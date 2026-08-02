import "server-only";
import { db } from "@/lib/db";
import {
  CATEGORY_LABELS,
  RARITY_LABELS,
  quoteAttribution,
  type Rarity,
  type TitleCategory,
} from "@/lib/achievements/catalog";

/**
 * Chuẩn bị dữ liệu danh hiệu để hiển thị.
 *
 * Hai nguyên tắc:
 *  - Danh hiệu PRIVATE_ONLY chỉ trả về cho chính chủ tài khoản, và tự động bị
 *    che khi học viên đã đạt danh hiệu chuyển hóa. Nó tồn tại để có cái vượt
 *    qua, không phải để nhắc mãi rằng họ từng kém.
 *  - Không đổ cả rừng danh hiệu khóa ra màn hình. Chỉ hiện thứ học viên đang
 *    tiến gần, thứ vừa đạt, và cho họ nút xem toàn bộ nếu muốn.
 */

export type TitleCard = {
  code: string;
  name: string;
  description: string;
  attribution: string;
  quoteSourceUrl: string | null;
  categoryLabel: string;
  rarityLabel: string;
  earned: boolean;
  earnedAt: Date | null;
  percent: number;
  hint: string;
  isPrivate: boolean;
  hasReward: boolean;
};

/** Danh hiệu chuyển hóa che danh hiệu cảnh tỉnh. */
const WARNING_CODE = "TRANSFORM_01_LOW_WARNING";
const RISE_CODE = "TRANSFORM_02_RISE";

function parseHint(progressJson: string | undefined): string {
  if (!progressJson) return "";
  try {
    const parsed = JSON.parse(progressJson) as { hint?: string };
    return typeof parsed.hint === "string" ? parsed.hint : "";
  } catch {
    return "";
  }
}

export type TitleOverview = {
  cards: TitleCard[];
  earnedCount: number;
  totalCount: number;
  /** Danh hiệu đang tiến gần nhất mà chưa đạt. */
  nextUp: TitleCard | null;
  /** Danh hiệu mới nhận gần đây nhất. */
  latest: TitleCard | null;
};

export async function titleOverviewFor(userId: string): Promise<TitleOverview> {
  const [definitions, awards, progress] = await Promise.all([
    db.titleDefinition.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.userTitle.findMany({
      where: { userId, status: "EARNED" },
      select: { titleId: true, earnedAt: true },
    }),
    db.titleProgress.findMany({
      where: { userId },
      select: { titleId: true, percent: true, progressJson: true },
    }),
  ]);

  const earnedAtOf = new Map(awards.map((a) => [a.titleId, a.earnedAt]));
  const progressOf = new Map(progress.map((p) => [p.titleId, p]));
  const earnedCodes = new Set(
    definitions.filter((d) => earnedAtOf.has(d.id)).map((d) => d.code)
  );
  const hasRisen = earnedCodes.has(RISE_CODE);

  const cards: TitleCard[] = definitions
    .filter((d) => {
      // Đã phục hồi thì không nhắc lại giai đoạn sa sút nữa
      if (d.code === WARNING_CODE && hasRisen) return false;
      // Danh hiệu riêng tư chưa đạt thì cũng không hiện — nó không phải mục tiêu
      if (d.visibility === "PRIVATE_ONLY" && !earnedAtOf.has(d.id)) return false;
      return true;
    })
    .map((d) => {
      const p = progressOf.get(d.id);
      const earned = earnedAtOf.has(d.id);
      return {
        code: d.code,
        name: d.name,
        description: d.description,
        attribution: quoteAttribution({
          quoteKind: d.quoteKind as "EXACT" | "ADAPTED" | "ORIGINAL",
          quoteSource: d.quoteSource,
        }),
        quoteSourceUrl: d.quoteSourceUrl,
        categoryLabel: CATEGORY_LABELS[d.category as TitleCategory] ?? d.category,
        rarityLabel: RARITY_LABELS[d.rarity as Rarity] ?? d.rarity,
        earned,
        earnedAt: earnedAtOf.get(d.id) ?? null,
        percent: earned ? 100 : (p?.percent ?? 0),
        hint: earned ? "" : parseHint(p?.progressJson),
        isPrivate: d.visibility === "PRIVATE_ONLY",
        hasReward: Boolean(d.rewardCode),
      };
    });

  const unearned = cards.filter((c) => !c.earned);
  const earnedCards = cards.filter((c) => c.earned);

  return {
    cards,
    earnedCount: earnedCards.length,
    totalCount: cards.length,
    nextUp:
      [...unearned].sort((a, b) => b.percent - a.percent)[0] ?? null,
    latest:
      [...earnedCards].sort(
        (a, b) => (b.earnedAt?.getTime() ?? 0) - (a.earnedAt?.getTime() ?? 0)
      )[0] ?? null,
  };
}
