"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Clock3, MessageCircle, Plus, RefreshCw, Search, Send, UserPlus, UserRound, X } from "lucide-react";
import { useRealtimeChat } from "@/components/chat/use-realtime-chat";
import { useOnlineStudents } from "@/components/realtime/student-realtime-provider";
import {
  searchStudentsAction,
  sendMessageAction,
  type ChatActionState,
} from "@/lib/actions/chat";
import {
  respondToFriendRequestAction,
  sendFriendRequestAction,
  type FriendActionState,
} from "@/lib/actions/friends";
import type { FriendOverview, FriendPerson } from "@/lib/friends/service";
import type { FriendshipState } from "@/lib/friends/rules";
import { STRANGER_MESSAGE_LIMIT } from "@/lib/chat/rules";
import { AccountAddIcon } from "@/components/friends/account-add-icon";
import { StudentAvatar } from "@/components/student/student-avatar";
import { INBOX_UPDATED_EVENT } from "@/lib/student/quick-access";
import { openChatAction } from "@/lib/actions/chat-dock";
import { requestChatWindow } from "@/components/chat/chat-dock";

export type ChatInboxItem = {
  id: string;
  friendshipState: FriendshipState;
  other: { id: string; name: string; avatarSrc: string | null };
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  lastMessageAt: string | null;
  unread: boolean;
  unreadCount: number;
};

