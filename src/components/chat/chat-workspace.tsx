"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { MessageCircle, Plus, RefreshCw, Search, Send, UserRound } from "lucide-react";
import {
  searchStudentsAction,
  sendMessageAction,
  startConversationAction,
  type ChatActionState,
} from "@/lib/actions/chat";

export type ChatInboxItem = {
  id: string;
  other: { id: string; name: string };
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  lastMessageAt: string | null;
  unread: boolean;
  unreadCount: number;
};

export type ChatConversation = {
  id: string;
  other: { id: string; name: string };
  messages: Array<{
    id: string;
    body: string;
    createdAt: string;
    senderId: string;
    senderName: string;
  }>;
};

type Props = {
  currentUserId: string;
  inbox: ChatInboxItem[];
  activeConversation: ChatConversation | null;
  activeConversationId?: string;
};

function formatTime(value: string | null): string {
  if (!value) return "Chưa có tin nhắn";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function SearchSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="world-action inline-flex min-h-11 items-center justify-center gap-2 border border-line-strong bg-paper px-4 font-ui text-sm font-semibold text-navy-deep transition-colors hover:border-stoic-primary disabled:cursor-wait disabled:opacity-60"
    >
      <Search className="size-4" aria-hidden />
      {pending ? "Đang tìm…" : "Tìm học viên"}
    </button>
  );
}

function StartConversationButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="world-action inline-flex min-h-10 items-center gap-2 border border-line bg-paper px-3 font-ui text-xs font-semibold text-navy-deep transition-colors hover:border-stoic-primary disabled:opacity-60"
    >
      <MessageCircle className="size-3.5" aria-hidden />
      {pending ? "Đang mở…" : "Nhắn tin"}
    </button>
  );
}

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="world-action inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-navy px-5 font-ui text-sm font-semibold text-paper transition-colors hover:bg-navy-deep disabled:cursor-wait disabled:opacity-60"
    >
      <Send className="size-4" aria-hidden />
      {pending ? "Đang gửi…" : "Gửi"}
    </button>
  );
}

