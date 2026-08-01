"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { gradeReading, type ReadingContent } from "@/lib/exercise-content";
import { FEYNMAN_LIMITS, isFeynmanErrorType } from "@/lib/feynman-constants";
import { chooseFeynmanMode, selectPriorityMistakes } from "@/lib/feynman-rules";
import { buildFeynmanLearningLookup } from "@/lib/feynman";
import { hasActiveAccess } from "@/lib/access-grants";

export type FeynmanFormState = { error?: string } | undefined;

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function validateText(
  label: string,
  value: string,
  limits: { min: number; max: number }
): string | null {
  if (value.length < limits.min) {
    return `${label} cần tối thiểu ${limits.min} ký tự (hiện ${value.length}).`;
  }
  if (value.length > limits.max) {
    return `${label} không được vượt quá ${limits.max} ký tự (hiện ${value.length}).`;
  }
  return null;
}

function confidenceValue(formData: FormData, name: string): number | null {
  const value = Number(formData.get(name));
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
}

/**
 * Bước 0 → 1: tạo phiên Feynman cho một lượt Reading đã chấm.
 * Idempotent nhờ ràng buộc duy nhất theo attemptId — bấm hai lần không tạo hai phiên.
 */
export async function startFeynmanReviewAction(attemptId: string) {
  const user = await requireUser();

  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    include: { exercise: true, feynmanReview: { select: { id: true } } },
  });
  if (!attempt || attempt.userId !== user.id) redirect("/hoc-vien");
  if (attempt.exercise.skill !== "READING" || attempt.status !== "GRADED") {
    redirect(`/hoc-vien/bai-lam/${attemptId}`);
  }
  // Phiên đã tạo thì luôn vào được — kể cả khi gói Feynman đã hết hạn. Việc
  // học dở dang không được phép biến mất vì lý do thương mại.
  if (attempt.feynmanReview) {
    redirect(`/hoc-vien/bai-lam/${attemptId}/feynman`);
  }

  // Chỉ kiểm tra quyền ở đúng lúc TẠO phiên mới.
  const canStart =
    user.role === "ADMIN" ||
    (await hasActiveAccess({
      userId: user.id,
      feature: "FEYNMAN",
      exerciseId: attempt.exerciseId,
    }));
  if (!canStart) {
    redirect(`/hoc-vien/bai-lam/${attemptId}?mua=feynman`);
  }

  const content = JSON.parse(attempt.exercise.content) as ReadingContent;
  const answers = JSON.parse(attempt.answers || "{}");
  const graded = gradeReading(content, answers);
  const imperfectCount = graded.detail.filter((qd) => !qd.correct).length;

  const mode = chooseFeynmanMode({
    scoreRaw: graded.scoreRaw,
    scoreTotal: graded.scoreTotal,
    taskType: attempt.exercise.taskType,
    imperfectCount,
  });
  const selected = selectPriorityMistakes(graded.detail, mode);
  const learning = buildFeynmanLearningLookup(content);

  await db.feynmanReview.upsert({
    where: { attemptId },
    update: {},
    create: {
      userId: user.id,
      attemptId,
      mode,
      mistakes: {
        create: selected.map((item, index) => {
          const note = learning.get(item.id);
          return {
            questionId: item.id,
            numberLabel: item.numberLabel,
            questionType: item.type,
            partNumber: item.part,
            sortOrder: index,
            prompt: item.prompt,
            userAnswer: item.userAnswer,
            correctAnswer: item.correctAnswer,
            modelEvidenceParagraph: note?.learning?.evidenceParagraph ?? null,
            modelEvidence: note?.learning?.evidenceText ?? null,
            modelExplanation: note?.learning?.explanation ?? null,
            modelTrap: note?.learning?.trap ?? null,
            modelParaphrasesJson: note?.learning?.paraphrases
              ? JSON.stringify(note.learning.paraphrases)
              : null,
          };
        }),
      },
    },
  });

  redirect(`/hoc-vien/bai-lam/${attemptId}/feynman`);
}

