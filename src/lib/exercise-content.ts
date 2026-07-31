/**
 * Định nghĩa cấu trúc JSON của nội dung bài tập + chấm điểm Reading.
 * Dùng chung cho server (chấm bài, seed) và client (render đề).
 *
 * 8 dạng câu hỏi Reading (theo chuẩn đề thi IELTS trên máy):
 *  - TFNG            TRUE / FALSE / NOT GIVEN (radio)
 *  - MC              Trắc nghiệm 1 đáp án (radio A–D…)
 *  - MC_MULTI        Trắc nghiệm nhiều đáp án (checkbox, chiếm nhiều số câu)
 *  - GAP             Điền từ (ô điền inline, giới hạn từ do admin đặt)
 *  - MATCH_HEADINGS  Kéo heading thả vào ô trong bài đọc (i, ii, iii…)
 *  - MATCH_INFO      Kéo đáp án vào ô cạnh câu — được dùng lại đáp án
 *  - MATCH_FEATURES  Nối đặc điểm với danh sách A–F — được dùng lại
 *  - MATCH_ENDINGS   Chọn phần kết thúc câu từ danh sách (mỗi ending 1 lần)
 */

export type QuestionType =
  | "TFNG"
  | "MC"
  | "MC_MULTI"
  | "GAP"
  | "MATCH_HEADINGS"
  | "MATCH_INFO"
  | "MATCH_FEATURES"
  | "MATCH_ENDINGS";

/** Giới hạn số từ cho dạng GAP — admin chọn khi tạo đề. */
export type WordLimit =
  | "ONE_WORD"
  | "TWO_WORDS"
  | "THREE_WORDS"
  | "ONE_WORD_NUMBER"
  | "TWO_WORDS_NUMBER"
  | "THREE_WORDS_NUMBER";

export const WORD_LIMIT_LABELS: Record<WordLimit, string> = {
  ONE_WORD: "ONE WORD ONLY",
  TWO_WORDS: "NO MORE THAN TWO WORDS",
  THREE_WORDS: "NO MORE THAN THREE WORDS",
  ONE_WORD_NUMBER: "ONE WORD AND/OR A NUMBER",
  TWO_WORDS_NUMBER: "NO MORE THAN TWO WORDS AND/OR A NUMBER",
  THREE_WORDS_NUMBER: "NO MORE THAN THREE WORDS AND/OR A NUMBER",
};

export const WORD_LIMIT_RULES: Record<
  WordLimit,
  { maxWords: number; allowNumber: boolean }
> = {
  ONE_WORD: { maxWords: 1, allowNumber: false },
  TWO_WORDS: { maxWords: 2, allowNumber: false },
  THREE_WORDS: { maxWords: 3, allowNumber: false },
  ONE_WORD_NUMBER: { maxWords: 1, allowNumber: true },
  TWO_WORDS_NUMBER: { maxWords: 2, allowNumber: true },
  THREE_WORDS_NUMBER: { maxWords: 3, allowNumber: true },
};

/**
 * Lời giải mẫu do giáo viên soạn, dùng cho bước "Reveal" của Feynman Review.
 * CHỈ tồn tại phía máy chủ — xem ghi chú bảo mật ở sanitizeReadingParts().
 */
export type FeynmanLearningNote = {
  /** Vị trí bằng chứng, ví dụ "C" hoặc "Part 2 — đoạn B". */
  evidenceParagraph?: string;
  /** Bằng chứng diễn giải ngắn 1–2 câu, không chép dài từ passage. */
  evidenceText?: string;
  /** Vì sao đáp án đúng và vì sao các phương án khác không đủ căn cứ. */
  explanation?: string;
  /** Bẫy IELTS chính của câu hỏi. */
  trap?: string;
  /** Cặp paraphrase giữa câu hỏi và passage. */
  paraphrases?: Array<{ question: string; passage: string }>;
  /** Nhãn kỹ năng mở, dùng cho thống kê sau này. */
  skillTag?: string;
};

