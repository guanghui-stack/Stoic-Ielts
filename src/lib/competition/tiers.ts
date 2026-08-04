/**
 * Ba tầng đại thí: Nguyệt Thí, Dương Thí, Thiên Thí.
 *
 * Ba tầng dùng CHUNG engine Competition đã có — cùng luật một lượt, cùng cách
 * chụp snapshot, cùng ranking, cùng Bảng Vàng. Khác nhau đúng năm thứ: chu kỳ,
 * nguồn thí sinh, ngưỡng tuyển chọn, số ghế và thời hạn huy hiệu.
 *
 * Viết thành chính sách dữ liệu thay vì rải if/else khắp nơi, vì đây là chỗ
 * một con số sai sẽ mời nhầm người vào một kỳ thi có tiền thưởng.
 */

export type CompetitionTier = "MONTHLY" | "QUARTERLY" | "ANNUAL";

export type TierPolicy = {
  tier: CompetitionTier;
  name: string;
  /** Tầng nguồn cấp thí sinh. Nguyệt Thí không có nguồn — đăng ký mở. */
  sourceTier: CompetitionTier | null;
  /** Số kỳ nguồn bắt buộc phải có, và phải FINALIZED hết. */
  sourceCount: number;
  /** Lấy top mấy của MỖI kỳ nguồn. */
  topPerSource: number;
  /** Trần số ghế. Không bao giờ được nới ra để lấp cho đủ. */
  maxSeats: number;
  /**
   * Band thấp nhất trong ba đề phải đạt từ mức này.
   * Dùng lowestBand chứ không phải trung bình: người mạnh hai đề và bỏ hẳn một
   * đề không nên được mời lên tầng cao hơn.
   */
  minLowestBand: number | null;
  /** Thời hạn huy hiệu, tính bằng ngày. */
  badgeDurationDays: number;
  /** Số ngày người được mời có để chấp nhận. */
  offerExpiryDays: number;
};

export const TIER_POLICIES: Record<CompetitionTier, TierPolicy> = {
  MONTHLY: {
    tier: "MONTHLY",
    name: "Nguyệt Thí",
    sourceTier: null,
    sourceCount: 0,
    topPerSource: 0,
    maxSeats: Number.POSITIVE_INFINITY,
    minLowestBand: null,
    badgeDurationDays: 30,
    offerExpiryDays: 0,
  },
  QUARTERLY: {
    tier: "QUARTERLY",
    name: "Dương Thí",
    sourceTier: "MONTHLY",
    sourceCount: 3,
    topPerSource: 5,
    maxSeats: 15,
    minLowestBand: 7.5,
    badgeDurationDays: 90,
    offerExpiryDays: 7,
  },
  ANNUAL: {
    tier: "ANNUAL",
    name: "Thiên Thí",
    sourceTier: "QUARTERLY",
    sourceCount: 4,
    topPerSource: 3,
    maxSeats: 12,
    minLowestBand: 8.0,
    badgeDurationDays: 365,
    offerExpiryDays: 7,
  },
};

export function tierPolicy(tier: CompetitionTier): TierPolicy {
  return TIER_POLICIES[tier];
}

/**
 * Khóa mùa giải. Dạng khác nhau theo tầng để không bao giờ đụng nhau:
 * "2026-08" cho tháng, "2026-Q3" cho quý, "2026" cho năm.
 */
export function seasonKey(tier: CompetitionTier, date: Date): string {
  const year = date.getUTCFullYear();
  if (tier === "ANNUAL") return String(year);
  if (tier === "QUARTERLY") {
    return `${year}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
  }
  return `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Kỳ nguồn có thuộc đúng mùa của kỳ đích không. */
export function sourceBelongsToSeason(
  targetTier: CompetitionTier,
  targetSeasonKey: string,
  sourceSeasonKey: string,
): boolean {
  if (targetTier === "QUARTERLY") {
    // "2026-Q3" nhận "2026-07", "2026-08", "2026-09".
    const match = /^(\d{4})-Q([1-4])$/.exec(targetSeasonKey);
    const src = /^(\d{4})-(\d{2})$/.exec(sourceSeasonKey);
    if (!match || !src) return false;
    if (match[1] !== src[1]) return false;
    const quarter = Number(match[2]);
    const month = Number(src[2]);
    return month > (quarter - 1) * 3 && month <= quarter * 3;
  }
  if (targetTier === "ANNUAL") {
    // "2026" nhận "2026-Q1".."2026-Q4".
    const src = /^(\d{4})-Q[1-4]$/.exec(sourceSeasonKey);
    return src !== null && src[1] === targetSeasonKey;
  }
  return false;
}
