/**
 * Trận đấu — tầng chạm database, giai đoạn P3.
 *
 * P3 chưa có realtime. Hai bên vào trận qua chiến thư, làm cùng một đề, máy chủ
 * chấm và quyết toán. P4 mới thêm SSE, ghép cặp và Chiến Lực.
 *
 * BỐN CHỖ KHÔNG ĐƯỢC NỚI:
 *
 * 1. **Trừ cược trong CÙNG transaction với việc chuyển sang ARMED.** Trừ ở một
 *    transaction khác thì có một khoảnh khắc trận đã vũ trang mà tiền chưa mất,
 *    và hai tab mở song song sẽ cược cùng một số Quân Công hai lần.
 * 2. **Máy chủ chấm, máy khách chỉ gửi đáp án.** Giống hệt Thí Bút.
 * 3. **`elapsedMs` đo ở máy chủ**, lấy hiệu giữa `startedAt` và lúc nhận bài.
 *    Đồng hồ trình duyệt không phải bằng chứng.
 * 4. **Quyết toán phải chống ghi hai lần** bằng `DUEL:<duelId>:<userId>:<kind>`
 *    ở ràng buộc unique, không bằng một câu `if`.
 */
import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { meritBalance } from "@/lib/merit/merit.ts";
import {
  DUEL_RULE_VERSION,
  INVITE_TTL_SECONDS,
  canTransition,
  decideStake,
  decideWinner,
  duelLedgerKey,
  hasStakeDeducted,
  inviteExpired,
  refundEntries,
  settlementEntries,
  truceGate,
  type DuelStatus,
  type DuelTier,
  type MeritEntry,
  type SideResult,
  type Verdict,
} from "@/lib/arena/duel.ts";

/* ===================== Chiến thư ===================== */

export type InviteResult =
  | { ok: true; inviteId: string; expiresAt: Date }
  | {
      ok: false;
      reason: "SELF" | "ALREADY_PENDING" | "BAD_STAKE";
      need?: number;
    };

/**
 * Gửi chiến thư.
 *
 * Mỗi cặp chỉ được có MỘT thư treo. Không có luật này thì một người gửi liên
 * tục và hộp thư của người kia thành bãi rác, đúng thứ bốn chốt bảo vệ ở mục
 * 04 sinh ra để tránh.
 *
 * Chưa trừ đồng nào ở bước này: trước ARMED thì chưa ai mất gì.
 */
export async function sendInvite(input: {
  fromUserId: string;
  toUserId: string;
  stake: number;
  toWasPresent?: boolean;
  now?: Date;
}): Promise<InviteResult> {
  const now = input.now ?? new Date();
  if (input.fromUserId === input.toUserId) return { ok: false, reason: "SELF" };

  const existing = await db.duelInvite.findFirst({
    where: {
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      status: "PENDING",
      expiresAt: { gt: now },
    },
    select: { id: true },
  });
  if (existing) return { ok: false, reason: "ALREADY_PENDING" };

  const [fromWallet, toWallet] = await Promise.all([
    db.meritWallet.findUnique({ where: { userId: input.fromUserId } }),
    db.meritWallet.findUnique({ where: { userId: input.toUserId } }),
  ]);
  const decision = decideStake({
    requested: input.stake,
    challengerBalance: fromWallet ? meritBalance(fromWallet) : 0,
    opponentBalance: toWallet ? meritBalance(toWallet) : 0,
  });
  if (!decision.ok) return { ok: false, reason: "BAD_STAKE", need: decision.need };

  // Người bị thách có đang trong trận nào chưa xong không. Một trong bốn chốt:
  // đang bận đánh thì lời từ chối không được tính vào sổ.
  const inDuel = await db.duelSide.findFirst({
    where: {
      userId: input.toUserId,
      duel: { status: { in: ["ARMED", "LIVE", "RESOLVING"] } },
    },
    select: { id: true },
  });

  const expiresAt = new Date(now.getTime() + INVITE_TTL_SECONDS * 1000);
  const invite = await db.duelInvite.create({
    data: {
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      stake: decision.stake,
      expiresAt,
      toWasPresent: input.toWasPresent ?? false,
      toWasInDuel: Boolean(inDuel),
    },
    select: { id: true },
  });
  return { ok: true, inviteId: invite.id, expiresAt };
}

