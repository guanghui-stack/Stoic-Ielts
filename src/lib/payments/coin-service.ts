import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { OFFERS, type OfferCode, type Offer } from "@/lib/payments/catalog";
import {
  reverseTopupOrderWithRepo,
  runTopupReversalWithRetry,
} from "@/lib/payments/topup-reversal-service";
import {
  WELCOME_COINS,
  coinBalance,
  decideCoinPurchase,
} from "@/lib/payments/coins";
import { decideGrantAccess } from "@/lib/payments/payment-rules";

/**
 * Tầng chạm database của ví xu. Việc *quyết định* nằm ở `coins.ts` (hàm thuần,
 * có kiểm thử); file này chỉ lo đọc — ghi và giữ cho hai vế không bao giờ lệch.
 *
 * NGUYÊN TẮC CAO NHẤT, đừng phá:
 *
 *   Trừ xu và cấp quyền phải nằm trong CÙNG một transaction Serializable.
 *
 * Tách ra làm hai bước thì một lần treo mạng ở giữa để lại học viên mất xu mà
 * không có quyền, và không còn dấu vết nào cho biết phải bù bao nhiêu. Đây là
 * đúng bài học đã trả giá ở `fulfillment.ts` khi cộng lượt AI.
 */

export type CoinWalletView = {
  grantedTotal: number;
  spentTotal: number;
  balance: number;
};

const EMPTY_WALLET: CoinWalletView = {
  grantedTotal: 0,
  spentTotal: 0,
  balance: 0,
};

/** Ví của học viên. Chưa từng nạp thì trả ví rỗng, không tạo hàng thừa. */
export async function getCoinWallet(userId: string): Promise<CoinWalletView> {
  const wallet = await db.coinWallet.findUnique({ where: { userId } });
  if (!wallet) return EMPTY_WALLET;
  return {
    grantedTotal: wallet.grantedTotal,
    spentTotal: wallet.spentTotal,
    balance: coinBalance(wallet),
  };
}

/**
 * Cộng xu cho một đơn nạp đã thanh toán. Gọi từ TRONG transaction của
 * `fulfillPaidOrder` — không bao giờ gọi riêng.
 *
 * `ledgerKey = TOPUP:<orderId>` là thứ chặn cộng hai lần: SePay gửi IPN lặp là
 * chuyện bình thường, và ràng buộc unique ở database đáng tin hơn mọi phép
 * kiểm tra "đã xử lý chưa" viết bằng tay.
 */
export async function creditCoinsForOrder(
  tx: Prisma.TransactionClient,
  input: { orderId: string; userId: string; coins: number; note: string }
): Promise<void> {
  if (input.coins <= 0) return;

  // upsert + increment chứ không đọc-rồi-ghi: hai IPN song song đọc cùng một số
  // dư rồi ghi đè nhau sẽ nuốt mất một lần nạp.
  const wallet = await tx.coinWallet.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      grantedTotal: input.coins,
      spentTotal: 0,
    },
    update: { grantedTotal: { increment: input.coins } },
  });

  await tx.coinLedger.create({
    data: {
      userId: input.userId,
      kind: "TOPUP",
      amount: input.coins,
      balanceAfter: coinBalance(wallet),
      ledgerKey: `TOPUP:${input.orderId}`,
      orderId: input.orderId,
      note: input.note,
    },
  });
}

export type CoinAdminStats = {
  /** Xu ĐÃ BÁN — đối ứng với tiền thật trong tài khoản ngân hàng. */
  sold: number;
  /** Xu TRUNG TÂM TẶNG — KHÔNG phải doanh thu, không đối ứng đồng nào. */
  gifted: number;
  /** Xu đã tiêu thành quyền học. */
  spent: number;
  /** Xu đã thu hồi (hoàn tiền). */
  revoked: number;
  /** Xu còn nằm trong ví học viên — đây là NGHĨA VỤ chưa thực hiện. */
  outstanding: number;
};

/**
 * Số liệu ví xu cho trang quản trị.
 *
 * `sold` và `gifted` tách hẳn nhau là điểm mấu chốt: gộp lại thành một con số
 * "đã phát hành" sẽ khiến báo cáo doanh thu phồng lên bằng đúng phần trung tâm
 * cho không. Cùng tinh thần với việc dự án cố ý không có nút "đánh dấu đã
 * thanh toán".
 */
