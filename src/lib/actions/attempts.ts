"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canAccessExercise } from "@/lib/exercise-access";
import { finalizeReadingAttempt } from "@/lib/attempts/finalize";

/** Dung sai sau hạn chót (mạng chậm, tự nộp phía client trễ vài giây). */
const GRACE_MS = 15_000;

/** Bắt đầu (hoặc tiếp tục) một lượt làm bài. */
export async function startAttemptAction(exerciseId: string) {
  const user = await requireUser();

  const exercise = await db.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise || exercise.skill !== "READING" || !exercise.published) {
    redirect("/luyen-tap/reading");
  }

  // Chặn ngay tại máy chủ: bài RESTRICTED chưa được mở khóa thì không vào được,
  // kể cả khi học viên tự gọi thẳng đường dẫn.
  if (!(await canAccessExercise(user, exercise))) redirect("/luyen-tap/reading");

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
    await finalizeReadingAttempt(existing.id, { submissionReason: "TIMEOUT" });
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
  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    include: { exercise: { select: { skill: true } } },
  });
  if (
    !attempt ||
    attempt.userId !== user.id ||
    attempt.exercise.skill !== "READING" ||
    attempt.status !== "IN_PROGRESS"
  ) {
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

/** Chốt bài Reading và chấm tự động. */
/** Học viên nộp bài (hoặc client tự nộp khi hết giờ). */
export async function submitAttemptAction(
  attemptId: string,
  answersJson: string,
  auto: boolean
) {
  const user = await requireUser();
  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    include: { exercise: { select: { skill: true } } },
  });
  if (!attempt || attempt.userId !== user.id || attempt.exercise.skill !== "READING") {
    redirect("/hoc-vien");
  }
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

  await finalizeReadingAttempt(attemptId, {
    submissionReason: auto || !withinGrace ? "TIMEOUT" : "NORMAL",
  });
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
