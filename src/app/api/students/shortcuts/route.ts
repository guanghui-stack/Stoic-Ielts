import { getCurrentUser } from "@/lib/session";
import { canUseChatRealtime } from "@/lib/chat/realtime-rules";
import { hasUnreadMessages } from "@/lib/chat/unread";
import { hasPendingInvite } from "@/lib/arena/duel-service";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

/**
 * Hai tín hiệu cho thanh lối tắt: tin nhắn chưa đọc và chiến thư đang chờ.
 *
 * Gộp vào MỘT lần gọi chứ không tách hai route: thanh lối tắt hiện trên gần như
 * mọi trang, tách ra là nhân đôi số lượt gọi cho cùng một nhịp.
 *
 * Cả hai đều chỉ trả có/không. Nội dung tin nhắn và nội dung chiến thư nằm ở
 * trang của chúng.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401, headers });
  if (!canUseChatRealtime(user)) return new Response(null, { status: 403, headers });

  const [unread, arenaInvite] = await Promise.all([
    hasUnreadMessages(user.id),
    hasPendingInvite(user.id).catch(() => false),
  ]);
  return Response.json({ hasUnread: unread, hasArenaInvite: arenaInvite }, { headers });
}
