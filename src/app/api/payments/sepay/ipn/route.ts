import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  fulfillPaidOrder,
  reversePackageOrder,
} from "@/lib/payments/fulfillment";
import { reverseTopupOrder } from "@/lib/payments/coin-service";
import {
  buildEventKey,
  boundPaymentEventErrorMessage,
  checkIpnPaidPayload,
  decidePaymentEventClaim,
  requirePaymentEventFinalized,
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

const PROCESSING_TIMEOUT_MS = 2 * 60 * 1000;

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

async function claimEventProcessing(input: {
  eventKey: string;
  orderId: string | null;
  notificationType: string;
  providerTransactionId: string | null;
  payloadJson: string;
  now: Date;
}): Promise<
  | { kind: "CLAIMED"; processingLeaseToken: string }
  | { kind: "FINAL" }
  | { kind: "IN_FLIGHT" }
> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await db.paymentEvent.findUnique({
      where: { eventKey: input.eventKey },
      select: {
        processingStatus: true,
        receivedAt: true,
        processedAt: true,
      },
    });

    const decision = decidePaymentEventClaim({
      existing,
      now: input.now,
      processingTimeoutMs: PROCESSING_TIMEOUT_MS,
    });

    if (decision.kind === "SKIP_FINAL") return { kind: "FINAL" };
    if (decision.kind === "SKIP_IN_FLIGHT") return { kind: "IN_FLIGHT" };

    const processingLeaseToken = randomUUID();

    if (decision.kind === "CREATE_AND_CLAIM") {
      try {
        await db.paymentEvent.create({
          data: {
            eventKey: input.eventKey,
            orderId: input.orderId,
            notificationType: input.notificationType || "UNKNOWN",
            providerTransactionId: input.providerTransactionId,
            processingStatus: "PROCESSING",
            processingLeaseToken,
            payloadJson: input.payloadJson,
            processedAt: input.now,
          },
        });
        return { kind: "CLAIMED", processingLeaseToken };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }
        throw error;
      }
    }

    const where =
      decision.kind === "RECLAIM_STALE"
        ? {
            eventKey: input.eventKey,
            processingStatus: "PROCESSING",
            OR: [
              { processedAt: { lte: new Date(input.now.getTime() - PROCESSING_TIMEOUT_MS) } },
              {
                processedAt: null,
                receivedAt: { lte: new Date(input.now.getTime() - PROCESSING_TIMEOUT_MS) },
              },
            ],
          }
        : {
            eventKey: input.eventKey,
            processingStatus: { notIn: ["PROCESSING", "PROCESSED"] },
          };

    const claimed = await db.paymentEvent.updateMany({
      where,
      data: {
        orderId: input.orderId,
        notificationType: input.notificationType || "UNKNOWN",
        providerTransactionId: input.providerTransactionId,
        processingStatus: "PROCESSING",
        processingLeaseToken,
        payloadJson: input.payloadJson,
        errorMessage: null,
        processedAt: input.now,
      },
    });
    if (claimed.count > 0) {
      return { kind: "CLAIMED", processingLeaseToken };
    }
  }

  return { kind: "IN_FLIGHT" };
}

