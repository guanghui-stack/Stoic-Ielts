"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  gradeReading,
  type ReadingAnswers,
  type ReadingContent,
} from "@/lib/exercise-content";
import { canAccessExercise } from "@/lib/exercise-access";
import {
  calculateReadingBand,
  isValidAchievementAttempt,
} from "@/lib/reading-band";
import {
  processAchievementEvent,
  recordAchievementEvent,
} from "@/lib/achievements/engine";

/** Dung sai sau hạn chót (mạng chậm, tự nộp phía client trễ vài giây). */
const GRACE_MS = 15_000;

/** Bắt đầu (hoặc tiếp tục) một lượt làm bài. */
export async function startAttemptAction(exerciseId: string) {
  const user = await requireUser();

  const exercise = await db.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise || !exercise.published) redirect("/luyen-tap");

  // Chặn ngay tại máy chủ: bài RESTRICTED chưa được mở khóa thì không vào được,
  // kể cả khi học viên tự gọi thẳng đường dẫn.
  if (!(await canAccessExercise(user, exercise))) redirect("/luyen-tap");

  // Nếu còn lượt đang làm dở và chưa quá hạn thì quay lại lượt đó
  const existing = await db.attempt.findFirst({
    where: { userId: user.id, exerciseId, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });
  if (existing) {
    if (existing.deadlineAt.getTime() + GRACE_MS > Date.now()) {
      redirect(`/lam-bai/${existing.id}`);
    }
    // Quá hạn từ phiên trước → chốt bài với phần đã lưu
    await finalizeAttempt(existing.id, true);
  }

  // Số thứ tự lượt làm phải cố định: danh hiệu xét "lần hợp lệ ĐẦU TIÊN",
  // nên làm lại nhiều lần không được phép ghi đè kết quả lần đầu.
  const previous = await db.attempt.count({ where: { userId: user.id, exerciseId } });

  const attempt = await db.attempt.create({
    data: {
      userId: user.id,
      exerciseId,
      answers: "{}",
      attemptNumber: previous + 1,
      deadlineAt: new Date(Date.now() + exercise.durationMinutes * 60_000),
    },
  });
  redirect(`/lam-bai/${attempt.id}`);
}

/** Lưu nháp trong lúc làm bài (autosave). */
export async function saveProgressAction(attemptId: string, answersJson: string) {
  const user = await requireUser();
  const attempt = await db.attempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== user.id || attempt.status !== "IN_PROGRESS") {
    return { ok: false };
  }
  // Chống payload bất thường
  if (answersJson.length > 200_000) return { ok: false };
  try {
    JSON.parse(answersJson);
  } catch {
    return { ok: false };
  }
  await db.attempt.update({
    where: { id: attemptId },
    data: { answers: answersJson },
  });
  return { ok: true };
}