export type ChatConversation = {
  id: string;
  friendshipState: FriendshipState;
  canSend: boolean;
  /** Khác `null` khi đang bị đếm hạn mức tin nhắn cho người chưa kết bạn. */
  sendLimit: { remaining: number; total: number } | null;
  other: { id: string; name: string; avatarSrc: string | null };
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
  realtimeEnabled: boolean;
  friendOverview: FriendOverview;
  /** Mã UID của chính học viên, để họ đưa cho bạn học. `null` nếu chưa cấp được. */
  myUid: string | null;
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

function OnlineMark({ online, ready }: { online: boolean; ready: boolean }) {
  if (!ready) return null;
  return (
    <span
      className={`inline-block size-2 shrink-0 rounded-full ${
        online ? "bg-success" : "bg-line-strong"
      }`}
      aria-label={online ? "Đang trực tuyến" : "Đang ngoại tuyến"}
      title={online ? "Đang trực tuyến" : "Đang ngoại tuyến"}
    />
  );
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

function StartConversationButton({
  otherUserId,
  personName,
  iconOnly = false,
}: {
  otherUserId: string;
  personName: string;
  iconOnly?: boolean;
}) {
  const [state, action, pending] = useActionState<ChatActionState, FormData>(
    async (_previous, formData) => {
      try {
        const result = await openChatAction(String(formData.get("otherUserId") ?? ""));
        if (result.error) return { error: result.error };
        if ("conversationId" in result && result.conversationId) requestChatWindow(result.conversationId);
        return undefined;
      } catch {
        return { error: "Chưa mở được chat. Vui lòng thử lại." };
      }
    },
    undefined,
  );
  return (
    <form action={action} className="flex min-w-0 flex-col items-end gap-1">
      <input type="hidden" name="otherUserId" value={otherUserId} />
      <button
        type="submit"
        disabled={pending}
        className={iconOnly
          ? "motion-press grid size-11 place-items-center border border-line text-navy-deep hover:border-stoic-primary hover:bg-stoic-lavender-pale disabled:opacity-60"
          : "world-action inline-flex min-h-11 items-center gap-2 border border-line bg-paper px-3 font-ui text-xs font-semibold text-navy-deep transition-colors hover:border-stoic-primary disabled:opacity-60"}
        aria-label={iconOnly ? `Nhắn tin cho ${personName}` : undefined}
      >
        <MessageCircle className="size-3.5" aria-hidden />
        {iconOnly ? null : pending ? "Đang mở…" : "Nhắn tin"}
      </button>
      {state?.error ? (
        <span className="max-w-48 text-right font-ui text-[11px] leading-snug text-vermilion-ink" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

function FriendshipButton({
  student,
  allowDecline = false,
}: {
  student: { id: string; friendshipState: FriendshipState };
  allowDecline?: boolean;
}) {
  const [requestState, requestAction, requestPending] = useActionState<FriendActionState, FormData>(
    sendFriendRequestAction,
    undefined,
  );
  const [responseState, responseAction, responsePending] = useActionState<FriendActionState, FormData>(
    respondToFriendRequestAction,
    undefined,
  );
  const state = responseState?.state ?? requestState?.state ?? student.friendshipState;

  if (state === "FRIENDS") {
    return <StartConversationButton otherUserId={student.id} personName="học viên" />;
  }

  if (state === "OUTGOING_PENDING") {
    return (
      <span className="inline-flex min-h-11 shrink-0 items-center gap-1.5 border border-line bg-canvas px-3 font-ui text-xs font-semibold text-muted">
        <Clock3 className="size-3.5" aria-hidden="true" />
        Đã gửi lời mời
      </span>
    );
  }

  if (state === "INCOMING_PENDING") {
    return (
      <form action={responseAction} className="flex flex-col items-end gap-1">
        <input type="hidden" name="otherUserId" value={student.id} />
        <div className="flex flex-wrap gap-2">
          {allowDecline ? (
            <button
              type="submit"
              name="response"
              value="DECLINE"
              disabled={responsePending}
              className="world-action inline-flex min-h-11 items-center gap-2 border border-line bg-paper px-3 font-ui text-xs font-semibold text-muted hover:border-navy disabled:opacity-60"
            >
              <X className="size-3.5" aria-hidden="true" />
              Bỏ qua
            </button>
          ) : null}
          <button
            type="submit"
            name="response"
            value="ACCEPT"
            disabled={responsePending}
            className="world-action motion-press inline-flex min-h-11 shrink-0 items-center gap-2 bg-navy px-3 font-ui text-xs font-semibold text-paper hover:bg-navy-deep disabled:opacity-60"
          >
            <Check className="size-3.5" aria-hidden="true" />
            {responsePending ? "Đang nhận…" : "Chấp nhận"}
          </button>
        </div>
        {responseState?.error ? (
          <span className="max-w-48 text-right font-ui text-[11px] leading-snug text-vermilion-ink" role="alert">
            {responseState.error}
          </span>
        ) : null}
      </form>
    );
  }

  return (
    <form action={requestAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="otherUserId" value={student.id} />
      <button
        type="submit"
        disabled={requestPending}
        className="world-action motion-press inline-flex min-h-11 shrink-0 items-center gap-2 border border-stoic-primary bg-paper px-3 font-ui text-xs font-semibold text-stoic-primary-deep hover:bg-stoic-lavender-pale disabled:opacity-60"
      >
        <AccountAddIcon size={16} aria-hidden="true" />
        {requestPending ? "Đang gửi…" : "Kết bạn"}
      </button>
      {requestState?.error ? (
        <span className="max-w-48 text-right font-ui text-[11px] leading-snug text-vermilion-ink" role="alert">
          {requestState.error}
        </span>
      ) : null}
    </form>
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

function SearchStudents({
  onlineUserIds,
  presenceReady,
}: {
  onlineUserIds: ReadonlySet<string>;
  presenceReady: boolean;
}) {
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
          <p className="font-display text-base font-bold text-navy-deep">Tìm bạn học</p>
          <p className="mt-1 font-ui text-xs leading-relaxed text-muted">
            Tìm bằng tên, email hoặc mã UID. Chưa kết bạn vẫn nhắn được tối đa {STRANGER_MESSAGE_LIMIT} tin.
          </p>
        </div>
      </div>
      <label htmlFor="student-search" className="mt-4 block font-ui text-xs font-semibold text-navy-deep">
        Tên, email hoặc mã UID
      </label>
      <form action={action} className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <input
          id="student-search"
          name="query"
          type="search"
          minLength={2}
          maxLength={120}
          placeholder="Nhập tên, email hoặc mã UID…"
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
              <div
                key={student.id}
                className="flex items-center justify-between gap-3 border border-line/80 px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2.5 font-ui text-sm font-medium text-ink">
                  <StudentAvatar
                    src={student.avatarSrc}
                    name={student.name}
                    email=""
                    size="sm"
                    showStatus={presenceReady}
                    online={onlineUserIds.has(student.id)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{student.name}</span>
                    {student.uid && (
                      <span className="block font-mono text-[11px] tracking-[0.1em] text-muted">
                        {student.uid}
                      </span>
                    )}
                  </span>
                </span>
                <FriendshipButton key={`${student.id}:${student.friendshipState}`} student={student} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function IncomingFriendRow({
  person,
  online,
  presenceReady,
}: {
  person: FriendPerson;
  online: boolean;
  presenceReady: boolean;
}) {
  const [state, action, pending] = useActionState<FriendActionState, FormData>(
    respondToFriendRequestAction,
    undefined,
  );

  if (state?.state === "NONE") return null;
  if (state?.state === "FRIENDS") {
    return (
      <div className="flex items-center justify-between gap-3 border border-stoic-primary/30 bg-stoic-lavender-pale px-3 py-2.5">
        <span className="font-ui text-sm font-semibold text-navy-deep">Đã kết bạn với {person.name}</span>
        <StartConversationButton otherUserId={person.id} personName={person.name} />
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 border border-stoic-primary/25 bg-paper px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <input type="hidden" name="otherUserId" value={person.id} />
      <span className="flex min-w-0 items-center gap-2.5">
        <StudentAvatar
          src={person.avatarSrc}
          name={person.name}
          email=""
          size="sm"
          showStatus={presenceReady}
          online={online}
        />
        <span className="min-w-0">
          <span className="block truncate font-ui text-sm font-semibold text-navy-deep">{person.name}</span>
          <span className="block font-ui text-[11px] text-muted">Muốn kết bạn với bạn</span>
        </span>
      </span>
      <span className="flex shrink-0 gap-2">
        <button
          type="submit"
          name="response"
          value="DECLINE"
          disabled={pending}
          className="motion-press grid size-11 place-items-center border border-line text-muted hover:border-vermilion-ink hover:text-vermilion-ink disabled:opacity-50"
          aria-label={`Bỏ qua lời mời của ${person.name}`}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <button
          type="submit"
          name="response"
          value="ACCEPT"
          disabled={pending}
          className="world-action motion-press inline-flex min-h-11 items-center gap-1.5 bg-navy px-3 font-ui text-xs font-semibold text-paper hover:bg-navy-deep disabled:opacity-50"
        >
          <Check className="size-3.5" aria-hidden="true" />
          {pending ? "Đang lưu…" : "Chấp nhận"}
        </button>
      </span>
      {state?.error ? <span className="font-ui text-xs text-vermilion-ink" role="alert">{state.error}</span> : null}
    </form>
  );
}

function ConnectionsPanel({
  overview,
  onlineUserIds,
  presenceReady,
}: {
  overview: FriendOverview;
  onlineUserIds: ReadonlySet<string>;
  presenceReady: boolean;
}) {
  if (overview.incoming.length === 0 && overview.friends.length === 0 && overview.outgoing.length === 0) {
    return null;
  }

  return (
    <section className="border border-line bg-canvas p-5" aria-labelledby="connections-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="label-caps">KẾT NỐI</p>
          <h2 id="connections-title" className="mt-1 font-display text-lg font-bold text-navy-deep">
            Bạn bè học tập
          </h2>
        </div>
        <p className="font-ui text-xs text-muted">
          {overview.friends.length} bạn bè
          {overview.outgoing.length > 0 ? ` · ${overview.outgoing.length} lời mời đã gửi` : ""}
        </p>
      </div>

      {overview.incoming.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="font-ui text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stoic-primary-deep">
            Lời mời mới · {overview.incoming.length}
          </p>
          {overview.incoming.map((person) => (
            <IncomingFriendRow
              key={person.id}
              person={person}
              online={onlineUserIds.has(person.id)}
              presenceReady={presenceReady}
            />
          ))}
        </div>
      ) : null}

      {overview.outgoing.length > 0 ? (
        <div className="mt-4">
          <p className="font-ui text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
            Đang chờ phản hồi · {overview.outgoing.length}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {overview.outgoing.map((person) => (
              <div key={person.id} className="flex min-h-14 items-center gap-2.5 border border-line bg-paper px-3 py-2.5">
                <StudentAvatar
                  src={person.avatarSrc}
                  name={person.name}
                  email=""
                  size="sm"
                  showStatus={presenceReady}
                  online={onlineUserIds.has(person.id)}
                />
                <span className="min-w-0">
                  <span className="block truncate font-ui text-sm font-semibold text-ink">{person.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 font-ui text-[11px] text-muted">
                    <Clock3 className="size-3" aria-hidden="true" />
                    Đã gửi lời mời
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {overview.friends.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {overview.friends.map((person) => (
            <div key={person.id} className="flex items-center justify-between gap-3 border border-line bg-paper px-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <StudentAvatar
                  src={person.avatarSrc}
                  name={person.name}
                  email=""
                  size="sm"
                  showStatus={presenceReady}
                  online={onlineUserIds.has(person.id)}
                />
                <span className="truncate font-ui text-sm font-semibold text-ink">{person.name}</span>
              </span>
              <StartConversationButton
                otherUserId={person.id}
                personName={person.name}
                iconOnly
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
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
  presenceReady,
  otherOnline,
}: {
  currentUserId: string;
  conversation: ChatConversation;
  presenceReady: boolean;
  otherOnline: boolean;
}) {
  const messagesRef = useRef<HTMLDivElement>(null);
  const previousConversationRef = useRef<string | null>(null);
  const previousMessageCountRef = useRef(0);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    const conversationChanged = previousConversationRef.current !== conversation.id;
    const receivedNewMessage = conversation.messages.length > previousMessageCountRef.current;
    previousConversationRef.current = conversation.id;
    previousMessageCountRef.current = conversation.messages.length;

    if (!conversationChanged && !receivedNewMessage) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: reducedMotion || conversationChanged ? "auto" : "smooth",
      });
    });
  }, [conversation.id, conversation.messages.length]);

  return (
    <section className="flex min-h-[34rem] flex-1 flex-col border border-line bg-canvas" aria-label={`Cuộc trò chuyện với ${conversation.other.name}`}>
      <header className="flex items-center gap-3 border-b border-line bg-paper px-5 py-4">
        <StudentAvatar
          src={conversation.other.avatarSrc}
          name={conversation.other.name}
          email=""
          size="sm"
          showStatus={presenceReady}
          online={otherOnline}
        />
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-bold text-navy-deep">{conversation.other.name}</h2>
          <p className="flex items-center gap-1.5 font-ui text-xs text-muted">
            <OnlineMark online={otherOnline} ready={presenceReady} />
            {presenceReady
              ? otherOnline
                ? "Đang trực tuyến"
                : "Đang ngoại tuyến"
              : "Đối thoại riêng giữa hai học viên"}
          </p>
        </div>
      </header>
      <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
        {conversation.messages.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center text-center">
            <p className="max-w-xs font-ui text-sm leading-relaxed text-muted">
              {conversation.canSend
                ? "Chưa có tin nhắn. Bạn có thể bắt đầu bằng một lời chào hoặc chia sẻ một điều hữu ích."
                : "Chưa có tin nhắn. Hãy chờ người kia trả lời, hoặc kết bạn để nhắn tiếp."}
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
      </div>
      {conversation.canSend ? (
        <>
          {conversation.sendLimit && (
            <StrangerQuotaStrip
              remaining={conversation.sendLimit.remaining}
              total={conversation.sendLimit.total}
              other={conversation.other}
              friendshipState={conversation.friendshipState}
            />
          )}
          <MessageComposer key={conversation.id} conversationId={conversation.id} />
        </>
      ) : (
        <div className="border-t border-line bg-paper p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-ui text-sm font-semibold text-navy-deep">Đã dùng hết lượt nhắn cho người chưa kết bạn</p>
              <p className="mt-1 font-ui text-xs leading-relaxed text-muted">
                {conversation.friendshipState === "INCOMING_PENDING"
                  ? "Lịch sử được giữ nguyên. Bạn có thể chấp nhận hoặc bỏ qua lời mời."
                  : conversation.friendshipState === "OUTGOING_PENDING"
                    ? "Bạn vẫn xem được lịch sử. Chờ người kia chấp nhận để nhắn tiếp."
                    : "Bạn vẫn xem được lịch sử. Chờ người kia trả lời, hoặc kết bạn để nhắn không giới hạn."}
              </p>
            </div>
            <div className="shrink-0 self-start sm:self-center">
              <FriendshipButton
                key={`${conversation.other.id}:${conversation.friendshipState}`}
                student={{ id: conversation.other.id, friendshipState: conversation.friendshipState }}
                allowDecline
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Dải nhắc hạn mức, chỉ hiện khi hai người CHƯA kết bạn.
 *
 * Đặt ngay trên ô soạn tin chứ không phải trong một hộp thoại: người ta cần
 * biết mình còn mấy lượt vào đúng lúc đang gõ, không phải sau khi đã gõ xong.
 */
function StrangerQuotaStrip({
  remaining,
  total,
  other,
  friendshipState,
}: {
  remaining: number;
  total: number;
  other: { id: string; name: string };
  friendshipState: FriendshipState;
}) {
  const last = remaining === 1;
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5 ${
        last ? "border-line bg-gold-pale" : "border-line bg-cream-deep"
      }`}
    >
      <p className="min-w-0 font-ui text-xs leading-relaxed text-ink-soft">
        <strong className="text-navy-deep">
          Còn {remaining}/{total} tin nhắn
        </strong>{" "}
        vì hai bạn chưa kết bạn.{" "}
        {last
          ? "Đây là tin cuối trước khi cần chờ trả lời."
          : "Hạn mức được gỡ ngay khi người kia trả lời."}
      </p>
      <div className="shrink-0">
        <FriendshipButton
          key={`${other.id}:${friendshipState}`}
          student={{ id: other.id, friendshipState }}
        />
      </div>
    </div>
  );
}

/**
 * Hộp mời kết bạn.
 *
 * Kho tin nhắn chỉ có ích khi có người để nhắn, mà phần lớn học viên không tự
 * nghĩ tới việc đi kết bạn trước. Hộp này nói thẳng ba cách tìm nhau và đặt
 * ngay trên hộp thư, chỗ họ chắc chắn nhìn thấy.
 */
function FriendInviteIntro({ myUid }: { myUid: string | null }) {
  return (
    <section className="border border-stoic-primary/35 bg-stoic-lavender-pale/40 p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center bg-paper text-stoic-primary">
          <UserPlus className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold text-navy-deep">
            Rủ bạn học cùng
          </h2>
          <p className="mt-1.5 font-ui text-sm leading-relaxed text-ink-soft">
            Học một mình dễ bỏ cuộc hơn học cùng người khác. Bạn có thể nhắn cho
            người chưa kết bạn tối đa {STRANGER_MESSAGE_LIMIT} tin để làm quen —
            kết bạn rồi thì nhắn không giới hạn.
          </p>

          <ul className="mt-3 grid gap-2 font-ui text-xs leading-relaxed text-ink-soft sm:grid-cols-3">
            <li className="border border-line bg-paper px-3 py-2.5">
              <strong className="block text-navy-deep">1. Tìm theo mã UID</strong>
              Xin mã của bạn học rồi dán vào ô tìm kiếm.
            </li>
            <li className="border border-line bg-paper px-3 py-2.5">
              <strong className="block text-navy-deep">2. Tìm theo tên hoặc email</strong>
              Gõ ít nhất 2 ký tự ở ô ngay bên dưới.
            </li>
            <li className="border border-line bg-paper px-3 py-2.5">
              <strong className="block text-navy-deep">3. Gặp nhau ở Diễn đàn</strong>
              Trả lời bài của người khác rồi kết bạn từ đó.
            </li>
          </ul>

          {myUid && (
            <p className="mt-3 flex flex-wrap items-center gap-2 font-ui text-xs text-ink-soft">
              Mã UID của bạn:
              <code className="border border-line bg-paper px-2 py-1 font-mono text-sm font-semibold tracking-[0.12em] text-navy-deep">
                {myUid}
              </code>
              <span className="text-muted">Đưa mã này cho người khác để họ tìm ra bạn.</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Inbox({
  items,
  activeId,
  onlineUserIds,
  presenceReady,
}: {
  items: ChatInboxItem[];
  activeId?: string;
  onlineUserIds: ReadonlySet<string>;
  presenceReady: boolean;
}) {
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
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    input?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
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
          className="world-action inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-line text-navy-deep transition-colors hover:border-stoic-primary hover:bg-stoic-lavender-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/40"
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
            className="min-h-11 w-full rounded-xl border border-line bg-canvas py-2 pl-9 pr-3 font-ui text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-stoic-primary"
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
                    onClick={(event) => {
                      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      event.preventDefault(); requestChatWindow(item.id);
                    }}
                    className={`world-action block border-t border-line/70 px-4 py-3 transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stoic-primary/50 ${activeId === item.id ? "bg-stoic-lavender-pale" : ""}`}
                    aria-current={activeId === item.id ? "page" : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <StudentAvatar
                        src={item.other.avatarSrc}
                        name={item.other.name}
                        email=""
                        size="sm"
                        showStatus={presenceReady}
                        online={onlineUserIds.has(item.other.id)}
                      />
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
                        {item.friendshipState !== "FRIENDS" ? (
                          <p className="mt-1 flex items-center gap-1 font-ui text-[11px] text-stoic-primary-deep">
                            <Clock3 className="size-3 shrink-0" aria-hidden="true" />
                            {item.friendshipState === "INCOMING_PENDING"
                              ? "Có lời mời kết bạn"
                              : item.friendshipState === "OUTGOING_PENDING"
                                ? "Đang chờ kết bạn"
                                : "Lịch sử · chưa kết bạn"}
                          </p>
                        ) : null}
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
  realtimeEnabled,
  friendOverview,
  myUid,
}: Props) {
  useRealtimeChat({ currentUserId, enabled: realtimeEnabled });
  const presence = useOnlineStudents(realtimeEnabled);

  useEffect(() => {
    // Hộp thư đã render sau bước đánh dấu đã đọc trên server: đồng bộ chấm báo.
    window.dispatchEvent(new Event(INBOX_UPDATED_EVENT));
  }, [inbox]);

  return (
    <div className="space-y-6">
      <ConnectionsPanel
        overview={friendOverview}
        onlineUserIds={presence.onlineUserIds}
        presenceReady={presence.ready}
      />
      <FriendInviteIntro myUid={myUid} />
      <SearchStudents
        onlineUserIds={presence.onlineUserIds}
        presenceReady={presence.ready}
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <Inbox
          items={inbox}
          activeId={activeConversationId}
          onlineUserIds={presence.onlineUserIds}
          presenceReady={presence.ready}
        />
        {activeConversation ? (
          <ConversationPanel
            currentUserId={currentUserId}
            conversation={activeConversation}
            presenceReady={presence.ready}
            otherOnline={presence.onlineUserIds.has(activeConversation.other.id)}
          />
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
        {realtimeEnabled
          ? "Tin mới được cập nhật tức thời, kèm đồng bộ dự phòng."
          : "Hộp thư tự cập nhật định kỳ khi bạn đang mở trang."}
      </p>
    </div>
  );
}
