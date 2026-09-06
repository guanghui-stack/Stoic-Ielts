import "server-only";
import { Rest, type TokenRequest } from "ably";
import {
  ARENA_INVITE_EVENT,
  arenaUserChannel,
  buildArenaInviteCreatedPayload,
} from "@/lib/arena/realtime-rules";
import {
  CHAT_REALTIME_EVENT,
  CHAT_REALTIME_PUBLISH_TIMEOUT_MS,
  buildChatMessageCreatedPayload,
  chatUserChannel,
  settlesWithin,
  studentRealtimeTokenParams,
} from "@/lib/chat/realtime-rules";

let restClient: Rest | null = null;
let restClientKey: string | null = null;

function ablyConfig(): { enabled: boolean; key: string } {
  const key = process.env.ABLY_API_KEY?.trim() ?? "";
  const enabled =
    process.env.ENABLE_ABLY_REALTIME === "true" ||
    // Tên cũ được giữ trong một chu kỳ triển khai để không làm chat tắt đột ngột.
    process.env.ENABLE_ABLY_CHAT === "true";
  return {
    enabled: enabled && Boolean(key),
    key,
  };
}

function ablyRest(): Rest | null {
  const config = ablyConfig();
  if (!config.enabled) return null;

  if (!restClient || restClientKey !== config.key) {
    restClient = new Rest({ key: config.key });
    restClientKey = config.key;
  }
  return restClient;
}

export function isAblyChatConfigured(): boolean {
  return ablyConfig().enabled;
}

export const isAblyRealtimeConfigured = isAblyChatConfigured;

export async function createStudentRealtimeTokenRequest(
  userId: string,
  viewerLevel: number,
): Promise<TokenRequest | null> {
  const client = ablyRest();
  if (!client) return null;
  return client.auth.createTokenRequest(
    studentRealtimeTokenParams(userId, viewerLevel),
  );
}

export async function publishChatMessageCreated(input: {
  recipientUserId: string;
  conversationId: string;
  messageId: string;
}): Promise<boolean> {
  if (!isAblyChatConfigured()) return false;

  const published = await settlesWithin(
    () => {
      const client = ablyRest();
      if (!client) throw new Error("Ably chưa được cấu hình.");
      return client.channels
        .get(chatUserChannel(input.recipientUserId))
        .publish(
          CHAT_REALTIME_EVENT,
          buildChatMessageCreatedPayload(input.conversationId, input.messageId),
        );
    },
    CHAT_REALTIME_PUBLISH_TIMEOUT_MS,
  );

  if (!published) {
    // Không log payload hay lỗi gốc: chúng có thể mang chi tiết từ nhà cung cấp.
    console.error("[wobridges] Khong phat duoc thong bao realtime chat.");
  }
  return published;
}

/**
 * Báo cho người bị thách rằng có chiến thư mới.
 *
 * Đi trên đúng kênh riêng của học viên mà chat đang dùng — xem ghi chú trong
 * `arena/realtime-rules.ts`. Thất bại thì im lặng: chiến thư đã nằm trong
 * database rồi, nhịp hỏi định kỳ của thanh lối tắt vẫn bắt được, chỉ là chậm
 * hơn. Không được để lỗi phát tin làm hỏng lượt thách đấu.
 */
export async function publishArenaInviteCreated(input: {
  recipientUserId: string;
  inviteId: string;
}): Promise<boolean> {
  if (!isAblyChatConfigured()) return false;

  const published = await settlesWithin(
    () => {
      const client = ablyRest();
      if (!client) throw new Error("Ably chưa được cấu hình.");
      return client.channels
        .get(arenaUserChannel(input.recipientUserId))
        .publish(
          ARENA_INVITE_EVENT,
          buildArenaInviteCreatedPayload(input.inviteId),
        );
    },
    CHAT_REALTIME_PUBLISH_TIMEOUT_MS,
  );

  if (!published) {
    console.error("[wobridges] Khong phat duoc thong bao chien thu.");
  }
  return published;
}