export type AcceptResult =
  | { ok: true; duelId: string; deadlineAt: Date }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "INSUFFICIENT" | "NO_EXERCISE" };

/**
 * Nhận lời: tạo trận, TRỪ CƯỢC CẢ HAI BÊN, chuyển thẳng sang LIVE.
 *
 * ARMED và LIVE xảy ra trong cùng một transaction vì ở P3 chưa có bước chờ nào
 * giữa hai trạng thái đó. Cột `armedAt` vẫn ghi riêng, để P4 tách ra được mà
 * không phải đổi dữ liệu cũ.
 */
export async function acceptInvite(input: {
  inviteId: string;
  userId: string;
  durationMinutes?: number;
  now?: Date;
}): Promise<AcceptResult> {
  const now = input.now ?? new Date();

  const invite = await db.duelInvite.findFirst({
    where: { id: input.inviteId, toUserId: input.userId, status: "PENDING" },
  });
  if (!invite) return { ok: false, reason: "NOT_FOUND" };
  if (inviteExpired(invite.createdAt, now)) {
    await db.duelInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED", respondedAt: now },
    });
    return { ok: false, reason: "EXPIRED" };
  }

  // Đề dùng cho trận: ưu tiên đề đánh dấu arenaOnly, vì rò rỉ ở sân đấu không
  // quan trọng bằng ở kho bán.
  const exercise =
    (await db.exercise.findFirst({
      where: { skill: "READING", arenaOnly: true, published: true },
      select: { id: true, durationMinutes: true },
      orderBy: { createdAt: "asc" },
    })) ??
    (await db.exercise.findFirst({
      where: { skill: "READING", published: true, competitionOnly: false },
      select: { id: true, durationMinutes: true },
      orderBy: { createdAt: "asc" },
    }));
  if (!exercise) return { ok: false, reason: "NO_EXERCISE" };

  const minutes = input.durationMinutes ?? exercise.durationMinutes ?? 20;
  const deadlineAt = new Date(now.getTime() + minutes * 60 * 1000);
  const tier: DuelTier = invite.stake > 0 ? "STAKED" : "FREE";

  try {
    const duelId = await db.$transaction(
      async (tx) => {
        if (invite.stake > 0) {
          // Đọc lại số dư TRONG transaction. Số đọc lúc gửi thư có thể đã cũ.
          for (const userId of [invite.fromUserId, invite.toUserId]) {
            const wallet = await tx.meritWallet.findUnique({ where: { userId } });
            if (!wallet || meritBalance(wallet) < invite.stake) return null;
          }
        }

        const duel = await tx.duel.create({
          data: {
            status: "LIVE",
            tier,
            exerciseId: exercise.id,
            stake: invite.stake,
            armedAt: now,
            startedAt: now,
            deadlineAt,
            ruleVersion: DUEL_RULE_VERSION,
            sides: {
              create: [
                { userId: invite.fromUserId },
                { userId: invite.toUserId },
              ],
            },
          },
          select: { id: true },
        });

        // Tạo lượt làm bài THẬT cho cả hai bên, ngay trong cùng transaction.
        //
        // Nhờ vậy trận dùng đúng phòng thi và đúng đường chấm mà mọi bài luyện
        // tập đang dùng, thay vì một luồng chấm thứ hai chạy song song. Hai
        // luồng chấm thì sớm muộn sẽ có một cái sai theo cách cái kia đã sửa
        // xong từ lâu.
        //
        // `validForAchievements` để `false`: bài trong trận không được tính vào
        // danh hiệu luyện tập, nếu không thì đấu trường thành đường tắt để cày
        // danh hiệu mà không phải học.
        for (const userId of [invite.fromUserId, invite.toUserId]) {
          const previous = await tx.attempt.count({
            where: { userId, exerciseId: exercise.id },
          });
          const attempt = await tx.attempt.create({
            data: {
              userId,
              exerciseId: exercise.id,
              status: "IN_PROGRESS",
              answers: "{}",
              attemptNumber: previous + 1,
              startedAt: now,
              deadlineAt,
              validForAchievements: false,
            },
            select: { id: true },
          });
          await tx.duelSide.updateMany({
            where: { duelId: duel.id, userId },
            data: { attemptId: attempt.id },
          });
        }

        if (invite.stake > 0) {
          for (const userId of [invite.fromUserId, invite.toUserId]) {
            const wallet = await tx.meritWallet.update({
              where: { userId },
              data: { burnedTotal: { increment: invite.stake } },
            });
            await tx.meritLedger.create({
              data: {
                userId,
                kind: "STAKE",
                amount: invite.stake,
                balanceAfter: meritBalance(wallet),
                ledgerKey: duelLedgerKey(duel.id, userId, "STAKE"),
                ruleVersion: DUEL_RULE_VERSION,
                note: "Đặt cược vào trận",
              },
            });
          }
        }

        await tx.duelInvite.update({
          where: { id: invite.id },
          data: { status: "ACCEPTED", respondedAt: now, duelId: duel.id },
        });

        return duel.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (!duelId) return { ok: false, reason: "INSUFFICIENT" };
    return { ok: true, duelId, deadlineAt };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, reason: "NOT_FOUND" };
    }
    throw error;
  }
}

