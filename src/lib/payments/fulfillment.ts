import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { OFFERS, isOfferCode, type Offer } from "@/lib/payments/catalog";
import { orderCodeLabel } from "@/lib/payments/coins";
import { creditCoinsForOrder } from "@/lib/payments/coin-service";
import {
  canRecoverFulfillmentP2002,
  canTransitionToPaid,
  computeGrantWindow,
  decidePackageReversal,
} from "@/lib/payments/payment-rules";

/**
 * ĐƯỜNG CẤP QUYỀN DUY NHẤT của hệ thống.
 *
 * IPN, nút đối soát của quản trị viên và tác vụ đối soát định kỳ đều phải đi
 * qua đây. Có hai nơi cấp quyền là sớm muộn cũng lệch nhau, và lệch ở chỗ này
 * nghĩa là học viên trả tiền mà không được học, hoặc được học mà không trả tiền.
 *
 * Toàn bộ nằm trong một transaction ở mức Serializable: hai thông báo IPN đến
 * cùng lúc thì chỉ một cái tạo được quyền.
 */

export type FulfillResult =
  | { ok: true; alreadyPaid: boolean }
  | { ok: false; reason: string };

async function hasExpectedFulfillmentEvidence(order: {
  id: string;
  userId: string;
  orderKind: string;
  offerCode: string;
  coinsGranted: number;
}): Promise<boolean> {
  if (order.orderKind === "TOPUP") {
    const ledger = await db.coinLedger.findUnique({
      where: { ledgerKey: `TOPUP:${order.id}` },
      select: { userId: true, orderId: true, kind: true, amount: true },
    });
    return (
      ledger?.userId === order.userId &&
      ledger.orderId === order.id &&
      ledger.kind === "TOPUP" &&
      ledger.amount === order.coinsGranted
    );
  }

  const offer = isOfferCode(order.offerCode)
    ? (OFFERS[order.offerCode] as Offer)
    : null;
  if (offer?.kind === "AI_TOPUP") {
    const budget = await db.feynmanAiBudget.findUnique({
      where: { userId: order.userId },
      select: { grantedTotal: true },
    });
    const credits = offer.aiGradingCredits ?? 0;
    return credits > 0 && (budget?.grantedTotal ?? 0) >= credits;
  }

  const grant = await db.accessGrant.findUnique({
    where: { orderId: order.id },
    select: { userId: true, grantKey: true, source: true },
  });
  return (
    grant?.userId === order.userId &&
    grant.grantKey === `ORDER:${order.id}` &&
    grant.source === "PURCHASE"
  );
}

