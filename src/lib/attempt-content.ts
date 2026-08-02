import "server-only";
import { db } from "@/lib/db";
import type { ReadingContent, ReadingPart } from "@/lib/exercise-content";

/**
 * Lấy nội dung đề cho một lượt làm bài.
 *
 * Lượt bình thường thì đọc thẳng nội dung của đề. Lượt thuộc một đề GHÉP thì
 * phải nối nội dung của ba passage thành phần lại thành một đề ba phần.
 *
 * Chỗ dễ hỏng nhất khi ghép: hai đề khác nhau thường cùng đánh mã câu hỏi là
 * "q1". Nếu nối thẳng, đáp án câu 1 của passage 2 sẽ ghi đè đáp án câu 1 của
 * passage 1 — học viên mất bài mà không hiểu vì sao. Vì vậy mọi mã câu hỏi đều
 * được gắn tiền tố theo số thứ tự passage.
 */

/** Chuẩn hóa một đề bất kỳ về dạng danh sách phần. */
function toParts(content: ReadingContent): ReadingPart[] {
  if (content.parts?.length) return content.parts;
  if (content.passage && content.questionGroups) {
    return [{ passage: content.passage, questionGroups: content.questionGroups }];
  }
  return [];
}

/** Gắn tiền tố cho mã câu hỏi để ba passage không đụng mã nhau. */
function prefixPart(part: ReadingPart, index: number): ReadingPart {
  return {
    ...part,
    questionGroups: part.questionGroups.map((group) => ({
      ...group,
      questions: group.questions.map((question) => ({
        ...question,
        id: `p${index + 1}:${question.id}`,
      })),
    })),
  };
}

function safeParse(text: string): ReadingContent {
  try {
    return JSON.parse(text) as ReadingContent;
  } catch {
    return {};
  }
}

export type AttemptForContent = {
  assemblyId: string | null;
  exercise: { content: string };
};

export async function readingContentForAttempt(
  attempt: AttemptForContent
): Promise<ReadingContent> {
  if (!attempt.assemblyId) return safeParse(attempt.exercise.content);

  const items = await db.readingAssemblyItem.findMany({
    where: { assemblyId: attempt.assemblyId },
    orderBy: { orderIndex: "asc" },
    select: { exercise: { select: { content: true } } },
  });

  // Đề ghép mất passage thành phần (bị xóa) thì thà trả về phần còn lại còn
  // hơn làm sập trang kết quả của học viên.
  const parts = items.flatMap((item, index) =>
    toParts(safeParse(item.exercise.content)).map((part) => prefixPart(part, index))
  );

  return { parts };
}

/** Tên hiển thị của một đề ghép, dùng ở trang kết quả và lịch sử. */
export async function assemblyTitle(assemblyId: string): Promise<string> {
  const items = await db.readingAssemblyItem.findMany({
    where: { assemblyId },
    orderBy: { orderIndex: "asc" },
    select: { exercise: { select: { title: true } } },
  });
  if (items.length === 0) return "Đề ghép";
  return `Đề ghép: ${items.map((i) => i.exercise.title).join(" · ")}`;
}
