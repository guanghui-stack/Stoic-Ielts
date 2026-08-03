import { NextResponse } from "next/server";
import { authenticateExamSession } from "@/lib/integrity/auth";
import { resumeSession } from "@/lib/integrity/session-service";
import { verifySebAttestation, ATTESTATION_MESSAGES } from "@/lib/integrity/attestation";
import { loadSebAllowlist } from "@/lib/integrity/auth";

/**
 * Nối lại phiên thi sau khi rớt mạng.
 *
 * Ba điều kiện đều bắt buộc: còn trong 15 phút, đúng thiết bị cũ, và SEB vẫn
 * hợp lệ. Thiếu một là từ chối — nếu không, "rớt mạng" trở thành đường vòng để
 * mở đề ở máy khác.
 *
 * Đồng hồ KHÔNG được cộng bù. Mất mạng không bị tính là gian lận, nhưng cũng
 * không được thưởng thêm giờ, vì nếu có thì rút dây mạng sẽ thành chiến thuật
 * kéo dài thời gian làm bài.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REJECT_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Không tìm thấy phiên thi.",
  NOT_RESUMABLE: "Phiên thi này không ở trạng thái chờ nối lại.",
  EXPIRED: "Đã quá 15 phút kể từ lúc mất kết nối. Bài của bạn đã được nộp tự động.",
  DIFFERENT_DEVICE: "Chỉ thiết bị đã bắt đầu bài thi mới được nối lại.",
  SEB_INVALID: "Safe Exam Browser không còn hợp lệ. Hãy mở lại bằng đúng file cấu hình.",
};

export async function POST(request: Request) {
  const auth = await authenticateExamSession(request);
  if (!auth) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: {
    installToken?: string;
    seb?: { version?: string; configKeyHash?: string; browserExamKeyHash?: string; pageUrl?: string };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const allowlist = await loadSebAllowlist();
  const attestation = verifySebAttestation({
    attestation: body.seb,
    allowlist,
    expectedUrl: body.seb?.pageUrl ?? "",
  });

  if (!attestation.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: "SEB_INVALID",
        message: REJECT_MESSAGES.SEB_INVALID,
        details: attestation.failures.map((f) => ATTESTATION_MESSAGES[f]),
      },
      { status: 403 }
    );
  }

  const result = await resumeSession({
    sessionId: auth.sessionId,
    installToken: String(body.installToken ?? ""),
    userAgent: request.headers.get("user-agent") ?? "",
    sebConfigKeyHash: body.seb?.configKeyHash ?? "",
    sebAttestationValid: true,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason, message: REJECT_MESSAGES[result.reason] },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, remainingSeconds: result.remainingSeconds });
}
