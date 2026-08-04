// Import tương đối kèm đuôi .ts để script kiểm thử nạp thẳng bằng node được.
import type { RankAttemptFact } from "./rules.ts";

/**
 * Sổ Sơ Hở — xếp hạng dạng câu yếu nhất. Hàm thuần, không chạm database.
 *
 * Đây là chỗ rất dễ nói dối người học bằng thống kê. Hai hàng rào bắt buộc:
 *
 *  1. Chỉ kết luận khi có đủ mẫu. Sai 2 trên 3 câu KHÔNG phải điểm yếu, chỉ
 *     là chưa đủ dữ liệu. Bảo một học viên rằng họ dốt một dạng câu dựa trên
 *     ba câu là vừa sai vừa làm họ nản.
 *  2. Chỉ nhìn 90 ngày gần nhất. Lỗi của nửa năm trước có thể đã sửa xong;
 *     gộp cả vào thì bảng luôn chỉ về quá khứ chứ không về hiện tại.
 *
 * Xu hướng so nửa cũ với nửa mới trong cùng cửa sổ. Cần tối thiểu số mẫu ở
 * MỖI nửa mới dám kết luận tăng hay giảm, nếu không một tuần nghỉ học sẽ bị
 * đọc thành "đang tệ đi".
 */

export const MIN_SAMPLES = 20;
export const WINDOW_DAYS = 90;
const MIN_SAMPLES_PER_HALF = 8;
/** Dưới ngưỡng này coi như đi ngang, không phải tiến bộ hay tụt lùi. */
const TREND_EPSILON = 0.05;

export type WeaknessTrend = "UP" | "FLAT" | "DOWN";

export type WeaknessRow = {
  questionType: string;
  correct: number;
  total: number;
  accuracy: number;
  trend: WeaknessTrend;
};

function accuracyOf(stats: { correct: number; total: number }): number {
  return stats.total > 0 ? stats.correct / stats.total : 0;
}

export function weaknessRows(
  attempts: RankAttemptFact[],
  now: Date,
  options: { minSamples?: number; windowDays?: number } = {},
): WeaknessRow[] {
  const minSamples = options.minSamples ?? MIN_SAMPLES;
  const windowDays = options.windowDays ?? WINDOW_DAYS;
  const from = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const midpoint = now.getTime() - (windowDays / 2) * 24 * 60 * 60 * 1000;

  const inWindow = attempts.filter(
    (attempt) => attempt.valid && attempt.submittedAt.getTime() >= from,
  );

  const totals = new Map<string, { correct: number; total: number }>();
  const older = new Map<string, { correct: number; total: number }>();
  const newer = new Map<string, { correct: number; total: number }>();

  for (const attempt of inWindow) {
    const half = attempt.submittedAt.getTime() < midpoint ? older : newer;
    for (const [type, stat] of Object.entries(attempt.questionTypeStats)) {
      for (const bucket of [totals, half]) {
        const acc = bucket.get(type) ?? { correct: 0, total: 0 };
        acc.correct += stat.correct;
        acc.total += stat.total;
        bucket.set(type, acc);
      }
    }
  }

  const rows: WeaknessRow[] = [];
  for (const [questionType, stat] of totals) {
    if (stat.total < minSamples) continue;

    const before = older.get(questionType);
    const after = newer.get(questionType);
    let trend: WeaknessTrend = "FLAT";
    if (
      before &&
      after &&
      before.total >= MIN_SAMPLES_PER_HALF &&
      after.total >= MIN_SAMPLES_PER_HALF
    ) {
      const delta = accuracyOf(after) - accuracyOf(before);
      if (delta > TREND_EPSILON) trend = "UP";
      else if (delta < -TREND_EPSILON) trend = "DOWN";
    }

    rows.push({
      questionType,
      correct: stat.correct,
      total: stat.total,
      accuracy: accuracyOf(stat),
      trend,
    });
  }

  // Yếu nhất lên đầu. Hòa thì ưu tiên dạng có nhiều mẫu hơn vì kết luận trên
  // mẫu lớn đáng tin hơn.
  return rows.sort(
    (a, b) => a.accuracy - b.accuracy || b.total - a.total,
  );
}

export const TREND_LABELS: Record<WeaknessTrend, string> = {
  UP: "Đang tốt lên",
  FLAT: "Đi ngang",
  DOWN: "Đang tụt",
};
