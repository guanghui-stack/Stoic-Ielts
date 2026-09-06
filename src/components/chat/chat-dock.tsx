"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { LoaderCircle, MessageCircle, Plus, X } from "lucide-react";
import type { InboundMessage } from "ably";
import { useOnlineStudents, useStudentRealtime } from "@/components/realtime/student-realtime-provider";
import { StudentAvatar } from "@/components/student/student-avatar";
import MessageConversation from "@/components/ui/messaging-conversation";
import type { ChatConversation } from "./chat-workspace";
import { CHAT_REALTIME_EVENT, chatUserChannel, isChatMessageCreatedPayload } from "@/lib/chat/realtime-rules";
import { claimChatFocus, incomingChats, openChatWindow, OPEN_CHAT_EVENT, showChatDock, validChatId, type DockInboxItem, type DockWindow } from "@/lib/chat/dock-rules";
import { readDockMessageAction, sendDockMessageAction } from "@/lib/actions/chat-dock";
import { INBOX_UPDATED_EVENT } from "@/lib/student/quick-access";
import styles from "./chat-dock.module.css";

export function requestChatWindow(conversationId: string) {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, { detail: { conversationId } }));
}

export type ChatDockTransport = {
  fetch: typeof fetch;
  send: typeof sendDockMessageAction;
  read: typeof readDockMessageAction;
};
const realTransport: ChatDockTransport = { fetch: (...args) => fetch(...args), send: sendDockMessageAction, read: readDockMessageAction };
const subscribeMount = () => () => undefined;
const clientMounted = () => true;
const serverMounted = () => false;

