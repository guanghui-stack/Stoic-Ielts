import "server-only";
import { db } from "@/lib/db";
import { getSePayClient } from "@/lib/payments/sepay";
import { fulfillPaidOrder } from "@/lib/payments/fulfillment";
import { checkRetrievedOrderPaid } from "@/lib/payments/payment-rules";

/**
 * Đối soát một đơn với SePay — dùng chung cho nút bấm của quản trị viên và tác
 * vụ chạy định kỳ.
 *
 * IPN là kênh chính; đây chỉ là lưới an toàn cho lúc thông báo không tới (mạng
 * lỗi, cấu hình sai, máy chủ đang khởi động lại). Cả hai lối đều đi qua ĐÚNG
 * hàm `fulfillPaidOrder` — không có đường cấp quyền thứ hai.
 */

export type ReconcileOutcome =
  | { kind: "granted"; invoiceNumber: string }
  | { kind: "already"; invoiceNumber: string }
  | { kind: "not-paid"; invoiceNumber: string; reason: string }
  | { kind: "error"; invoiceNumber: string; reason: string };

export async function reconcileOneOrder(
  invoiceNumber: string
): Promise<ReconcileOutcome> {
  const order = await db.paymentOrder.findUnique({ where: { invoiceNumber } });
  if (!order) return { kind: "error", invoiceNumber, reason: "ORDER_NOT_FOUND" };
  if (order.status === "PAID") return { kind: "already", invoiceNumber };

  let body: unknown;
  try {
    const response = await getSePayClient().order.retrieve(invoiceNumber);
    body = response.data;
  } catch (error) {
    return {
      kind: "error",
      invoiceNumber,
      reason: `SEPAY_UNREACHABLE:${String(error).slice(0, 160)}`,
    };
  }

  // API có thể bọc trong { data: {...} } hoặc trả phẳng — chấp nhận cả hai.
  // Bên trong lớp bọc đó là ĐƠN HÀNG dạng phẳng (order_status, order_amount…),
  // KHÔNG phải gói thông báo IPN dạng { order, transaction }.
  const wrapper = body as Record<string, unknown> | null;
  const payload =
    wrapper && typeof wrapper.data === "object" && wrapper.data !== null
      ? wrapper.data
      : wrapper;

  const snapshot = JSON.stringify(payload ?? {}).slice(0, 60_000);
  const check = checkRetrievedOrderPaid(payload, {
    amount: order.amount,
    currency: order.currency,
  });

  if (!check.ok) {
    // Chưa trả tiền là chuyện bình thường với đơn mới tạo — chỉ ghi lại, không
    // đổi trạng thái đơn, để lần đối soát sau vẫn thử tiếp được.
    await db.paymentOrder.update({
      where: { id: order.id },
      data: { lastError: `RECONCILE:${check.reason}`, rawLastPayload: snapshot },
    });
    return { kind: "not-paid", invoiceNumber, reason: check.reason };
  }

  const record = payload as Record<string, unknown>;
  const txList = Array.isArray(record.transactions) ? record.transactions : [];
  const tx = txList.find(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null
  );

  const result = await fulfillPaidOrder({
    orderId: order.id,
    providerOrderId: record.order_id ? String(record.order_id) : null,
    providerTransactionId: check.transactionId,
    paymentMethod: tx?.payment_method ? String(tx.payment_method) : "BANK_TRANSFER",
    paidAt: new Date(),
    sanitizedPayload: snapshot,
  });

  if (!result.ok) {
    await db.paymentOrder.update({
      where: { id: order.id },
      data: { status: "REQUIRES_REVIEW", lastError: result.reason },
    });
    return { kind: "error", invoiceNumber, reason: result.reason };
  }
  return result.alreadyPaid
    ? { kind: "already", invoiceNumber }
    : { kind: "granted", invoiceNumber };
}

/** Đơn chờ dưới 5 phút thì bỏ qua — học viên có thể vẫn đang thao tác trên SePay. */
const MIN_AGE_MS = 5 * 60 * 1000;
const BATCH_LIMIT = 25;

export async function reconcileStalePendingOrders(): Promise<ReconcileOutcome[]> {
  const stale = await db.paymentOrder.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: new Date(Date.now() - MIN_AGE_MS) },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH_LIMIT,
    select: { invoiceNumber: true },
  });

  const results: ReconcileOutcome[] = [];
  for (const order of stale) {
    results.push(await reconcileOneOrder(order.invoiceNumber));
  }
  return results;
}
