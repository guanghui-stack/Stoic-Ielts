import "server-only";
import { db } from "@/lib/db";
import { ENTRY_TITLE_CODE } from "@/lib/achievements/catalog";
import { dateKeyOf } from "@/lib/achievements/rules";
import {
  ELIGIBILITY,
  checkEligibility,
  rankEntries,
  selectPrizeWinners,
  type EligibilityResult,
  type RankedInput,
} from "@/lib/competition/ranking";

/**
 * Tầng dữ liệu của Nguyệt Thí. Mọi phép QUYẾT ĐỊNH nằm ở `ranking.ts` (hàm
 * thuần, có kiểm thử); file này chỉ lấy số liệu và ghi kết quả.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const BADGE_DAYS = 30;

/** Kỳ thi đang mở đăng ký hoặc đang diễn ra. */
export async function currentCompetition() {
  return db.competition.findFirst({
    where: { status: { in: ["REGISTRATION", "RUNNING"] } },
    orderBy: { startAt: "asc" },
    include: {
      exercises: {
        orderBy: { orderIndex: "asc" },
        include: { exercise: { select: { id: true, title: true, durationMinutes: true } } },
      },
    },
  });
}

/**
 * Xét lại điều kiện dự thi tại thời điểm đăng ký.
 *
 * Danh hiệu COMPOSITE_02 giữ vĩnh viễn, nhưng phong độ 30 ngày gần nhất phải
 * đạt lại mỗi tháng — người đạt danh hiệu từ nửa năm trước rồi bỏ học không
 * nên bước thẳng vào cuộc thi có tiền mặt.
 */
export async function eligibilityFor(
  userId: string,
  registrationCloseAt: Date
): Promise<EligibilityResult> {
  const from = new Date(registrationCloseAt.getTime() - 30 * DAY_MS);

  const [entryTitle, activeDays, feynmanCount, recent, flags] = await Promise.all([
    db.userTitle.findFirst({
      where: { userId, status: "EARNED", title: { code: ENTRY_TITLE_CODE } },
      select: { id: true },
    }),
    db.studyDay.count({
      where: {
        userId,
        dateKey: { gte: dateKeyOf(from), lte: dateKeyOf(registrationCloseAt) },
        activeSeconds: { gte: 600 },
      },
    }),
    db.feynmanReview.count({
      where: {
        userId,
        status: "COMPLETED",
        completedAt: { gte: from, lte: registrationCloseAt },
      },
    }),
    // Lần làm ĐẦU TIÊN của các đề khác nhau, mới nhất trước
    db.attempt.findMany({
      where: {
        userId,
        validForAchievements: true,
        attemptNumber: 1,
        submittedAt: { lte: registrationCloseAt },
      },
      orderBy: { submittedAt: "desc" },
      take: ELIGIBILITY.recentAttempts,
      select: { band: true },
    }),
    db.integrityFlag.count({
      where: { userId, status: "OPEN", severity: { in: ["HIGH", "CRITICAL"] } },
    }),
  ]);

  return checkEligibility({
    hasEntryTitle: Boolean(entryTitle),
    activeDaysLast30: activeDays,
    feynmanCompletedLast30: feynmanCount,
    recentFirstAttemptBands: recent
      .map((a) => a.band)
      .filter((b): b is number => b !== null),
    openHighSeverityFlags: flags,
  });
}

/**
 * Chốt kết quả một kỳ thi.
 *
 * Chỉ chạy khi quản trị viên đã tự rà soát xong (trạng thái REVIEW). Cố ý
 * KHÔNG tự động: giải thưởng bằng tiền mặt phải có người thật chịu trách nhiệm
 * xác nhận, và một thuật toán không nhìn ra được những dấu hiệu bất thường mà
 * con người nhận ra ngay.
 *
 * Tiền KHÔNG bao giờ tự chuyển. Hệ thống chỉ ghi "đã duyệt, chờ chi".
 */
