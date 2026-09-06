import { chatUserChannel } from "../chat/realtime-rules.ts";

/**
 * Báo chiến thư ngay trên thanh lối tắt — LUẬT THUẦN, không chạm mạng.
 *
 * Vì sao phải là realtime chứ không phải nhịp hỏi định kỳ: chiến thư sống đúng
 * `INVITE_TTL_SECONDS` = 90 giây. Thanh lối tắt hỏi lại mỗi 60–120 giây, nên
 * nếu chỉ dựa vào nhịp đó thì phần lớn chiến thư sẽ hết hạn TRƯỚC khi chấm báo
 * kịp sáng — người bị thách sẽ thấy một cái chấm trỏ vào lá thư đã chết.
 *
 * Dùng lại ĐÚNG kênh riêng của học viên mà chat đang dùng (`chat:user:<id>`),
 * chỉ khác tên sự kiện. Kênh đó đã nằm sẵn trong quyền của token học viên và
 * đã được thanh lối tắt lắng nghe, nên không phải mở kênh mới, không phải nới
 * quyền token, và không tốn thêm một kết nối nào.
 */
export const ARENA_INVITE_EVENT = "arena.invite.created";

export type ArenaInviteCreatedPayload = { inviteId: string };

/** Kênh riêng của học viên. Cùng kênh với chat, xem ghi chú ở trên. */
export const arenaUserChannel = chatUserChannel;

export function buildArenaInviteCreatedPayload(
  inviteId: string,
): ArenaInviteCreatedPayload {
  return { inviteId };
}

export function isArenaInviteCreatedPayload(
  value: unknown,
): value is ArenaInviteCreatedPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ArenaInviteCreatedPayload).inviteId === "string"
  );
}
