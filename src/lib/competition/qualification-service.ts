import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { tierPolicy, type CompetitionTier } from "@/lib/competition/tiers";
import {
  buildQualificationOffers,
  canBuildOffers,
  type SourceCompetition,
} from "@/lib/competition/qualification";

/**
 * Tầng nối giữa luật tuyển chọn thuần và database.
 *
 * Mọi phán xét ai đủ điều kiện đều nằm ở `qualification.ts` dưới dạng hàm
 * thuần đã có kiểm thử. File này chỉ đọc dữ liệu, gọi xuống đó, rồi ghi kết
 * quả — không tự quyết định gì thêm.
 *
 * Hai điều tầng này chịu trách nhiệm mà hàm thuần không làm được: chỉ sinh vé
 * khi mọi kỳ nguồn đã FINALIZED, và đảm bảo không ai vào được Dương Thí hay
 * Thiên Thí mà thiếu vé đã chấp nhận — kể cả khi gọi thẳng Server Action.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Đọc các kỳ nguồn của một kỳ đích, kèm kết quả từng thí sinh. */
async function loadSources(targetCompetitionId: string): Promise<SourceCompetition[]> {
  const links = await db.competitionSource.findMany({
    where: { targetCompetitionId },
    orderBy: { orderIndex: "asc" },
    select: {
      orderIndex: true,
      sourceCompetitionId: true,
      source: {
        select: {
          id: true,
          seasonKey: true,
          finalizedAt: true,
          entries: {
            select: {
              id: true,
              userId: true,
              finalRank: true,
              lowestBand: true,
              completedAt: true,
              reviewStatus: true,
            },
          },
        },
      },
    },
  });

  // Khiếu nại đang mở của toàn bộ kỳ nguồn, lấy một lần thay vì mỗi entry một
  // truy vấn. Đường quan hệ dài vì CompetitionAppeal gắn với phiên thi chứ
  // không gắn thẳng với kỳ thi: appeal → session → attempt → entry → kỳ.
  const sourceIds = links.map((link) => link.sourceCompetitionId);
  const openAppeals = sourceIds.length
    ? await db.competitionAppeal.findMany({
        where: {
          status: { notIn: ["RESOLVED", "REJECTED"] },
          session: { competitionAttempt: { entry: { competitionId: { in: sourceIds } } } },
        },
        select: {
          userId: true,
          session: {
            select: {
              competitionAttempt: { select: { entry: { select: { competitionId: true } } } },
            },
          },
        },
      })
    : [];
  const appealKeys = new Set(
    openAppeals.map(
      (a) => `${a.session.competitionAttempt.entry.competitionId}:${a.userId}`,
    ),
  );

  return links.map((link) => ({
    competitionId: link.source.id,
    seasonKey: link.source.seasonKey,
    orderIndex: link.orderIndex,
    finalized: link.source.finalizedAt !== null,
    entries: link.source.entries
      // Người chưa có thứ hạng chung cuộc thì chưa xét được.
      .filter((entry) => entry.finalRank !== null)
      .map((entry) => ({
        entryId: entry.id,
        userId: entry.userId,
        rank: entry.finalRank as number,
        lowestBand: entry.lowestBand ?? 0,
        completedAt: entry.completedAt !== null,
        completedAll: entry.completedAt !== null,
        integrityClear: entry.reviewStatus === "CLEAR",
        hasOpenAppeal: appealKeys.has(`${link.source.id}:${entry.userId}`),
      })),
  }));
}

/**
 * Tính thử kết quả tuyển chọn mà KHÔNG ghi gì.
 *
 * Quản trị viên phải thấy được ai sẽ nhận vé, ai bị loại và vì sao, TRƯỚC khi
 * bấm nút. Sinh vé rồi mới phát hiện gắn nhầm kỳ nguồn nghĩa là đã gửi lời
 * mời sai cho người thật.
 */
export async function previewQualifications(targetCompetitionId: string) {
  const target = await db.competition.findUnique({
    where: { id: targetCompetitionId },
    select: { tier: true },
  });
  if (!target) return null;

  const policy = tierPolicy(target.tier as CompetitionTier);
  const sources = await loadSources(targetCompetitionId);
  const gate = canBuildOffers(sources, policy);

  return {
    policy,
    sourceCount: sources.length,
    ready: gate.ok,
    blockedReason: gate.ok ? null : gate.reason,
    // Vẫn tính thử ngay cả khi chưa đủ điều kiện: quản trị viên cần thấy
    // danh sách đang hình thành thế nào để biết còn thiếu gì.
    result: buildQualificationOffers(sources, policy),
  };
}

export type GenerateResult =
  | { ok: false; error: string }
  | {
      ok: true;
      created: number;
      unfilledSeats: number;
      rejected: Array<{ userId: string; sourceCompetitionId: string; reason: string }>;
    };

/**
 * Sinh vé mời cho một kỳ đích.
 *
 * Idempotent: chạy lại không tạo vé trùng nhờ khóa duy nhất
 * (targetCompetitionId, userId). Vé đã có thì bỏ qua, không ghi đè — người đã
 * chấp nhận rồi không được đẩy về trạng thái OFFERED.
 */
