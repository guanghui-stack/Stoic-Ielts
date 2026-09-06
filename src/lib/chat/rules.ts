import { FRIENDSHIP_ACCEPTED } from "../friends/rules.ts";

export const MESSAGE_MAX = 2_000;
export const MESSAGE_MIN_INTERVAL_MS = 700;

/**
 * Số tin một người được gửi cho NGƯỜI CHƯA KẾT BẠN.
 *
 * Trước đây phải kết bạn xong mới nhắn được, mà muốn kết bạn thì thường phải
 * nói được một câu trước — vòng luẩn quẩn đó khiến hai người lạ không có đường
 * bắt đầu. Nay mở đúng ba tin: đủ để chào và nói mình là ai, không đủ để dội
 * quảng cáo vào hộp thư người khác.
 */
export const STRANGER_MESSAGE_LIMIT = 3;

export type ChatBodyResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function conversationPermissions(
  conversation: { participantAId: string; participantBId: string },
  viewerId: string,
): { canRead: boolean } {
  const canRead =
    conversation.participantAId === viewerId ||
    conversation.participantBId === viewerId;
  return { canRead };
}

/** Vì sao không gửi được — để giao diện nói đúng câu chứ không nói chung chung. */
export type SendBlockReason = "NOT_PARTICIPANT" | "STRANGER_LIMIT";

export type SendGate = {
  canSend: boolean;
  /** Đang bị đếm hạn mức người lạ hay không. */
  limited: boolean;
  /** Còn bao nhiêu tin trong hạn mức. Không bị hạn thì bằng `Infinity`. */
  remaining: number;
  reason: SendBlockReason | null;
};

/**
 * Được gửi tin hay không, và còn bao nhiêu lượt.
 *
 * Hạn mức được GỠ khi người kia đã trả lời, chứ không chỉ khi đã kết bạn. Một
 * người đã chịu nhắn lại là đã đồng ý nói chuyện; bắt họ phải bấm thêm nút kết
 * bạn mới được nói tiếp là chặn đúng cuộc trò chuyện đang diễn ra tử tế.
 *
 * Đếm theo tin của CHÍNH người gửi trong cuộc trò chuyện đó, nên hai người lạ
 * mỗi bên có hạn mức riêng và không ai tiêu mất phần của ai.
 */
export function conversationSendGate(input: {
  isParticipant: boolean;
  friendshipStatus: string | null;
  /** Số tin người này đã gửi trong cuộc trò chuyện. */
  sentByViewer: number;
  /** Người kia đã gửi ít nhất một tin chưa. */
  otherHasReplied: boolean;
}): SendGate {
  if (!input.isParticipant) {
    return { canSend: false, limited: false, remaining: 0, reason: "NOT_PARTICIPANT" };
  }

  const unlimited =
    input.friendshipStatus === FRIENDSHIP_ACCEPTED || input.otherHasReplied;
  if (unlimited) {
    return { canSend: true, limited: false, remaining: Infinity, reason: null };
  }

  const remaining = Math.max(0, STRANGER_MESSAGE_LIMIT - input.sentByViewer);
  return {
    canSend: remaining > 0,
    limited: true,
    remaining,
    reason: remaining > 0 ? null : "STRANGER_LIMIT",
  };
}

export function orderedParticipants(firstId: string, secondId: string): [string, string] {
  return firstId < secondId ? [firstId, secondId] : [secondId, firstId];
}

export function validateMessageBody(raw: string): ChatBodyResult {
  const body = raw.replace(/\r\n/g, "\n").trim();
  if (!body) return { ok: false, error: "Tin nhắn không được để trống." };
  if (body.length > MESSAGE_MAX) {
    return { ok: false, error: `Tin nhắn tối đa ${MESSAGE_MAX.toLocaleString("vi-VN")} ký tự.` };
  }
  return { ok: true, value: body };
}