export async function coinAdminStats(): Promise<CoinAdminStats> {
  const rows = await db.coinLedger.groupBy({
    by: ["kind"],
    _sum: { amount: true },
  });
  const of = (kind: string) =>
    rows.find((r) => r.kind === kind)?._sum.amount ?? 0;

  const sold = of("TOPUP");
  const gifted = of("GIFT");
  const spent = of("SPEND");
  const revoked = of("REVOKE");

  return {
    sold,
    gifted,
    spent,
    revoked,
    outstanding: Math.max(0, sold + gifted - spent - revoked),
  };
}

/** Ví và sổ cái của MỘT học viên, cho trang quản trị. */
export async function coinLedgerOf(userId: string, take = 20) {
  return db.coinLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      kind: true,
      amount: true,
      balanceAfter: true,
      note: true,
      createdAt: true,
    },
  });
}

export type SpendFailure =
  | "NOT_BUYABLE"
  | "ALREADY_OWNED"
  | "NOT_ENOUGH_COINS"
  | "TARGET_REQUIRED";

export type SpendResult =
  | { ok: true; alreadyDone: boolean; cost: number; balanceAfter: number }
  | { ok: false; reason: SpendFailure; cost: number | null; missing: number };

/**
 * Khóa chống ghi hai lần cho một lần tiêu xu.
 *
 * Gói bán theo lượt làm bài có khóa TỰ NHIÊN — cùng gói, cùng lượt thì cùng
 * khóa — nên hai cú bấm nhanh chỉ trừ tiền một lần mà không cần trình duyệt
 * làm gì cả. Gói nạp lượt AI thì mua lại nhiều lần là ĐÚNG ý, nên không có
 * khóa tự nhiên; chỗ đó dùng token do máy chủ sinh lúc dựng nút (cùng khuôn
 * với `introPromoToken`), nên hai cú bấm trên cùng một trang là một lần mua,
 * còn tải lại trang thì mua tiếp được.
 */
function ledgerKeyFor(input: {
  offerCode: OfferCode;
  exerciseId: string | null;
  attemptId: string | null;
  spendToken: string | null;
}): string | null {
  const offer = OFFERS[input.offerCode] as Offer;

  if (offer.kind === "AI_TOPUP") {
    return input.spendToken ? `SPEND:AI:${input.spendToken}` : null;
  }

  // Khóa phải trỏ đúng thứ gói đó mở. Gói mở ĐỀ khóa theo `exerciseId`, gói
  // Feynman khóa theo `attemptId`. Dùng nhầm cột thì hoặc học viên mở đề rồi
  // vẫn bị trừ tiếp, hoặc bị chặn oan vì thiếu một mã họ không có lý do gì để
  // có (chưa làm bài thì lấy đâu ra lượt làm bài).
  if (offer.scope === "EXERCISE") {
    return input.exerciseId
      ? `SPEND:${input.offerCode}:${input.exerciseId}`
      : null;
  }

  return input.attemptId
    ? `SPEND:${input.offerCode}:${input.attemptId}`
    : null;
}

/**
 * Tiêu xu để mở một gói. ĐƯỜNG DUY NHẤT trừ xu của học viên.
 *
 * Thứ tự bên trong là cố ý và đã cân nhắc: đọc ví → hỏi luật thuần → trừ xu →
 * ghi sổ cái → cấp quyền → cộng lượt AI, tất cả trong một transaction. Bất kỳ
 * bước nào ném lỗi thì cả khối bị hủy, ví về đúng như chưa ai bấm gì.
 */
