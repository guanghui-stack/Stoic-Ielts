"use server";

import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { hasActiveAccess } from "@/lib/access-grants";
import { OFFERS, isOfferCode, type OfferCode } from "@/lib/payments/catalog";
import { quoteOffer } from "@/lib/payments/quote";
import { introTokenStillHeld } from "@/lib/payments/payment-rules";
import { sePayEnvironment, isSePayConfigured } from "@/lib/payments/sepay";

/** Đơn chưa trả tiền sau 24 giờ coi như bỏ; học viên bấm mua lại là có đơn mới. */
const ORDER_TTL_MS = 24 * 60 * 60 * 1000;

/** Chặn bấm mua dồn dập (bot hoặc bấm liên tục) — đếm ngay trên database. */
const MAX_PENDING_PER_HOUR = 12;

/** Mã đơn dạng WB-260801-A1B2C3: đọc được bằng mắt khi đối soát với SePay. */
function newInvoiceNumber(): string {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(2, 14);
  return `WB-${stamp}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * Tạo đơn hàng rồi chuyển sang trang thanh toán.
 *
 * Biểu mẫu chỉ gửi lên MÃ sản phẩm và mã bài — số tiền lấy từ bảng giá phía
 * máy chủ, đường dẫn quay về cũng do máy chủ tự dựng. Nhờ vậy người dùng sửa
 * HTML cũng không mua được giá rẻ hơn, cũng không chuyển hướng đi đâu khác.
 */
export async function createPaymentOrderAction(formData: FormData) {
  const user = await requireUser();

  if (!isSePayConfigured()) {
    redirect("/thanh-toan?loi=chua-cau-hinh");
  }

  const offerCodeRaw = String(formData.get("offerCode") ?? "");
  if (!isOfferCode(offerCodeRaw)) redirect("/thanh-toan?loi=san-pham");
  const offerCode: OfferCode = offerCodeRaw;
  const offer = OFFERS[offerCode];

  const exerciseId = String(formData.get("exerciseId") ?? "").trim() || null;
  const attemptId = String(formData.get("attemptId") ?? "").trim() || null;

  const returnPath = await resolveReturnPath({
    userId: user.id,
    offerCode,
    exerciseId,
    attemptId,
  });

  // Đã có quyền rồi thì đừng bán thêm — đưa thẳng về chỗ học.
  if (
    await hasActiveAccess({
      userId: user.id,
      feature: offer.feature,
      exerciseId,
    })
  ) {
    redirect(returnPath);
  }

  const quote = await quoteOffer({ userId: user.id, offerCode });

  // Bấm mua nhiều lần cho cùng một thứ thì quay lại đúng đơn đang chờ, thay vì
  // rải ra hàng loạt đơn rác khiến việc đối soát rối tung.
  const reusable = await db.paymentOrder.findFirst({
    where: {
      userId: user.id,
      offerCode,
      exerciseId,
      status: "PENDING",
      amount: quote.amount,
      priceVersion: quote.priceVersion,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true },
  });
  if (reusable) redirect(`/thanh-toan/${reusable.invoiceNumber}`);

  const recentPending = await db.paymentOrder.count({
    where: {
      userId: user.id,
      status: "PENDING",
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recentPending >= MAX_PENDING_PER_HOUR) {
    redirect("/thanh-toan?loi=qua-nhieu-don");
  }

  const invoiceNumber = await createOrder({
    userId: user.id,
    exerciseId,
    returnPath,
    offerCode,
    feature: offer.feature,
    scope: offer.scope,
    quote,
  });

  redirect(`/thanh-toan/${invoiceNumber}`);
}

/**
 * Dựng đường dẫn quay về sau khi trả tiền — luôn ở phía máy chủ và luôn là
 * đường dẫn nội bộ, nên không thể bị lợi dụng để chuyển hướng ra ngoài.
 * Đồng thời đây cũng là chỗ kiểm tra bài/lượt làm có thật và có đúng chủ không.
 */
async function resolveReturnPath(input: {
  userId: string;
  offerCode: OfferCode;
  exerciseId: string | null;
  attemptId: string | null;
}): Promise<string> {
  const offer = OFFERS[input.offerCode];
  if (offer.scope === "ALL") {
    return offer.feature === "READING" ? "/luyen-tap/reading" : "/hoc-vien";
  }

  if (!input.exerciseId) redirect("/thanh-toan?loi=thieu-bai");
  const exercise = await db.exercise.findUnique({
    where: { id: input.exerciseId },
    select: { id: true, published: true, skill: true },
  });
  if (!exercise || !exercise.published || exercise.skill !== "READING") {
    redirect("/luyen-tap/reading");
  }

  if (offer.feature === "READING") return "/luyen-tap/reading";

  // Feynman gắn với một lượt làm bài ĐÃ CHẤM của chính học viên đó — chưa làm
  // bài thì chưa có gì để chữa.
  const attempt = input.attemptId
    ? await db.attempt.findUnique({
        where: { id: input.attemptId },
        select: { id: true, userId: true, exerciseId: true, status: true },
      })
    : await db.attempt.findFirst({
        where: {
          userId: input.userId,
          exerciseId: input.exerciseId,
          status: "GRADED",
        },
        orderBy: { submittedAt: "desc" },
        select: { id: true, userId: true, exerciseId: true, status: true },
      });

  if (
    !attempt ||
    attempt.userId !== input.userId ||
    attempt.exerciseId !== input.exerciseId ||
    attempt.status !== "GRADED"
  ) {
    redirect("/hoc-vien");
  }
  return `/hoc-vien/bai-lam/${attempt.id}`;
}

/**
 * Ghi đơn xuống database, xử lý trường hợp khóa ưu đãi đang bị một đơn cũ giữ.
 *
 * Ràng buộc unique trên `introPromoToken` là thứ chặn được hai tab cùng bấm
 * mua giá 9.000đ. Nhưng nếu đơn giữ khóa đã hủy/hết hạn thì phải NHẢ khóa,
 * nếu không học viên bấm nhầm một lần là mất ưu đãi mà chưa tiêu đồng nào.
 */
async function createOrder(input: {
  userId: string;
  exerciseId: string | null;
  returnPath: string;
  offerCode: OfferCode;
  feature: string;
  scope: string;
  quote: Awaited<ReturnType<typeof quoteOffer>>;
}): Promise<string> {
  const data = {
    invoiceNumber: newInvoiceNumber(),
    userId: input.userId,
    exerciseId: input.exerciseId,
    returnPath: input.returnPath,
    offerCode: input.offerCode,
    feature: input.feature,
    scope: input.scope,
    amount: input.quote.amount,
    currency: "VND",
    priceVersion: input.quote.priceVersion,
    priceRule: input.quote.priceRule,
    status: "PENDING",
    provider: "SEPAY_PG",
    providerEnvironment: sePayEnvironment(),
    introPromoToken: input.quote.introPromoToken,
    expiresAt: new Date(Date.now() + ORDER_TTL_MS),
  };

  try {
    const order = await db.paymentOrder.create({ data, select: { invoiceNumber: true } });
    return order.invoiceNumber;
  } catch (error) {
    const isDuplicate =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";
    if (!isDuplicate || !input.quote.introPromoToken) throw error;

    const holder = await db.paymentOrder.findUnique({
      where: { introPromoToken: input.quote.introPromoToken },
      select: { id: true, invoiceNumber: true, status: true, expiresAt: true },
    });
    if (!holder) throw error;

    const stillValid =
      holder.status === "PENDING" && holder.expiresAt.getTime() > Date.now();
    if (stillValid) return holder.invoiceNumber; // hai tab cùng bấm → dùng chung một đơn
    if (introTokenStillHeld(holder.status)) throw error; // đã thanh toán: ưu đãi đã tiêu thật

    // Đơn cũ đã hủy/lỗi/hết hạn → nhả khóa rồi tạo lại đơn mới
    await db.paymentOrder.update({
      where: { id: holder.id },
      data: {
        introPromoToken: null,
        status: holder.status === "PENDING" ? "EXPIRED" : holder.status,
      },
    });
    const retried = await db.paymentOrder.create({
      data: { ...data, invoiceNumber: newInvoiceNumber() },
      select: { invoiceNumber: true },
    });
    return retried.invoiceNumber;
  }
}

/** Học viên tự bỏ một đơn đang chờ (nút "Hủy đơn" ở trang kết quả). */
export async function cancelPaymentOrderAction(invoiceNumber: string) {
  const user = await requireUser();
  const order = await db.paymentOrder.findUnique({
    where: { invoiceNumber },
    select: { id: true, userId: true, status: true },
  });
  if (!order || order.userId !== user.id) redirect("/thanh-toan");
  if (order.status === "PENDING") {
    await db.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        // Nhả khóa ưu đãi: học viên chưa trả tiền nên chưa tiêu ưu đãi
        introPromoToken: null,
      },
    });
  }
  redirect(`/thanh-toan/${invoiceNumber}/ket-qua`);
}