/** Chốt bài: chấm Reading tự động, Writing chuyển sang chờ giáo viên chấm. */
async function finalizeAttempt(attemptId: string, auto: boolean) {
  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    include: { exercise: true },
  });
  if (!attempt || attempt.status !== "IN_PROGRESS") return;

  let scoreRaw: number | null = null;
  let scoreTotal: number | null = null;
  let status = "SUBMITTED";
  let band: number | null = null;
  let bandScaleVersion: string | null = null;
  let answeredCount: number | null = null;
  let validForAchievements = false;

  const now = new Date();
  // Thời gian làm bài THẬT, kẹp theo thời lượng đề để lượt bị treo qua đêm
  // không biến thành một con số vô lý.
  const elapsedSeconds = Math.max(
    0,
    Math.min(
      Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000),
      attempt.exercise.durationMinutes * 60
    )
  );

  if (attempt.exercise.skill === "READING") {
    const content = JSON.parse(attempt.exercise.content) as ReadingContent;
    const answers = JSON.parse(attempt.answers || "{}") as ReadingAnswers;
    const graded = gradeReading(content, answers);
    scoreRaw = graded.scoreRaw;
    scoreTotal = graded.scoreTotal;
    status = "GRADED"; // Reading chấm máy, không cần giáo viên

    answeredCount = Object.values(answers).filter(
      (v) => v !== null && v !== undefined && String(v).trim() !== ""
    ).length;

    // Band phải được CHỐT ngay lúc chấm: nếu tính lại khi hiển thị, đổi thang
    // quy đổi về sau sẽ âm thầm làm thay đổi kết quả cũ của học viên.
    const bandResult = calculateReadingBand(content, scoreRaw, scoreTotal);
    band = bandResult?.band ?? null;
    bandScaleVersion = bandResult?.scaleVersion ?? null;

    validForAchievements = isValidAchievementAttempt({
      status,
      achievementEligible: attempt.exercise.achievementEligible,
      band,
      answeredCount,
      scoreTotal,
      elapsedSeconds,
      durationMinutes: attempt.exercise.durationMinutes,
      integrityStatus: attempt.integrityStatus,
    });
  }

  await db.attempt.update({
    where: { id: attemptId },
    data: {
      status,
      submittedAt: now,
      autoSubmitted: auto,
      scoreRaw,
      scoreTotal,
      band,
      bandScaleVersion,
      answeredCount,
      elapsedSeconds,
      validForAchievements,
      gradedAt: status === "GRADED" ? now : null,
    },
  });

  // Xét danh hiệu SAU khi bài đã được chốt điểm. Cố ý không nằm trong cùng
  // transaction: nếu việc xét danh hiệu lỗi, học viên vẫn phải nộp bài được —
  // danh hiệu là phần thưởng, không phải điều kiện để học.
  if (status === "GRADED") {
    const eventId = await recordAchievementEvent({
      userId: attempt.userId,
      type: "READING_GRADED",
      key: attemptId,
      payload: { attemptId },
    });
    if (eventId) await processAchievementEvent(eventId);
  }
}

/** Học viên nộp bài (hoặc client tự nộp khi hết giờ). */
export async function submitAttemptAction(
  attemptId: string,
  answersJson: string,
  auto: boolean
) {
  const user = await requireUser();
  const attempt = await db.attempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== user.id) redirect("/hoc-vien");
  if (attempt.status !== "IN_PROGRESS") redirect(`/hoc-vien/bai-lam/${attemptId}`);

  // Lưu đáp án cuối cùng nếu hợp lệ và còn trong hạn (kèm dung sai)
  const withinGrace = attempt.deadlineAt.getTime() + GRACE_MS > Date.now();
  if (withinGrace && answersJson.length <= 200_000) {
    try {
      JSON.parse(answersJson);
      await db.attempt.update({
        where: { id: attemptId },
        data: { answers: answersJson },
      });
    } catch {
      /* giữ bản autosave gần nhất */
    }
  }

  await finalizeAttempt(attemptId, auto || !withinGrace);
  revalidatePath("/hoc-vien");
  redirect(`/hoc-vien/bai-lam/${attemptId}`);
}

/**
 * Mở đáp án cơ bản của bài Reading — MIỄN PHÍ và không ràng buộc gì.
 *
 * Feynman đã trở thành sản phẩm trả phí riêng, nên không được lấy đáp án làm
 * con tin để bán nó: học viên trả tiền làm bài thì phải biết mình đúng sai chỗ
 * nào. Thứ Feynman bán là lớp chữa sâu — lời giải mẫu, bẫy, bằng chứng và quy
 * trình tự giảng lại.
 *
 * Vẫn cần một cú bấm thay vì hiện luôn: khoảnh khắc dừng lại trước khi xem đáp
 * án là chỗ việc học thật sự diễn ra.
 */
export async function revealBasicAnswersAction(attemptId: string) {
  const user = await requireUser();
  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    include: { exercise: { select: { skill: true } } },
  });
  if (
    !attempt ||
    attempt.userId !== user.id ||
    attempt.exercise.skill !== "READING" ||
    attempt.status !== "GRADED"
  ) {
    redirect("/hoc-vien");
  }

  // Giữ nguyên mốc thời gian lần đầu — bấm lại không làm sai lịch sử học tập
  if (!attempt.answersRevealedAt) {
    await db.attempt.update({
      where: { id: attempt.id },
      data: { answersRevealedAt: new Date() },
    });
  }
  revalidatePath(`/hoc-vien/bai-lam/${attempt.id}`);
  redirect(`/hoc-vien/bai-lam/${attempt.id}#chi-tiet`);
}
