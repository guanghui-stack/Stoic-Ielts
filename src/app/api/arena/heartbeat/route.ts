import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { heartbeat, presentPlayers } from "@/lib/arena/arena-service.ts";
import { activeDuelFor, pendingInvitesFor } from "@/lib/arena/duel-service.ts";
import { PRESENCE_HEARTBEAT_SECONDS } from "@/lib/arena/rating.ts";

/**
 * Nhịp tim của đấu trường, và cũng là chỗ trả về danh sách người đang có mặt.
 *
 * GỘP HAI VIỆC VÀO MỘT LẦN GỌI là có chủ ý: màn đấu trường cần cả hai với cùng
 * một nhịp, nên tách ra thành hai đường sẽ nhân đôi số lượt gọi mà không thêm
 * thông tin nào.
 *
 * Không dùng SSE. Đặc tả mục 04 đã ghi rõ logic dò mất kết nối rất khó tin cậy
 * với SSE trên Hostinger, và cả dự án này chưa có SSE ở đâu. Một mốc thời gian
 * thì luôn đọc được, kể cả sau khi máy chủ khởi động lại.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let status: "IDLE" | "QUEUED" | "IN_DUEL" = "IDLE";
  try {
    const body = (await request.json()) as { status?: string };
    if (body.status === "QUEUED" || body.status === "IN_DUEL") status = body.status;
  } catch {
    // Thân rỗng là hợp lệ: mặc định IDLE.
  }

  const accepted = await heartbeat({ userId: user.id, status });

  // Một nhịp của bot, đi ké nhịp tim của người thật.
  //
  // Dự án không có bộ định giờ nào và gói Hostinger không cho chạy tiến trình
  // nền. Bot chỉ cần hoạt động khi có người ở sân, mà lúc đó thì đã có nhịp tim
  // rồi. Bọc try để một lỗi ở tầng bot không bao giờ làm hỏng nhịp tim của
  // người thật.
  try {
    const { tickBots } = await import("@/lib/arena/bot-loop");
    await tickBots();
  } catch (err) {
    console.error("[wobridges] Nhip bot loi:", err);
  }

  const [present, invites, active] = await Promise.all([
    presentPlayers(),
    pendingInvitesFor(user.id),
    activeDuelFor(user.id),
  ]);

  return NextResponse.json({
    ok: true,
    // `false` nghĩa là người này đang Quy Điền, nên màn hình biết mà hiện đúng
    // trạng thái thay vì im lặng không cập nhật gì.
    present: accepted,
    intervalSeconds: PRESENCE_HEARTBEAT_SECONDS,
    invites,
    activeDuel: active
      ? {
          duelId: active.duelId,
          attemptId: active.attemptId,
          opponentName: active.opponentName,
          stake: active.stake,
          submitted: active.submitted,
        }
      : null,
    players: present
      // Không lộ userId của người khác ra ngoài nhiều hơn mức cần để thách đấu.
      .map((p) => ({
        userId: p.userId,
        name: p.name,
        chienLuc: p.chienLuc,
        status: p.status,
      })),
  });
}