export type ReadingQuestion = {
  id: string;
  /** Nội dung câu hỏi/câu khẳng định. Với GAP có thể chứa ______ (ô điền inline). */
  prompt?: string;
  /** TFNG/MC/MC_MULTI: các lựa chọn hiển thị. */
  options?: string[];
  /** MATCH_HEADINGS: đoạn văn mà ô thả gắn vào ("A", "B", …). */
  paragraph?: string;
  /** MC_MULTI: số đáp án phải chọn (mặc định = độ dài answer). */
  selectCount?: number;
  /** Đáp án: chuỗi (chữ cái/numeral/từ) hoặc mảng chữ cái với MC_MULTI. Chỉ tồn tại phía server. */
  answer?: string | string[];
  altAnswers?: string[];
  /** Lời giải mẫu cho Feynman Review — CHỈ phía server, không gửi xuống phòng thi. */
  learning?: FeynmanLearningNote;
};

export type ReadingQuestionGroup = {
  type: QuestionType;
  instruction: string;
  questions: ReadingQuestion[];
  /** Các dạng MATCH_*: kho đáp án (không kèm nhãn — hệ thống tự đánh i/ii/… hoặc A/B/…). */
  options?: string[];
  /** MATCH_INFO / MATCH_FEATURES: cho phép dùng một đáp án nhiều lần (mặc định true). */
  reuseOptions?: boolean;
  /** GAP: giới hạn từ + tiêu đề khung tóm tắt (nếu trình bày dạng khung). */
  wordLimit?: WordLimit;
  boxTitle?: string;
};

export type ReadingPassage = {
  title: string;
  paragraphs: string[];
  /** Gắn nhãn A., B., C.… trước từng đoạn (bắt buộc với MATCH_HEADINGS/INFO). */
  labelParagraphs?: boolean;
};

/** Một part của bài thi (giống Part 1/2/3 trong đề thật). */
export type ReadingPart = {
  passage: ReadingPassage;
  questionGroups: ReadingQuestionGroup[];
};

export type ReadingContent = {
  parts?: ReadingPart[];
  passage?: ReadingPassage;
  questionGroups?: ReadingQuestionGroup[];
};

export type WritingContent = {
  task: "TASK_1" | "TASK_2";
  prompt: string;
  minWords: number;
  guidance?: string;
  dataTable?: {
    caption: string;
    headers: string[];
    rows: string[][];
  };
};

/**
 * Đáp án Reading: qid → chuỗi (hoặc mảng chữ cái với MC_MULTI).
 * Khóa "__marked" lưu các câu đánh dấu xem lại (không chấm điểm).
 */
export type ReadingAnswers = Record<string, string | string[]>;
export type WritingAnswers = { essay: string; wordCount: number };

/** Nhãn lựa chọn theo vị trí: headings dùng i/ii/iii…, còn lại A/B/C… */
const ROMANS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];
export function optionLabel(type: QuestionType, index: number): string {
  if (type === "MATCH_HEADINGS") return ROMANS[index] ?? String(index + 1);
  return String.fromCharCode(65 + index); // A, B, C…
}

/** Số "ô câu hỏi" mà một câu chiếm (MC_MULTI chọn 2 → chiếm 2 số). */
export function questionSpan(group: ReadingQuestionGroup, q: ReadingQuestion): number {
  if (group.type !== "MC_MULTI") return 1;
  if (typeof q.selectCount === "number" && q.selectCount > 0) return q.selectCount;
  return Array.isArray(q.answer) ? q.answer.length : 2;
}

/** Quy mọi đề Reading về dạng parts[] thống nhất. */
export function normalizeReadingParts(content: ReadingContent): ReadingPart[] {
  if (content.parts && content.parts.length > 0) return content.parts;
  if (content.passage && content.questionGroups) {
    return [{ passage: content.passage, questionGroups: content.questionGroups }];
  }
  return [];
}

/**
 * Loại bỏ đáp án trước khi gửi đề sang trình duyệt học viên.
 *
 * BẢO MẬT: hàm này dựng lại object theo DANH SÁCH CHO PHÉP (allow-list) chứ
 * không xóa trường — nhờ vậy `answer`, `altAnswers` và `learning` (lời giải mẫu
 * Feynman) mặc định ở lại máy chủ. TUYỆT ĐỐI không thêm hai trường đó vào đây.
 */