export async function spendCoinsForOffer(input: {
  userId: string;
  offerCode: OfferCode;
  exerciseId: string | null;
  attemptId: string | null;
  spendToken: string | null;
}): Promise<SpendResult> {
  const offer = OFFERS[input.offerCode] as Offer;

  // Gói mở quyền mà thiếu đích để mở là dữ liệu hỏng: grant scope ATTEMPT
  // thiếu `attemptId`, hay scope EXERCISE thiếu `exerciseId`, đều không mở
  // được gì — và học viên mất xu vào hư không. Chặn TRƯỚC khi đụng tới ví.
  const ledgerKey = ledgerKeyFor(input);
  if (!ledgerKey) {
    return {
      ok: false,
      reason: "TARGET_REQUIRED" as const,
      cost: null,
      missing: 0,
    };
  }

  try {
    return await db.$transaction(
      async (tx) => {
        const wallet = await tx.coinWallet.findUnique({
          where: { userId: input.userId },
        });
        const balance = wallet ? coinBalance(wallet) : 0;

        // Đã có quyền rồi thì đừng bán tiếp — đây là tiền của học viên.
        // Gói nạp lượt AI không mở quyền nào nên không có gì để "đã có".
        let alreadyOwned = false;
        if (offer.kind !== "AI_TOPUP") {
          const grants = await tx.accessGrant.findMany({
            where: {
              userId: input.userId,
              feature: offer.feature,
              status: "ACTIVE",
            },
            select: {
              feature: true,
              scope: true,
              exerciseId: true,
              attemptId: true,
              status: true,
              startsAt: true,
              expiresAt: true,
            },
          });
          alreadyOwned = decideGrantAccess({
            grants,
            feature: offer.feature,
            exerciseId: input.exerciseId,
            attemptId: input.attemptId,
            at: new Date(),
          });
        }

        const decision = decideCoinPurchase({
          offerCode: input.offerCode,
          balance,
          alreadyOwned,
        });
        if (!decision.ok) {
          return {
            ok: false as const,
            reason: decision.reason,
            cost: decision.cost,
            missing: decision.missing,
          };
        }

        await tx.coinWallet.update({
          where: { userId: input.userId },
          data: { spentTotal: { increment: decision.cost } },
        });

        await tx.coinLedger.create({
          data: {
            userId: input.userId,
            kind: "SPEND",
            amount: decision.cost,
            balanceAfter: decision.balanceAfter,
            ledgerKey,
            offerCode: input.offerCode,
            exerciseId: input.exerciseId,
            attemptId: input.attemptId,
            note: offer.label,
          },
        });

        if (offer.kind !== "AI_TOPUP") {
          await tx.accessGrant.create({
            data: {
              userId: input.userId,
              exerciseId: offer.scope === "EXERCISE" ? input.exerciseId : null,
              attemptId: offer.scope === "ATTEMPT" ? input.attemptId : null,
              grantKey: `COIN:${ledgerKey}`,
              feature: offer.feature,
              scope: offer.scope,
              source: "PURCHASE",
              status: "ACTIVE",
              startsAt: new Date(),
              // Gói theo lượt là vĩnh viễn. `durationDays` của gói cũ không
              // dùng ở đây vì không gói xu nào có thời hạn.
              expiresAt: null,
            },
          });
        }

        const credits = offer.aiGradingCredits ?? 0;
        if (credits > 0) {
          await tx.feynmanAiBudget.upsert({
            where: { userId: input.userId },
            create: {
              userId: input.userId,
              grantedTotal: credits,
              usedTotal: 0,
            },
            update: { grantedTotal: { increment: credits } },
          });
        }

        return {
          ok: true as const,
          alreadyDone: false,
          cost: decision.cost,
          balanceAfter: decision.balanceAfter,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    // Hai cú bấm song song: cái thua cuộc đụng ràng buộc unique trên
    // `ledgerKey` (hoặc `grantKey`). Cái thắng đã trừ đúng một lần và đã cấp
    // quyền, nên đây là thành công — thử lại là trừ tiền lần hai.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: true, alreadyDone: true, cost: 0, balanceAfter: 0 };
    }
    throw error;
  }
}

/**
 * Tặng quà chào mừng 150 xu. Gọi được bao nhiêu lần cũng chỉ tặng MỘT LẦN cho
 * mỗi tài khoản — khóa `GIFT:WELCOME:<userId>` lo việc đó.
 *
 * ĐIỀU KIỆN: tài khoản phải đã xác minh email. Hàm tự kiểm chứ không tin nơi
 * gọi, vì có ba nơi gọi tới (đăng ký thường sau khi xác minh, đăng nhập Google,
 * và migration cho tài khoản cũ) và chỉ cần một nơi quên là mở đường lập tài
 * khoản ảo lấy lượt AI chấm — thứ có hóa đơn OpenAI thật.
 *
 * KHÔNG ném lỗi khi hỏng: quà chào mừng không đáng để làm hỏng việc đăng ký.
 * Trả về `false` và ghi log.
 */
export async function grantWelcomeCoins(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { emailVerifiedAt: true },
  });
  if (!user?.emailVerifiedAt) return false;

  try {
    const result = await giftCoins({
      userId,
      coins: WELCOME_COINS,
      giftKey: `WELCOME:${userId}`,
      note: "Quà chào mừng tài khoản mới",
    });
    return result.ok;
  } catch (error) {
    console.error("[wobridges] Khong tang duoc qua chao mung:", error);
    return false;
  }
}

export type RevokeResult =
  | { ok: true; coins: number; balanceAfter: number }
  | {
      ok: false;
      reason: "ALREADY_SPENT" | "CORRUPTED";
      coins: number;
      balance: number;
    };