export async function fulfillPaidOrder(input: {
  orderId: string;
  providerOrderId?: string | null;
  providerTransactionId: string;
  paymentMethod: string;
  paidAt: Date;
  sanitizedPayload: string;
  eventFinalize?: {
    eventKey: string;
    processingLeaseToken: string;
    errorMessage?: string | null;
  };
}): Promise<FulfillResult> {
  try {
    return await db.$transaction(
      async (tx) => {
        const order = await tx.paymentOrder.findUnique({
          where: { id: input.orderId },
        });
        if (!order) return { ok: false as const, reason: "ORDER_NOT_FOUND" };

        // Gọi lại lần hai cho đơn đã xử lý là chuyện bình thường (SePay gửi lặp)
        if (order.status === "PAID") {
          return { ok: true as const, alreadyPaid: true };
        }
        if (!canTransitionToPaid(order.status)) {
          return { ok: false as const, reason: `ORDER_NOT_PAYABLE:${order.status}` };
        }

        // Một giao dịch của SePay không được mở quyền cho hai đơn khác nhau.
        const reused = await tx.paymentOrder.findFirst({
          where: {
            providerTransactionId: input.providerTransactionId,
            id: { not: order.id },
          },
          select: { id: true },
        });
        if (reused) {
          return { ok: false as const, reason: "TRANSACTION_ALREADY_USED" };
        }

        // Đơn nạp ví rẽ ở ĐÂY, trước khi tra bảng giá: mã trên đơn nạp là mã
        // mốc nạp chứ không phải mã gói, nên tra `OFFERS` sẽ ra null và mọi
        // bước dưới đều xử lý sai một cách im lặng.
        //
        // Số xu lấy từ `order.coinsGranted` đã chốt lúc tạo đơn, KHÔNG tra lại
        // bảng mốc nạp: đổi mức thưởng không được phép làm thay đổi số xu của
        // một đơn học viên đã bấm mua theo tỉ lệ cũ.
        if (order.orderKind === "TOPUP") {
          await creditCoinsForOrder(tx, {
            orderId: order.id,
            userId: order.userId,
            coins: order.coinsGranted,
            note: orderCodeLabel(order.offerCode),
          });

          await tx.paymentOrder.update({
            where: { id: order.id },
            data: {
              status: "PAID",
              paidAt: input.paidAt,
              providerOrderId: input.providerOrderId ?? null,
              providerTransactionId: input.providerTransactionId,
              paymentMethod: input.paymentMethod,
              rawLastPayload: input.sanitizedPayload,
              lastError: null,
            },
          });

          if (input.eventFinalize) {
            const finalized = await tx.paymentEvent.updateMany({
              where: {
                eventKey: input.eventFinalize.eventKey,
                processingStatus: "PROCESSING",
                processingLeaseToken: input.eventFinalize.processingLeaseToken,
              },
              data: {
                processingStatus: "PROCESSED",
                errorMessage: input.eventFinalize.errorMessage ?? null,
                processedAt: input.paidAt,
              },
            });
            if (finalized.count !== 1) {
              throw new Error("PAYMENT_EVENT_LEASE_LOST");
            }
          }

          return { ok: true as const, alreadyPaid: false };
        }

        const offer = isOfferCode(order.offerCode)
          ? (OFFERS[order.offerCode] as Offer)
          : null;
        const durationDays = offer?.durationDays ?? null;

        // Gia hạn khi gói cũ còn hạn thì nối tiếp, không đè mất ngày còn lại.
        const current =
          order.scope === "ALL"
            ? await tx.accessGrant.findFirst({
                where: {
                  userId: order.userId,
                  feature: order.feature,
                  scope: "ALL",
                  status: "ACTIVE",
                  expiresAt: { gt: input.paidAt },
                },
                orderBy: { expiresAt: "desc" },
                select: { expiresAt: true },
              })
            : null;

        const window = computeGrantWindow({
          durationDays,
          paidAt: input.paidAt,
          currentExpiresAt: current?.expiresAt ?? null,
        });

        // Gói nạp lượt AI không mở quyền gì, nên KHÔNG tạo grant. Tạo một grant
        // scope NONE chỉ để "cho có" sẽ làm bảng quyền đầy những dòng không mở
        // gì cả, và trang quản trị đếm quyền sẽ sai.
        if (offer?.kind !== "AI_TOPUP") {
          await tx.accessGrant.create({
            data: {
              userId: order.userId,
              exerciseId: order.scope === "EXERCISE" ? order.exerciseId : null,
              attemptId: order.scope === "ATTEMPT" ? order.attemptId : null,
              orderId: order.id,
              grantKey: `ORDER:${order.id}`,
              feature: order.feature,
              scope: order.scope,
              source: "PURCHASE",
              status: "ACTIVE",
              startsAt: window.startsAt,
              expiresAt: window.expiresAt,
            },
          });
        }

        // Cộng lượt AI vào ví CHUNG của tài khoản.
        //
        // Nằm trong cùng transaction Serializable với việc cấp quyền là bắt
        // buộc: tách ra ngoài thì một lần treo mạng giữa hai bước sẽ để lại
        // học viên đã trả tiền, đã có quyền, nhưng ví trống — và không có dấu
        // vết nào cho biết phải cộng bù bao nhiêu.
        //
        // Dùng upsert với `increment` thay vì đọc-rồi-ghi: hai IPN song song
        // đọc cùng một số dư rồi ghi đè nhau sẽ nuốt mất một lần nạp.
        const credits = offer?.aiGradingCredits ?? 0;
        if (credits > 0) {
          await tx.feynmanAiBudget.upsert({
            where: { userId: order.userId },
            create: {
              userId: order.userId,
              grantedTotal: credits,
              usedTotal: 0,
            },
            update: { grantedTotal: { increment: credits } },
          });
        }

        await tx.paymentOrder.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            paidAt: input.paidAt,
            providerOrderId: input.providerOrderId ?? null,
            providerTransactionId: input.providerTransactionId,
            paymentMethod: input.paymentMethod,
            rawLastPayload: input.sanitizedPayload,
            lastError: null,
          },
        });

        if (input.eventFinalize) {
          const finalized = await tx.paymentEvent.updateMany({
            where: {
              eventKey: input.eventFinalize.eventKey,
              processingStatus: "PROCESSING",
              processingLeaseToken: input.eventFinalize.processingLeaseToken,
            },
            data: {
              processingStatus: "PROCESSED",
              errorMessage: input.eventFinalize.errorMessage ?? null,
              processedAt: input.paidAt,
            },
          });
          if (finalized.count !== 1) {
            throw new Error("PAYMENT_EVENT_LEASE_LOST");
          }
        }

        return { ok: true as const, alreadyPaid: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    // P2002 chỉ nói một unique key bị đụng. Nó có thể là giao dịch đã thuộc về
    // đơn khác hoặc dữ liệu grant/ledger hỏng, nên phải đọc lại và chứng minh
    // worker song song đã hoàn tất ĐÚNG đơn trước khi trả idempotent-success.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const order = await db.paymentOrder.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          userId: true,
          status: true,
          orderKind: true,
          offerCode: true,
          coinsGranted: true,
          providerTransactionId: true,
        },
      });
      const evidence = order
        ? await hasExpectedFulfillmentEvidence(order)
        : false;
      if (
        order &&
        canRecoverFulfillmentP2002({
          orderStatus: order.status,
          expectedProviderTransactionId: input.providerTransactionId,
          actualProviderTransactionId: order.providerTransactionId,
          hasExpectedFulfillmentEvidence: evidence,
        })
      ) {
        return { ok: true, alreadyPaid: true };
      }
      return { ok: false, reason: "FULFILLMENT_UNIQUE_CONFLICT" };
    }
    throw error;
  }
}