export async function generateQualifications(
  targetCompetitionId: string,
): Promise<GenerateResult> {
  const target = await db.competition.findUnique({
    where: { id: targetCompetitionId },
    select: { id: true, tier: true, seasonKey: true },
  });
  if (!target) return { ok: false, error: "Không tìm thấy kỳ thi." };

  const policy = tierPolicy(target.tier as CompetitionTier);
  const sources = await loadSources(targetCompetitionId);

  const gate = canBuildOffers(sources, policy);
  if (!gate.ok) return { ok: false, error: gate.reason };

  const result = buildQualificationOffers(sources, policy);
  const expiresAt = new Date(Date.now() + policy.offerExpiryDays * DAY_MS);

  let created = 0;
  for (const offer of result.offers) {
    try {
      await db.competitionQualification.create({
        data: {
          targetCompetitionId,
          sourceCompetitionId: offer.sourceCompetitionId,
          sourceEntryId: offer.sourceEntryId,
          userId: offer.userId,
          sourceRank: offer.sourceRank,
          route: offer.route,
          expiresAt,
        },
      });
      created += 1;
    } catch (error) {
      // P2002 = đã có vé cho người này ở kỳ này. Đúng như thiết kế, bỏ qua.
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      ) {
        throw error;
      }
    }
  }

  return {
    ok: true,
    created,
    unfilledSeats: result.unfilledSeats,
    rejected: result.rejected,
  };
}

/**
 * Đánh dấu hết hạn những vé quá thời gian chấp nhận.
 *
 * Cố ý KHÔNG tự động mời người kế tiếp ở đây: cascade phải là quyết định có
 * kiểm soát của quản trị viên, vì mời thêm người sau khi kỳ thi sắp bắt đầu
 * là thay đổi luật chơi giữa chừng.
 */
export async function expireStaleOffers(now = new Date()): Promise<number> {
  const result = await db.competitionQualification.updateMany({
    where: { status: "OFFERED", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });
  return result.count;
}

export type AcceptResult = { ok: true } | { ok: false; error: string };

/**
 * Học viên chấp nhận vé và trở thành thí sinh chính thức.
 *
 * Toàn bộ nằm trong một giao dịch: tạo CompetitionEntry và đổi trạng thái vé
 * phải cùng thành công hoặc cùng thất bại. Nếu tách ra, một lỗi giữa chừng sẽ
 * để lại vé ACCEPTED mà không có suất thi, và học viên tưởng mình đã vào.
 */
export async function acceptQualification(
  qualificationId: string,
  userId: string,
  now = new Date(),
): Promise<AcceptResult> {
  const offer = await db.competitionQualification.findUnique({
    where: { id: qualificationId },
    select: {
      id: true,
      userId: true,
      status: true,
      expiresAt: true,
      targetCompetitionId: true,
    },
  });

  if (!offer || offer.userId !== userId) {
    return { ok: false, error: "Không tìm thấy vé mời này." };
  }
  if (offer.status === "ACCEPTED") return { ok: true };
  if (offer.status !== "OFFERED") {
    return { ok: false, error: "Vé mời không còn hiệu lực." };
  }
  if (offer.expiresAt < now) {
    await db.competitionQualification.update({
      where: { id: offer.id },
      data: { status: "EXPIRED" },
    });
    return { ok: false, error: "Vé mời đã hết hạn." };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.competitionEntry.create({
        data: {
          competitionId: offer.targetCompetitionId,
          userId,
          entrySource: "QUALIFIED",
          qualificationId: offer.id,
        },
      });
      await tx.competitionQualification.update({
        where: { id: offer.id },
        data: { status: "ACCEPTED", acceptedAt: now },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Bạn đã có suất thi ở kỳ này." };
    }
    throw error;
  }

  return { ok: true };
}

export async function declineQualification(
  qualificationId: string,
  userId: string,
): Promise<AcceptResult> {
  const result = await db.competitionQualification.updateMany({
    where: { id: qualificationId, userId, status: "OFFERED" },
    data: { status: "DECLINED" },
  });
  return result.count === 1
    ? { ok: true }
    : { ok: false, error: "Vé mời không còn ở trạng thái chờ trả lời." };
}

/**
 * Chốt chặn phía máy chủ cho hai tầng trên.
 *
 * Đặc tả §13.1 đòi hỏi rõ: người không có vé ACCEPTED không được tạo
 * CompetitionEntry cho Dương Thí hoặc Thiên Thí, KỂ CẢ khi gọi thẳng Server
 * Action. Giao diện ẩn nút không phải là bảo vệ.
 */
export async function assertMayEnter(
  competitionId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const competition = await db.competition.findUnique({
    where: { id: competitionId },
    select: { tier: true },
  });
  if (!competition) return { ok: false, error: "Không tìm thấy kỳ thi." };

  const policy = tierPolicy(competition.tier as CompetitionTier);
  // Nguyệt Thí dùng đăng ký mở, điều kiện do Danh hiệu quyết định ở nơi khác.
  if (policy.sourceTier === null) return { ok: true };

  const accepted = await db.competitionQualification.findFirst({
    where: { targetCompetitionId: competitionId, userId, status: "ACCEPTED" },
    select: { id: true },
  });

  return accepted
    ? { ok: true }
    : {
        ok: false,
        error: `${policy.name} chỉ dành cho người được tuyển chọn từ ${tierPolicy(policy.sourceTier).name}.`,
      };
}

/** Vé của một học viên ở một kỳ, để giao diện hiển thị. */
export async function qualificationFor(competitionId: string, userId: string) {
  return db.competitionQualification.findUnique({
    where: { targetCompetitionId_userId: { targetCompetitionId: competitionId, userId } },
    select: {
      id: true,
      status: true,
      sourceRank: true,
      route: true,
      offeredAt: true,
      expiresAt: true,
      acceptedAt: true,
    },
  });
}
