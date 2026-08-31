import {
  createStudentRealtimeTokenRequest,
  isAblyRealtimeConfigured,
} from "@/lib/chat/ably-server";
import { canUseChatRealtime } from "@/lib/chat/realtime-rules";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
} as const;

function errorResponse(error: string, status: number): Response {
  return Response.json({ error }, { status, headers: RESPONSE_HEADERS });
}

export async function POST(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Bạn cần đăng nhập lại.", 401);
  if (!canUseChatRealtime(user)) {
    return errorResponse("Tài khoản này không được dùng realtime.", 403);
  }
  if (!isAblyRealtimeConfigured()) {
    return errorResponse("Realtime chưa được cấu hình.", 503);
  }

  try {
    // Bậc được đọc lại từ MySQL ở MỖI lần cấp token. Không nhận level từ
    // request, nếu không học viên chỉ cần sửa body là subscribe được bậc cao.
    const rank = await db.userRank.findUnique({
      where: { userId: user.id },
      select: { currentLevel: true },
    });
    const tokenRequest = await createStudentRealtimeTokenRequest(
      user.id,
      rank?.currentLevel ?? 1,
    );
    if (!tokenRequest) return errorResponse("Realtime chưa sẵn sàng.", 503);
    return Response.json(tokenRequest, { headers: RESPONSE_HEADERS });
  } catch {
    // Không trả chi tiết SDK ra ngoài vì lỗi xác thực có thể chứa tên key.
    console.error("[wobridges] Khong cap duoc token realtime.");
    return errorResponse("Không kết nối được realtime.", 503);
  }
}
