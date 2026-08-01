import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { OFFERS, isOfferCode } from "@/lib/payments/catalog";
import {
  canTransitionToPaid,
  computeGrantWindow,
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

export async function fulfillPaidOrder(input: {
  orderId: string;
  providerOrderId?: string | null;
  providerTransactionId: string;
  paymentMethod: string;
  paidAt: Date;
  sanitizedPayload: string;
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

        const durationDays = isOfferCode(order.offerCode)
          ? OFFERS[order.offerCode].durationDays
          : null;

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

        await tx.accessGrant.create({
          data: {
            userId: order.userId,
            exerciseId: order.scope === "EXERCISE" ? order.exerciseId : null,
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

        return { ok: true as const, alreadyPaid: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    // Hai IPN chạy song song: cái thua cuộc đụng ràng buộc unique (grantKey
    // hoặc providerTransactionId). Quyền đã được cấp bởi cái thắng nên coi là
    // thành công, không được thử cấp lại.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: true, alreadyPaid: true };
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
