// Import tương đối kèm đuôi .ts để script kiểm thử nạp thẳng bằng node được.
import { type TierPolicy } from "./tiers.ts";

/**
 * Sinh vé tuyển chọn từ tầng dưới lên tầng trên. Hàm thuần, không chạm database.
 *
 * Đây là chỗ dễ sai nhất của cả hệ thi đấu, và sai ở đây nghĩa là mời nhầm
 * người vào một kỳ thi có tiền thưởng. Bốn quy tắc bắt buộc, mỗi quy tắc đều
 * có kiểm thử canh:
 *
 *  1. MỘT người chỉ có MỘT ghế ở kỳ đích. Ai đủ điều kiện từ nhiều kỳ nguồn
 *     thì giữ suất ở kỳ mà họ xếp hạng tốt nhất.
 *  2. Ghế trùng được nhường cho người kế tiếp của CHÍNH kỳ nguồn đó, không
 *     phải cho người giỏi nhất còn lại. Nếu không, một kỳ nguồn mạnh sẽ nuốt
 *     hết ghế của kỳ nguồn yếu hơn, và tháng nào thi cũng như nhau thì đâu
 *     còn ý nghĩa thi hằng tháng.
 *  3. KHÔNG hạ ngưỡng để lấp đủ ghế. Danh sách thiếu người đạt chuẩn thì kỳ
 *     thi ít người hơn, chấp nhận được; mời người chưa đạt thì phá luôn giá
 *     trị của tấm vé.
 *  4. Chỉ người có integrity CLEAR và không còn khiếu nại đang mở mới được
 *     xét. Đang rà soát nghĩa là chưa kết luận, mà chưa kết luận thì không
 *     trao vé.
 */

export type SourceEntry = {
  entryId: string;
  userId: string;
  /** Thứ hạng trong kỳ nguồn, 1 là cao nhất. */
  rank: number;
  /** Band thấp nhất trong ba đề của kỳ nguồn. */
  lowestBand: number;
  /** Đã hoàn thành đủ ba đề chưa. */
  completedAll: boolean;
  integrityClear: boolean;
  hasOpenAppeal: boolean;
};

export type SourceCompetition = {
  competitionId: string;
  seasonKey: string;
  /** Thứ tự ưu tiên khi chia ghế, thường là thứ tự thời gian. */
  orderIndex: number;
  finalized: boolean;
  entries: SourceEntry[];
};

export type QualificationOffer = {
  userId: string;
  sourceCompetitionId: string;
  sourceEntryId: string;
  sourceRank: number;
  /** DIRECT là suất top gốc; CASCADE là ghế được nhường xuống. */
  route: "DIRECT" | "CASCADE";
};

export type BuildResult = {
  offers: QualificationOffer[];
  /** Ghế bỏ trống vì không còn ai đạt ngưỡng. Đây là kết quả hợp lệ. */
  unfilledSeats: number;
  /** Lý do từng người bị loại, để trang quản trị giải thích được. */
  rejected: Array<{ userId: string; sourceCompetitionId: string; reason: string }>;
};

export function isEligible(
  entry: SourceEntry,
  policy: TierPolicy,
): { ok: true } | { ok: false; reason: string } {
  if (!entry.completedAll) {
    return { ok: false, reason: "Chưa hoàn thành đủ ba đề của kỳ nguồn." };
  }
  if (!entry.integrityClear) {
    return { ok: false, reason: "Kết quả đang trong diện rà soát liêm chính." };
  }
  if (entry.hasOpenAppeal) {
    return { ok: false, reason: "Còn khiếu nại chưa khép lại." };
  }
  if (policy.minLowestBand !== null && entry.lowestBand < policy.minLowestBand) {
    return {
      ok: false,
      reason: `Band thấp nhất ${entry.lowestBand} chưa đạt ngưỡng ${policy.minLowestBand}.`,
    };
  }
  return { ok: true };
}

export function buildQualificationOffers(
  sources: SourceCompetition[],
  policy: TierPolicy,
): BuildResult {
  const offers: QualificationOffer[] = [];
  const rejected: BuildResult["rejected"] = [];
  /** userId đã có ghế, và thứ hạng nguồn tốt nhất đang giữ. */
  const seated = new Map<string, QualificationOffer>();

  const ordered = [...sources].sort((a, b) => a.orderIndex - b.orderIndex);

  for (const source of ordered) {
    if (!source.finalized) continue;

    const ranked = [...source.entries].sort((a, b) => a.rank - b.rank);
    let taken = 0;

    for (const entry of ranked) {
      if (taken >= policy.topPerSource) break;
      if (seated.size >= policy.maxSeats && !seated.has(entry.userId)) break;

      const check = isEligible(entry, policy);
      if (!check.ok) {
        rejected.push({
          userId: entry.userId,
          sourceCompetitionId: source.competitionId,
          reason: check.reason,
        });
        // Người không đạt KHÔNG chiếm ghế, nên ghế đó dành cho người kế tiếp
        // của chính kỳ này — đó là ý nghĩa của cascade.
        continue;
      }

      const existing = seated.get(entry.userId);
      if (existing) {
        // Đã có ghế từ kỳ khác. Giữ suất ở kỳ họ xếp hạng tốt hơn; ghế thừa
        // ở kỳ này nhường xuống người kế tiếp.
        if (entry.rank < existing.sourceRank) {
          const replacement: QualificationOffer = {
            userId: entry.userId,
            sourceCompetitionId: source.competitionId,
            sourceEntryId: entry.entryId,
            sourceRank: entry.rank,
            route: "DIRECT",
          };
          const index = offers.findIndex((offer) => offer.userId === entry.userId);
          if (index >= 0) offers[index] = replacement;
          seated.set(entry.userId, replacement);
        }
        taken += 1;
        continue;
      }

      const offer: QualificationOffer = {
        userId: entry.userId,
        sourceCompetitionId: source.competitionId,
        sourceEntryId: entry.entryId,
        sourceRank: entry.rank,
        route: taken < policy.topPerSource && entry.rank <= policy.topPerSource
          ? "DIRECT"
          : "CASCADE",
      };
      offers.push(offer);
      seated.set(entry.userId, offer);
      taken += 1;
    }
  }

  const unfilledSeats = Number.isFinite(policy.maxSeats)
    ? Math.max(0, policy.maxSeats - offers.length)
    : 0;

  return { offers, unfilledSeats, rejected };
}

/**
 * Kiểm tra một kỳ đích đã đủ điều kiện sinh vé chưa.
 *
 * Sinh vé khi kỳ nguồn chưa chốt xong là trao vé dựa trên thứ hạng còn có thể
 * đổi — người bị tụt hạng sau khiếu nại sẽ phải thu hồi vé, việc mà không nên
 * xảy ra bao giờ.
 */
export function canBuildOffers(
  sources: SourceCompetition[],
  policy: TierPolicy,
): { ok: true } | { ok: false; reason: string } {
  if (policy.sourceTier === null) {
    return { ok: false, reason: "Tầng này dùng đăng ký mở, không sinh vé tuyển chọn." };
  }
  if (sources.length !== policy.sourceCount) {
    return {
      ok: false,
      reason: `Cần đúng ${policy.sourceCount} kỳ nguồn, hiện có ${sources.length}.`,
    };
  }
  const pending = sources.filter((source) => !source.finalized);
  if (pending.length > 0) {
    return {
      ok: false,
      reason: `Còn ${pending.length} kỳ nguồn chưa chốt kết quả.`,
    };
  }
  return { ok: true };
}
