/**
 * Xếp hạng Nguyệt Thí — HÀM THUẦN, không chạm database.
 *
 * Đây là chỗ quyết định ai nhận 999.000đ tiền mặt. Sai ở đây không phải là một
 * lỗi giao diện: nó là trao giải cho nhầm người, và không có cách nào sửa mà
 * không làm tổn thương ai đó. Vì vậy mọi thứ ở file này phải:
 *
 *   - TẤT ĐỊNH: cùng dữ liệu vào thì luôn ra cùng kết quả, không phụ thuộc thứ
 *     tự bản ghi lấy từ database hay đồng hồ hệ thống.
 *   - GIẢI THÍCH ĐƯỢC: mỗi thứ hạng phải nói rõ vì sao người này trên người kia.
 *   - KHÔNG HẠ CHUẨN: không đủ điều kiện thì giải để trống, tuyệt đối không đôn
 *     người kém hơn lên cho đủ mâm.
 */

/** Ngưỡng band tối thiểu cho từng giải, áp cho CẢ BA đề. */
export const PRIZE_TIERS = [
  { rank: 1, minBand: 8.5, amount: 999_000, badge: "MONTHLY_CROWN" },
  { rank: 2, minBand: 8.0, amount: 499_000, badge: "MONTHLY_CHANCELLOR" },
  { rank: 3, minBand: 7.5, amount: 199_000, badge: "MONTHLY_GENERAL" },
] as const;

/** Không đạt mức này ở cả ba đề thì không lên Bảng Vàng. */
export const HONOR_BOARD_MIN_BAND = 7.5;

export const PASSAGES_REQUIRED = 3;

export type RankedInput = {
  entryId: string;
  /** Band của từng đề, đúng ba đề. */
  bands: number[];
  rawTotal: number;
  elapsedSeconds: number;
  /** Thời điểm nộp đề CUỐI CÙNG. */
  completedAt: Date;
  /** Bị loại thì không xét, dù điểm cao tới đâu. */
  disqualified?: boolean;
};

export type RankedEntry = RankedInput & {
  averageBand: number;
  lowestBand: number;
};

/**
 * Lọc và sắp xếp thí sinh.
 *
 * Năm tầng phân định, theo đúng thứ tự — tầng sau chỉ dùng khi tầng trước hòa:
 *   1. Band trung bình cao hơn
 *   2. Band thấp nhất cao hơn  (thưởng người đều tay, không thưởng người
 *      được một bài xuất sắc còn lại lẹt đẹt)
 *   3. Tổng số câu đúng nhiều hơn
 *   4. Tổng thời gian làm ít hơn
 *   5. Nộp xong sớm hơn
 */
export function rankEntries(rows: RankedInput[]): RankedEntry[] {
  return rows
    .filter((row) => !row.disqualified)
    .filter((row) => row.bands.length === PASSAGES_REQUIRED)
    .filter((row) => row.bands.every((band) => band >= HONOR_BOARD_MIN_BAND))
    .map((row) => ({
      ...row,
      averageBand:
        row.bands.reduce((sum, band) => sum + band, 0) / row.bands.length,
      lowestBand: Math.min(...row.bands),
    }))
    .sort(
      (a, b) =>
        b.averageBand - a.averageBand ||
        b.lowestBand - a.lowestBand ||
        b.rawTotal - a.rawTotal ||
        a.elapsedSeconds - b.elapsedSeconds ||
        a.completedAt.getTime() - b.completedAt.getTime() ||
        // Chốt chặn cuối: nếu mọi thứ bằng nhau thì xếp theo mã, để kết quả
        // không đổi giữa hai lần chạy.
        a.entryId.localeCompare(b.entryId)
    );
}

export type PrizeWinner = {
  rank: number;
  amount: number;
  badge: string;
  entry: RankedEntry;
};

/**
 * Chọn người nhận giải.
 *
 * Duyệt từ giải Nhất xuống, mỗi giải lấy người XẾP CAO NHẤT còn lại mà đạt
 * ngưỡng của giải đó. Không ai đạt ngưỡng thì giải để trống — và giải dưới
 * vẫn được trao bình thường.
 */
