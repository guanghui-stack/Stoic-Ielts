import type { TokenParams } from "ably";
import { forumSubscribeCapabilityForLevel } from "../forum/realtime-rules.ts";

export const CHAT_REALTIME_EVENT = "message.created";
export const CHAT_REALTIME_TOKEN_TTL_MS = 10 * 60_000;
export const CHAT_REALTIME_PUBLISH_TIMEOUT_MS = 2_500;
export const CHAT_REALTIME_REFRESH_DEBOUNCE_MS = 200;
export const CHAT_REALTIME_FALLBACK_REFRESH_MS = 60_000;
export const CHAT_POLLING_REFRESH_MS = 8_000;
export const CHAT_REALTIME_SEEN_MESSAGE_LIMIT = 200;
export const STUDENT_PRESENCE_CHANNEL = "presence:students";

const SAFE_ID = /^[A-Za-z0-9_-]{1,191}$/;

export type ChatRealtimeAccount = {
  role: string;
  active: boolean;
  isBot: boolean;
};

export type ChatMessageCreatedPayload = {
  conversationId: string;
  messageId: string;
};

function assertSafeId(value: string, label: string): void {
  if (!SAFE_ID.test(value)) throw new Error(`${label} không hợp lệ.`);
}

export function chatUserChannel(userId: string): string {
  assertSafeId(userId, "Mã học viên");
  return `chat:user:${userId}`;
}

export function chatTokenParams(userId: string): TokenParams {
  return {
    clientId: userId,
    ttl: CHAT_REALTIME_TOKEN_TTL_MS,
    capability: {
      [chatUserChannel(userId)]: ["subscribe"],
    },
  };
}

/**
 * Token dùng chung cho một học viên trên toàn website.
 *
 * `viewerLevel` phải do máy chủ đọc từ MySQL. Trình duyệt không được chọn bậc
 * vì capability là hàng rào cuối ngăn sự kiện diễn đàn bậc cao lọt xuống máy
 * học viên bậc thấp.
 */
export function studentRealtimeTokenParams(
  userId: string,
  viewerLevel: number,
): TokenParams {
  assertSafeId(userId, "Mã học viên");
  return {
    clientId: userId,
    ttl: CHAT_REALTIME_TOKEN_TTL_MS,
    capability: {
      [chatUserChannel(userId)]: ["subscribe"],
      [STUDENT_PRESENCE_CHANNEL]: ["presence", "subscribe"],
      ...forumSubscribeCapabilityForLevel(viewerLevel),
    },
  };
}

export function canUseChatRealtime(account: ChatRealtimeAccount | null): boolean {
  return Boolean(
    account &&
      account.active &&
      !account.isBot &&
      account.role === "STUDENT",
  );
}

export function chatRefreshInterval(
  realtimeEnabled: boolean,
  realtimeConnected: boolean,
): number {
  return realtimeEnabled && realtimeConnected
    ? CHAT_REALTIME_FALLBACK_REFRESH_MS
    : CHAT_POLLING_REFRESH_MS;
}

export function buildChatMessageCreatedPayload(
  conversationId: string,
  messageId: string,
): ChatMessageCreatedPayload {
  assertSafeId(conversationId, "Mã cuộc trò chuyện");
  assertSafeId(messageId, "Mã tin nhắn");
  return { conversationId, messageId };
}

export function isChatMessageCreatedPayload(
  value: unknown,
): value is ChatMessageCreatedPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.conversationId === "string" &&
    SAFE_ID.test(candidate.conversationId) &&
    typeof candidate.messageId === "string" &&
    SAFE_ID.test(candidate.messageId)
  );
}

/**
 * Một sự kiện có thể được Ably phát lại sau khi nối mạng. Ghi nhớ một cửa sổ
 * nhỏ giúp tránh refresh lặp nhưng không giữ bộ nhớ tăng mãi khi tab mở lâu.
 */
export function rememberRealtimeMessage(
  seen: Set<string>,
  messageId: string,
  limit = CHAT_REALTIME_SEEN_MESSAGE_LIMIT,
): boolean {
  if (seen.has(messageId)) return false;
  seen.add(messageId);

  while (seen.size > Math.max(1, limit)) {
    const oldest = seen.values().next().value;
    if (typeof oldest !== "string") break;
    seen.delete(oldest);
  }
  return true;
}

/**
 * Realtime chỉ là đường báo tin. Một nhà cung cấp chậm hoặc lỗi không được giữ
 * request gửi chat vô hạn, cũng không được biến tin đã commit thành "gửi lỗi".
 */
export async function settlesWithin(
  task: Promise<unknown> | (() => Promise<unknown>),
  timeoutMs: number,
): Promise<boolean> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return false;

  let pending: Promise<unknown>;
  try {
    pending = typeof task === "function" ? task() : task;
  } catch {
    return false;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  const settled = pending.then(
    () => true as const,
    () => false as const,
  );

  const result = await Promise.race([settled, timeout]);
  if (timer) clearTimeout(timer);
  return result;
}