/**
 * Đóng đơn đã quá hạn hiển thị và nhả khóa ưu đãi.
 *
 * Đặt ở đây thay vì ngay trong trang: đọc đồng hồ hệ thống trong lúc dựng giao
 * diện làm kết quả không ổn định giữa các lần dựng lại.
 *
 * @returns true nếu đơn đã hết hạn (dù vừa đóng hay đã đóng từ trước)
 */
export async function expireOrderIfStale(order: {
  id: string;
  status: string;
  expiresAt: Date;
}): Promise<boolean> {
  if (order.status !== "PENDING") return false;
  if (order.expiresAt.getTime() > Date.now()) return false;

  await db.paymentOrder.update({
    where: { id: order.id },
    data: { status: "EXPIRED", introPromoToken: null },
  });
  return true;
}

/**
 * Thu hồi quyền của đúng một đơn (khi SePay báo hủy giao dịch hoặc quản trị
 * viên hoàn tiền). Chỉ đụng tới grant sinh ra từ đơn đó — các quyền khác của
 * học viên, kể cả quyền đã mua trước đó, phải giữ nguyên.
 */
export async function revokeGrantsOfOrder(
  orderId: string,
  reason: string
): Promise<number> {
  const result = await db.accessGrant.updateMany({
    where: { orderId, status: "ACTIVE" },
    data: { status: "REVOKED", revokedAt: new Date(), revokeReason: reason },
  });
  return result.count;
}

