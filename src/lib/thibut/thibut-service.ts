/**
 * Thí Bút — tầng chạm database.
 *
 * BỐN CHỖ DỄ HỎNG, và cả bốn đều hỏng im lặng:
 *
 * 1. **Trừ Quân Công lúc BẮT ĐẦU, không lúc chấm.** Nếu chờ tới cuối mới trừ,
 *    một người mở được nhiều lượt song song và cược số Quân Công họ chỉ có một
 *    lần. Cùng lý do đặc tả mục 04 trừ cược ở bước ARMED.
 * 2. **Đáp án không rời máy chủ.** `startAttempt` trả về `PublicItem`, đã bóc
 *    `answerIndex` và `explanation`.
 * 3. **Máy khách không bao giờ gửi điểm lên.** Nó chỉ gửi lựa chọn; máy chủ đọc
 *    lại câu từ database rồi tự chấm.
 * 4. **Quyền cấp bởi Thí Bút phải phân biệt được với quyền MUA BẰNG TIỀN.**
 *    `source: "MERIT"` chứ không phải `"PURCHASE"`. Gộp lại thì báo cáo doanh
 *    thu phồng lên bằng đúng phần người ta đoạt được bằng công sức, cùng lỗi
 *    mà ví xu đã tránh khi tách `sold` khỏi `gifted`.
 */
import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { meritBalance } from "@/lib/merit/merit.ts";
import {
  ITEMS_PER_ATTEMPT,
  THI_BUT_RULE_VERSION,
  TIME_LIMIT_SECONDS,
  gradeAttempt,
  poolHealth,
  publicItem,
  retryGate,
  selectItems,
  type ItemPoolEntry,
  type PublicItem,
  type StoredItem,
  type ThiButDifficulty,
  type ThiButResult,
  type ThiButTarget,
  type ThiButType,
} from "@/lib/thibut/thibut.ts";

/* ===================== Đọc trạng thái ===================== */

export type ThiButGate = {
  balance: number;
  cost: number;
  canAfford: boolean;
  canRetry: boolean;
  secondsLeft: number;
  previousAttempts: number;
  poolReady: boolean;
};

/**
 * Người này vào Thí Bút cho mục tiêu này được chưa, và tốn bao nhiêu.
 *
 * Đọc thôi, không trừ gì. Màn hình dùng hàm này để hiện nút, còn `startAttempt`
 * kiểm lại từ đầu: một hàm chỉ để hiển thị không bao giờ được là chốt chặn.
 */
export async function thiButGate(input: {
  userId: string;
  targetKind: ThiButTarget;
  targetId: string;
  now?: Date;
}): Promise<ThiButGate> {
  const now = input.now ?? new Date();

  const [wallet, previous, publishedCount] = await Promise.all([
    db.meritWallet.findUnique({ where: { userId: input.userId } }),
    db.thiButAttempt.findMany({
      where: {
        userId: input.userId,
        targetKind: input.targetKind,
        targetId: input.targetId,
      },
      orderBy: { startedAt: "desc" },
      select: { passed: true, submittedAt: true },
    }),
    db.thiButItem.count({ where: { status: "PUBLISHED" } }),
  ]);

  const lastFailed = previous.find((p) => p.passed === false)?.submittedAt ?? null;
  const gate = retryGate({
    now,
    lastFailedAt: lastFailed,
    previousAttempts: previous.length,
  });
  const balance = wallet ? meritBalance(wallet) : 0;

  return {
    balance,
    cost: gate.cost,
    canAfford: balance >= gate.cost,
    canRetry: gate.canRetry,
    secondsLeft: gate.canRetry ? 0 : gate.secondsLeft,
    previousAttempts: previous.length,
    poolReady: poolHealth(publishedCount).ready,
  };
}

/* ===================== Bắt đầu một lượt ===================== */

export type StartResult =
  | {
      ok: true;
      attemptId: string;
      items: PublicItem[];
      deadlineAt: Date;
      cost: number;
      balanceAfter: number;
    }
  | {
      ok: false;
      reason: "INSUFFICIENT_MERIT" | "COOLDOWN" | "POOL_EMPTY" | "ALREADY_PASSED";
      cost: number;
      balance: number;
      secondsLeft?: number;
    };

