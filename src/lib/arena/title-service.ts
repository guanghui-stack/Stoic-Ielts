import "server-only";
import { db } from "@/lib/db";
import {
  ARENA_REDEMPTION_TITLE,
  ARENA_TITLE_THRESHOLDS,
  decideWatch,
  evaluateAll,
  isMachineAwardable,
  type DuelRecord,
  type TitleFacts,
} from "@/lib/arena/titles.ts";
import { countableDeclines, type DeclineEvent } from "@/lib/arena/duel.ts";

/**
 * Gắn và gỡ danh hiệu chất vấn — tầng chạm database.
 *
 * BA CHỐT CHẶN, và cả ba đều ở đây chứ không ở tầng gọi:
 *
 * 1. **Máy không bao giờ gắn hai danh hiệu cần người xử.** `isMachineAwardable`
 *    được kiểm ngay trước khi ghi, nên kể cả khi ai đó lỡ tay truyền mã sai vào
 *    thì cũng không có đường nào ghi được.
 * 2. **Gỡ danh hiệu là một sự kiện, không phải một phép xoá.** Dùng `revokedAt`
 *    và `revokeReason` chứ không xoá hàng: người từng bị gắn rồi tự xoá được
 *    phải có bằng chứng cho điều đó, vì đó chính là điều kiện của Cải Quá Tự Tân.
 * 3. **Danh hiệu chất vấn không bao giờ công khai.** Cột `publicVisible` để
 *    `false`, và định nghĩa đã là `PRIVATE_ONLY`.
 */

/* ===================== Dựng dữ liệu để xét ===================== */

/**
 * Trung vị Chiến Lực của những người CÙNG CẤP BẬC.
 *
 * Trả `null` khi mẫu quá nhỏ. Trung vị của bốn người không nói lên gì, mà một
 * con số vô nghĩa ở đây sẽ gắn danh hiệu công khai cho người không đáng.
 */
const MIN_PEER_SAMPLE = 8;

async function peerMedianRating(userId: string): Promise<number | null> {
  const mine = await db.userRank.findUnique({
    where: { userId },
    select: { currentLevel: true },
  });
  if (!mine) return null;

  const peers = await db.userRank.findMany({
    where: { currentLevel: mine.currentLevel, userId: { not: userId } },
    select: { userId: true },
    take: 500,
  });
  if (peers.length < MIN_PEER_SAMPLE) return null;

  const profiles = await db.arenaProfile.findMany({
    where: { userId: { in: peers.map((p) => p.userId) }, user: { isBot: false } },
    select: { chienLuc: true },
  });
  if (profiles.length < MIN_PEER_SAMPLE) return null;

  const sorted = profiles.map((p) => p.chienLuc).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

async function loadTitleFacts(userId: string, now: Date): Promise<TitleFacts> {
  const sides = await db.duelSide.findMany({
    where: { userId, duel: { status: { in: ["SETTLED", "ABANDONED"] } } },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      submittedAt: true,
      surrenderedAt: true,
      abandoned: true,
      duel: {
        select: {
          id: true,
          settledAt: true,
          winnerId: true,
          sides: {
            select: {
              userId: true,
              user: { select: { isBot: true } },
            },
          },
        },
      },
    },
  });

  // Ai là người CHỦ ĐỘNG gửi chiến thư trong từng trận. Chỉ trận chủ động mới
  // đếm cho Ỷ Cường Lăng Nhược.
  const invites = await db.duelInvite.findMany({
    where: { duelId: { in: sides.map((s) => s.duel.id) }, status: "ACCEPTED" },
    select: { duelId: true, fromUserId: true },
  });
  const initiatorByDuel = new Map(invites.map((i) => [i.duelId, i.fromUserId]));

  const ratings = await db.arenaProfile.findMany({
    where: {
      userId: {
        in: [...new Set(sides.flatMap((s) => s.duel.sides.map((x) => x.userId)))],
      },
    },
    select: { userId: true, chienLuc: true },
  });
  const ratingById = new Map(ratings.map((r) => [r.userId, r.chienLuc]));
  const myRating = ratingById.get(userId) ?? 1000;

  const duels: DuelRecord[] = sides
    .filter((s) => s.duel.settledAt !== null)
    .map((s) => {
      const opp = s.duel.sides.find((x) => x.userId !== userId);
      return {
        duelId: s.duel.id,
        settledAt: s.duel.settledAt as Date,
        myRating,
        opponentId: opp?.userId ?? "",
        opponentRating: ratingById.get(opp?.userId ?? "") ?? 1000,
        opponentIsBot: opp?.user.isBot ?? false,
        won: s.duel.winnerId === userId,
        initiatedByMe: initiatorByDuel.get(s.duel.id) === userId,
        abandonedByMe: s.abandoned,
        completedByMe: Boolean(s.submittedAt) && !s.surrenderedAt && !s.abandoned,
      };
    });

  // Lời từ chối, đã qua bốn chốt bảo vệ ở `countableDeclines`.
  const declined = await db.duelInvite.findMany({
    where: { toUserId: userId, status: { in: ["DECLINED", "EXPIRED"] } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      fromUserId: true,
      createdAt: true,
      toWasPresent: true,
      toWasInDuel: true,
    },
  });
  const declineEvents: DeclineEvent[] = declined.map((d) => ({
    challengerId: d.fromUserId,
    dateKey: d.createdAt.toISOString().slice(0, 10),
    wasPresent: d.toWasPresent,
    wasInDuel: d.toWasInDuel,
  }));

  // Vũ Môn đã mở bao nhiêu ngày mà chưa khởi thí.
  const openTrial = await db.userTrial.findFirst({
    where: { userId, status: "AVAILABLE" },
    orderBy: { updatedAt: "asc" },
    select: { updatedAt: true },
  });

  return {
    now,
    rating: myRating,
    peerMedianRating: await peerMedianRating(userId),
    duels,
    countableDeclines: countableDeclines(declineEvents),
    openGateIdleDays: openTrial
      ? Math.floor((now.getTime() - openTrial.updatedAt.getTime()) / 86_400_000)
      : null,
  };
}