function SearchStudents() {
  const [state, action] = useActionState<ChatActionState, FormData>(
    searchStudentsAction,
    undefined,
  );

  return (
    <div id="student-search-panel" className="border border-line bg-paper p-5 scroll-mt-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center bg-stoic-lavender-pale text-navy-deep">
          <UserRound className="size-4" aria-hidden />
        </div>
        <div>
          <p className="font-display text-base font-bold text-navy-deep">Bắt đầu đối thoại</p>
          <p className="mt-1 font-ui text-xs leading-relaxed text-muted">
            Tìm bằng tên hoặc email. Chỉ học viên đang hoạt động mới xuất hiện trong kết quả.
          </p>
        </div>
      </div>
      <form action={action} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="student-search" className="sr-only">Tìm học viên</label>
        <input
          id="student-search"
          name="query"
          type="search"
          minLength={2}
          maxLength={120}
          placeholder="Nhập ít nhất 2 ký tự…"
          className="min-h-11 min-w-0 flex-1 border border-line bg-canvas px-3 font-ui text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-stoic-primary"
        />
        <SearchSubmit />
      </form>
      {state?.error && <p className="mt-3 font-ui text-xs text-vermilion-ink" role="alert">{state.error}</p>}
      {state?.students && (
        <div className="mt-4 space-y-2" aria-live="polite">
          {state.students.length === 0 ? (
            <p className="border border-dashed border-line px-3 py-4 font-ui text-sm text-muted">
              Không tìm thấy học viên phù hợp.
            </p>
          ) : (
            state.students.map((student) => (
              <form
                key={student.id}
                action={startConversationAction}
                className="flex items-center justify-between gap-3 border border-line/80 px-3 py-2.5"
              >
                <input type="hidden" name="otherUserId" value={student.id} />
                <span className="min-w-0 truncate font-ui text-sm font-medium text-ink">{student.name}</span>
                <StartConversationButton />
              </form>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, action] = useActionState<ChatActionState, FormData>(
    sendMessageAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} action={action} className="border-t border-line bg-paper p-4 sm:p-5">
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="flex items-end gap-2">
        <label htmlFor="chat-message" className="sr-only">Viết tin nhắn</label>
        <textarea
          id="chat-message"
          name="body"
          rows={2}
          maxLength={2000}
          required
          placeholder="Viết điều bạn muốn chia sẻ…"
          onKeyDown={submitOnEnter}
          className="min-h-11 min-w-0 flex-1 resize-y border border-line bg-canvas px-3 py-2.5 font-ui text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-stoic-primary"
        />
        <SendButton />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-ui text-[11px] text-muted">
        <span>Enter để gửi · Shift + Enter để xuống dòng</span>
        <span>Tối đa 2.000 ký tự</span>
      </div>
      {state?.error && <p className="mt-2 font-ui text-xs text-vermilion-ink" role="alert">{state.error}</p>}
      {state?.success && <p className="mt-2 font-ui text-xs text-stoic-primary" role="status">{state.success}</p>}
    </form>
  );
}

function ConversationPanel({
  currentUserId,
  conversation,
}: {
  currentUserId: string;
  conversation: ChatConversation;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [conversation.id, conversation.messages.length]);

  return (
    <section className="flex min-h-[34rem] flex-1 flex-col border border-line bg-canvas" aria-label={`Cuộc trò chuyện với ${conversation.other.name}`}>
      <header className="flex items-center gap-3 border-b border-line bg-paper px-5 py-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-stoic-lavender-pale font-display font-bold text-navy-deep">
          {conversation.other.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-bold text-navy-deep">{conversation.other.name}</h2>
          <p className="font-ui text-xs text-muted">Đối thoại riêng giữa hai học viên</p>
        </div>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
        {conversation.messages.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center text-center">
            <p className="max-w-xs font-ui text-sm leading-relaxed text-muted">
              Chưa có tin nhắn. Bạn có thể bắt đầu bằng một lời chào hoặc chia sẻ một điều hữu ích.
            </p>
          </div>
        ) : (
          conversation.messages.map((message) => {
            const own = message.senderId === currentUserId;
            return (
              <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] border px-3.5 py-2.5 sm:max-w-[72%] ${own ? "border-navy bg-navy text-paper" : "border-line bg-paper text-ink"}`}>
                  {!own && <p className="mb-1 font-ui text-[11px] font-semibold text-stoic-primary">{message.senderName}</p>}
                  <p className="whitespace-pre-wrap break-words font-ui text-sm leading-relaxed">{message.body}</p>
                  <time dateTime={message.createdAt} className={`mt-1.5 block font-ui text-[10px] ${own ? "text-paper/65" : "text-muted"}`}>
                    {formatTime(message.createdAt)}
                  </time>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <MessageComposer conversationId={conversation.id} />
    </section>
  );
}

function Inbox({ items, activeId }: { items: ChatInboxItem[]; activeId?: string }) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("vi-VN");
  const filteredItems = normalizedSearch
    ? items.filter((item) =>
        `${item.other.name} ${item.lastMessage?.body ?? ""}`
          .toLocaleLowerCase("vi-VN")
          .includes(normalizedSearch),
      )
    : items;
  const unreadTotal = items.reduce((total, item) => total + item.unreadCount, 0);

  function focusNewChat() {
    const input = document.getElementById("student-search");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus();
  }

  return (
    <aside className="flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-paper lg:w-[21rem] lg:shrink-0" aria-label="Danh sách thông báo chat">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-navy-deep">Tin nhắn</h2>
          <p className="mt-1 font-ui text-xs text-muted">
            {unreadTotal > 0 ? `${unreadTotal} tin chưa đọc` : `${items.length} cuộc đối thoại`}
          </p>
        </div>
        <button
          type="button"
          onClick={focusNewChat}
          aria-label="Bắt đầu cuộc trò chuyện mới"
          className="world-action inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-line text-navy-deep transition-colors hover:border-stoic-primary hover:bg-stoic-lavender-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/40"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </header>

      <div className="border-b border-line px-4 py-3">
        <label htmlFor="chat-inbox-search" className="sr-only">Tìm trong tin nhắn</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="chat-inbox-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm người hoặc tin nhắn…"
            autoComplete="off"
            spellCheck={false}
            className="min-h-10 w-full rounded-xl border border-line bg-canvas py-2 pl-9 pr-3 font-ui text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-stoic-primary"
          />
        </div>
      </div>

      <div className="max-h-[32rem] overflow-y-auto">
        {filteredItems.length === 0 ? (
          <p className="px-4 py-8 font-ui text-sm leading-relaxed text-muted">
            {items.length === 0 ? "Chưa có đối thoại. Hãy bấm dấu cộng để tìm một học viên." : "Không tìm thấy cuộc đối thoại phù hợp."}
          </p>
        ) : (
          <section aria-labelledby="direct-chat-list-label">
            <h3 id="direct-chat-list-label" className="px-4 pb-2 pt-3 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
              Đối thoại riêng
            </h3>
            <ul>
              {filteredItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/hoc-vien/tin-nhan?conversation=${encodeURIComponent(item.id)}`}
                    className={`world-action block border-t border-line/70 px-4 py-3 transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stoic-primary/50 ${activeId === item.id ? "bg-stoic-lavender-pale" : ""}`}
                    aria-current={activeId === item.id ? "page" : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream-deep font-display text-sm font-bold text-navy-deep">
                        {item.other.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate font-ui text-sm ${item.unread ? "font-bold text-navy-deep" : "font-semibold text-ink"}`}>{item.other.name}</p>
                          <time dateTime={item.lastMessageAt ?? undefined} className="shrink-0 font-ui text-[10px] text-muted">
                            {formatTime(item.lastMessageAt)}
                          </time>
                        </div>
                        <p className={`mt-1 truncate font-ui text-xs ${item.unread ? "font-medium text-ink" : "text-muted"}`}>
                          {item.lastMessage?.body ?? "Chưa có tin nhắn"}
                        </p>
                      </div>
                      {item.unreadCount > 0 ? (
                        <span
                          className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-stoic-primary px-1.5 py-0.5 font-ui text-[10px] font-bold text-paper"
                          aria-label={`${item.unreadCount} tin chưa đọc`}
                        >
                          {item.unreadCount > 99 ? "99+" : item.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}

export function ChatWorkspace({
  currentUserId,
  inbox,
  activeConversation,
  activeConversationId,
}: Props) {
  const router = useRouter();
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    refreshRef.current = setInterval(refresh, 8_000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [router]);

  return (
    <div className="space-y-6">
      <SearchStudents />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <Inbox items={inbox} activeId={activeConversationId} />
        {activeConversation ? (
          <ConversationPanel currentUserId={currentUserId} conversation={activeConversation} />
        ) : (
          <section className="flex min-h-[34rem] flex-1 items-center justify-center border border-dashed border-line bg-canvas px-6 py-12 text-center">
            <div className="max-w-sm">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-stoic-lavender-pale text-stoic-primary">
                <MessageCircle className="size-7" aria-hidden />
              </div>
              <h2 className="mt-5 font-display text-xl font-bold text-navy-deep">Chọn một đối thoại</h2>
              <p className="mt-2 font-ui text-sm leading-relaxed text-muted">
                Tin nhắn của bạn chỉ hiển thị với đúng người tham gia. Chọn một cuộc trò chuyện ở Hộp thư hoặc tìm học viên mới.
              </p>
            </div>
          </section>
        )}
      </div>
      <p className="flex items-center justify-end gap-1.5 font-ui text-[11px] text-muted">
        <RefreshCw className="size-3" aria-hidden />
        Hộp thư tự cập nhật định kỳ khi bạn đang mở trang.
      </p>
    </div>
  );
}
