import type { GradedQuestion } from "../exercise-content.ts";

/**
 * Chế độ ĐỐI CHIẾU — luật thuần, không chạm database và không dựng giao diện.
 *
 * Đối chiếu là màn xem lại: cùng bố cục phòng thi (passage bên trái, câu hỏi
 * bên phải) nhưng chỉ để đọc, mỗi ô điền hiện "bạn trả lời → đáp án đúng".
 * Tách phần luật ra đây vì có đúng MỘT quy tắc không được sai, và nó phải kiểm
 * thử được bằng node thuần:
 *
 *   **Chưa mở đáp án thì đáp án đúng KHÔNG được rời máy chủ.**
 *
 * Ẩn bằng CSS hay bằng `hidden` là không đủ — dữ liệu vẫn nằm trong payload RSC
 * và bất kỳ ai mở tab mạng cũng đọc được. Vì vậy `correctAnswer` bị xoá khỏi
 * dữ liệu ngay từ đây khi chưa mở, chứ không phải ở lớp hiển thị.
 *
 * Cũng vì lẽ đó, hàm này KHÔNG đụng tới `sanitizeReadingParts()`: bố cục đề vẫn
 * đi đường cũ đã được kiểm định, còn lớp đáp án là một gói riêng, mở riêng.
 */

export type ReviewSlot = {
  qid: string;
  /** "7" hoặc "21-22" — trùng với số câu hiển thị trong phòng thi. */
  numberLabel: string;
  /** Đáp án học viên đã chọn. Chuỗi rỗng nghĩa là bỏ trống. */
  userAnswer: string;
  /** Đáp án đúng. `null` khi chưa mở khoá — khi đó nó cũng không có mặt trong payload. */
  correctAnswer: string | null;
  correct: boolean;
  /** Điểm của mục này; MC_MULTI có thể ăn nhiều điểm nên cần cả hai số. */
  score: number;
  maxScore: number;
};

export type ReviewModel = {
  revealed: boolean;
  slots: Record<string, ReviewSlot>;
};

/**
 * Dựng lớp đáp án phủ lên bố cục đề.
 *
 * Khóa theo `qid` chứ không theo thứ tự: bố cục đề và bảng chấm được dựng bởi
 * hai hàm khác nhau, và chỉ có `qid` là thứ chắc chắn trỏ về cùng một câu ở cả
 * hai bên. Dựa vào thứ tự thì một dạng câu hỏi mới có cách đánh số khác là lệch
 * toàn bộ đáp án mà không có lỗi nào báo ra.
 */
export function buildReviewModel(
  detail: readonly GradedQuestion[],
  revealed: boolean,
): ReviewModel {
  const slots: Record<string, ReviewSlot> = {};
  for (const q of detail) {
    slots[q.id] = {
      qid: q.id,
      numberLabel: q.numberLabel,
      userAnswer: q.userAnswer,
      // Chưa mở thì trường này là `null` chứ không phải chuỗi bị ẩn đi.
      correctAnswer: revealed ? q.correctAnswer : null,
      correct: q.correct,
      score: q.score,
      maxScore: q.maxScore,
    };
  }
  return { revealed, slots };
}

/**
 * Tách phần chữ của một câu hỏi quanh các ô điền `___`.
 *
 * Trả về mảng đoạn chữ; giữa hai đoạn liên tiếp là một ô điền. Câu không có ô
 * điền nào trả về đúng một đoạn, và khi đó ô điền được đặt SAU phần chữ.
 *
 * Để ở đây thay vì trong component vì đây là chỗ quyết định ô đáp án rơi vào
 * đâu trong câu — sai chỗ này thì đề đọc ra vô nghĩa, và đó là thứ đáng kiểm
 * thử chứ không đáng ngồi nhìn bằng mắt.
 */
export function splitPromptAroundBlanks(prompt: string): string[] {
  return (prompt ?? "").split(/_{3,}/);
}

/** Câu này có ô điền nằm giữa dòng chữ hay không. */
export function hasInlineBlank(prompt: string): boolean {
  return splitPromptAroundBlanks(prompt).length > 1;
}

/**
 * Nhãn dải số câu của một nhóm: "Question 3", "Questions 1–2", "Questions 4–5".
 *
 * Không ghép thẳng nhãn đầu với nhãn cuối. Một câu MC_MULTI mang sẵn nhãn dải
 * ("4-5"), nên ghép thô sẽ ra "Questions 4-5–4-5"; nhóm một câu sẽ ra
 * "Questions 3–3". Vì vậy phải bóc lấy SỐ đầu tiên và SỐ cuối cùng rồi mới dựng
 * nhãn, và nhóm chỉ có một số thì dùng số ít.
 */
export function questionRangeLabel(labels: readonly string[]): string {
  const numbers = labels
    .flatMap((label) => label.match(/\d+/g) ?? [])
    .map(Number)
    .filter((n) => Number.isFinite(n));
  if (numbers.length === 0) return "";

  const first = Math.min(...numbers);
  const last = Math.max(...numbers);
  return first === last ? `Question ${first}` : `Questions ${first}–${last}`;
}

/**
 * Phần chữ của một câu hỏi.
 *
 * Dạng nối heading không có `prompt` — câu hỏi của nó LÀ một đoạn văn trong
 * bài. Không có bước thay thế này thì màn đối chiếu hiện một ô đáp án trống
 * trơn, không nói được nó thuộc đoạn nào.
 *
 * Quy tắc trùng khớp cố ý với `gradeReading()`, để bảng chấm và màn đối chiếu
 * gọi cùng một câu bằng cùng một tên.
 */
export function reviewPromptOf(question: {
  prompt?: string;
  paragraph?: string;
}): string {
  if (question.prompt) return question.prompt;
  if (question.paragraph) return `Paragraph ${question.paragraph}`;
  return "";
}
