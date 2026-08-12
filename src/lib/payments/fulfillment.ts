import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { OFFERS, isOfferCode, type Offer } from "@/lib/payments/catalog";
import { orderCodeLabel } from "@/lib/payments/coins";
import { creditCoinsForOrder } from "@/lib/payments/coin-service";
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
