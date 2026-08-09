import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { askAboutEvaluation } from "@/lib/feynman-ai/service";
import { readFeynmanAiConfig } from "@/lib/feynman-ai/config";
import { QUESTION_MAX_CHARS } from "@/lib/feynman-ai/rules";

/**
 * Hỏi AI một câu về bài đọc và phần chữa bài vừa rồi.
 *
 * `requestKey` do trình duyệt sinh và là @unique ở database: bấm gửi hai lần
 * cho cùng một câu chỉ tốn đúng một lượt. Không có nó thì mỗi lần mạng chập
 * chờn người dùng bấm lại là mất thêm một lượt đã trả tiền.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLIENT_ERRORS = new Set([
  "FEATURE_DISABLED",
  "NO_ACCESS",
  "COMPETITION_LOCKED",
  "CHAT_LIMIT_REACHED",
  "QUESTION_TOO_SHORT",
  "QUESTION_TOO_LONG",
  "EVALUATION_NOT_READY",
  "OUT_OF_SCOPE",
  "INVALID_REQUEST",
]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, code: "UNAUTHENTICATED" }, { status: 401 });
  }

  if (!readFeynmanAiConfig().enabled) {
    return NextResponse.json(
      { ok: false, code: "FEATURE_DISABLED" },
      { status: 503 }
    );
  }

  let body: { evaluationId?: unknown; question?: unknown; requestKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });
  }

  const evaluationId = String(body.evaluationId ?? "").trim();
  const question = String(body.question ?? "");
  const requestKey = String(body.requestKey ?? "").trim();

  if (!evaluationId || evaluationId.length > 64) {
    return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });
  }
  // Chặn sớm ở đây để một chuỗi vài megabyte không phải đi hết vào tận service
  // rồi mới bị từ chối.
  if (question.length > QUESTION_MAX_CHARS * 2) {
    return NextResponse.json({ ok: false, code: "QUESTION_TOO_LONG" }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(requestKey)) {
    return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });
  }

  const result = await askAboutEvaluation({
    userId: user.id,
    evaluationId,
    question,
    requestKey,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message, rejected: result.rejected },
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