/**
 * Bước 1–2 → 3: lưu phần tự giải thích rồi MỞ lời giải mẫu (DRAFT → REVEALED).
 */
export async function revealFeynmanReviewAction(
  reviewId: string,
  _previous: FeynmanFormState,
  formData: FormData
): Promise<FeynmanFormState> {
  const user = await requireUser();

  const review = await db.feynmanReview.findUnique({
    where: { id: reviewId },
    include: {
      attempt: { select: { id: true, status: true, userId: true } },
      mistakes: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!review || review.userId !== user.id || review.attempt.userId !== user.id) {
    return { error: "Không tìm thấy phiên Feynman hợp lệ." };
  }
  if (review.attempt.status !== "GRADED") {
    return { error: "Bài Reading chưa ở trạng thái đã chấm." };
  }
  // Mở nhiều tab: lần submit sau chỉ đưa về đúng trạng thái hiện tại
  if (review.status === "COMPLETED" || review.status === "REVEALED") {
    redirect(`/hoc-vien/bai-lam/${review.attempt.id}/feynman`);
  }

  const passageSummary = field(formData, "passageSummary");
  const paragraphMap = field(formData, "paragraphMap");
  const confusingPoint = field(formData, "confusingPoint");
  const confidenceBefore = confidenceValue(formData, "confidenceBefore");

  const topChecks: Array<[string, string, { min: number; max: number }]> = [
    ["Phần giải thích bài đọc", passageSummary, FEYNMAN_LIMITS.passageSummary],
    ["Sơ đồ vai trò các đoạn", paragraphMap, FEYNMAN_LIMITS.paragraphMap],
    ["Điểm còn khó hiểu", confusingPoint, FEYNMAN_LIMITS.confusingPoint],
  ];
  for (const [label, value, limits] of topChecks) {
    const error = validateText(label, value, limits);
    if (error) return { error };
  }
  if (confidenceBefore === null) {
    return { error: "Vui lòng chọn mức độ tự tin trước khi xem lời giải." };
  }

  const mistakeUpdates: Array<{
    id: string;
    errorType: string;
    evidenceParagraph: string;
    evidenceText: string;
    firstExplanation: string;
  }> = [];

  for (const mistake of review.mistakes) {
    const errorType = field(formData, `errorType_${mistake.id}`);
    const evidenceParagraph = field(formData, `evidenceParagraph_${mistake.id}`);
    const evidenceText = field(formData, `evidenceText_${mistake.id}`);
    const firstExplanation = field(formData, `firstExplanation_${mistake.id}`);

    if (!isFeynmanErrorType(errorType)) {
      return { error: `Câu ${mistake.numberLabel}: hãy chọn một nguyên nhân sai.` };
    }
    const checks: Array<[string, string, { min: number; max: number }]> = [
      [`Câu ${mistake.numberLabel} — vị trí bằng chứng`, evidenceParagraph, FEYNMAN_LIMITS.evidenceParagraph],
      [`Câu ${mistake.numberLabel} — bằng chứng`, evidenceText, FEYNMAN_LIMITS.evidenceText],
      [`Câu ${mistake.numberLabel} — giải thích ban đầu`, firstExplanation, FEYNMAN_LIMITS.firstExplanation],
    ];
    for (const [label, value, limits] of checks) {
      const error = validateText(label, value, limits);
      if (error) return { error };
    }
    mistakeUpdates.push({
      id: mistake.id,
      errorType,
      evidenceParagraph,
      evidenceText,
      firstExplanation,
    });
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.feynmanReview.update({
      where: { id: review.id },
      data: {
        passageSummary,
        paragraphMap,
        confusingPoint: confusingPoint || null,
        confidenceBefore,
        status: "REVEALED",
        revealedAt: now,
      },
    });
    for (const item of mistakeUpdates) {
      await tx.feynmanMistake.update({
        where: { id: item.id },
        data: {
          errorType: item.errorType,
          evidenceParagraph: item.evidenceParagraph,
          evidenceText: item.evidenceText,
          firstExplanation: item.firstExplanation,
          revealedAt: now,
        },
      });
    }
  });

  revalidatePath(`/hoc-vien/bai-lam/${review.attempt.id}/feynman`);
  redirect(`/hoc-vien/bai-lam/${review.attempt.id}/feynman`);
}

/**
 * Bước 3–4 → 5: lưu phần sửa lại và giảng lại (REVEALED → COMPLETED).
 * Hoàn thành xong, trang kết quả mới mở toàn bộ đáp án đúng.
 */
export async function completeFeynmanReviewAction(
  reviewId: string,
  _previous: FeynmanFormState,
  formData: FormData
): Promise<FeynmanFormState> {
  const user = await requireUser();

  const review = await db.feynmanReview.findUnique({
    where: { id: reviewId },
    include: {
      attempt: { select: { id: true, userId: true } },
      mistakes: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!review || review.userId !== user.id || review.attempt.userId !== user.id) {
    return { error: "Không tìm thấy phiên Feynman hợp lệ." };
  }
  if (review.status === "COMPLETED") {
    redirect(`/hoc-vien/bai-lam/${review.attempt.id}`);
  }
  if (review.status !== "REVEALED") {
    return { error: "Bạn cần hoàn thành bước tự giải thích trước." };
  }

  const finalTeachBack = field(formData, "finalTeachBack");
  const finalRule = field(formData, "finalRule");
  const confidenceAfter = confidenceValue(formData, "confidenceAfter");

  const topChecks: Array<[string, string, { min: number; max: number }]> = [
    ["Phần giảng lại cuối cùng", finalTeachBack, FEYNMAN_LIMITS.finalTeachBack],
    ["Quy tắc cần nhớ", finalRule, FEYNMAN_LIMITS.finalRule],
  ];
  for (const [label, value, limits] of topChecks) {
    const error = validateText(label, value, limits);
    if (error) return { error };
  }
  if (confidenceAfter === null) {
    return { error: "Vui lòng chọn mức độ tự tin sau khi sửa bài." };
  }

  const mistakeUpdates: Array<{
    id: string;
    revisedExplanation: string;
    lessonRule: string;
  }> = [];

  for (const mistake of review.mistakes) {
    const revisedExplanation = field(formData, `revisedExplanation_${mistake.id}`);
    const lessonRule = field(formData, `lessonRule_${mistake.id}`);
    const checks: Array<[string, string, { min: number; max: number }]> = [
      [`Câu ${mistake.numberLabel} — giải thích đã sửa`, revisedExplanation, FEYNMAN_LIMITS.revisedExplanation],
      [`Câu ${mistake.numberLabel} — quy tắc rút ra`, lessonRule, FEYNMAN_LIMITS.lessonRule],
    ];
    for (const [label, value, limits] of checks) {
      const error = validateText(label, value, limits);
      if (error) return { error };
    }
    mistakeUpdates.push({ id: mistake.id, revisedExplanation, lessonRule });
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    for (const item of mistakeUpdates) {
      await tx.feynmanMistake.update({
        where: { id: item.id },
        data: {
          revisedExplanation: item.revisedExplanation,
          lessonRule: item.lessonRule,
          completedAt: now,
        },
      });
    }
    await tx.feynmanReview.update({
      where: { id: review.id },
      data: {
        finalTeachBack,
        finalRule,
        confidenceAfter,
        status: "COMPLETED",
        completedAt: now,
      },
    });
  });

  revalidatePath(`/hoc-vien/bai-lam/${review.attempt.id}`);
  redirect(`/hoc-vien/bai-lam/${review.attempt.id}`);
}
