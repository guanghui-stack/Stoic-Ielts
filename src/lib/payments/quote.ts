import "server-only";
import { db } from "@/lib/db";
import type { OfferCode } from "@/lib/payments/catalog";
import { resolveOfferPrice, type Quote } from "@/lib/payments/payment-rules";

/**
 * Hỏi database xem học viên đã tiêu ưu đãi Feynman lần đầu chưa, rồi để hàm
 * thuần `resolveOfferPrice` quyết định giá. Tách hai việc để phần quyết định
 * giá kiểm thử được mà không cần database.
 */
export async function quoteOffer(input: {
  userId: string;
  offerCode: OfferCode;
}): Promise<Quote> {
  // Chỉ đơn ĐÃ THANH TOÁN mới tính là đã dùng ưu đãi. Đơn bỏ dở không tính —
  // học viên bấm nhầm rồi đóng tab thì không mất quyền lợi.
  const paidBefore =
    input.offerCode === "FEYNMAN_SINGLE"
      ? await db.paymentOrder.findFirst({
          where: {
            userId: input.userId,
            offerCode: "FEYNMAN_SINGLE",
            status: "PAID",
          },
          select: { id: true },
        })
      : null;

  return resolveOfferPrice({
    offerCode: input.offerCode,
    userId: input.userId,
    hasPaidFeynmanSingleBefore: Boolean(paidBefore),
  });
}

/** Giá sẽ hiển thị trên nút mua Feynman lẻ cho học viên này. */
export async function feynmanSinglePrice(userId: string): Promise<{
  amount: number;
  isIntro: boolean;
}> {
  const quote = await quoteOffer({ userId, offerCode: "FEYNMAN_SINGLE" });
  return { amount: quote.amount, isIntro: quote.priceRule === "FIRST_FEYNMAN_9K" };
}