export async function reverseTopupOrder(input: {
  orderId: string;
  targetStatus: "VOIDED" | "REFUNDED";
  reason: string;
  reviewCodePrefix: string;
  rawLastPayload?: string | null;
  now?: Date;
  eventFinalize?: {
    eventKey: string;
    processingLeaseToken: string;
    errorMessage?: string | null;
  };
}): Promise<
  | {
      ok: true;
      action: "REVERSED" | "NOOP_FINAL";
      orderStatus: string;
      coinsRevoked: number;
      balanceAfter: number;
    }
  | {
      ok: false;
      action: "REVIEW";
      orderStatus: "REQUIRES_REVIEW";
      reason: "ALREADY_SPENT" | "CORRUPTED" | "TOPUP_NOT_PAYABLE" | "INSUFFICIENT_BALANCE";
      coinsRevoked: 0;
      balanceAfter: number;
    }
> {
  return runTopupReversalWithRetry(() =>
    db.$transaction(
      async (tx) => {
        return reverseTopupOrderWithRepo(
          {
            getOrder: (orderId) =>
              tx.paymentOrder.findUnique({
                where: { id: orderId },
                select: {
                  id: true,
                  userId: true,
                  status: true,
                  coinsGranted: true,
                },
              }),
            getWallet: (userId) =>
              tx.coinWallet.findUnique({
                where: { userId },
                select: { grantedTotal: true, spentTotal: true },
              }),
            getLedger: (userId) =>
              tx.coinLedger.findMany({
                where: { userId },
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                select: {
                  kind: true,
                  amount: true,
                  orderId: true,
                  ledgerKey: true,
                },
              }),
            incrementWalletSpent: async (userId, amount) => {
              await tx.coinWallet.update({
                where: { userId },
                data: { spentTotal: { increment: amount } },
              });
            },
            createRevokeLedger: async ({
              userId,
              orderId,
              amount,
              balanceAfter,
              note,
            }) => {
              await tx.coinLedger.create({
                data: {
                  userId,
                  kind: "REVOKE",
                  amount,
                  balanceAfter,
                  ledgerKey: `REVOKE:${orderId}`,
                  orderId,
                  note,
                },
              });
            },
            updateOrder: async (orderId, data) => {
              await tx.paymentOrder.update({
                where: { id: orderId },
                data,
              });
            },
            finalizeEvent: input.eventFinalize
              ? async (event) => {
                  const finalized = await tx.paymentEvent.updateMany({
                    where: {
                      eventKey: event.eventKey,
                      processingStatus: "PROCESSING",
                      processingLeaseToken: event.processingLeaseToken,
                    },
                    data: {
                      processingStatus: event.processingStatus,
                      errorMessage: event.errorMessage ?? null,
                      processedAt: event.processedAt,
                    },
                  });
                  return finalized.count === 1;
                }
              : undefined,
          },
          {
            orderId: input.orderId,
            targetStatus: input.targetStatus,
            reason: input.reason,
            reviewCodePrefix: input.reviewCodePrefix,
            rawLastPayload: input.rawLastPayload,
            now: input.now ?? new Date(),
            eventFinalize: input.eventFinalize,
          }
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
  );
}

/**
 * Trung tâm tặng xu.
 *
 * `kind = GIFT` chứ không phải TOPUP, và đây không phải chuyện đặt tên cho vui:
 * mọi con số doanh thu phải loại nhóm này ra. Cùng tinh thần với việc dự án cố
 * ý không có nút "đánh dấu đã thanh toán" — sổ sách phải khớp tiền thật.
 */
export async function giftCoins(input: {
  userId: string;
  coins: number;
  giftKey: string;
  note: string;
}): Promise<{ ok: boolean; balanceAfter: number }> {
  if (input.coins <= 0) return { ok: false, balanceAfter: 0 };

  try {
    return await db.$transaction(
      async (tx) => {
        const wallet = await tx.coinWallet.upsert({
          where: { userId: input.userId },
          create: {
            userId: input.userId,
            grantedTotal: input.coins,
            spentTotal: 0,
          },
          update: { grantedTotal: { increment: input.coins } },
        });
        const balanceAfter = coinBalance(wallet);

        await tx.coinLedger.create({
          data: {
            userId: input.userId,
            kind: "GIFT",
            amount: input.coins,
            balanceAfter,
            ledgerKey: `GIFT:${input.giftKey}`,
            note: input.note,
          },
        });

        return { ok: true, balanceAfter };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, balanceAfter: 0 };
    }
    throw error;
  }
}
