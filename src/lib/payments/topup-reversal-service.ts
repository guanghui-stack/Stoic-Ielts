import { coinBalance } from "./coins.ts";
import { decideTopupReversalFromLedger } from "./payment-rules.ts";

const TERMINAL_ORDER_STATUS = new Set([
  "REFUNDED",
  "VOIDED",
  "CANCELLED",
  "FAILED",
  "EXPIRED",
]);

export type TopupReversalLedgerRow = {
  kind: string;
  amount: number;
  orderId: string | null;
  ledgerKey: string;
};

export type TopupReversalOrder = {
  id: string;
  userId: string;
  status: string;
  coinsGranted: number;
};

export type TopupReversalWallet = {
  grantedTotal: number;
  spentTotal: number;
};

export type TopupReversalRepo = {
  getOrder(orderId: string): Promise<TopupReversalOrder | null>;
  getWallet(userId: string): Promise<TopupReversalWallet | null>;
  getLedger(userId: string): Promise<TopupReversalLedgerRow[]>;
  incrementWalletSpent(userId: string, amount: number): Promise<void>;
  createRevokeLedger(input: {
    userId: string;
    orderId: string;
    amount: number;
    balanceAfter: number;
    note: string;
  }): Promise<void>;
  updateOrder(
    orderId: string,
    data: {
      status: string;
      rawLastPayload?: string | null;
      lastError?: string | null;
      voidedAt?: Date;
    }
  ): Promise<void>;
  finalizeEvent?: (input: {
    eventKey: string;
    processingLeaseToken: string;
    processingStatus: "PROCESSED";
    errorMessage?: string | null;
    processedAt: Date;
  }) => Promise<boolean>;
};

export type TopupReversalServiceResult =
  | {
      ok: true;
      action: "REVERSED" | "NOOP_FINAL";
      orderStatus: string;
      coinsRevoked: number;
      balanceAfter: number;
    }
  | {
      ok: false;
      action: "REVIEW";
      orderStatus: "REQUIRES_REVIEW";
      reason:
        | "ALREADY_SPENT"
        | "CORRUPTED"
        | "TOPUP_NOT_PAYABLE"
        | "INSUFFICIENT_BALANCE";
      coinsRevoked: 0;
      balanceAfter: number;
    };

function reviewCodeOf(reason: string): string {
  return String(reason);
}

function retryableTransactionCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return code === "P2002" || code === "P2034" ? code : null;
}

/**
 * Mỗi lần gọi `operation` phải mở một Serializable transaction mới. Nhờ vậy
 * sau unique-conflict/deadlock, lần thử kế tiếp đọc state đã commit thay vì
 * đoán rằng worker kia chắc chắn đã làm xong.
 */
export async function runTopupReversalWithRetry<T>(
  operation: (attempt: number) => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  const boundedAttempts = Math.max(1, Math.min(5, Math.trunc(maxAttempts)));
  for (let attempt = 1; attempt <= boundedAttempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (!retryableTransactionCode(error) || attempt === boundedAttempts) {
        throw error;
      }
    }
  }
  throw new Error("TOPUP_REVERSAL_RETRY_EXHAUSTED");
}

