/**
 * Hằng số của hệ thống Feynman Review cho IELTS Reading.
 * Không import gì từ database/server nên dùng được ở cả client lẫn kiểm thử.
 */

export const FEYNMAN_REVIEW_STATUSES = ["DRAFT", "REVEALED", "COMPLETED"] as const;
export type FeynmanReviewStatus = (typeof FEYNMAN_REVIEW_STATUSES)[number];

/** 10 nhóm nguyên nhân sai — học viên chọn đúng một mã cho mỗi câu chữa sâu. */
export const FEYNMAN_ERROR_TYPES = [
  "LOCATION",
  "PARAPHRASE",
  "LOGIC",
  "OVER_INFERENCE",
  "DISTRACTOR",
  "QUESTION_RULE",
  "WORD_LIMIT",
  "TIME_PRESSURE",
  "VOCABULARY",
  "CARELESSNESS",
] as const;
export type FeynmanErrorType = (typeof FEYNMAN_ERROR_TYPES)[number];

export const FEYNMAN_ERROR_LABELS: Record<FeynmanErrorType, string> = {
  LOCATION: "Không định vị đúng đoạn chứa thông tin",
  PARAPHRASE: "Không nhận ra paraphrase",
  LOGIC: "Hiểu sai quan hệ logic hoặc ý chính",
  OVER_INFERENCE: "Suy diễn vượt quá nội dung bài đọc",
  DISTRACTOR: "Bị phương án nhiễu đánh lừa",
  QUESTION_RULE: "Áp dụng sai quy tắc của dạng câu hỏi",
  WORD_LIMIT: "Vi phạm giới hạn từ hoặc hình thức đáp án",
  TIME_PRESSURE: "Thiếu thời gian hoặc phân bổ thời gian chưa hợp lý",
  VOCABULARY: "Thiếu từ vựng làm sai nghĩa",
  CARELESSNESS: "Bất cẩn khi đọc hoặc nhập đáp án",
};

/** Giới hạn ký tự — kiểm tra ở MÁY CHỦ, thuộc tính HTML chỉ là lớp trải nghiệm. */
export const FEYNMAN_LIMITS = {
  passageSummary: { min: 80, max: 1000 },
  paragraphMap: { min: 30, max: 1500 },
  confusingPoint: { min: 0, max: 500 },
  evidenceParagraph: { min: 1, max: 40 },
  evidenceText: { min: 10, max: 600 },
  firstExplanation: { min: 30, max: 1000 },
  revisedExplanation: { min: 40, max: 1200 },
  lessonRule: { min: 15, max: 400 },
  finalTeachBack: { min: 100, max: 1500 },
  finalRule: { min: 20, max: 400 },
} as const;

export function isFeynmanErrorType(value: string): value is FeynmanErrorType {
  return (FEYNMAN_ERROR_TYPES as readonly string[]).includes(value);
}

/** Nhãn mức độ tự tin 1–5 dùng chung cho trước và sau khi chữa bài. */
export const CONFIDENCE_LABELS: Record<number, string> = {
  1: "Chưa hiểu gì",
  2: "Mơ hồ",
  3: "Tạm được",
  4: "Khá chắc",
  5: "Giảng lại được cho người khác",
};