/* ===================== Gắn và gỡ ===================== */

async function titleIdOf(code: string): Promise<string | null> {
  const row = await db.titleDefinition.findUnique({
    where: { code },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function awardQuestionTitle(input: {
  userId: string;
  code: string;
  snapshot: unknown;
}): Promise<boolean> {
  // Chốt chặn: máy KHÔNG BAO GIỜ gắn hai danh hiệu cần người xử.
  if (!isMachineAwardable(input.code)) return false;

  const titleId = await titleIdOf(input.code);
  if (!titleId) return false;

  const existing = await db.userTitle.findFirst({
    where: { userId: input.userId, titleId, revokedAt: null },
    select: { id: true },
  });
  if (existing) return false;

  await db.userTitle.upsert({
    where: {
      userId_titleId_cycleKey: { userId: input.userId, titleId, cycleKey: "GLOBAL" },
    },
    create: {
      userId: input.userId,
      titleId,
      cycleKey: "GLOBAL",
      status: "EARNED",
      // Danh hiệu chất vấn KHÔNG BAO GIỜ công khai.
      publicVisible: false,
      progressSnapshotJson: JSON.stringify(input.snapshot),
    },
    update: {
      status: "EARNED",
      revokedAt: null,
      revokeReason: null,
      earnedAt: new Date(),
      progressSnapshotJson: JSON.stringify(input.snapshot),
    },
  });
  return true;
}

/**
 * Gỡ một danh hiệu chất vấn, và mở đường chuộc lỗi.
 *
 * Gỡ bằng `revokedAt` chứ không xoá hàng: Cải Quá Tự Tân đòi bằng chứng rằng
 * người này TỪNG bị gắn rồi tự xoá được, và xoá hàng là xoá luôn bằng chứng đó.
 */
async function revokeQuestionTitle(input: {
  userId: string;
  code: string;
  reason: string;
}): Promise<boolean> {
  const titleId = await titleIdOf(input.code);
  if (!titleId) return false;

  const result = await db.userTitle.updateMany({
    where: { userId: input.userId, titleId, revokedAt: null, status: "EARNED" },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokeReason: input.reason,
    },
  });
  if (result.count === 0) return false;

  await grantRedemptionIfEarned(input.userId);
  return true;
}

/**
 * Cải Quá Tự Tân.
 *
 * Chỉ người TỪNG VẤP mới có được. Nó biến vết trượt thành một thứ đáng kể, và
 * là lời hứa cụ thể rằng nền tảng không đóng đinh ai vĩnh viễn.
 */
async function grantRedemptionIfEarned(userId: string): Promise<void> {
  const cleared = await db.userTitle.count({
    where: {
      userId,
      revokedAt: { not: null },
      title: { category: "ARENA_QUESTION" },
    },
  });
  if (cleared < 1) return;

  const titleId = await titleIdOf(ARENA_REDEMPTION_TITLE);
  if (!titleId) return;

  await db.userTitle.upsert({
    where: { userId_titleId_cycleKey: { userId, titleId, cycleKey: "GLOBAL" } },
    create: {
      userId,
      titleId,
      cycleKey: "GLOBAL",
      status: "EARNED",
      // CÔNG KHAI, khác hẳn năm danh hiệu chất vấn. Chính sự tương phản đó nói
      // lên rằng đường ra là có thật.
      publicVisible: true,
      progressSnapshotJson: JSON.stringify({ clearedTitles: cleared }),
    },
    update: {},
  });
}

/* ===================== Vòng xét ===================== */

export type TitleEvaluation = {
  awarded: string[];
  revoked: string[];
  watching: string[];
};

/**
 * Xét lại toàn bộ danh hiệu chất vấn của một người.
 *
 * Gọi SAU khi quyết toán trận, và khi người đó mở trang hồ sơ. Không chạy job
 * quét: xét tới đâu tính tới đó thì không bao giờ có một job im lặng hỏng mà
 * không ai biết.
 */
export async function evaluateArenaTitles(
  userId: string,
  now = new Date(),
): Promise<TitleEvaluation> {
  // Bot không mang danh hiệu. Bot bỏ mặc và từ chối theo lịch trình của máy, nên
  // gắn Lâm Trận Thoát Đào cho một con bot là lời chê một dòng mã.
  const subject = await db.user.findUnique({
    where: { id: userId },
    select: { isBot: true },
  });
  if (!subject || subject.isBot) return { awarded: [], revoked: [], watching: [] };

  const facts = await loadTitleFacts(userId, now);
  const verdicts = evaluateAll(facts);

  const awarded: string[] = [];
  const revoked: string[] = [];
  const watching: string[] = [];

  for (const v of verdicts) {
    const held = await db.userTitle.findFirst({
      where: {
        userId,
        title: { code: v.code },
        revokedAt: null,
        status: "EARNED",
      },
      select: { id: true },
    });

    if (held) {
      if (v.clearMet) {
        if (await revokeQuestionTitle({ userId, code: v.code, reason: v.explanation })) {
          revoked.push(v.code);
        }
      }
      continue;
    }

    // Chỉ Danh Bất Phù Thực có bộ lọc thời gian. Bốn danh hiệu kia gắn ngay khi
    // điều kiện đúng, vì chúng đo HÀNH VI ĐẾM ĐƯỢC chứ không đo một trạng thái
    // có thể do vận rủi.
    if (v.code !== "ARENA_Q01_DANH_BAT_PHU_THUC") {
      if (v.conditionMet && (await awardQuestionTitle({ userId, code: v.code, snapshot: v }))) {
        awarded.push(v.code);
      }
      continue;
    }

    const watch = await db.arenaTitleWatch.findUnique({
      where: { userId_code: { userId, code: v.code } },
      select: { since: true },
    });
    const decision = decideWatch({
      conditionMet: v.conditionMet,
      watchingSince: watch?.since ?? null,
      now,
      sustainedDays: ARENA_TITLE_THRESHOLDS.DANH_BAT_PHU_THUC.sustainedDays,
    });

    switch (decision.action) {
      case "START_WATCH":
        await db.arenaTitleWatch.upsert({
          where: { userId_code: { userId, code: v.code } },
          create: { userId, code: v.code, since: decision.since },
          update: {},
        });
        watching.push(v.code);
        break;
      case "HOLD":
        if (watch) watching.push(v.code);
        break;
      case "CLEAR_WATCH":
        await db.arenaTitleWatch.deleteMany({ where: { userId, code: v.code } });
        break;
      case "AWARD":
        if (await awardQuestionTitle({ userId, code: v.code, snapshot: v })) {
          awarded.push(v.code);
        }
        await db.arenaTitleWatch.deleteMany({ where: { userId, code: v.code } });
        break;
    }
  }

  return { awarded, revoked, watching };
}

/* ===================== Danh hiệu người xử ===================== */

/**
 * Gắn một trong hai danh hiệu chỉ người xử được.
 *
 * `reviewerId` BẮT BUỘC và được ghi vào ghi chú. Khi có khiếu nại, câu hỏi đầu
 * tiên luôn là "ai quyết định việc này", và không có tên thì không ai trả lời
 * được.
 */
export async function awardManualTitle(input: {
  userId: string;
  code: "ARENA_M01_NGUY_TAO_QUAN_CONG" | "ARENA_M02_NOI_UNG_NGOAI_HOP";
  reviewerId: string;
  evidence: string;
}): Promise<boolean> {
  if (!input.evidence.trim()) {
    throw new Error("[arena] Gắn danh hiệu người xử bắt buộc phải có bằng chứng.");
  }

  const titleId = await titleIdOf(input.code);
  if (!titleId) return false;

  await db.userTitle.upsert({
    where: {
      userId_titleId_cycleKey: { userId: input.userId, titleId, cycleKey: "GLOBAL" },
    },
    create: {
      userId: input.userId,
      titleId,
      cycleKey: "GLOBAL",
      status: "EARNED",
      publicVisible: false,
      progressSnapshotJson: JSON.stringify({
        reviewerId: input.reviewerId,
        evidence: input.evidence,
        at: new Date().toISOString(),
      }),
    },
    update: {
      status: "EARNED",
      revokedAt: null,
      revokeReason: null,
      progressSnapshotJson: JSON.stringify({
        reviewerId: input.reviewerId,
        evidence: input.evidence,
        at: new Date().toISOString(),
      }),
    },
  });
  return true;
}

/**
 * Gỡ một danh hiệu do người xét duyệt bấm.
 *
 * Đây là đường duy nhất gỡ được hai danh hiệu người xử, và cũng là đường cho
 * quản trị viên gỡ nhầm lẫn của máy khi có khiếu nại đúng.
 *
 * LƯU Ý VỀ CẢI QUÁ TỰ TÂN. Gỡ một danh hiệu chất vấn (`ARENA_QUESTION`) thì mở
 * đường chuộc lỗi, vì đó là điều đã hứa. Gỡ một danh hiệu người xử
 * (`ARENA_MANUAL`) thì KHÔNG, và đó là chủ ý: trao một danh hiệu công khai đẹp
 * đẽ ngay sau khi gỡ một kết luận gian lận đã xác minh là quyết định của chủ
 * nền tảng, không phải của một dòng mã viết sẵn.
 */
export async function revokeTitleByReviewer(input: {
  userId: string;
  code: string;
  reviewerId: string;
  reason: string;
}): Promise<boolean> {
  if (!input.reason.trim()) {
    throw new Error("[arena] Gỡ danh hiệu bắt buộc phải ghi lý do.");
  }
  return revokeQuestionTitle({
    userId: input.userId,
    code: input.code,
    reason: `${input.reason.trim()} (người gỡ: ${input.reviewerId})`,
  });
}

/**
 * Mọi danh hiệu chất vấn đang có người mang, cho màn hình xét duyệt.
 *
 * Đây là danh sách để GỠ, không phải danh sách để bêu. Nó chỉ tồn tại sau
 * `requireAdmin`, và không có đường nào từ trang học viên tới đây.
 */
export async function listHeldArenaTitles(take = 100) {
  return db.userTitle.findMany({
    where: {
      revokedAt: null,
      status: "EARNED",
      title: { category: { in: ["ARENA_QUESTION", "ARENA_MANUAL"] } },
    },
    orderBy: { earnedAt: "desc" },
    take,
    select: {
      earnedAt: true,
      progressSnapshotJson: true,
      user: { select: { id: true, name: true, email: true } },
      title: { select: { code: true, name: true, category: true } },
    },
  });
}

/** Danh hiệu chất vấn đang mang, để hiện trên hồ sơ của chính người đó. */
export async function questionTitlesOf(userId: string) {
  return db.userTitle.findMany({
    where: {
      userId,
      revokedAt: null,
      status: "EARNED",
      title: { category: { in: ["ARENA_QUESTION", "ARENA_MANUAL"] } },
    },
    select: {
      earnedAt: true,
      progressSnapshotJson: true,
      title: { select: { code: true, name: true, description: true } },
    },
    orderBy: { earnedAt: "desc" },
  });
}