export async function startAttempt(input: {
  userId: string;
  targetKind: ThiButTarget;
  targetId: string;
  now?: Date;
}): Promise<StartResult> {
  const now = input.now ?? new Date();

  const passedBefore = await db.thiButAttempt.findFirst({
    where: {
      userId: input.userId,
      targetKind: input.targetKind,
      targetId: input.targetId,
      passed: true,
    },
    select: { id: true },
  });
  const gate = await thiButGate(input);

  // Đã qua rồi thì không cho trả thêm lần nữa cho cùng một thứ. Không có lý do
  // nào để lấy Quân Công của người ta lần thứ hai cho cùng một cánh cửa.
  if (passedBefore) {
    return { ok: false, reason: "ALREADY_PASSED", cost: 0, balance: gate.balance };
  }
  if (!gate.poolReady) {
    return { ok: false, reason: "POOL_EMPTY", cost: gate.cost, balance: gate.balance };
  }
  if (!gate.canRetry) {
    return {
      ok: false,
      reason: "COOLDOWN",
      cost: gate.cost,
      balance: gate.balance,
      secondsLeft: gate.secondsLeft,
    };
  }
  if (!gate.canAfford) {
    return {
      ok: false,
      reason: "INSUFFICIENT_MERIT",
      cost: gate.cost,
      balance: gate.balance,
    };
  }

  // Câu đã gặp trong các lượt trước, để lần này tránh.
  const history = await db.thiButAttempt.findMany({
    where: { userId: input.userId },
    select: { itemIds: true },
  });
  const seen = new Set<string>();
  for (const row of history) {
    for (const id of parseIds(row.itemIds)) seen.add(id);
  }

  const pool = await db.thiButItem.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, type: true, difficulty: true },
  });
  const chosen = selectItems(
    pool as ItemPoolEntry[],
    seen,
    (max) => Math.floor(Math.random() * max),
  );

  const lastAttempt = await db.thiButAttempt.findFirst({
    where: {
      userId: input.userId,
      targetKind: input.targetKind,
      targetId: input.targetId,
    },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });

  const deadlineAt = new Date(now.getTime() + TIME_LIMIT_SECONDS * 1000);

  const created = await db.$transaction(
    async (tx) => {
      // Đọc lại số dư TRONG transaction: giá trị đọc ở `thiButGate` phía trên
      // có thể đã cũ nếu người dùng mở hai tab.
      const wallet = await tx.meritWallet.findUnique({
        where: { userId: input.userId },
      });
      const balance = wallet ? meritBalance(wallet) : 0;
      if (balance < gate.cost) return null;

      const attempt = await tx.thiButAttempt.create({
        data: {
          userId: input.userId,
          targetKind: input.targetKind,
          targetId: input.targetId,
          cost: gate.cost,
          itemIds: JSON.stringify(chosen.map((c) => c.id)),
          deadlineAt,
          retryOfId: lastAttempt?.id ?? null,
          ruleVersion: THI_BUT_RULE_VERSION,
        },
        select: { id: true },
      });

      const updated = await tx.meritWallet.update({
        where: { userId: input.userId },
        data: { burnedTotal: { increment: gate.cost } },
      });

      await tx.meritLedger.create({
        data: {
          userId: input.userId,
          kind: "STAKE",
          amount: gate.cost,
          balanceAfter: meritBalance(updated),
          // Khoá gắn với chính lượt vừa tạo, nên không có đường ghi hai lần.
          ledgerKey: `MERIT:THIBUT:${attempt.id}`,
          ruleVersion: THI_BUT_RULE_VERSION,
          note: `Thí Bút cho ${input.targetKind}`,
        },
      });

      return { attemptId: attempt.id, balanceAfter: meritBalance(updated) };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if (!created) {
    return {
      ok: false,
      reason: "INSUFFICIENT_MERIT",
      cost: gate.cost,
      balance: gate.balance,
    };
  }

  const stored = await loadItems(chosen.map((c) => c.id));
  return {
    ok: true,
    attemptId: created.attemptId,
    items: stored.map(publicItem),
    deadlineAt,
    cost: gate.cost,
    balanceAfter: created.balanceAfter,
  };
}

/* ===================== Nộp và chấm ===================== */

export type SubmitResult =
  | { ok: true; result: ThiButResult; unlocked: boolean }
  | { ok: false; reason: "NOT_FOUND" | "ALREADY_SUBMITTED" };

/**
 * Chấm ở MÁY CHỦ. Máy khách chỉ gửi lựa chọn.
 *
 * Hết giờ vẫn chấm bình thường theo phần đã làm, không huỷ lượt: Quân Công đã
 * trừ rồi, và huỷ trắng sẽ biến một sự cố mạng thành mất tiền.
 */
export async function submitAttempt(input: {
  userId: string;
  attemptId: string;
  answers: Record<string, number | null>;
  now?: Date;
}): Promise<SubmitResult> {
  const now = input.now ?? new Date();

  const attempt = await db.thiButAttempt.findFirst({
    where: { id: input.attemptId, userId: input.userId },
    select: {
      id: true,
      itemIds: true,
      submittedAt: true,
      targetKind: true,
      targetId: true,
    },
  });
  if (!attempt) return { ok: false, reason: "NOT_FOUND" };
  if (attempt.submittedAt) return { ok: false, reason: "ALREADY_SUBMITTED" };

  const stored = await loadItems(parseIds(attempt.itemIds));
  const result = gradeAttempt(stored, input.answers);

  await db.thiButAttempt.update({
    where: { id: attempt.id },
    data: {
      answers: JSON.stringify(input.answers),
      correctCount: result.correctCount,
      passed: result.passed,
      submittedAt: now,
    },
  });

  let unlocked = false;
  if (result.passed) {
    unlocked = await grantAccess({
      userId: input.userId,
      attemptId: attempt.id,
      targetKind: attempt.targetKind as ThiButTarget,
      targetId: attempt.targetId,
    });
  }

  return { ok: true, result, unlocked };
}

/**
 * Mở quyền sau khi qua.
 *
 * `source: "MERIT"` là chi tiết quan trọng nhất ở đây. Nếu ghi `"PURCHASE"` thì
 * mọi báo cáo doanh thu sẽ đếm cả những cánh cửa mà học viên đoạt được bằng
 * công sức, và con số đó không đối ứng một đồng nào trong tài khoản ngân hàng.
 */
async function grantAccess(input: {
  userId: string;
  attemptId: string;
  targetKind: ThiButTarget;
  targetId: string;
}): Promise<boolean> {
  const grantKey = `MERIT:THIBUT:${input.attemptId}`;
  try {
    await db.accessGrant.create({
      data: {
        userId: input.userId,
        exerciseId: input.targetKind === "EXERCISE" ? input.targetId : null,
        attemptId: input.targetKind === "FEYNMAN" ? input.targetId : null,
        grantKey,
        feature: input.targetKind === "EXERCISE" ? "READING" : "FEYNMAN",
        scope: input.targetKind === "EXERCISE" ? "EXERCISE" : "ATTEMPT",
        source: "MERIT",
        status: "ACTIVE",
        startsAt: new Date(),
        expiresAt: null,
      },
    });
    return true;
  } catch (error) {
    // Đã cấp rồi thì thôi, không phải lỗi.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return true;
    }
    throw error;
  }
}

