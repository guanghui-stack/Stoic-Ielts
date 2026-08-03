import "server-only";
import { db } from "@/lib/db";
import { finalizeReadingAttempt, type SubmissionReason } from "@/lib/attempts/finalize";

/**
 * Buộc nộp bài từ phía máy chủ.
 *
 * ĐIỀU QUAN TRỌNG NHẤT: máy chủ là bên quyết định, không phải trình duyệt. Client
 * có thể hiển thị cảnh báo và chủ động nộp, nhưng tắt JavaScript, đóng máy hay
 * rút mạng đều KHÔNG vô hiệu hóa được quyết định này — vì nó chạy ở đây, dựa
 * trên bản trả lời đã tự lưu gần nhất.
 *
 * Bài bị buộc nộp luôn kết thúc ở trạng thái REVIEW, KHÔNG BAO GIỜ ở
 * DISQUALIFIED. Hệ thống chỉ nghi ngờ; việc loại một thí sinh cần hai quản trị
 * viên độc lập xem bằng chứng rồi mới quyết.
 */
export async function forceSubmitExamSession(
  sessionId: string,
  reason: Extract<SubmissionReason, "INTEGRITY_AUTO" | "PROCTOR" | "DISCONNECT_EXPIRED" | "TIMEOUT">,
  options?: { detail?: string; actorAdminId?: string }
): Promise<{ done: boolean; note: string }> {
  const session = await db.examSession.findUnique({
    where: { id: sessionId },
    include: { competitionAttempt: { select: { attemptId: true } } },
  });
  if (!session) return { done: false, note: "SESSION_NOT_FOUND" };

  // Phiên đã kết thúc thì không làm gì. Gọi lại nhiều lần là chuyện bình thường:
  // ngưỡng liêm chính, cron hết hạn nối lại và lệnh giám thị có thể cùng chạm
  // tới một phiên trong vài giây.
  if (session.status === "AUTO_SUBMITTED" || session.status === "COMPLETED" || session.status === "CLOSED") {
    return { done: false, note: "ALREADY_ENDED" };
  }

  const result = await finalizeReadingAttempt(session.competitionAttempt.attemptId, {
    submissionReason: reason,
    integrityStatus: "REVIEW",
  });

  const now = new Date();
  await db.examSession.update({
    where: { id: sessionId },
    data: {
      status: "AUTO_SUBMITTED",
      integrityStatus: "REVIEW",
      forceSubmitAt: session.forceSubmitAt ?? now,
      forceSubmitReason: session.forceSubmitReason ?? reason,
      endedAt: now,
      webcamState: "LOST",
      screenState: "LOST",
    },
  });

  // Ghi vào nhật ký kiểm toán để hồ sơ rà soát về sau nói được ai/lý do gì.
  await db.proctorActionLog.create({
    data: {
      sessionId,
      adminUserId: options?.actorAdminId ?? "SYSTEM",
      action: "FORCE_SUBMIT",
      reason: options?.detail ?? reason,
      metadataJson: JSON.stringify({
        reason,
        finalized: result.finalized,
        note: result.finalized ? "OK" : result.reason,
      }),
    },
  });

  return {
    done: true,
    note: result.finalized ? "FINALIZED" : `ATTEMPT_${result.reason}`,
  };
}

/**
 * Kết thúc bình thường khi học viên tự bấm nộp trong phòng thi.
 *
 * Vẫn đi qua đúng hàm chấm bài chung, chỉ khác trạng thái phiên: COMPLETED thay
 * vì AUTO_SUBMITTED, và không ép sang REVIEW nếu hồ sơ đang sạch.
 */
export async function completeExamSession(
  sessionId: string
): Promise<{ done: boolean; note: string }> {
  const session = await db.examSession.findUnique({
    where: { id: sessionId },
    include: { competitionAttempt: { select: { attemptId: true } } },
  });
  if (!session) return { done: false, note: "SESSION_NOT_FOUND" };
  if (session.status !== "ACTIVE" && session.status !== "DISCONNECTED") {
    return { done: false, note: "NOT_ACTIVE" };
  }

  const result = await finalizeReadingAttempt(session.competitionAttempt.attemptId, {
    submissionReason: "NORMAL",
    integrityStatus: session.integrityStatus === "REVIEW" ? "REVIEW" : "CLEAR",
  });

  await db.examSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED", endedAt: new Date() },
  });

  return { done: true, note: result.finalized ? "FINALIZED" : `ATTEMPT_${result.reason}` };
}

/**
 * Quét các phiên đã quá hạn — chạy định kỳ bằng cron.
 *
 * Hai nhóm bị quét:
 *   1. Rớt mạng quá 15 phút mà không quay lại.
 *   2. Hết giờ đề mà client không nộp (đóng máy, hết pin, mất điện).
 *
 * Nếu thiếu việc này, một thí sinh đóng máy giữa chừng sẽ để lại phiên treo mãi
 * và kỳ thi không bao giờ chốt được.
 */
export async function sweepExpiredSessions(now = new Date()): Promise<{
  disconnectExpired: number;
  timedOut: number;
}> {
  const stale = await db.examSession.findMany({
    where: {
      status: { in: ["ACTIVE", "DISCONNECTED"] },
      OR: [
        { status: "DISCONNECTED", resumeUntil: { lt: now } },
        { competitionAttempt: { attempt: { deadlineAt: { lt: now } } } },
      ],
    },
    select: { id: true, status: true, resumeUntil: true },
    take: 200,
  });

  let disconnectExpired = 0;
  let timedOut = 0;

  for (const session of stale) {
    const expiredReconnect =
      session.status === "DISCONNECTED" &&
      session.resumeUntil !== null &&
      session.resumeUntil < now;

    const outcome = await forceSubmitExamSession(
      session.id,
      expiredReconnect ? "DISCONNECT_EXPIRED" : "TIMEOUT"
    );
    if (!outcome.done) continue;
    if (expiredReconnect) disconnectExpired += 1;
    else timedOut += 1;
  }

  return { disconnectExpired, timedOut };
}
