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

/* ===================== Trong trận ===================== */

/**
 * Nộp bài. Máy chủ chấm và tự đo thời gian.
 *
 * `elapsedMs` lấy hiệu giữa `startedAt` của trận và lúc này, KHÔNG nhận từ máy
 * khách. Đồng hồ trình duyệt không phải bằng chứng, và nó là thứ dễ sửa nhất
 * trong cả luồng.
 */
export async function submitSide(input: {
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
