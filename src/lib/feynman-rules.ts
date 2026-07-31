/**
 * Quy tắc THUẦN của Feynman Review — không phụ thuộc database nên kiểm thử
 * được độc lập (scripts/test-feynman.ts).
 */

export const FEYNMAN_REVIEW_MODES = ["QUICK", "DEEP"] as const;
export type FeynmanReviewMode = (typeof FEYNMAN_REVIEW_MODES)[number];

export const FEYNMAN_MODE_LIMITS: Record<FeynmanReviewMode, number> = {
  QUICK: 3,
  DEEP: 6,
};

export type FeynmanQuestionResult = {
  id: string;
  type: string;
  part: number;
  numberLabel: string;
  score: number;
  maxScore: number;
  correct: boolean;
};

/**
 * Chọn chế độ chữa bài:
 *  - DEEP khi là đề full test, hoặc độ chính xác dưới 65%, hoặc sai quá 5 mục
 *  - còn lại là QUICK (giữ thói quen chữa bài trong 5–8 phút)
 */
export function chooseFeynmanMode(input: {
  scoreRaw: number;
  scoreTotal: number;
  taskType: string;
  imperfectCount: number;
}): FeynmanReviewMode {
  const pct = input.scoreTotal > 0 ? (input.scoreRaw / input.scoreTotal) * 100 : 0;
  if (
    input.taskType === "READING_FULL" ||
    pct < 65 ||
    input.imperfectCount > 5
  ) {
    return "DEEP";
  }
  return "QUICK";
}

/**
 * Chọn các câu cần chữa sâu:
 *  1. Câu có tỷ lệ điểm thấp nhất trước.
 *  2. Ưu tiên đa dạng dạng câu hỏi (mỗi dạng một câu trước khi lặp lại dạng).
 *  3. QUICK tối đa 3 mục; DEEP tối đa 6 mục.
 *
 * Một câu MC_MULTI có thể chiếm hai số câu nhưng vẫn tính là MỘT mục chữa.
 */
export function selectPriorityMistakes<T extends FeynmanQuestionResult>(
  detail: T[],
  mode: FeynmanReviewMode
): T[] {
  const limit = FEYNMAN_MODE_LIMITS[mode];
  const imperfect = detail
    .filter((q) => !q.correct)
    .sort((a, b) => {
      const aRatio = a.maxScore > 0 ? a.score / a.maxScore : 0;
      const bRatio = b.maxScore > 0 ? b.score / b.maxScore : 0;
      return (
        aRatio - bRatio ||
        a.part - b.part ||
        a.numberLabel.localeCompare(b.numberLabel, undefined, { numeric: true })
      );
    });

  const selected: T[] = [];
  const selectedIds = new Set<string>();
  const seenTypes = new Set<string>();

  // Vòng 1: mỗi dạng câu hỏi lấy một câu để bài học đa dạng
  for (const item of imperfect) {
    if (selected.length >= limit) break;
    if (seenTypes.has(item.type)) continue;
    selected.push(item);
    selectedIds.add(item.id);
    seenTypes.add(item.type);
  }
  // Vòng 2: lấp các chỗ còn lại theo thứ tự ưu tiên
  for (const item of imperfect) {
    if (selected.length >= limit) break;
    if (selectedIds.has(item.id)) continue;
    selected.push(item);
    selectedIds.add(item.id);
  }
  return selected;
}