export async function declineInvite(input: {
  inviteId: string;
  userId: string;
  now?: Date;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  const result = await db.duelInvite.updateMany({
    where: { id: input.inviteId, toUserId: input.userId, status: "PENDING" },
    data: { status: "DECLINED", respondedAt: now },
  });
  return result.count > 0;
}

/* ===================== Đọc trạng thái cho màn hình ===================== */

export type PendingInvite = {
  inviteId: string;
  fromUserId: string;
  fromName: string;
  fromChienLuc: number;
  stake: number;
  secondsLeft: number;
};

/**
 * Chiến thư đang chờ mình trả lời.
 *
 * Trả kèm `secondsLeft` chứ không trả `expiresAt`: màn hình cần đếm ngược, và
 * để nó tự trừ theo đồng hồ trình duyệt là mở đường cho hai bên nhìn thấy hai
 * con số khác nhau. Máy chủ tính, máy khách chỉ đếm lùi từ con số đó.
 */
export async function pendingInvitesFor(
  userId: string,
  now = new Date(),
): Promise<PendingInvite[]> {
  const rows = await db.duelInvite.findMany({
    where: { toUserId: userId, status: "PENDING", expiresAt: { gt: now } },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: {
      id: true,
      fromUserId: true,
      stake: true,
      expiresAt: true,
      fromUser: { select: { name: true } },
    },
  });
  if (rows.length === 0) return [];

  const profiles = await db.arenaProfile.findMany({
    where: { userId: { in: rows.map((r) => r.fromUserId) } },
    select: { userId: true, chienLuc: true },
  });
  const ratingById = new Map(profiles.map((p) => [p.userId, p.chienLuc]));

  return rows.map((r) => ({
    inviteId: r.id,
    fromUserId: r.fromUserId,
    fromName: r.fromUser.name,
    fromChienLuc: ratingById.get(r.fromUserId) ?? 1000,
    stake: r.stake,
    secondsLeft: Math.max(
      0,
      Math.ceil((r.expiresAt.getTime() - now.getTime()) / 1000),
    ),
  }));
}

export type ActiveDuel = {
  duelId: string;
  attemptId: string | null;
  opponentName: string;
  stake: number;
  deadlineAt: Date | null;
  /** Mình đã nộp chưa. Nộp rồi thì chỉ còn chờ đối thủ. */
  submitted: boolean;
};

/**
 * Trận đang diễn ra của mình, nếu có.
 *
 * Cần cho màn đấu trường vì người đóng tab giữa chừng phải tìm được đường quay
 * lại. Không có nó thì Quân Công đã cược biến mất khỏi tầm mắt họ, và cách duy
 * nhất để về là nhớ đường dẫn phòng thi.
 */
export async function activeDuelFor(userId: string): Promise<ActiveDuel | null> {
  const side = await db.duelSide.findFirst({
    where: {
      userId,
      submittedAt: null,
      surrenderedAt: null,
      duel: { status: "LIVE" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      attemptId: true,
      submittedAt: true,
      duel: {
        select: {
          id: true,
          stake: true,
          deadlineAt: true,
          sides: { select: { userId: true, user: { select: { name: true } } } },
        },
      },
    },
  });
  if (!side) return null;

  const opponent = side.duel.sides.find((s) => s.userId !== userId);
  return {
    duelId: side.duel.id,
    attemptId: side.attemptId,
    opponentName: opponent?.user.name ?? "Đối thủ",
    stake: side.duel.stake,
    deadlineAt: side.duel.deadlineAt,
    submitted: Boolean(side.submittedAt),
  };
}

/* ===================== Trong trận ===================== */

/**
 * Nộp bài. Máy chủ chấm và tự đo thời gian.
 *
 * `elapsedMs` lấy hiệu giữa `startedAt` của trận và lúc này, KHÔNG nhận từ máy
 * khách. Đồng hồ trình duyệt không phải bằng chứng, và nó là thứ dễ sửa nhất
 * trong cả luồng.
 *
 * VỀ THAM SỐ `score`. Nó CHỈ được truyền từ `recordDuelAttemptResult`, tức từ
 * kết quả `finalizeReadingAttempt` đã chấm ở máy chủ. Không có đường nào từ
 * máy khách tới đây: `submitSide` không phải server action, không nằm sau một
 * route API nào, và `scripts/test-economy-invariants.ts` gác điều đó.
 *
 * Trước ngày 2026-08-21 hàm này nhận điểm từ tầng gọi bất kỳ, và đó là lỗ hổng
 * cuối cùng trong chuỗi "máy khách không bao giờ gửi điểm lên".
 */
async function submitSide(input: {
  duelId: string;
  userId: string;
  score: number;
  attemptId?: string;
  now?: Date;
}): Promise<{ ok: boolean; bothSubmitted: boolean }> {
  const now = input.now ?? new Date();

  const duel = await db.duel.findUnique({
    where: { id: input.duelId },
    select: { status: true, startedAt: true, sides: { select: { userId: true, submittedAt: true } } },
  });
  if (!duel || duel.status !== "LIVE") return { ok: false, bothSubmitted: false };

  const elapsedMs = duel.startedAt
    ? now.getTime() - duel.startedAt.getTime()
    : 0;

  const updated = await db.duelSide.updateMany({
    where: { duelId: input.duelId, userId: input.userId, submittedAt: null },
    data: {
      score: input.score,
      elapsedMs,
      submittedAt: now,
      attemptId: input.attemptId ?? null,
    },
  });
  if (updated.count === 0) return { ok: false, bothSubmitted: false };

  const sides = await db.duelSide.findMany({
    where: { duelId: input.duelId },
    select: { submittedAt: true, surrenderedAt: true },
  });
  const bothDone = sides.every((s) => s.submittedAt || s.surrenderedAt);
  return { ok: true, bothSubmitted: bothDone };
}

/**
 * Cửa DUY NHẤT để một kết quả bài làm đi vào trận.
 *
 * Gọi từ `finalizeReadingAttempt`, tức SAU khi máy chủ đã chấm xong. Điểm ở đây
 * là `scoreRaw` do chính hàm chấm trả về, không phải con số nào từ trình duyệt.
 *
 * Trả về `false` khi lượt làm bài này không thuộc trận nào, và đó là trường hợp
 * thường gặp nhất: phần lớn bài làm là luyện tập bình thường. Không phải lỗi,
 * nên không ghi log.
 */
export async function recordDuelAttemptResult(input: {
  attemptId: string;
  userId: string;
  scoreRaw: number;
  now?: Date;
}): Promise<boolean> {
  const side = await db.duelSide.findFirst({
    where: { attemptId: input.attemptId, userId: input.userId, submittedAt: null },
    select: { duelId: true },
  });
  if (!side) return false;

  const result = await submitSide({
    duelId: side.duelId,
    userId: input.userId,
    score: input.scoreRaw,
    attemptId: input.attemptId,
    now: input.now,
  });

  // Cả hai đã xong thì quyết toán ngay, thay vì chờ một job quét. Người vừa nộp
  // muốn biết kết quả ngay lúc đó, và đợi tới nhịp quét sau là khoảng im lặng
  // duy nhất trong cả trận mà không ai giải thích được.
  if (result.ok && result.bothSubmitted) {
    await settleDuel({ duelId: side.duelId, now: input.now });
  }
  return result.ok;
}

/** Đầu hàng chủ động. Rẻ hơn bỏ mặc về kinh nghiệm, và đó là chủ ý. */
export async function surrender(input: {
  duelId: string;
  userId: string;
  now?: Date;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  const result = await db.duelSide.updateMany({
    where: {
      duelId: input.duelId,
      userId: input.userId,
      submittedAt: null,
      surrenderedAt: null,
    },
    data: { surrenderedAt: now },
  });
  return result.count > 0;
}

/**
 * Giảng hoà. Trung tính ở MỌI chiều: hoàn cược cả hai, không kinh nghiệm,
 * không gì cả. Chỉ ghi một dấu vào cột Hoà khí.
 *
 * Cổng kiểm nằm ở `truceGate`: chỉ nửa đầu thời gian, và cả hai chưa nộp quá
 * một phần ba số câu.
 */
export async function agreeTruce(input: {
  duelId: string;
  totalQuestions: number;
  answeredByEach: readonly number[];
  now?: Date;
}): Promise<{ ok: boolean; reason?: string }> {
  const now = input.now ?? new Date();
  const duel = await db.duel.findUnique({
    where: { id: input.duelId },
    select: {
      status: true,
      startedAt: true,
      deadlineAt: true,
      tier: true,
      stake: true,
      sides: { select: { userId: true } },
    },
  });
  if (!duel?.startedAt || !duel.deadlineAt) return { ok: false, reason: "NOT_FOUND" };

  const gate = truceGate({
    status: duel.status as DuelStatus,
    startedAt: duel.startedAt,
    deadlineAt: duel.deadlineAt,
    now,
    totalQuestions: input.totalQuestions,
    answeredByEach: input.answeredByEach,
  });
  if (!gate.canOffer) return { ok: false, reason: gate.reason };
  if (!canTransition(duel.status as DuelStatus, "TRUCE")) {
    return { ok: false, reason: "BAD_TRANSITION" };
  }

  const entries = refundEntries({
    tier: duel.tier as DuelTier,
    stake: duel.stake,
    sides: [duel.sides[0].userId, duel.sides[1].userId],
    reason: "Giảng hoà, hoàn cược",
  });

  await db.$transaction(
    async (tx) => {
      await writeEntries(tx, input.duelId, entries);
      await tx.duel.update({
        where: { id: input.duelId },
        data: { status: "TRUCE", settledAt: now },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  // Giảng hoà chỉ ghi MỘT dấu vào cột Hoà khí. Không đụng Chiến Lực, không
  // kinh nghiệm, không điểm phe. Trung tính ở mọi chiều.
  try {
    const { recordTruce } = await import("@/lib/arena/arena-service");
    await recordTruce(input.duelId);
  } catch (error) {
    console.error("[wobridges] Khong ghi duoc Hoa khi:", error);
  }

  return { ok: true };
}

/* ===================== Quyết toán ===================== */

export type SettleResult =
  | { ok: true; verdict: Verdict; entries: MeritEntry[] }
  | { ok: false; reason: "NOT_FOUND" | "NOT_READY" | "ALREADY_SETTLED" };

/**
 * Chốt kết quả và ghi sổ.
 *
 * Gọi được nhiều lần: khoá `DUEL:<duelId>:<userId>:<kind>` bảo đảm mỗi dòng chỉ
 * ghi một lần, kể cả khi job quyết toán chạy lại hoặc hai bên cùng nộp một lúc.
 *
 * Hết giờ mà chưa nộp thì tính là BỎ MẶC và vẫn chấm theo phần đã làm, không
 * huỷ trận: cược đã trừ rồi, huỷ trắng sẽ biến một sự cố mạng thành mất tiền.
 */
export async function settleDuel(input: {
  duelId: string;
  now?: Date;
}): Promise<SettleResult> {
  const now = input.now ?? new Date();

  const duel = await db.duel.findUnique({
    where: { id: input.duelId },
    include: { sides: { orderBy: { createdAt: "asc" } } },
  });
  if (!duel || duel.sides.length !== 2) return { ok: false, reason: "NOT_FOUND" };
  if (duel.status === "SETTLED" || duel.status === "TRUCE") {
    return { ok: false, reason: "ALREADY_SETTLED" };
  }
  if (duel.status !== "LIVE" && duel.status !== "RESOLVING") {
    return { ok: false, reason: "NOT_READY" };
  }

  const overdue = Boolean(duel.deadlineAt && now >= duel.deadlineAt);
  const results = duel.sides.map<SideResult>((s) => ({
    userId: s.userId,
    score: s.score ?? 0,
    // Bên chưa nộp coi như dùng hết giờ. Nếu để 0 thì người bỏ mặc lại thắng
    // tiêu chí thời gian, tức bỏ mặc thành chiến thuật.
    elapsedMs: s.elapsedMs ?? Number.MAX_SAFE_INTEGER,
    submitted: Boolean(s.submittedAt),
    surrendered: Boolean(s.surrenderedAt),
    abandoned: !s.submittedAt && !s.surrenderedAt && overdue,
  }));

  const everyoneDone = results.every(
    (r) => r.submitted || r.surrendered || r.abandoned,
  );
  if (!everyoneDone) return { ok: false, reason: "NOT_READY" };

  const verdict = decideWinner(results[0], results[1]);
  const entries = settlementEntries({
    verdict,
    tier: duel.tier as DuelTier,
    stake: duel.stake,
    sides: [duel.sides[0].userId, duel.sides[1].userId],
  });

  await db.$transaction(
    async (tx) => {
      await writeEntries(tx, duel.id, entries);
      for (const r of results) {
        if (!r.abandoned) continue;
        await tx.duelSide.updateMany({
          where: { duelId: duel.id, userId: r.userId },
          data: { abandoned: true },
        });
      }
      await tx.duel.update({
        where: { id: duel.id },
        data: {
          status: "SETTLED",
          settledAt: now,
          winnerId: verdict.kind === "WIN" ? verdict.winnerId : null,
          winBy: verdict.kind === "WIN" ? verdict.by : null,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  // Cập nhật Chiến Lực NGOÀI transaction ở trên, và bọc try.
  //
  // Hai mức hậu quả khác nhau: Chiến Lực sai thì bảng xếp hạng lệch, Quân Công
  // sai thì có người mất tiền. Không nên để một lỗi ở tầng nhẹ làm quay lui cả
  // tầng nặng, mà quyết toán Quân Công thì đã xong và đã đúng.
  try {
    const { applyDuelToRatings } = await import("@/lib/arena/arena-service");
    await applyDuelToRatings({
      duelId: duel.id,
      winnerId: verdict.kind === "WIN" ? verdict.winnerId : null,
      now,
    });
  } catch (error) {
    console.error("[wobridges] Khong cap nhat duoc Chien Luc:", error);
  }

  // Quét liêm chính và xét lại danh hiệu chất vấn. Cùng lý do như trên, và ở
  // đây còn rõ hơn: một hồ sơ liêm chính không mở được thì người xét duyệt thiếu
  // một dòng trong hàng chờ, còn quay lui quyết toán thì có người mất Quân Công.
  //
  // Xét tới đâu tính tới đó, không job quét: một job im lặng hỏng thì không ai
  // biết, mà danh hiệu chất vấn là thứ không được phép sai âm thầm.
  try {
    const { scanDuelForIntegrity } = await import("@/lib/arena/integrity-service");
    await scanDuelForIntegrity({ duelId: duel.id, now });
  } catch (error) {
    console.error("[wobridges] Khong quet duoc liem chinh tran dau:", error);
  }

  try {
    const { evaluateArenaTitles } = await import("@/lib/arena/title-service");
    for (const side of duel.sides) {
      await evaluateArenaTitles(side.userId, now);
    }
  } catch (error) {
    console.error("[wobridges] Khong xet duoc danh hieu chat van:", error);
  }

  // Điểm phe. Cùng lý do như trên, và chống ghi hai lần nằm ở ràng buộc duy
  // nhất trong database chứ không ở đây.
  try {
    const { recordFactionPoints } = await import("@/lib/arena/season-service");
    await recordFactionPoints({ duelId: duel.id, now });
  } catch (error) {
    console.error("[wobridges] Khong ghi duoc diem phe:", error);
  }

  return { ok: true, verdict, entries };
}

/**
 * Huỷ trận và hoàn cược cả hai.
 *
 * `reason` BẮT BUỘC. Huỷ trận mà không ghi lý do thì không tra được khi có
 * khiếu nại, và người bị huỷ chỉ thấy Quân Công của mình đi qua đi lại.
 */
export async function voidDuel(input: {
  duelId: string;
  reason: string;
  now?: Date;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  if (!input.reason.trim()) {
    throw new Error("[duel] voidDuel bắt buộc phải có lý do.");
  }

  const duel = await db.duel.findUnique({
    where: { id: input.duelId },
    include: { sides: true },
  });
  if (!duel || duel.sides.length !== 2) return false;
  if (!canTransition(duel.status as DuelStatus, "VOIDED")) return false;

  // Trước ARMED thì chưa trừ đồng nào, nên hoàn cược lúc đó là phát tiền từ hư
  // không.
  const entries = hasStakeDeducted(duel.status as DuelStatus)
    ? refundEntries({
        tier: duel.tier as DuelTier,
        stake: duel.stake,
        sides: [duel.sides[0].userId, duel.sides[1].userId],
        reason: `Huỷ trận, hoàn cược: ${input.reason}`,
      })
    : [];

  await db.$transaction(
    async (tx) => {
      await writeEntries(tx, duel.id, entries);
      await tx.duel.update({
        where: { id: duel.id },
        data: { status: "VOIDED", settledAt: now, voidReason: input.reason },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  return true;
}

/* ===================== Nội bộ ===================== */

/**
 * Ghi các dòng sổ cái, bỏ qua dòng đã có.
 *
 * `P2002` ở đây KHÔNG phải lỗi: nó nghĩa là dòng đó đã ghi rồi, tức job đang
 * chạy lần thứ hai. Đúng thứ ta muốn xảy ra.
 */
async function writeEntries(
  tx: Prisma.TransactionClient,
  duelId: string,
  entries: readonly MeritEntry[],
): Promise<void> {
  for (const entry of entries) {
    const credit = entry.kind === "MINT" || entry.kind === "REFUND";
    try {
      const wallet = await tx.meritWallet.upsert({
        where: { userId: entry.userId },
        create: {
          userId: entry.userId,
          earnedTotal: credit ? entry.amount : 0,
          burnedTotal: credit ? 0 : entry.amount,
        },
        update: credit
          ? { earnedTotal: { increment: entry.amount } }
          : { burnedTotal: { increment: entry.amount } },
      });
      await tx.meritLedger.create({
        data: {
          userId: entry.userId,
          kind: entry.kind,
          amount: entry.amount,
          balanceAfter: meritBalance(wallet),
          ledgerKey: duelLedgerKey(duelId, entry.userId, entry.kind),
          ruleVersion: DUEL_RULE_VERSION,
          note: entry.reason,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }
}