/* ===================== Lượt đang mở ===================== */

export type LiveAttempt = {
  attemptId: string;
  items: PublicItem[];
  deadlineAt: Date;
  cost: number;
};

/**
 * Lượt CHƯA NỘP của người này cho mục tiêu này, nếu có.
 *
 * Nhờ hàm này mà trang Thí Bút tự biết mình đang ở bước nào, không cần giữ
 * trạng thái ở máy khách. Đóng tab giữa chừng rồi mở lại thì vẫn đúng lượt đó,
 * và Quân Công đã trừ không biến mất vào hư không.
 *
 * Vẫn trả về `PublicItem`, tức vẫn đã bóc đáp án.
 */
export async function currentAttempt(input: {
  userId: string;
  targetKind: ThiButTarget;
  targetId: string;
}): Promise<LiveAttempt | null> {
  const row = await db.thiButAttempt.findFirst({
    where: {
      userId: input.userId,
      targetKind: input.targetKind,
      targetId: input.targetId,
      submittedAt: null,
    },
    orderBy: { startedAt: "desc" },
    select: { id: true, itemIds: true, deadlineAt: true, cost: true },
  });
  if (!row) return null;

  const stored = await loadItems(parseIds(row.itemIds));
  return {
    attemptId: row.id,
    items: stored.map(publicItem),
    deadlineAt: row.deadlineAt,
    cost: row.cost,
  };
}