export async function reversePackageOrder(input: {
  orderId: string;
  status: "REFUNDED" | "VOIDED";
  revokeReason: string;
  now?: Date;
  lastError?: string | null;
  rawLastPayload?: string | null;
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
      revokedGrants: number;
      aiCreditsRevoked: number;
    }
  | {
      ok: false;
      action: "REVIEW";
      orderStatus: "REQUIRES_REVIEW";
      reason: "AI_CREDITS_ALREADY_USED" | "ORDER_NOT_REVERSIBLE";
      revokedGrants: 0;
      aiCreditsRevoked: 0;
    }
> {
  const now = input.now ?? new Date();

  return db.$transaction(
    async (tx) => {
      const order = await tx.paymentOrder.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          userId: true,
          offerCode: true,
          status: true,
        },
      });
      if (!order) {
        throw new Error(`ORDER_NOT_FOUND:${input.orderId}`);
      }

      const offer = isOfferCode(order.offerCode)
        ? (OFFERS[order.offerCode] as Offer)
        : null;
      const grantCount = await tx.accessGrant.count({
        where: { orderId: input.orderId },
      });
      const budget = await tx.feynmanAiBudget.findUnique({
        where: { userId: order.userId },
        select: { grantedTotal: true, usedTotal: true },
      });
      const availableAiCredits = budget
        ? Math.max(0, budget.grantedTotal - budget.usedTotal)
        : 0;
      const decision = decidePackageReversal({
        orderStatus: order.status,
        targetStatus: input.status,
        grantedAiCredits: offer?.aiGradingCredits ?? 0,
        availableAiCredits,
        usedTotal: budget?.usedTotal ?? 0,
        grantCount,
      });

      if (decision.action === "NOOP_FINAL") {
        if (input.eventFinalize) {
          const finalized = await tx.paymentEvent.updateMany({
            where: {
              eventKey: input.eventFinalize.eventKey,
              processingStatus: "PROCESSING",
              processingLeaseToken: input.eventFinalize.processingLeaseToken,
            },
            data: {
              processingStatus: "PROCESSED",
              errorMessage: input.eventFinalize.errorMessage ?? null,
              processedAt: now,
            },
          });
          if (finalized.count !== 1) {
            throw new Error("PAYMENT_EVENT_LEASE_LOST");
          }
        }
        return {
          ok: true as const,
          action: "NOOP_FINAL" as const,
          orderStatus: order.status,
          revokedGrants: 0,
          aiCreditsRevoked: 0,
        };
      }

      if (decision.action === "REVIEW") {
        await tx.paymentOrder.update({
          where: { id: input.orderId },
          data: {
            status: "REQUIRES_REVIEW",
            lastError: input.lastError ?? decision.reviewReason,
            rawLastPayload: input.rawLastPayload ?? undefined,
          },
        });
        if (input.eventFinalize) {
          const finalized = await tx.paymentEvent.updateMany({
            where: {
              eventKey: input.eventFinalize.eventKey,
              processingStatus: "PROCESSING",
              processingLeaseToken: input.eventFinalize.processingLeaseToken,
            },
            data: {
              processingStatus: "PROCESSED",
              errorMessage:
                input.eventFinalize.errorMessage ?? decision.reviewReason,
              processedAt: now,
            },
          });
          if (finalized.count !== 1) {
            throw new Error("PAYMENT_EVENT_LEASE_LOST");
          }
        }
        return {
          ok: false as const,
          action: "REVIEW" as const,
          orderStatus: "REQUIRES_REVIEW" as const,
          reason: decision.reviewReason,
          revokedGrants: 0,
          aiCreditsRevoked: 0,
        };
      }

      const revoked = await tx.accessGrant.updateMany({
        where: { orderId: input.orderId, status: "ACTIVE" },
        data: {
          status: "REVOKED",
          revokedAt: now,
          revokeReason: input.revokeReason,
        },
      });

      if (decision.aiCreditsToRevoke > 0) {
        await tx.feynmanAiBudget.update({
          where: { userId: order.userId },
          data: {
            grantedTotal: { decrement: decision.aiCreditsToRevoke },
          },
        });
      }

      await tx.paymentOrder.update({
        where: { id: input.orderId },
        data: {
          status: decision.orderStatus,
          lastError: input.lastError ?? null,
          rawLastPayload: input.rawLastPayload ?? undefined,
          ...(decision.orderStatus === "VOIDED" ? { voidedAt: now } : {}),
        },
      });

      if (input.eventFinalize) {
        const finalized = await tx.paymentEvent.updateMany({
          where: {
            eventKey: input.eventFinalize.eventKey,
            processingStatus: "PROCESSING",
            processingLeaseToken: input.eventFinalize.processingLeaseToken,
          },
          data: {
            processingStatus: "PROCESSED",
            errorMessage: input.eventFinalize.errorMessage ?? null,
            processedAt: now,
          },
        });
        if (finalized.count !== 1) {
          throw new Error("PAYMENT_EVENT_LEASE_LOST");
        }
      }

      return {
        ok: true as const,
        action: "REVERSED" as const,
        orderStatus: decision.orderStatus,
        revokedGrants: revoked.count,
        aiCreditsRevoked: decision.aiCreditsToRevoke,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}