export function ChatDock({ userId, transport = realTransport }: { userId: string; transport?: ChatDockTransport }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const activePageId = pathname === "/hoc-vien/tin-nhan" ? params.get("conversation") : null;
  const allowed = showChatDock(pathname);
  const { client, connected } = useStudentRealtime();
  const [windows, setWindows] = useState<DockWindow[]>([]);
  const [inbox, setInbox] = useState<DockInboxItem[]>([]);
  const [views, setViews] = useState<Record<string, ChatConversation>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sendErrors, setSendErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [focus, setFocus] = useState<Record<string, number>>({});
  const [paused, setPaused] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [offline, setOffline] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [capacity, setCapacity] = useState(1);
  const mounted = useSyncExternalStore(subscribeMount, clientMounted, serverMounted);
  const windowsRef = useRef(windows);
  const seen = useRef(new Map<string, string>());
  const controllers = useRef(new Map<string, AbortController>());
  const sendLocks = useRef(new Set<string>());
  const appliedFocus = useRef(new Map<string, number>());
  const alive = useRef(true);
  const claimFocus = useCallback((id: string, request: number | undefined) => claimChatFocus(appliedFocus.current, id, request), []);
  const { onlineUserIds, ready: presenceReady } = useOnlineStudents(allowed && !paused && windows.length > 0);

  useEffect(() => { windowsRef.current = windows; }, [windows]);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1100px)");
    const update = () => setCapacity(query.matches ? 2 : 1);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    alive.current = true;
    const requests = controllers.current;
    const logout = () => {
      requests.forEach((controller) => controller.abort());
      setSignedOut(true); setWindows([]); setViews({}); setDrafts({}); setInbox([]);
    };
    const storage = (event: StorageEvent) => { if (event.key === "stoic:realtime-logout-at") logout(); };
    window.addEventListener("stoic:realtime-logout", logout);
    window.addEventListener("storage", storage);
    return () => {
      alive.current = false; requests.forEach((controller) => controller.abort()); requests.clear();
      window.removeEventListener("stoic:realtime-logout", logout);
      window.removeEventListener("storage", storage);
    };
  }, []);

  const loadConversation = useCallback(async (id: string, force = false) => {
    if (!validChatId(id)) return;
    const previous = controllers.current.get(id);
    if (previous && !force) return;
    previous?.abort();
    const controller = new AbortController();
    controllers.current.set(id, controller);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 8_000);
    try {
      const response = await transport.fetch(`/api/students/chat?conversation=${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal });
      if (controller.signal.aborted || !alive.current) return;
      if (response.status === 401 || response.status === 403) { setSignedOut(true); setViews({}); setDrafts({}); return; }
      const data = await response.json();
      if (controller.signal.aborted || !alive.current) return;
      if (data.paused) { setPaused(true); return; }
      if (!response.ok) {
        setViews((previous) => { const next = { ...previous }; delete next[id]; return next; });
        setErrors((previous) => ({ ...previous, [id]: data.error || "Không tải được cuộc trò chuyện." })); return;
      }
      setViews((previous) => ({ ...previous, [id]: data.conversation }));
      setErrors((previous) => ({ ...previous, [id]: "" }));
    } catch {
      if (alive.current && (!controller.signal.aborted || timedOut)) setErrors((previous) => ({ ...previous, [id]: "Mất kết nối. Tin nhắn đang soạn vẫn được giữ." }));
    } finally {
      clearTimeout(timer);
      if (controllers.current.get(id) === controller) controllers.current.delete(id);
    }
  }, [transport]);

  const open = useCallback((id: string) => {
    if (!validChatId(id)) return;
    setWindows((previous) => openChatWindow(previous, id, true));
    setFocus((previous) => ({ ...previous, [id]: (previous[id] ?? 0) + 1 }));
    setTrayOpen(false);
    void loadConversation(id);
  }, [loadConversation]);

  useEffect(() => {
    if (!allowed || signedOut) return;
    const requests = controllers.current;
    let disposed = false;
    let busy = false;
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let request: AbortController | undefined;
    const refresh = async () => {
      if (disposed || document.visibilityState !== "visible") return;
      if (busy) { pending = true; return; }
      busy = true;
      request = new AbortController();
      const timeout = setTimeout(() => request?.abort(), 8_000);
      try {
        const response = await transport.fetch("/api/students/chat", { cache: "no-store", signal: request.signal });
        if (disposed) return;
        if (response.status === 401 || response.status === 403) { setSignedOut(true); setViews({}); setDrafts({}); return; }
        if (!response.ok) throw new Error("chat unavailable");
        const data = await response.json();
        if (disposed) return;
        setOffline(false); setPaused(Boolean(data.paused));
        if (data.paused) { requests.forEach((controller) => controller.abort()); return; }
        const items = data.inbox as DockInboxItem[];
        setInbox(items);
        const arrivals = incomingChats(items, seen.current).filter((id) => id !== activePageId);
        setWindows((previous) => arrivals.slice(0, 3).reduce((next, id) => openChatWindow(next, id), previous));
        const ids = new Set([...windowsRef.current.map((item) => item.id), ...arrivals.slice(0, 3)]);
        await Promise.all([...ids].map((id) => loadConversation(id)));
      } catch {
        if (!disposed) setOffline(true);
      } finally {
        clearTimeout(timeout); busy = false;
        if (pending && !disposed) { pending = false; schedule(); }
      }
    };
    const schedule = () => {
      if (disposed || timer) return;
      timer = setTimeout(() => { timer = undefined; void refresh(); }, 200);
    };
    const onOpen = (event: Event) => {
      const id = (event as CustomEvent).detail?.conversationId;
      if (validChatId(id)) open(id);
    };
    const channel = client?.channels.get(chatUserChannel(userId));
    const onMessage = (message: InboundMessage) => { if (isChatMessageCreatedPayload(message.data)) schedule(); };
    if (channel) void channel.subscribe(CHAT_REALTIME_EVENT, onMessage).then(schedule).catch(() => undefined);
    schedule();
    const interval = setInterval(schedule, connected ? 60_000 : 8_000);
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    window.addEventListener(INBOX_UPDATED_EVENT, schedule);
    window.addEventListener("focus", schedule);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      disposed = true; request?.abort(); clearTimeout(timer); clearInterval(interval);
      requests.forEach((controller) => controller.abort());
      channel?.unsubscribe(CHAT_REALTIME_EVENT, onMessage);
      window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
      window.removeEventListener(INBOX_UPDATED_EVENT, schedule);
      window.removeEventListener("focus", schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [activePageId, allowed, client, connected, loadConversation, open, signedOut, transport, userId]);

  async function send(id: string) {
    const body = drafts[id] ?? "";
    if (!body.trim() || sendLocks.current.has(id)) return;
    sendLocks.current.add(id); setSending((previous) => ({ ...previous, [id]: true }));
    setSendErrors((previous) => ({ ...previous, [id]: "" }));
    try {
      const result = await transport.send(id, body);
      if (!alive.current) return;
      if (result.error) {
        setSendErrors((previous) => ({ ...previous, [id]: result.error! }));
        if ("paused" in result && result.paused) setPaused(true);
      } else {
        setDrafts((previous) => ({ ...previous, [id]: previous[id] === body ? "" : previous[id] }));
        await loadConversation(id, true);
        if (windowsRef.current.some((item) => item.id === id && !item.minimized)) {
          setFocus((previous) => ({ ...previous, [id]: (previous[id] ?? 0) + 1 }));
        }
        window.dispatchEvent(new Event(INBOX_UPDATED_EVENT));
      }
    } catch {
      if (alive.current) setSendErrors((previous) => ({ ...previous, [id]: "Chưa xác nhận được tin đã gửi. Tải lại cuộc trò chuyện trước khi gửi lại." }));
    } finally {
      sendLocks.current.delete(id);
      if (alive.current) setSending((previous) => ({ ...previous, [id]: false }));
    }
  }

  async function read(id: string, messageId: string) {
    try {
      const result = await transport.read(id, messageId);
      if ("success" in result) window.dispatchEvent(new Event(INBOX_UPDATED_EVENT));
      if ("paused" in result && result.paused && alive.current) setPaused(true);
      return "success" in result;
    } catch { return false; }
  }

  if (!mounted || !allowed || paused || signedOut) return null;
  const expanded = windows.filter((item) => !item.minimized && item.id !== activePageId).slice(0, capacity);
  const minimized = windows.filter((item) => !expanded.includes(item) && item.id !== activePageId);
  const unreadCount = inbox.filter((item) => item.unread).length;
  return createPortal(
    <aside className={styles.dock} aria-label="Chat học viên" data-chat-expanded={expanded.length > 0 ? "true" : undefined}>
      <div className={styles.windows}>
        {expanded.map(({ id }) => {
          const view = views[id];
          const close = () => { claimFocus(id, focus[id]); setWindows((previous) => previous.filter((item) => item.id !== id)); };
          return view ? <MessageConversation key={id} conversation={view} currentUserId={userId}
            draft={drafts[id] ?? ""} onDraft={(value) => setDrafts((previous) => ({ ...previous, [id]: value }))}
            onSend={() => { void send(id); }} onRead={(messageId) => read(id, messageId)}
            onMinimize={() => { claimFocus(id, focus[id]); setWindows((previous) => previous.map((item) => item.id === id ? { ...item, minimized: true } : item)); }}
            onClose={close} sending={sending[id]} error={sendErrors[id] || errors[id]} onRetry={() => { void loadConversation(id, true); }}
            online={onlineUserIds.has(view.other.id)} presenceReady={presenceReady} focusRequest={focus[id]} claimFocus={claimFocus} /> :
            <div key={id} className={styles.loading} role="region" aria-label="Đang mở chat">
              <button className={styles.closeLoading} onClick={close} aria-label="Đóng cửa sổ chat"><X className="size-4" /></button>
              {errors[id] ? <p role="alert">{errors[id]} <button className="underline" onClick={() => { void loadConversation(id); }}>Thử lại</button></p> : <><LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" /><p>Đang mở cuộc trò chuyện…</p></>}
            </div>;
        })}
      </div>
      <div className={styles.rail}>
        {minimized.map(({ id }) => {
          const person = views[id]?.other ?? inbox.find((item) => item.id === id)?.other;
          const unread = inbox.some((item) => item.id === id && item.unread);
          return <button key={id} className={styles.head} onClick={() => open(id)} aria-label={`Mở lại chat với ${person?.name ?? "học viên"}${unread ? ", có tin mới" : ""}`} title={person?.name}>
            <StudentAvatar src={person?.avatarSrc} name={person?.name ?? "HV"} email="" size="md" />
            {unread && <span className={styles.unreadDot} />}
          </button>;
        })}
        <div className="relative">
          {trayOpen && <div className={styles.tray}>
            <div className="flex items-center justify-between border-b border-stoic-line px-4 py-3">
              <h2 className="text-sm font-semibold">Tin nhắn</h2>
              <Link href="/hoc-vien/tin-nhan" onClick={() => setTrayOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-stoic-canvas-soft" aria-label="Tìm bạn để nhắn tin"><Plus className="size-4" /></Link>
            </div>
            {offline && <p role="status" className="px-4 py-2 text-xs text-danger">Đang chờ kết nối lại…</p>}
            <div className="max-h-72 overflow-y-auto">
              {inbox.length === 0 && <p className="px-4 py-8 text-sm text-stoic-muted">Chưa có cuộc trò chuyện. Mở danh sách bạn bè để bắt đầu.</p>}
              {inbox.map((item) => <button key={item.id} className={styles.inboxRow} onClick={() => open(item.id)}>
                <StudentAvatar src={item.other.avatarSrc} name={item.other.name} email="" size="sm" />
                <span className="min-w-0 flex-1 truncate text-left">{item.other.name}</span>
                {item.unread && <span className="text-[10px] font-semibold text-stoic-primary">Tin mới</span>}
              </button>)}
            </div>
            <Link href="/hoc-vien/tin-nhan" onClick={() => setTrayOpen(false)} className="block border-t border-stoic-line p-3 text-center text-xs font-semibold text-stoic-primary">Xem tất cả tin nhắn</Link>
          </div>}
          <button className={styles.launcher} onClick={() => setTrayOpen(!trayOpen)} aria-expanded={trayOpen} aria-label={trayOpen ? "Đóng danh sách chat" : `Mở danh sách chat${unreadCount ? `, ${unreadCount} cuộc trò chuyện chưa đọc` : ""}`}>
            {trayOpen ? <X className="size-5" /> : <MessageCircle className="size-5" />}
            {unreadCount > 0 && <span className={styles.count}>{unreadCount}</span>}
          </button>
        </div>
      </div>
    </aside>, document.body,
  );
}