export function selectPrizeWinners(ranked: RankedEntry[]): PrizeWinner[] {
  const remaining = [...ranked];
  const winners: PrizeWinner[] = [];

  for (const tier of PRIZE_TIERS) {
    const index = remaining.findIndex((row) =>
      row.bands.every((band) => band >= tier.minBand)
    );
    if (index < 0) continue; // để trống, KHÔNG hạ chuẩn
    const [entry] = remaining.splice(index, 1);
    winners.push({
      rank: tier.rank,
      amount: tier.amount,
      badge: tier.badge,
      entry,
    });
  }
  return winners;
}

/** Câu giải thích vì sao người này xếp trên người kia — hiện trên Bảng Vàng. */
export function explainOrder(a: RankedEntry, b: RankedEntry): string {
  if (a.averageBand !== b.averageBand) return "band trung bình cao hơn";
  if (a.lowestBand !== b.lowestBand) return "band thấp nhất cao hơn";
  if (a.rawTotal !== b.rawTotal) return "nhiều câu đúng hơn";
  if (a.elapsedSeconds !== b.elapsedSeconds) return "hoàn thành nhanh hơn";
  return "nộp bài sớm hơn";
}

/* ------------------------------------------------------------------ */
/* Điều kiện dự thi                                                     */
/* ------------------------------------------------------------------ */

export type EligibilityFacts = {
  hasEntryTitle: boolean;
  activeDaysLast30: number;
  feynmanCompletedLast30: number;
  recentFirstAttemptBands: number[];
  openHighSeverityFlags: number;
};

export const ELIGIBILITY = {
  activeDays: 10,
  feynmanReviews: 4,
  recentAttempts: 5,
  minAverageBand: 7.0,
} as const;

export type EligibilityResult = {
  eligible: boolean;
  /** Từng điều kiện, để giao diện nói rõ còn thiếu gì thay vì chỉ từ chối. */
  checks: Array<{ label: string; ok: boolean; detail: string }>;
};

/**
 * Danh hiệu là vé vào cửa, KHÔNG phải vé miễn kiểm tra.
 *
 * COMPOSITE_02 được giữ vĩnh viễn, nhưng phong độ 30 ngày gần nhất phải được
 * xét lại mỗi lần đăng ký. Người đạt danh hiệu từ nửa năm trước rồi bỏ học
 * không nên bước thẳng vào cuộc thi có tiền mặt.
 */
export function checkEligibility(facts: EligibilityFacts): EligibilityResult {
  const average =
    facts.recentFirstAttemptBands.length === ELIGIBILITY.recentAttempts
      ? facts.recentFirstAttemptBands.reduce((s, b) => s + b, 0) /
        ELIGIBILITY.recentAttempts
      : 0;

  const checks = [
    {
      label: "Đã đạt danh hiệu Nhận thức — Hành động — Ý chí",
      ok: facts.hasEntryTitle,
      detail: facts.hasEntryTitle ? "Đã có" : "Chưa đạt",
    },
    {
      label: `Ít nhất ${ELIGIBILITY.activeDays} ngày học thật trong 30 ngày qua`,
      ok: facts.activeDaysLast30 >= ELIGIBILITY.activeDays,
      detail: `${facts.activeDaysLast30}/${ELIGIBILITY.activeDays} ngày`,
    },
    {
      label: `Ít nhất ${ELIGIBILITY.feynmanReviews} phiên chữa bài trong 30 ngày qua`,
      ok: facts.feynmanCompletedLast30 >= ELIGIBILITY.feynmanReviews,
      detail: `${facts.feynmanCompletedLast30}/${ELIGIBILITY.feynmanReviews} phiên`,
    },
    {
      label: `Trung bình ${ELIGIBILITY.recentAttempts} bài gần nhất đạt từ ${ELIGIBILITY.minAverageBand}`,
      ok:
        facts.recentFirstAttemptBands.length === ELIGIBILITY.recentAttempts &&
        average >= ELIGIBILITY.minAverageBand,
      detail:
        facts.recentFirstAttemptBands.length < ELIGIBILITY.recentAttempts
          ? `mới có ${facts.recentFirstAttemptBands.length}/${ELIGIBILITY.recentAttempts} bài`
          : `đang ${average.toFixed(1)}`,
    },
    {
      label: "Không có cờ nghi vấn liêm chính đang mở",
      ok: facts.openHighSeverityFlags === 0,
      detail:
        facts.openHighSeverityFlags === 0
          ? "Sạch"
          : `${facts.openHighSeverityFlags} cờ cần xử lý`,
    },
  ];

  return { eligible: checks.every((c) => c.ok), checks };
}
