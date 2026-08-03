import { NextResponse } from "next/server";
import { authenticateExamSession } from "@/lib/integrity/auth";
import { recordHeartbeat, markDisconnected } from "@/lib/integrity/session-service";

/**
 * Nhịp tim của phòng thi — client gọi mỗi 5 giây.
 *
 * Đây cũng là kênh máy chủ ra lệnh cho client: cảnh báo strike, hoặc buộc nộp
 * bài. Client KHÔNG tự quyết định gì; nó chỉ hiển thị con số máy chủ trả về, kể
 * cả đồng hồ đếm ngược — nếu tin đồng hồ máy tính của thí sinh thì chỉ cần chỉnh
 * giờ hệ thống là có thêm thời gian làm bài.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await authenticateExamSession(request);
  if (!auth) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { offline?: boolean } = {};
  try {
    body = (await request.json()) as { offline?: boolean };
  } catch {
    // Nhịp tim không kèm dữ liệu cũng hợp lệ.
  }

  // Client tự báo sắp mất mạng (sự kiện offline của trình duyệt). Ghi nhận để
  // mở cửa sổ nối lại 15 phút — KHÔNG tính là gian lận.
  if (body.offline) {
    const result = await markDisconnected({ sessionId: auth.sessionId });
    return NextResponse.json({
      status: "DISCONNECTED",
      resumeUntil: result?.resumeUntil ?? null,
    });
  }

  const beat = await recordHeartbeat({ sessionId: auth.sessionId });
  if (!beat) return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });

  return NextResponse.json(beat);
}
