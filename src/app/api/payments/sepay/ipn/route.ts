import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  fulfillPaidOrder,
  revokeGrantsOfOrder,
} from "@/lib/payments/fulfillment";
import {
  buildEventKey,
  checkIpnPaidPayload,
} from "@/lib/payments/payment-rules";

/**
 * Điểm nhận thông báo thanh toán từ máy chủ SePay (IPN).
 *
 * ĐÂY LÀ NGUỒN SỰ THẬT DUY NHẤT về việc "đã trả tiền hay chưa". Trình duyệt
 * quay về success_url không mở quyền cho ai cả — nếu dựa vào đó thì chỉ cần
 * gõ tay địa chỉ là học miễn phí.
 *
 * Phải là Route Handler chứ không phải Server Action: SePay gọi từ máy chủ của
 * họ, không có cookie phiên và không đi qua cơ chế chống CSRF của Server Action.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** So sánh chuỗi theo thời gian hằng định để không rò rỉ khóa qua thời gian đáp ứng. */
function safeEqual(actual: string, expected: string): boolean {
  const a = Buffer.from(actual, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function expectedSecret(): string | null {
  const value = (
    process.env.SEPAY_IPN_SECRET || process.env.SEPAY_SECRET_KEY || ""
  ).trim();
  return value || null;
}

/**
 * Bỏ những trường không cần cho việc đối soát trước khi lưu payload.
 * Số thẻ, tên chủ thẻ, IP và trình duyệt của học viên không phục vụ mục đích
 * nào của trung tâm, nên đơn giản là không lưu.
 */
function sanitizePayload(payload: unknown): string {
  let clone: Record<string, unknown>;
  try {
    clone = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  } catch {
    return "{}";
  }
  const order = clone.order as Record<string, unknown> | undefined;
  if (order) {
    delete order.ip_address;
    delete order.user_agent;
  }
  const tx = clone.transaction as Record<string, unknown> | undefined;
  if (tx) {
    delete tx.card_number;
    delete tx.card_holder_name;
    delete tx.card_expiry;
    delete tx.card_cvv;
  }
  return JSON.stringify(clone).slice(0, 60_000);
}

function str(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

export async function POST(request: Request) {
  const secret = expectedSecret();
  if (!secret) {
    console.error(
      "[wobridges] Nhận IPN nhưng chưa cấu hình SEPAY_IPN_SECRET/SEPAY_SECRET_KEY"
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supplied = request.headers.get("x-secret-key") ?? "";
  if (!safeEqual(supplied, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.text();
  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) throw new Error("not object");
    payload = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderPart = (payload.order ?? {}) as Record<string, unknown>;
  const txPart = (payload.transaction ?? {}) as Record<string, unknown>;
  const invoiceNumber = str(orderPart.order_invoice_number);
  const transactionId = str(txPart.transaction_id);
  const notificationType = str(payload.notification_type);
  const eventKey = buildEventKey({
    notificationType,
    transactionId,
    invoiceNumber,
    timestamp: payload.timestamp,
  });
  const sanitized = sanitizePayload(payload);

  const order = invoiceNumber
    ? await db.paymentOrder.findUnique({ where: { invoiceNumber } })
    : null;

  // Ghi nhật ký TRƯỚC khi xử lý. Ràng buộc duy nhất trên eventKey chính là cơ
  // chế chống xử lý lặp: SePay gửi lại cùng thông báo thì dừng ngay tại đây.
  try {
    await db.paymentEvent.create({
      data: {
        eventKey,
        orderId: order?.id ?? null,
        notificationType: notificationType || "UNKNOWN",
        providerTransactionId: transactionId || null,
        processingStatus: "RECEIVED",
        payloadJson: sanitized,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ success: true, duplicate: true });
    }
    throw error;
  }

  const markEvent = (
    processingStatus: string,
    errorMessage?: string
  ) =>
    db.paymentEvent.update({
      where: { eventKey },
      data: { processingStatus, errorMessage, processedAt: new Date() },
    });

  if (!order) {
    // Trả 200 để SePay không gửi lại mãi; bản ghi vẫn nằm đó cho người đối soát.
    await markEvent("IGNORED", "UNKNOWN_INVOICE");
    return NextResponse.json({ success: true });
  }

  if (notificationType === "ORDER_PAID") {
    const check = checkIpnPaidPayload(payload, {
      amount: order.amount,
      currency: order.currency,
    });

    if (!check.ok) {
      // Không khớp thì KHÔNG cấp quyền — chuyển sang chờ người thật đối soát.
      await db.$transaction([
        db.paymentOrder.update({
          where: { id: order.id },
          data: {
            status: "REQUIRES_REVIEW",
            rawLastPayload: sanitized,
            lastError: `IPN_VALIDATION_FAILED:${check.reason}`,
          },
        }),
        db.paymentEvent.update({
          where: { eventKey },
          data: {
            processingStatus: "FAILED",
            errorMessage: check.reason,
            processedAt: new Date(),
          },
        }),
      ]);
      return NextResponse.json({ success: true, review: true });
    }

    const result = await fulfillPaidOrder({
      orderId: order.id,
      providerOrderId: str(orderPart.order_id) || null,
      providerTransactionId: check.transactionId,
      paymentMethod: str(txPart.payment_method) || "BANK_TRANSFER",
      paidAt: new Date(),
      sanitizedPayload: sanitized,
    });

    if (!result.ok) {
      await db.$transaction([
        db.paymentOrder.update({
          where: { id: order.id },
          data: { status: "REQUIRES_REVIEW", lastError: result.reason },
        }),
        db.paymentEvent.update({
          where: { eventKey },
          data: {
            processingStatus: "FAILED",
            errorMessage: result.reason,
            processedAt: new Date(),
          },
        }),
      ]);
      return NextResponse.json({ success: true, review: true });
    }

    await markEvent("PROCESSED");
    return NextResponse.json({ success: true });
  }

  if (notificationType === "TRANSACTION_VOID") {
    await db.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: "VOIDED",
        voidedAt: new Date(),
        rawLastPayload: sanitized,
      },
    });
    // Chỉ thu hồi quyền sinh ra từ đúng đơn này; quyền mua trước đó giữ nguyên.
    await revokeGrantsOfOrder(order.id, "SEPAY_VOID");
    await markEvent("PROCESSED");
    return NextResponse.json({ success: true });
  }

  await markEvent("IGNORED", `UNHANDLED_TYPE:${notificationType || "EMPTY"}`);
  return NextResponse.json({ success: true });
}