export async function finalizeCompetition(competitionId: string) {
  const competition = await db.competition.findUnique({
    where: { id: competitionId },
    include: {
      entries: {
        include: {
          attempts: { select: { bandSnapshot: true, rawSnapshot: true, elapsedSeconds: true, submittedAt: true } },
        },
      },
    },
  });
  if (!competition) throw new Error("Không tìm thấy kỳ thi.");
  if (competition.status !== "REVIEW") {
    throw new Error(
      `Chỉ chốt được kỳ thi đang ở bước rà soát (hiện: ${competition.status}).`
    );
  }

  const inputs: RankedInput[] = competition.entries.map((entry) => {
    const done = entry.attempts.filter((a) => a.submittedAt !== null);
    return {
      entryId: entry.id,
      bands: done
        .map((a) => a.bandSnapshot)
        .filter((b): b is number => b !== null),
      rawTotal: done.reduce((s, a) => s + (a.rawSnapshot ?? 0), 0),
      elapsedSeconds: done.reduce((s, a) => s + (a.elapsedSeconds ?? 0), 0),
      completedAt: done.reduce<Date>(
        (latest, a) =>
          a.submittedAt && a.submittedAt > latest ? a.submittedAt : latest,
        new Date(0)
      ),
      disqualified: entry.status === "DISQUALIFIED",
    };
  });

  const ranked = rankEntries(inputs);
  const winners = selectPrizeWinners(ranked);
  const now = new Date();
  const userOf = new Map(competition.entries.map((e) => [e.id, e.userId]));

  await db.$transaction(async (tx) => {
    // Ghi thứ hạng cho MỌI người lên được Bảng Vàng, không chỉ Top 3
    for (const [index, row] of ranked.entries()) {
      const winner = winners.find((w) => w.entry.entryId === row.entryId);
      await tx.competitionEntry.update({
        where: { id: row.entryId },
        data: {
          status: "COMPLETED",
          averageBand: Number(row.averageBand.toFixed(2)),
          lowestBand: row.lowestBand,
          totalRaw: row.rawTotal,
          totalElapsedSeconds: row.elapsedSeconds,
          completedAt: row.completedAt,
          finalRank: index + 1,
          prizeAmount: winner?.amount ?? null,
          // "Đã duyệt, chờ chi" — hệ thống không tự chuyển tiền
          prizeStatus: winner ? "APPROVED" : null,
          finalizedAt: now,
        },
      });
    }

    for (const winner of winners) {
      const userId = userOf.get(winner.entry.entryId);
      if (!userId) continue;
      // Huy hiệu 30 ngày: vinh quang tháng này không nên che mờ người giỏi
      // của tháng sau. Danh hiệu thì vĩnh viễn, huy hiệu thì không.
      await tx.userBadge.upsert({
        where: {
          userId_competitionId_code: {
            userId,
            competitionId: competition.id,
            code: winner.badge,
          },
        },
        update: {},
        create: {
          userId,
          competitionId: competition.id,
          code: winner.badge,
          startsAt: now,
          expiresAt: new Date(now.getTime() + BADGE_DAYS * DAY_MS),
        },
      });
    }

    await tx.competition.update({
      where: { id: competition.id },
      data: { status: "FINALIZED", finalizedAt: now },
    });
  });

  return { ranked: ranked.length, winners: winners.length };
}

/** Bảng Vàng của một kỳ đã chốt — chỉ hiện tên khi thí sinh đồng ý. */
export async function honorBoard(competitionId: string) {
  const entries = await db.competitionEntry.findMany({
    where: { competitionId, finalRank: { not: null } },
    orderBy: { finalRank: "asc" },
    include: { user: { select: { name: true } } },
  });

  return entries.map((entry) => ({
    rank: entry.finalRank as number,
    // PRIVATE là mặc định: không chọn công khai thì hiện "Ẩn danh"
    displayName:
      entry.publicMode === "REAL_NAME"
        ? entry.user.name
        : entry.publicMode === "ALIAS" && entry.publicAlias
          ? entry.publicAlias
          : "Thí sinh ẩn danh",
    averageBand: entry.averageBand,
    lowestBand: entry.lowestBand,
    prizeAmount: entry.prizeAmount,
  }));
}
