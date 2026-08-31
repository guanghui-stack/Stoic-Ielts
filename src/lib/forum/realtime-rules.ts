export const FORUM_POST_CREATED_EVENT = "post.created";
export const FORUM_COMMENT_CREATED_EVENT = "comment.created";
export const FORUM_REALTIME_PUBLISH_TIMEOUT_MS = 2_500;
export const FORUM_REALTIME_REFRESH_DEBOUNCE_MS = 250;
export const FORUM_REALTIME_FALLBACK_REFRESH_MS = 60_000;
export const FORUM_REALTIME_SEEN_EVENT_LIMIT = 300;
export const FORUM_REALTIME_MAX_LEVEL = 9;

const SAFE_ID = /^[A-Za-z0-9_-]{1,191}$/;

export type ForumRealtimeEventName =
  | typeof FORUM_POST_CREATED_EVENT
  | typeof FORUM_COMMENT_CREATED_EVENT;

export type ForumPostCreatedPayload = {
  postId: string;
};

export type ForumCommentCreatedPayload = {
  postId: string;
  commentId: string;
};

export type ForumRealtimePayload =
  | ForumPostCreatedPayload
  | ForumCommentCreatedPayload;

function assertSafeId(value: string, label: string): void {
  if (!SAFE_ID.test(value)) throw new Error(`${label} không hợp lệ.`);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => key in value);
}

/**
 * Mỗi bậc có một channel riêng. Không phát chung rồi lọc ở trình
 * duyệt, vì như thế học viên bậc thấp vẫn nhận metadata bài bậc cao.
 */
export function forumLevelChannel(level: number): string {
  if (!Number.isInteger(level) || level < 1 || level > FORUM_REALTIME_MAX_LEVEL) {
    throw new Error("Bậc nội dung không hợp lệ.");
  }
  return `forum:level:${level}`;
}

/**
 * Danh sách channel được tạo từ bậc do máy chủ tra trong database.
 * Giá trị lạ được thu hẹp an toàn, không bao giờ mở thêm quyền.
 */
export function forumChannelsForViewerLevel(viewerLevel: number): string[] {
  if (!Number.isFinite(viewerLevel) || viewerLevel < 1) return [];
  const highest = Math.min(
    Math.floor(viewerLevel),
    FORUM_REALTIME_MAX_LEVEL,
  );
  return Array.from({ length: highest }, (_, index) =>
    forumLevelChannel(index + 1),
  );
}

/** Capability này được ghép vào token chung; client chỉ được subscribe. */
export function forumSubscribeCapabilityForLevel(
  viewerLevel: number,
): Record<string, Array<"subscribe">> {
  const capability: Record<string, Array<"subscribe">> = {};
  for (const channel of forumChannelsForViewerLevel(viewerLevel)) {
    capability[channel] = ["subscribe"];
  }
  return capability;
}

export function buildForumPostCreatedPayload(
  postId: string,
): ForumPostCreatedPayload {
  assertSafeId(postId, "Mã bài viết");
  return { postId };
}

export function buildForumCommentCreatedPayload(
  postId: string,
  commentId: string,
): ForumCommentCreatedPayload {
  assertSafeId(postId, "Mã bài viết");
  assertSafeId(commentId, "Mã bình luận");
  return { postId, commentId };
}

export function isForumPostCreatedPayload(
  value: unknown,
): value is ForumPostCreatedPayload {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, ["postId"])) return false;
  return typeof value.postId === "string" && SAFE_ID.test(value.postId);
}

export function isForumCommentCreatedPayload(
  value: unknown,
): value is ForumCommentCreatedPayload {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, ["postId", "commentId"])) {
    return false;
  }
  return (
    typeof value.postId === "string" &&
    SAFE_ID.test(value.postId) &&
    typeof value.commentId === "string" &&
    SAFE_ID.test(value.commentId)
  );
}

export function isForumRealtimePayload(
  eventName: string,
  value: unknown,
): value is ForumRealtimePayload {
  if (eventName === FORUM_POST_CREATED_EVENT) {
    return isForumPostCreatedPayload(value);
  }
  if (eventName === FORUM_COMMENT_CREATED_EVENT) {
    return isForumCommentCreatedPayload(value);
  }
  return false;
}

function forumRealtimeEventKey(
  eventName: string,
  value: ForumRealtimePayload,
): string {
  return eventName === FORUM_COMMENT_CREATED_EVENT && "commentId" in value
    ? `${eventName}:${value.commentId}`
    : `${eventName}:${value.postId}`;
}

/**
 * Ably có thể phát lại sự kiện sau khi phục hồi kết nối. Chỉ nhận
 * payload đúng dạng và giữ một cửa sổ hữu hạn để không tăng bộ nhớ mãi.
 */
export function rememberForumRealtimeEvent(
  seen: Set<string>,
  eventName: string,
  value: unknown,
  limit = FORUM_REALTIME_SEEN_EVENT_LIMIT,
): boolean {
  if (!isForumRealtimePayload(eventName, value)) return false;
  const key = forumRealtimeEventKey(eventName, value);
  if (seen.has(key)) return false;
  seen.add(key);

  while (seen.size > Math.max(1, limit)) {
    const oldest = seen.values().next().value;
    if (typeof oldest !== "string") break;
    seen.delete(oldest);
  }
  return true;
}

/**
 * Realtime chỉ là đường báo tin. Timeout hoặc lỗi Ably không được
 * biến bài/bình luận đã commit MySQL thành thao tác thất bại.
 */
export async function settlesForumPublishWithin(
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