export async function reverseTopupOrderWithRepo(
  repo: TopupReversalRepo,
  input: {
    orderId: string;
    targetStatus: "VOIDED" | "REFUNDED";
    reason: string;
    reviewCodePrefix: string;
    rawLastPayload?: string | null;
    now: Date;
    eventFinalize?: {
      eventKey: string;
      processingLeaseToken: string;
      errorMessage?: string | null;
    };
  }
): Promise<TopupReversalServiceResult> {
  const order = await repo.getOrder(input.orderId);
  if (!order) throw new Error(`ORDER_NOT_FOUND:${input.orderId}`);

  const wallet = await repo.getWallet(order.userId);
  const balance = wallet ? coinBalance(wallet) : 0;

  const finalizeEvent = async (errorMessage?: string | null) => {
    if (!input.eventFinalize) return;
    const finalized = await repo.finalizeEvent?.({
      eventKey: input.eventFinalize.eventKey,
      processingLeaseToken: input.eventFinalize.processingLeaseToken,
      processingStatus: "PROCESSED",
      errorMessage: errorMessage ?? input.eventFinalize.errorMessage ?? null,
      processedAt: input.now,
    });
    if (finalized === false) {
      throw new Error("PAYMENT_EVENT_LEASE_LOST");
    }
  };

  if (TERMINAL_ORDER_STATUS.has(order.status)) {
    await finalizeEvent();
    return {
      ok: true,
      action: "NOOP_FINAL",
      orderStatus: order.status,
      coinsRevoked: 0,
      balanceAfter: balance,
    };
  }

  const ledgerRows = await repo.getLedger(order.userId);
  const decision = decideTopupReversalFromLedger({
    orderId: order.id,
    orderStatus: order.status,
    expectedCoins: order.coinsGranted,
    ledgerRows,
  });

  if (decision.action === "REVIEW") {
    const reason =
      decision.reviewReason === "TOPUP_CREDIT_ALREADY_SPENT"
        ? "ALREADY_SPENT"
        : "CORRUPTED";
    await repo.updateOrder(order.id, {
      status: "REQUIRES_REVIEW",
      rawLastPayload: input.rawLastPayload,
      lastError: `${input.reviewCodePrefix}:${reviewCodeOf(reason)}`,
    });
    await finalizeEvent(reason);
    return {
      ok: false,
      action: "REVIEW",
      orderStatus: "REQUIRES_REVIEW",
      reason,
      coinsRevoked: 0,
      balanceAfter: balance,
    };
  }

  if (decision.action === "REVOKE_ORIGINAL_CREDIT" && order.status !== "PAID") {
    await repo.updateOrder(order.id, {
      status: "REQUIRES_REVIEW",
      rawLastPayload: input.rawLastPayload,
      lastError: `${input.reviewCodePrefix}:TOPUP_NOT_PAYABLE`,
    });
    await finalizeEvent("TOPUP_NOT_PAYABLE");
    return {
      ok: false,
      action: "REVIEW",
      orderStatus: "REQUIRES_REVIEW",
      reason: "TOPUP_NOT_PAYABLE",
      coinsRevoked: 0,
      balanceAfter: balance,
    };
  }

  if (decision.action === "REVOKE_ORIGINAL_CREDIT" && balance < decision.coinsToRevoke) {
    await repo.updateOrder(order.id, {
      status: "REQUIRES_REVIEW",
      rawLastPayload: input.rawLastPayload,
      lastError: `${input.reviewCodePrefix}:INSUFFICIENT_BALANCE`,
    });
    await finalizeEvent("INSUFFICIENT_BALANCE");
    return {
      ok: false,
      action: "REVIEW",
      orderStatus: "REQUIRES_REVIEW",
      reason: "INSUFFICIENT_BALANCE",
      coinsRevoked: 0,
      balanceAfter: balance,
    };
  }

  const coinsRevoked =
    decision.action === "REVOKE_ORIGINAL_CREDIT" ? decision.coinsToRevoke : 0;
  if (coinsRevoked > 0) {
    await repo.incrementWalletSpent(order.userId, coinsRevoked);
    await repo.createRevokeLedger({
      userId: order.userId,
      orderId: order.id,
      amount: coinsRevoked,
      balanceAfter: balance - coinsRevoked,
      note: input.reason,
    });
  }

  await repo.updateOrder(order.id, {
    status: input.targetStatus,
    rawLastPayload: input.rawLastPayload,
    lastError: null,
    ...(input.targetStatus === "VOIDED" ? { voidedAt: input.now } : {}),
  });
  await finalizeEvent();
  return {
    ok: true,
    action: "REVERSED",
    orderStatus: input.targetStatus,
    coinsRevoked,
    balanceAfter: balance - coinsRevoked,
  };
}
