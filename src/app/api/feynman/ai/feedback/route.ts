import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Học viên bấm "Chấm sai" trên một bản chấm AI.
 *
 * Việc này KHÔNG gọi API, KHÔNG tốn lượt, và KHÔNG sửa kết quả. Nó chỉ đẩy một
 * dòng vào hàng đợi cảnh báo để người thật xem lại. AI tự sửa theo lời phàn nàn
 * là con đường ngắn nhất tới chỗ ai kêu to thì được điểm cao.
 *
 * Bản ghi cố tình KHÔNG lưu `userId`: quản trị viên cần biết BẢN CHẤM nào bị
 * báo, còn ai báo thì tra ngược từ evaluationId khi thật sự cần.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Các loại báo cáo học viên chọn được trên giao diện. */
const KINDS = new Set([
  "SAI_KET_LUAN",
  "SAI_TRICH_DAN",
  "KHONG_HIEU",
  "LOI_KHAC",
]);

const MAX_NOTE_CHARS = 1_000;

/** Một bản chấm chỉ nhận một báo cáo đang mở — bấm mười lần không thành mười dòng. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, code: "UNAUTHENTICATED" }, { status: 401 });
  }

  let body: { evaluationId?: unknown; kind?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });
  }

  const evaluationId = String(body.evaluationId ?? "").trim();
  const kind = String(body.kind ?? "");
  const note = String(body.note ?? "").trim().slice(0, MAX_NOTE_CHARS);

  if (!evaluationId || evaluationId.length > 64 || !KINDS.has(kind)) {
    return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });
  }

  // Phải là bản chấm của chính người đang bấm. Thiếu bước này thì bất kỳ ai
  // cũng dội được cảnh báo giả vào hàng đợi của quản trị viên.
  const evaluation = await db.feynmanAiEvaluation.findUnique({
    where: { id: evaluationId },
    select: {
      id: true,
      userId: true,
      review: { select: { attemptId: true, attempt: { select: { exerciseId: true } } } },
    },
  });
  if (!evaluation || evaluation.userId !== user.id) {
    return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 404 });
  }

  const existing = await db.feynmanAiAlert.findFirst({
    where: { evaluationId, source: "STUDENT", status: "OPEN" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { ok: true, alreadyReported: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  await db.feynmanAiAlert.create({
    data: {
      source: "STUDENT",
      // Học viên báo thì luôn MEDIUM: đủ để lọt vào danh sách cần xem, không đủ
      // để đẩy lên trên những cảnh báo do chính hệ thống phát hiện.
      severity: "MEDIUM",
      status: "OPEN",
      kind,
      evaluationId,
      attemptId: evaluation.review.attemptId,
      exerciseId: evaluation.review.attempt.exerciseId,
      detail: note || null,
    },
  });

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
