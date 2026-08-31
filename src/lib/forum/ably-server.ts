import "server-only";
import { Rest } from "ably";
import {
  FORUM_COMMENT_CREATED_EVENT,
  FORUM_POST_CREATED_EVENT,
  FORUM_REALTIME_PUBLISH_TIMEOUT_MS,
  buildForumCommentCreatedPayload,
  buildForumPostCreatedPayload,
  forumLevelChannel,
  settlesForumPublishWithin,
  type ForumRealtimeEventName,
  type ForumRealtimePayload,
} from "@/lib/forum/realtime-rules";

let restClient: Rest | null = null;
let restClientKey: string | null = null;

function ablyForumConfig(): { enabled: boolean; key: string } {
  const key = process.env.ABLY_API_KEY?.trim() ?? "";
  const enabled =
    process.env.ENABLE_ABLY_REALTIME === "true" ||
    // Alias tạm thời để bản chat đã triển khai không bị tắt đột ngột.
    process.env.ENABLE_ABLY_CHAT === "true";
  return { enabled: enabled && Boolean(key), key };
}

function ablyRest(): Rest | null {
  const config = ablyForumConfig();
  if (!config.enabled) return null;

  if (!restClient || restClientKey !== config.key) {
    restClient = new Rest({ key: config.key });
    restClientKey = config.key;
  }
  return restClient;
}

export function isAblyForumConfigured(): boolean {
  return ablyForumConfig().enabled;
}

async function publishForumEvent(input: {
  level: number;
  eventName: ForumRealtimeEventName;
  payload: ForumRealtimePayload;
}): Promise<boolean> {
  if (!isAblyForumConfigured()) return false;

  const published = await settlesForumPublishWithin(
    () => {
      const client = ablyRest();
      if (!client) throw new Error("Ably chưa được cấu hình.");
      return client.channels
        .get(forumLevelChannel(input.level))
        .publish(input.eventName, input.payload);
    },
    FORUM_REALTIME_PUBLISH_TIMEOUT_MS,
  );

  if (!published) {
    // Không log payload hay lỗi SDK: chúng có thể mang chi tiết nhà cung cấp.
    console.error("[wobridges] Khong phat duoc thong bao realtime dien dan.");
  }
  return published;
}

export function publishForumPostCreated(input: {
  level: number;
  postId: string;
}): Promise<boolean> {
  return publishForumEvent({
    level: input.level,
    eventName: FORUM_POST_CREATED_EVENT,
    payload: buildForumPostCreatedPayload(input.postId),
  });
}

export function publishForumCommentCreated(input: {
  level: number;
  postId: string;
  commentId: string;
}): Promise<boolean> {
  return publishForumEvent({
    level: input.level,
    eventName: FORUM_COMMENT_CREATED_EVENT,
    payload: buildForumCommentCreatedPayload(input.postId, input.commentId),
  });
}
