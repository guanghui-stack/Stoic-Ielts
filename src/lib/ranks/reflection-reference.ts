import { db } from "@/lib/db";
import { readingContentForAttempt } from "@/lib/attempt-content";
import { gradeReading, type ReadingAnswers } from "@/lib/exercise-content";

export type ReflectionSourceQuestion = {
  attemptId: string;
  questionId: string;
  numberLabel: string;
  prompt: string;
  type: string;
  part: number;
  userAnswer: string;
  correctAnswer: string | null;
  attemptTitle: string;
  submittedAtLabel: string;
  answersUnlocked: boolean;
};

function parseAnswers(value: string): ReadingAnswers {
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as ReadingAnswers)
      : {};
  } catch {
    return {};
  }
}

/**
 * Các câu sai dùng cho phục bàn miễn phí.
 *
 * Chỉ đọc attempt đã nộp của đúng userId, sau đó dùng cùng pipeline snapshot +
 * gradeReading với trang kết quả. Không nhận questionId hay đáp án từ client.
 */
export async function listReflectionSourceQuestions(
  userId: string,
): Promise<ReflectionSourceQuestion[]> {
  const attempts = await db.attempt.findMany({
    where: {
      userId,
      status: "GRADED",
      submittedAt: { not: null },
      exercise: { skill: "READING" },
    },
    orderBy: { submittedAt: "desc" },
    take: 12,
    select: {
      id: true,
      answers: true,
      answersRevealedAt: true,
      submittedAt: true,
      assemblyId: true,
      exercise: { select: { title: true, content: true } },
      feynmanReviews: {
        where: { status: "COMPLETED" },
        select: { id: true },
        take: 1,
      },
    },
  });

  const sources: ReflectionSourceQuestion[] = [];
  for (const attempt of attempts) {
    try {
      const content = await readingContentForAttempt(attempt);
      const { detail } = gradeReading(content, parseAnswers(attempt.answers));
      const answersUnlocked =
        attempt.answersRevealedAt !== null || attempt.feynmanReviews.length > 0;
      const submittedAtLabel = attempt.submittedAt
        ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(
            attempt.submittedAt,
          )
        : "Không rõ ngày nộp";

      for (const question of detail) {
        if (question.correct) continue;
        sources.push({
          attemptId: attempt.id,
          questionId: question.id,
          numberLabel: question.numberLabel,
          prompt: question.prompt,
          type: question.type,
          part: question.part,
          userAnswer: question.userAnswer,
          correctAnswer: answersUnlocked ? question.correctAnswer : null,
          attemptTitle: attempt.exercise.title,
          submittedAtLabel,
          answersUnlocked,
        });
      }
    } catch {
      // Một attempt hỏng snapshot không được làm sập trang phục bàn.
    }
  }

  return sources;
}

/** Kiểm tra server-side một tham chiếu có thật sự là câu sai của user hay không. */
export async function isValidReflectionSource(input: {
  userId: string;
  attemptId: string;
  questionId: string;
}): Promise<boolean> {
  const attempt = await db.attempt.findFirst({
    where: {
      id: input.attemptId,
      userId: input.userId,
      status: "GRADED",
      submittedAt: { not: null },
      exercise: { skill: "READING" },
    },
    select: {
      answers: true,
      assemblyId: true,
      exercise: { select: { content: true } },
    },
  });
  if (!attempt) return false;

  try {
    const content = await readingContentForAttempt(attempt);
    const { detail } = gradeReading(content, parseAnswers(attempt.answers));
    return detail.some((question) => question.id === input.questionId && !question.correct);
  } catch {
    return false;
  }
}