async function finalizeClaimedEvent(input: {
  eventKey: string;
  processingLeaseToken: string;
  processingStatus: "PROCESSED" | "FAILED";
  errorMessage?: string | null;
  processedAt: Date;
  tx?: Prisma.TransactionClient;
}): Promise<boolean> {
  const client = input.tx ?? db;
  const updated = await client.paymentEvent.updateMany({
    where: {
      eventKey: input.eventKey,
      processingStatus: "PROCESSING",
      processingLeaseToken: input.processingLeaseToken,
    },
    data: {
      processingStatus: input.processingStatus,
      errorMessage: input.errorMessage ?? null,
      processedAt: input.processedAt,
    },
  });
  return updated.count === 1;
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
  const now = new Date();

  const claim = await claimEventProcessing({
    eventKey,
    orderId: order?.id ?? null,
    notificationType,
    providerTransactionId: transactionId || null,
    payloadJson: sanitized,
    now,
  });
  if (claim.kind === "FINAL") {
    return NextResponse.json({ success: true, duplicate: true });
  }
  if (claim.kind === "IN_FLIGHT") {
    return NextResponse.json(
      { success: false, processing: true, retry: true },
      { status: 503, headers: { "Retry-After": "5" } }
    );
  }

  const processingLeaseToken = claim.processingLeaseToken;
  try {
    if (!order) {
      requirePaymentEventFinalized(
        await finalizeClaimedEvent({
          eventKey,
          processingLeaseToken,
          processingStatus: "PROCESSED",
          errorMessage: "UNKNOWN_INVOICE",
          processedAt: now,
        })
      );
      return NextResponse.json({ success: true });
    }

    if (notificationType === "ORDER_PAID") {
      const check = checkIpnPaidPayload(payload, {
        amount: order.amount,
        currency: order.currency,
      });

      if (!check.ok) {
        // Không khớp thì KHÔNG cấp quyền — chuyển sang chờ người thật đối soát.
        await db.$transaction(async (tx) => {
          await tx.paymentOrder.updateMany({
            where: { id: order.id, status: { in: ["PENDING", "REQUIRES_REVIEW"] } },
            data: {
              status: "REQUIRES_REVIEW",
              rawLastPayload: sanitized,
              lastError: `IPN_VALIDATION_FAILED:${check.reason}`,
            },
          });
          const finalized = await finalizeClaimedEvent({
            tx,
            eventKey,
            processingLeaseToken,
            processingStatus: "PROCESSED",
            errorMessage: check.reason,
            processedAt: now,
          });
          if (!finalized) throw new Error("PAYMENT_EVENT_LEASE_LOST");
        });
        return NextResponse.json({ success: true, review: true });
      }

      const result = await fulfillPaidOrder({
        orderId: order.id,
        providerOrderId: str(orderPart.order_id) || null,
        providerTransactionId: check.transactionId,
        paymentMethod: str(txPart.payment_method) || "BANK_TRANSFER",
        paidAt: now,
        sanitizedPayload: sanitized,
        eventFinalize: {
          eventKey,
          processingLeaseToken,
        },
      });

      if (!result.ok) {
        await db.$transaction(async (tx) => {
          await tx.paymentOrder.updateMany({
            where: { id: order.id, status: { in: ["PENDING", "REQUIRES_REVIEW"] } },
            data: {
              status: "REQUIRES_REVIEW",
              rawLastPayload: sanitized,
              lastError: result.reason,
            },
          });
          const finalized = await finalizeClaimedEvent({
            tx,
            eventKey,
            processingLeaseToken,
            processingStatus: "PROCESSED",
            errorMessage: result.reason,
            processedAt: now,
          });
          if (!finalized) throw new Error("PAYMENT_EVENT_LEASE_LOST");
        });
        return NextResponse.json({ success: true, review: true });
      }

      if (result.alreadyPaid) {
        requirePaymentEventFinalized(
          await finalizeClaimedEvent({
            eventKey,
            processingLeaseToken,
            processingStatus: "PROCESSED",
            processedAt: now,
          })
        );
      }
      return NextResponse.json({ success: true });
    }

    if (notificationType === "TRANSACTION_VOID") {
      if (order.orderKind === "TOPUP") {
        const topUpRevoke = await reverseTopupOrder({
          orderId: order.id,
          targetStatus: "VOIDED",
          reason: "SEPAY_VOID",
          reviewCodePrefix: "SEPAY_VOID",
          rawLastPayload: sanitized,
          now,
          eventFinalize: {
            eventKey,
            processingLeaseToken,
          },
        });

        return NextResponse.json({
          success: true,
          ...(topUpRevoke.ok ? {} : { review: true }),
        });
      }

      const reversed = await reversePackageOrder({
        orderId: order.id,
        status: "VOIDED",
        revokeReason: "SEPAY_VOID",
        rawLastPayload: sanitized,
        now,
        eventFinalize: {
          eventKey,
          processingLeaseToken,
        },
      });

      return NextResponse.json({
        success: true,
        ...(reversed.ok ? {} : { review: true }),
      });
    }

    requirePaymentEventFinalized(
      await finalizeClaimedEvent({
        eventKey,
        processingLeaseToken,
        processingStatus: "PROCESSED",
        errorMessage: `UNHANDLED_TYPE:${notificationType || "EMPTY"}`,
        processedAt: now,
      })
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    await finalizeClaimedEvent({
      eventKey,
      processingLeaseToken,
      processingStatus: "FAILED",
      errorMessage: boundPaymentEventErrorMessage(error),
      processedAt: new Date(),
    });
    throw error;
  }
}
