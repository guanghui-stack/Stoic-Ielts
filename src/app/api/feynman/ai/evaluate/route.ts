import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { gradeFeynmanReview } from "@/lib/feynman-ai/service";
import { readFeynmanAiConfig } from "@/lib/feynman-ai/config";

/**
 * Nhờ AI chấm phần tự giảng lại của một phiên Feynman.
 *
 * Route này KHÔNG chứa luật nào. Mọi hàng rào (quyền, ví lượt, nhịp ngày, khóa
 * Nguyệt Thí) nằm trong `gradeFeynmanReview()`, vì cùng bộ luật đó còn phải
 * dùng lại ở chỗ khác — chép luật vào route là cách chắc chắn để hai chỗ nói
 * khác nhau sau vài tháng.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mã lỗi mà học viên tự xử lý được → 4xx. Còn lại là lỗi của chúng ta → 5xx. */
const CLIENT_ERRORS = new Set([
  "FEATURE_DISABLED",
  "NO_ACCESS",
  "COMPETITION_LOCKED",
  "DAILY_LIMIT_REACHED",
  "QUOTA_EXHAUSTED",
  "REVIEW_NOT_COMPLETED",
  "ALREADY_GRADED",
  "INVALID_REQUEST",
]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, code: "UNAUTHENTICATED" }, { status: 401 });
  }

  // Cờ tắt được kiểm ở cả hai nơi. Ở đây để trả lời nhanh mà không đụng
  // database; trong service để không đường nào vòng qua được.
  if (!readFeynmanAiConfig().enabled) {
    return NextResponse.json(
      { ok: false, code: "FEATURE_DISABLED" },
      { status: 503 }
    );
  }

  let body: { reviewId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });
  }

  const reviewId = String(body.reviewId ?? "").trim();
  if (!reviewId || reviewId.length > 64) {
    return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });
  }

  const result = await gradeFeynmanReview({ userId: user.id, reviewId });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      {
        status: CLIENT_ERRORS.has(result.code) ? 409 : 502,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
