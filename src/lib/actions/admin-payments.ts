"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { revokeGrantsOfOrder } from "@/lib/payments/fulfillment";
import { reconcileOneOrder } from "@/lib/payments/reconcile";

export type AdminPaymentState = { error?: string; success?: string } | undefined;

const ADMIN_PATH = "/quan-tri/thanh-toan";

/**
 * Đối soát một đơn với SePay khi thông báo tự động không tới (mạng lỗi, cấu
 * hình IPN sai…).
 *
 * Hỏi thẳng máy chủ SePay xem đơn đó thực sự đã trả tiền chưa, rồi đưa kết quả
 * qua ĐÚNG hàm cấp quyền mà IPN dùng. Không có đường cấp quyền thứ hai — nếu
 * có, sớm muộn hai đường sẽ lệch nhau.
 */
export async function reconcileOrderAction(
  _prev: AdminPaymentState,
  formData: FormData
): Promise<AdminPaymentState> {
  await requireAdmin();
  const invoiceNumber = String(formData.get("invoiceNumber") ?? "").trim();
  if (!invoiceNumber) return { error: "Thiếu mã đơn." };

  const outcome = await reconcileOneOrder(invoiceNumber);
  revalidatePath(ADMIN_PATH);
  revalidatePath("/luyen-tap");

  switch (outcome.kind) {
    case "granted":
      return { success: `Đã xác nhận thanh toán và mở quyền cho đơn ${invoiceNumber}.` };
    case "already":
      return { success: `Đơn ${invoiceNumber} vốn đã được xử lý — không cấp thêm quyền.` };
    case "not-paid":
      return {
        error: `SePay chưa xác nhận đơn này đã thanh toán (${outcome.reason}). Chưa cấp quyền.`,
      };
    default:
      return { error: `Không đối soát được: ${outcome.reason}` };
  }
}

/**
 * Ghi nhận hoàn tiền và thu hồi quyền của ĐÚNG đơn đó.
 *
 * Không xóa bài làm, không xóa phiên chữa bài Feynman: đó là lịch sử học tập
 * và cũng là bằng chứng nếu có tranh chấp.
 */
export async function refundOrderAction(
  _prev: AdminPaymentState,
  formData: FormData
): Promise<AdminPaymentState> {
  await requireAdmin();
  const invoiceNumber = String(formData.get("invoiceNumber") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!invoiceNumber) return { error: "Thiếu mã đơn." };
  if (reason.length < 5) {
    return { error: "Hãy ghi lý do hoàn tiền (tối thiểu 5 ký tự) để sau này tra lại được." };
  }

  const order = await db.paymentOrder.findUnique({ where: { invoiceNumber } });
  if (!order) return { error: "Không tìm thấy đơn này." };
  if (order.status !== "PAID") {
    return { error: `Chỉ hoàn tiền được đơn đã thanh toán (đơn này đang ở trạng thái ${order.status}).` };
  }

  await db.paymentOrder.update({
    where: { id: order.id },
    data: { status: "REFUNDED", lastError: `REFUND:${reason}` },
  });
  const revoked = await revokeGrantsOfOrder(order.id, `REFUND:${reason}`);

  revalidatePath(ADMIN_PATH);
  revalidatePath("/luyen-tap");
  return {
    success: `Đã ghi nhận hoàn tiền đơn ${invoiceNumber} và thu hồi ${revoked} quyền truy cập. Nhớ chuyển tiền lại cho học viên trên hệ thống SePay hoặc ngân hàng.`,
  };
}

/** Đóng một đơn treo mà không cấp quyền (học viên báo không trả nữa). */
export async function closePendingOrderAction(invoiceNumber: string) {
  await requireAdmin();
  const order = await db.paymentOrder.findUnique({
    where: { invoiceNumber },
    select: { id: true, status: true },
  });
  if (!order) return;
  if (order.status !== "PENDING" && order.status !== "REQUIRES_REVIEW") return;

  await db.paymentOrder.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      // Nhả khóa ưu đãi lần đầu: học viên chưa trả tiền nên chưa tiêu ưu đãi
      introPromoToken: null,
    },
  });
  revalidatePath(ADMIN_PATH);
}