/** Lượt đã nộp gần nhất, để hiện lại kết quả và lời giải sau khi chấm. */
export async function lastResult(input: {
  userId: string;
  targetKind: ThiButTarget;
  targetId: string;
}): Promise<{ passed: boolean; correctCount: number; items: ThiButResult["items"] } | null> {
  const row = await db.thiButAttempt.findFirst({
    where: {
      userId: input.userId,
      targetKind: input.targetKind,
      targetId: input.targetId,
      submittedAt: { not: null },
    },
    orderBy: { submittedAt: "desc" },
    select: { itemIds: true, answers: true, passed: true, correctCount: true },
  });
  if (!row) return null;

  const stored = await loadItems(parseIds(row.itemIds));
  let answers: Record<string, number | null> = {};
  try {
    answers = JSON.parse(row.answers ?? "{}") as Record<string, number | null>;
  } catch {
    answers = {};
  }
  const graded = gradeAttempt(stored, answers);

  return {
    passed: row.passed ?? graded.passed,
    correctCount: row.correctCount ?? graded.correctCount,
    items: graded.items,
  };
}

/* ===================== Kho câu, cho màn hình duyệt ===================== */

export async function poolStats() {
  const rows = await db.thiButItem.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const count = (s: string) =>
    rows.find((r) => r.status === s)?._count._all ?? 0;
  const published = count("PUBLISHED");
  return {
    draft: count("DRAFT"),
    published,
    retired: count("RETIRED"),
    health: poolHealth(published),
  };
}

export async function listDraftItems(take = 20) {
  return db.thiButItem.findMany({
    where: { status: "DRAFT" },
    orderBy: { createdAt: "asc" },
    take,
  });
}

/**
 * Duyệt một câu.
 *
 * `reviewerId` bắt buộc và được ghi lại. Khi có tranh chấp về một câu, câu hỏi
 * đầu tiên luôn là "ai đã duyệt cái này", và không có cột đó thì không ai trả
 * lời được.
 */
export async function reviewItem(input: {
  itemId: string;
  reviewerId: string;
  decision: "PUBLISH" | "RETIRE";
  note?: string;
}): Promise<void> {
  const now = new Date();
  await db.thiButItem.update({
    where: { id: input.itemId },
    data: {
      status: input.decision === "PUBLISH" ? "PUBLISHED" : "RETIRED",
      reviewedById: input.reviewerId,
      reviewedAt: now,
      publishedAt: input.decision === "PUBLISH" ? now : null,
      reviewNote: input.note ?? null,
    },
  });
}

/* ===================== Nội bộ ===================== */

function parseIds(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Đọc câu ĐÚNG THỨ TỰ đã phát.
 *
 * `findMany` không bảo đảm thứ tự theo mảng `in`, mà thứ tự thì có nghĩa: học
 * viên thấy câu 1 tới 4 theo thứ tự nào thì kết quả chấm phải trả về đúng thứ
 * tự ấy, nếu không lời giải sẽ gắn nhầm câu.
 */
async function loadItems(ids: readonly string[]): Promise<StoredItem[]> {
  if (ids.length === 0) return [];
  const rows = await db.thiButItem.findMany({ where: { id: { in: [...ids] } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({
      id: r.id,
      type: r.type as ThiButType,
      difficulty: r.difficulty as ThiButDifficulty,
      prompt: r.prompt,
      options: parseOptions(r.options),
      answerIndex: r.answerIndex,
      explanation: r.explanation,
    }));
}

function parseOptions(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

export { ITEMS_PER_ATTEMPT };
