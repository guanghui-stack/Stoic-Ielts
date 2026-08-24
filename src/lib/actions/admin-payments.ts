"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { reversePackageOrder } from "@/lib/payments/fulfillment";
import { reverseTopupOrder } from "@/lib/payments/coin-service";
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
  revalidatePath("/luyen-tap/reading");
  revalidatePath("/luyen-tap/reading/general");

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

  if (order.orderKind === "TOPUP") {
    const revoked = await reverseTopupOrder({
      orderId: order.id,
      targetStatus: "REFUNDED",
      reason: `REFUND:${reason}`,
      reviewCodePrefix: "REFUND",
    });
    if (!revoked.ok) {
      return {
        error:
          revoked.reason === "ALREADY_SPENT"
            ? `Không hoàn được: đơn này đã cộng xu nhưng ví học viên ` +
              `hiện còn ${revoked.balanceAfter} xu — phần chênh đã tiêu thành quyền học rồi. ` +
              `Hãy xử lý tay: hoặc thu hồi quyền tương ứng trước, hoặc chấp nhận ` +
              `hoàn tiền mà không thu lại xu.`
            : "Không hoàn được tự động vì sổ cái xu của đơn này không còn khớp với dữ liệu hiện tại. Hãy đối soát tay trước khi hoàn tiền để tránh trừ nhầm vào lần nạp khác của học viên.",
      };
    }
    revalidatePath(ADMIN_PATH);
    return {
      success: revoked.action === "NOOP_FINAL"
        ? `Đơn ${invoiceNumber} đã ở trạng thái ${revoked.orderStatus}; không cần thu hồi thêm xu.`
        : `Đã ghi nhận hoàn tiền đơn ${invoiceNumber} và thu lại ${revoked.coinsRevoked} xu ` +
          `(ví còn ${revoked.balanceAfter} xu). Nhớ chuyển tiền lại cho học viên ` +
          `trên hệ thống SePay hoặc ngân hàng.`,
    };
  }

  const revoked = await reversePackageOrder({
    orderId: order.id,
    status: "REFUNDED",
    revokeReason: `REFUND:${reason}`,
    lastError: `REFUND:${reason}`,
  });
  if (!revoked.ok) {
    return {
      error:
        revoked.reason === "AI_CREDITS_ALREADY_USED"
          ? "Không hoàn được tự động vì học viên đã dùng mất một phần lượt AI của gói này. Đơn đã được chuyển sang REQUIRES_REVIEW để quản trị viên quyết định xử lý tay."
          : `Không hoàn được tự động khi đơn đang ở trạng thái ${order.status}. Hãy kiểm tra lại lịch sử xử lý trước khi tiếp tục.`,
    };
  }

  revalidatePath(ADMIN_PATH);
  revalidatePath("/luyen-tap/reading");
  revalidatePath("/luyen-tap/reading/general");
  return {
    success:
      `Đã ghi nhận hoàn tiền đơn ${invoiceNumber} và thu hồi ${revoked.revokedGrants} quyền truy cập` +
      `${revoked.aiCreditsRevoked > 0 ? ` cùng ${revoked.aiCreditsRevoked} lượt AI` : ""}. ` +
      "Nhớ chuyển tiền lại cho học viên trên hệ thống SePay hoặc ngân hàng.",
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