export function sanitizeReadingParts(content: ReadingContent): ReadingPart[] {
  return normalizeReadingParts(content).map((part) => ({
    passage: part.passage,
    questionGroups: part.questionGroups.map((g) => ({
      type: g.type,
      instruction: g.instruction,
      options: g.options,
      reuseOptions: g.reuseOptions,
      wordLimit: g.wordLimit,
      boxTitle: g.boxTitle,
      questions: g.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options,
        paragraph: q.paragraph,
        selectCount: questionSpan(g, q),
      })),
    })),
  }));
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?'"()]/g, "")
    .replace(/\s+/g, " ");
}

/** So khớp đáp án GAP: chấp nhận đáp án chính và các biến thể. */
function gapMatches(userAnswer: string, q: ReadingQuestion): boolean {
  const user = normalize(userAnswer);
  if (!user) return false;
  const main = typeof q.answer === "string" ? q.answer : "";
  const accepted = [main, ...(q.altAnswers ?? [])].map(normalize);
  return accepted.includes(user);
}

export type GradedQuestion = {
  id: string;
  prompt: string;
  type: QuestionType;
  part: number; // 1-based
  numberLabel: string; // "7" hoặc "21-22"
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
  /** Điểm đạt được / điểm tối đa của mục này (MC_MULTI có thể >1). */
  score: number;
  maxScore: number;
};

export function gradeReading(
  content: ReadingContent,
  answers: ReadingAnswers
): { scoreRaw: number; scoreTotal: number; detail: GradedQuestion[] } {
  const detail: GradedQuestion[] = [];
  const parts = normalizeReadingParts(content);
  let no = 0;

  parts.forEach((part, partIdx) => {
    for (const group of part.questionGroups) {
      for (const q of group.questions) {
        const span = questionSpan(group, q);
        const startNo = no + 1;
        no += span;
        const numberLabel = span > 1 ? `${startNo}-${no}` : String(startNo);
        const raw = answers[q.id];

        let userAnswer = "";
        let score = 0;
        const maxScore = span;

        if (group.type === "MC_MULTI") {
          const user = Array.isArray(raw)
            ? raw.map((v) => String(v).trim().toUpperCase())
            : [];
          const correctSet = new Set(
            (Array.isArray(q.answer) ? q.answer : []).map((v) =>
              String(v).trim().toUpperCase()
            )
          );
          userAnswer = user.join(", ");
          score = user.filter((v) => correctSet.has(v)).length;
          score = Math.min(score, span);
        } else {
          userAnswer = typeof raw === "string" ? raw : "";
          let correct = false;
          if (group.type === "GAP") {
            correct = gapMatches(userAnswer, q);
          } else if (group.type === "MC") {
            const letter = userAnswer.trim().charAt(0).toUpperCase();
            correct =
              letter ===
              String(q.answer ?? "").trim().charAt(0).toUpperCase();
          } else if (
            group.type === "MATCH_HEADINGS" ||
            group.type === "MATCH_INFO" ||
            group.type === "MATCH_FEATURES" ||
            group.type === "MATCH_ENDINGS"
          ) {
            correct =
              userAnswer.trim().toLowerCase() ===
              String(q.answer ?? "").trim().toLowerCase();
          } else {
            correct = normalize(userAnswer) === normalize(String(q.answer ?? ""));
          }
          score = correct ? 1 : 0;
        }

        const correctAnswer = Array.isArray(q.answer)
          ? q.answer.join(", ")
          : String(q.answer ?? "");
        detail.push({
          id: q.id,
          prompt:
            q.prompt ??
            (group.type === "MATCH_HEADINGS" && q.paragraph
              ? `Paragraph ${q.paragraph}`
              : ""),
          type: group.type,
          part: partIdx + 1,
          numberLabel,
          userAnswer,
          correctAnswer,
          correct: score >= maxScore,
          score,
          maxScore,
        });
      }
    }
  });

  return {
    scoreRaw: detail.reduce((s, d) => s + d.score, 0),
    scoreTotal: detail.reduce((s, d) => s + d.maxScore, 0),
    detail,
  };
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Kiểm tra "mềm" giới hạn từ của dạng GAP (chỉ cảnh báo, không chặn). */
export function violatesWordLimit(value: string, limit: WordLimit): boolean {
  const rule = WORD_LIMIT_RULES[limit];
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const numbers = tokens.filter((t) => /^[\d.,]+$/.test(t));
  const words = tokens.length - numbers.length;
  if (rule.allowNumber) {
    return words > rule.maxWords || numbers.length > 1;
  }
  return tokens.length > rule.maxWords;
}
