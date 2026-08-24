/**
 * Quy tắc thanh toán và quyền truy cập — HÀM THUẦN, không chạm database.
 *
 * Vì sao tách riêng: máy phát triển không có MySQL, nên đây là cách duy nhất
 * kiểm chứng được phần logic dễ gây thiệt hại thật (bán sai giá, mở nhầm
 * quyền, cấp quyền hai lần cho một giao dịch). Chạy: `npm run test:payments`.
 *
 * Nguyên tắc xuyên suốt: **chặn khi nghi ngờ** (fail closed). Dữ liệu lạ,
 * trạng thái lạ, thiếu trường — đều trả về "không có quyền" hoặc "cần đối
 * soát", chứ không bao giờ đoán rồi mở quyền.
 */

// Đuôi ".ts" là cố ý: bộ kiểm thử chạy bằng node thuần (ESM) cần đường dẫn
// đầy đủ, còn tsconfig đã bật allowImportingTsExtensions nên bản build vẫn hiểu.
import { OFFERS, PRICE_VERSION, type OfferCode } from "./catalog.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* 1. Quyết định quyền truy cập từ danh sách grant                      */
/* ------------------------------------------------------------------ */

export type GrantLike = {
  feature: string;
  scope: string;
  exerciseId: string | null;
  /**
   * Lượt làm bài được mở. Chỉ có nghĩa với scope ATTEMPT.
   *
   * Để tùy chọn vì các grant cũ (mua trước khi đổi mô hình) không có cột này
   * khi đọc từ những truy vấn chưa cập nhật select — thiếu thì coi như null,
   * và grant ATTEMPT thiếu attemptId sẽ bị chặn ở dưới.
   */
  attemptId?: string | null;
  status: string;
  startsAt: Date;
  /** null = vĩnh viễn */
  expiresAt: Date | null;
};

/** Một grant có đang có hiệu lực tại thời điểm `at` không. */
export function isGrantLive(grant: GrantLike, at: Date): boolean {
  if (grant.status !== "ACTIVE") return false;
  if (grant.startsAt.getTime() > at.getTime()) return false;
  if (grant.expiresAt !== null && grant.expiresAt.getTime() <= at.getTime()) {
    return false;
  }
  return true;
}

/**
 * Học viên có quyền dùng `feature` cho lượt làm bài này không.
 *
 * Ba tầng, xét theo thứ tự rộng dần xuống hẹp:
 *
 * 1. `ALL`      — gói phủ mọi bài, kể cả bài tạo sau khi mua. Đó là lý do
 *                 không lưu sẵn danh sách bài mà tính lại mỗi lần hỏi.
 * 2. `ATTEMPT`  — mô hình đang bán: mở đúng một lượt làm bài.
 * 3. `EXERCISE` — mô hình cũ: mở mọi lượt làm của một bài. Vẫn phải đọc được
 *                 vì có học viên đã trả tiền theo mô hình này.
 *
 * Tầng 3 nằm lại vĩnh viễn chứ không phải mã tạm. Xóa nó đi là tước quyền của
 * người đã mua, và họ sẽ phát hiện ra ngay ngày hôm sau.
 */
export function decideGrantAccess(input: {
  grants: GrantLike[];
  feature: string;
  exerciseId?: string | null;
  attemptId?: string | null;
  at: Date;
}): boolean {
  return input.grants.some((grant) => {
    if (grant.feature !== input.feature) return false;
    if (!isGrantLive(grant, input.at)) return false;
    if (grant.scope === "ALL") return true;
    if (grant.scope === "ATTEMPT") {
      // Grant mở một lượt mà thiếu attemptId là dữ liệu hỏng → không mở quyền
      return Boolean(
        input.attemptId && (grant.attemptId ?? null) === input.attemptId
      );
    }
    if (grant.scope === "EXERCISE") {
      // Grant mở lẻ mà thiếu exerciseId là dữ liệu hỏng → không mở quyền
      return Boolean(
        input.exerciseId && grant.exerciseId === input.exerciseId
      );
    }
    // scope lạ, và cả "NONE" của gói nạp lượt → chặn
    return false;
  });
}

/* ------------------------------------------------------------------ */
/* 2. Cửa sổ hiệu lực khi cấp quyền                                     */
/* ------------------------------------------------------------------ */

/**
 * Tính thời gian hiệu lực của quyền vừa mua.
 *
 * Gia hạn khi gói cũ CÒN HẠN thì gói mới nối tiếp chứ không đè lên — học viên
 * mua sớm không bị mất những ngày chưa dùng. Đây là điều dễ làm sai nhất và
 * cũng là thứ khách hàng khiếu nại ngay nếu sai.
 */
export function computeGrantWindow(input: {
  durationDays: number | null;
  paidAt: Date;
  /** Hạn xa nhất của gói cùng loại đang còn hiệu lực, null nếu chưa có. */
  currentExpiresAt: Date | null;
}): { startsAt: Date; expiresAt: Date | null } {
  // Mua lẻ: quyền vĩnh viễn với đúng bài đó
  if (input.durationDays === null) {
    return { startsAt: input.paidAt, expiresAt: null };
  }

  const base =
    input.currentExpiresAt &&
    input.currentExpiresAt.getTime() > input.paidAt.getTime()
      ? input.currentExpiresAt
      : input.paidAt;

  return {
    startsAt: base,
    expiresAt: new Date(base.getTime() + input.durationDays * DAY_MS),
  };
}

/* ------------------------------------------------------------------ */
/* 3. Giá và ưu đãi bài Feynman đầu tiên                                */
/* ------------------------------------------------------------------ */

export type PriceRule = "STANDARD" | "FIRST_FEYNMAN_9K";

export type Quote = {
  amount: number;
  priceRule: PriceRule;
  priceVersion: string;
  /** Khóa giữ chỗ ưu đãi; null nghĩa là đơn này không dùng ưu đãi. */
  introPromoToken: string | null;
};

/** Khóa duy nhất theo tài khoản — ràng buộc unique ở DB chính là thứ chặn race. */
export function introPromoTokenFor(userId: string): string {
  return `FEYNMAN_FIRST:${userId}`;
}

/**
 * Chốt giá cho một đơn.
 *
 * Ưu đãi 9.000đ chỉ áp cho FEYNMAN_SINGLE và chỉ khi tài khoản chưa từng
 * thanh toán thành công một đơn FEYNMAN_SINGLE nào. Đơn đang chờ (PENDING)
 * không tính là đã dùng — nếu tính, học viên bấm nhầm rồi bỏ dở sẽ mất ưu đãi
 * mà chưa tiêu đồng nào.
 */
/**
 * LỊCH SỬ, không còn đường nào gọi tới từ mã chạy thật.
 *
 * Từ 12/08/2026 gói mua bằng xu nên không còn báo giá VND cho gói nào nữa. Giữ
 * hàm này vì `PaymentOrder.priceRule` của các đơn CŨ mang giá trị
 * `FIRST_FEYNMAN_9K`, và đây là chỗ duy nhất ghi lại giá trị đó từng nghĩa là
 * gì. Xóa đi thì vài năm nữa không ai đọc nổi những đơn ấy.
 */
export function resolveOfferPrice(input: {
  offerCode: OfferCode;
  userId: string;
  hasPaidFeynmanSingleBefore: boolean;
}): Quote {
  const offer = OFFERS[input.offerCode];
  const standard: Quote = {
    amount: offer.amount,
    priceRule: "STANDARD",
    priceVersion: PRICE_VERSION,
    introPromoToken: null,
  };

  if (input.offerCode !== "FEYNMAN_SINGLE") return standard;
  if (input.hasPaidFeynmanSingleBefore) return standard;

  return {
    amount: OFFERS.FEYNMAN_SINGLE.introAmount,
    priceRule: "FIRST_FEYNMAN_9K",
    priceVersion: PRICE_VERSION,
    introPromoToken: introPromoTokenFor(input.userId),
  };
}

/* ------------------------------------------------------------------ */
/* 4. Vòng đời đơn hàng                                                 */
/* ------------------------------------------------------------------ */

/** Các trạng thái còn có thể chuyển sang PAID. */
const PAYABLE = new Set(["PENDING", "REQUIRES_REVIEW"]);

export function canTransitionToPaid(status: string): boolean {
  return PAYABLE.has(status);
}

export type PaymentEventClaimDecision =
  | { kind: "CREATE_AND_CLAIM" }
  | { kind: "CLAIM_EXISTING" }
  | { kind: "RECLAIM_STALE" }
  | { kind: "SKIP_IN_FLIGHT" }
  | { kind: "SKIP_FINAL" };

export function canFinalizePaymentEventLease(input: {
  processingStatus: string;
  processingLeaseToken: string | null;
  workerLeaseToken: string;
}): boolean {
  return (
    input.processingStatus === "PROCESSING" &&
    !!input.processingLeaseToken &&
    input.processingLeaseToken === input.workerLeaseToken
  );
}

/**
 * Một P2002 trong fulfillment chỉ là dấu hiệu một unique key bị đụng, không
 * phải bằng chứng worker song song đã cấp quyền thành công. Chỉ coi là
 * idempotent-success khi đọc lại được đúng đơn, đúng giao dịch và side effect
 * tương ứng đã tồn tại.
 */
export function canRecoverFulfillmentP2002(input: {
  orderStatus: string;
  expectedProviderTransactionId: string;
  actualProviderTransactionId: string | null;
  hasExpectedFulfillmentEvidence: boolean;
}): boolean {
  return (
    input.orderStatus === "PAID" &&
    input.actualProviderTransactionId === input.expectedProviderTransactionId &&
    input.hasExpectedFulfillmentEvidence
  );
}

function hasNestedMysqlDuplicateColumnCode(value: unknown): boolean {
  if (value === 1060 || value === "1060" || value === "ER_DUP_FIELDNAME") {
    return true;
  }
  if (typeof value === "string") {
    return (
      /(?:\b1060\b|ER_DUP_FIELDNAME)/i.test(value) &&
      /duplicate\s+column/i.test(value)
    );
  }
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some((nested) =>
    hasNestedMysqlDuplicateColumnCode(nested)
  );
}

/** Chỉ nuốt race ADD COLUMN; permission, lock và lỗi kết nối phải nổi lên. */
export function isDuplicateColumnMigrationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    errno?: unknown;
    code?: unknown;
    meta?: unknown;
  };
  if (
    candidate.errno === 1060 ||
    candidate.code === 1060 ||
    candidate.code === "1060" ||
    candidate.code === "ER_DUP_FIELDNAME"
  ) {
    return true;
  }
  return candidate.code === "P2010" && hasNestedMysqlDuplicateColumnCode(candidate.meta);
}

export function requirePaymentEventFinalized(finalized: boolean): void {
  if (!finalized) throw new Error("PAYMENT_EVENT_LEASE_LOST");
}

export function decidePaymentEventClaim(input: {
  existing:
    | {
        processingStatus: string;
        receivedAt: Date;
        processedAt: Date | null;
      }
    | null;
  now: Date;
  processingTimeoutMs: number;
}): PaymentEventClaimDecision {
  if (!input.existing) return { kind: "CREATE_AND_CLAIM" };

  if (input.existing.processingStatus === "PROCESSED") {
    return { kind: "SKIP_FINAL" };
  }

  if (input.existing.processingStatus === "PROCESSING") {
    const claimedAt = input.existing.processedAt ?? input.existing.receivedAt;
    const stale =
      claimedAt.getTime() <= input.now.getTime() - input.processingTimeoutMs;
    return stale ? { kind: "RECLAIM_STALE" } : { kind: "SKIP_IN_FLIGHT" };
  }

  return { kind: "CLAIM_EXISTING" };
}

export type VoidOutcome = {
  orderStatus: "VOIDED" | "REQUIRES_REVIEW";
  eventStatus: "PROCESSED";
  revokeGrants: boolean;
};

export function boundPaymentEventErrorMessage(
  error: unknown,
  maxLength = 400
): string {
  const text =
    error instanceof Error
      ? error.stack || error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
  return (text || "UNKNOWN_IPN_ERROR").slice(0, maxLength);
}

export function decideVoidOutcome(input: {
  orderKind: string;
  revokeCoins:
    | { ok: true }
    | { ok: false; reason: "ALREADY_SPENT" | "CORRUPTED" }
    | null;
}): VoidOutcome {
  if (input.orderKind === "TOPUP") {
    if (input.revokeCoins?.ok) {
      return {
        orderStatus: "VOIDED",
        eventStatus: "PROCESSED",
        revokeGrants: false,
      };
    }
    return {
      orderStatus: "REQUIRES_REVIEW",
      eventStatus: "PROCESSED",
      revokeGrants: false,
    };
  }

  return {
    orderStatus: "VOIDED",
    eventStatus: "PROCESSED",
    revokeGrants: true,
  };
}

export type TopupReversalDecision =
  | {
      action: "VOID_NOOP";
      orderStatus: "VOIDED";
      eventStatus: "PROCESSED";
      reviewReason: null;
      coinsToRevoke: 0;
    }
  | {
      action: "REVOKE_ORIGINAL_CREDIT";
      orderStatus: "VOIDED";
      eventStatus: "PROCESSED";
      reviewReason: null;
      coinsToRevoke: number;
    }
  | {
      action: "REVIEW";
      orderStatus: "REQUIRES_REVIEW";
      eventStatus: "PROCESSED";
      reviewReason:
        | "TOPUP_CREDIT_ALREADY_SPENT"
        | "TOPUP_LEDGER_CORRUPTED"
        | "TOPUP_LEDGER_MISSING";
      coinsToRevoke: 0;
    };

export function decideTopupReversal(input: {
  orderStatus: string;
  expectedCoins: number;
  creditedCoins: number;
  revokedCoins: number;
  remainingCreditedCoins: number;
}): TopupReversalDecision {
  const expected = Math.max(0, input.expectedCoins);
  const credited = Math.max(0, input.creditedCoins);
  const revoked = Math.max(0, input.revokedCoins);
  const remaining = Math.max(0, input.remainingCreditedCoins);

  if (credited === 0 && revoked === 0) {
    return input.orderStatus === "PENDING"
      ? {
          action: "VOID_NOOP",
          orderStatus: "VOIDED",
          eventStatus: "PROCESSED",
          reviewReason: null,
          coinsToRevoke: 0,
        }
      : {
          action: "REVIEW",
          orderStatus: "REQUIRES_REVIEW",
          eventStatus: "PROCESSED",
          reviewReason: "TOPUP_LEDGER_MISSING",
          coinsToRevoke: 0,
        };
  }

  if (
    credited !== expected ||
    revoked > credited ||
    remaining > credited ||
    revoked + remaining > credited
  ) {
    return {
      action: "REVIEW",
      orderStatus: "REQUIRES_REVIEW",
      eventStatus: "PROCESSED",
      reviewReason: "TOPUP_LEDGER_CORRUPTED",
      coinsToRevoke: 0,
    };
  }

  if (remaining === 0) {
    return revoked === expected
      ? {
          action: "VOID_NOOP",
          orderStatus: "VOIDED",
          eventStatus: "PROCESSED",
          reviewReason: null,
          coinsToRevoke: 0,
        }
      : {
          action: "REVIEW",
          orderStatus: "REQUIRES_REVIEW",
          eventStatus: "PROCESSED",
          reviewReason: "TOPUP_CREDIT_ALREADY_SPENT",
          coinsToRevoke: 0,
        };
  }

  if (remaining === expected && revoked === 0) {
    return {
      action: "REVOKE_ORIGINAL_CREDIT",
      orderStatus: "VOIDED",
      eventStatus: "PROCESSED",
      reviewReason: null,
      coinsToRevoke: expected,
    };
  }

  return {
    action: "REVIEW",
    orderStatus: "REQUIRES_REVIEW",
    eventStatus: "PROCESSED",
    reviewReason: "TOPUP_CREDIT_ALREADY_SPENT",
    coinsToRevoke: 0,
  };
}

export function decideTopupReversalFromLedger(input: {
  orderId: string;
  orderStatus: string;
  expectedCoins: number;
  ledgerRows: Array<{
    kind: string;
    amount: number;
    orderId: string | null;
    ledgerKey: string;
  }>;
}): TopupReversalDecision {
  const topupKey = `TOPUP:${input.orderId}`;
  const revokeKey = `REVOKE:${input.orderId}`;
  const topupIndex = input.ledgerRows.findIndex((row) => row.ledgerKey === topupKey);
  const topupEntry = topupIndex >= 0 ? input.ledgerRows[topupIndex] : null;

  if (!topupEntry) {
    return decideTopupReversal({
      orderStatus: input.orderStatus,
      expectedCoins: input.expectedCoins,
      creditedCoins: 0,
      revokedCoins: 0,
      remainingCreditedCoins: 0,
    });
  }

  if (
    topupEntry.kind !== "TOPUP" ||
    topupEntry.orderId !== input.orderId ||
    topupEntry.amount !== input.expectedCoins
  ) {
    return {
      action: "REVIEW",
      orderStatus: "REQUIRES_REVIEW",
      eventStatus: "PROCESSED",
      reviewReason: "TOPUP_LEDGER_CORRUPTED",
      coinsToRevoke: 0,
    };
  }

  let originalAvailable = topupEntry.amount;
  let otherAvailable = 0;
  let revokedCoins = 0;

  for (const row of input.ledgerRows.slice(0, topupIndex)) {
    if (row.kind === "TOPUP" || row.kind === "GIFT") {
      otherAvailable += Math.max(0, row.amount);
      continue;
    }
    if (row.kind === "SPEND" || row.kind === "REVOKE") {
      otherAvailable = Math.max(0, otherAvailable - Math.max(0, row.amount));
    }
  }

  for (const row of input.ledgerRows.slice(topupIndex + 1)) {
    const amount = Math.max(0, row.amount);
    if (row.kind === "TOPUP" || row.kind === "GIFT") {
      otherAvailable += amount;
      continue;
    }
    if (row.kind !== "SPEND" && row.kind !== "REVOKE") continue;

    if (row.ledgerKey === revokeKey) {
      if (row.kind !== "REVOKE" || row.orderId !== input.orderId || amount > originalAvailable) {
        return {
          action: "REVIEW",
          orderStatus: "REQUIRES_REVIEW",
          eventStatus: "PROCESSED",
          reviewReason: "TOPUP_LEDGER_CORRUPTED",
          coinsToRevoke: 0,
        };
      }
      originalAvailable -= amount;
      revokedCoins += amount;
      continue;
    }

    const useOther = Math.min(otherAvailable, amount);
    otherAvailable -= useOther;
    const remainingDebit = amount - useOther;
    if (remainingDebit > 0) {
      originalAvailable = Math.max(0, originalAvailable - remainingDebit);
    }
  }

  return decideTopupReversal({
    orderStatus: input.orderStatus,
    expectedCoins: input.expectedCoins,
    creditedCoins: topupEntry.amount,
    revokedCoins,
    remainingCreditedCoins: originalAvailable,
  });
}

export type PackageReversalDecision =
  | {
      action: "REVERSE";
      orderStatus: "VOIDED" | "REFUNDED";
      eventStatus: "PROCESSED";
      reviewReason: null;
      aiCreditsToRevoke: number;
      revokeGrants: boolean;
    }
  | {
      action: "NOOP_FINAL";
      orderStatus: string;
      eventStatus: "PROCESSED";
      reviewReason: null;
      aiCreditsToRevoke: 0;
      revokeGrants: false;
    }
  | {
      action: "REVIEW";
      orderStatus: "REQUIRES_REVIEW";
      eventStatus: "PROCESSED";
      reviewReason: "AI_CREDITS_ALREADY_USED" | "ORDER_NOT_REVERSIBLE";
      aiCreditsToRevoke: 0;
      revokeGrants: false;
    };

export function decidePackageReversal(input: {
  orderStatus: string;
  targetStatus: "VOIDED" | "REFUNDED";
  grantedAiCredits: number;
  availableAiCredits: number;
  usedTotal?: number;
  grantCount?: number;
}): PackageReversalDecision {
  if (
    input.orderStatus === input.targetStatus ||
    input.orderStatus === "REFUNDED" ||
    input.orderStatus === "VOIDED" ||
    input.orderStatus === "CANCELLED" ||
    input.orderStatus === "FAILED" ||
    input.orderStatus === "EXPIRED"
  ) {
    return {
      action: "NOOP_FINAL",
      orderStatus: input.orderStatus,
      eventStatus: "PROCESSED",
      reviewReason: null,
      aiCreditsToRevoke: 0,
      revokeGrants: false,
    };
  }

  if (input.orderStatus !== "PAID") {
    return {
      action: "REVIEW",
      orderStatus: "REQUIRES_REVIEW",
      eventStatus: "PROCESSED",
      reviewReason: "ORDER_NOT_REVERSIBLE",
      aiCreditsToRevoke: 0,
      revokeGrants: false,
    };
  }

  const granted = Math.max(0, input.grantedAiCredits);
  const available = Math.max(0, input.availableAiCredits);
  const usedTotal = Math.max(0, input.usedTotal ?? 0);
  const grantCount = Math.max(0, input.grantCount ?? 0);
  if (granted > 0 && (grantCount === 0 || usedTotal > 0 || available < granted)) {
    return {
      action: "REVIEW",
      orderStatus: "REQUIRES_REVIEW",
      eventStatus: "PROCESSED",
      reviewReason: "AI_CREDITS_ALREADY_USED",
      aiCreditsToRevoke: 0,
      revokeGrants: false,
    };
  }

  return {
    action: "REVERSE",
    orderStatus: input.targetStatus,
    eventStatus: "PROCESSED",
    reviewReason: null,
    aiCreditsToRevoke: granted,
    revokeGrants: true,
  };
}

/**
 * Đơn ở trạng thái này có còn giữ chỗ ưu đãi không.
 *
 * Đơn hủy/lỗi/quá hạn phải NHẢ khóa ưu đãi, nếu không học viên bấm nhầm một
 * lần là mất ưu đãi vĩnh viễn — và mã sẽ vỡ vì khóa unique đã bị chiếm.
 */
export function introTokenStillHeld(status: string): boolean {
  return status === "PENDING" || status === "PAID";
}

/* ------------------------------------------------------------------ */
/* 5. Kiểm tra thông báo IPN từ SePay                                   */
/* ------------------------------------------------------------------ */

/** Số tiền VND hợp lệ: số nguyên không âm, an toàn với kiểu Number. */
export function parseVndAmount(value: unknown): number | null {
  if (typeof value === "boolean" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
  return parsed;
}

export type IpnPaidCheck =
  | { ok: true; transactionId: string }
  | { ok: false; reason: string };

/**
 * Xác minh một thông báo ORDER_PAID có thực sự khớp đơn hàng của mình không.
 *
 * Mọi trường đều phải khớp; sai một thứ là chuyển đơn sang REQUIRES_REVIEW cho
 * người thật đối soát, TUYỆT ĐỐI không cấp quyền. Số tiền là trường quan trọng
 * nhất: nó chặn kiểu tấn công trả 1.000đ rồi đòi mở gói 299.000đ.
 */
export function checkIpnPaidPayload(
  payload: unknown,
  order: { amount: number; currency: string }
): IpnPaidCheck {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, reason: "PAYLOAD_NOT_OBJECT" };
  }
  const root = payload as Record<string, unknown>;
  const orderPart = root.order;
  const txPart = root.transaction;
  if (typeof orderPart !== "object" || orderPart === null) {
    return { ok: false, reason: "MISSING_ORDER" };
  }
  if (typeof txPart !== "object" || txPart === null) {
    return { ok: false, reason: "MISSING_TRANSACTION" };
  }
  const o = orderPart as Record<string, unknown>;
  const t = txPart as Record<string, unknown>;

  const transactionId = String(t.transaction_id ?? "").trim();
  if (!transactionId) return { ok: false, reason: "MISSING_TRANSACTION_ID" };

  if (o.order_status !== "CAPTURED") {
    return { ok: false, reason: `ORDER_STATUS:${String(o.order_status)}` };
  }
  if (t.transaction_status !== "APPROVED") {
    return {
      ok: false,
      reason: `TRANSACTION_STATUS:${String(t.transaction_status)}`,
    };
  }
  if (t.transaction_type !== "PAYMENT") {
    return { ok: false, reason: `TRANSACTION_TYPE:${String(t.transaction_type)}` };
  }
  if (o.order_currency !== order.currency) {
    return { ok: false, reason: `ORDER_CURRENCY:${String(o.order_currency)}` };
  }
  if (t.transaction_currency !== order.currency) {
    return {
      ok: false,
      reason: `TRANSACTION_CURRENCY:${String(t.transaction_currency)}`,
    };
  }

  const orderAmount = parseVndAmount(o.order_amount);
  const txAmount = parseVndAmount(t.transaction_amount);
  if (orderAmount === null || orderAmount !== order.amount) {
    return { ok: false, reason: `ORDER_AMOUNT:${String(o.order_amount)}` };
  }
  if (txAmount === null || txAmount !== order.amount) {
    return { ok: false, reason: `TRANSACTION_AMOUNT:${String(t.transaction_amount)}` };
  }

  return { ok: true, transactionId };
}

/**
 * Khóa chống xử lý lặp cho một thông báo IPN.
 * Cùng một sự kiện gửi lại nhiều lần sẽ sinh cùng một khóa → bản ghi thứ hai
 * bị ràng buộc unique từ chối, nên quyền không bị cấp hai lần.
 */
export function buildEventKey(input: {
  notificationType: string;
  transactionId: string;
  invoiceNumber: string;
  timestamp: unknown;
}): string {
  const compact = (value: string, maxLength: number) => value.slice(0, maxLength);
  const type = compact(input.notificationType || "UNKNOWN", 60);
  const transactionId = compact(input.transactionId || "", 120);
  const invoiceNumber = compact(input.invoiceNumber || "", 120);
  if (transactionId) {
    return `${type}:${transactionId}`;
  }
  if (invoiceNumber) {
    return `${type}:${invoiceNumber}`;
  }
  return `${type}:MALFORMED`;
}

/* ------------------------------------------------------------------ */
/* 6. Kiểm tra phản hồi của API tra cứu đơn (dùng khi đối soát)         */
/* ------------------------------------------------------------------ */

/** Trạng thái khoản thanh toán được coi là đã thu tiền xong. */
const SETTLED_TRANSACTION_STATUS = new Set(["APPROVED", "COMPLETED", "SUCCESS"]);

/**
 * Chọn mã giao dịch từ phản hồi tra cứu.
 *
 * Mảng `transactions` CÓ THỂ RỖNG ngay cả khi đơn đã CAPTURED — SePay ghi
 * nhận khoản thanh toán trễ hơn trạng thái đơn. Khi đó lấy `order_id` (mã
 * PAY... của SePay) làm khóa chống cấp quyền hai lần: nó cũng là chuỗi duy
 * nhất phía SePay nên ràng buộc unique trên providerTransactionId vẫn đúng.
 */
function pickSettledTransactionId(root: Record<string, unknown>): string | null {
  const list = Array.isArray(root.transactions) ? root.transactions : [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const t = item as Record<string, unknown>;
    if (t.transaction_type !== undefined && t.transaction_type !== "PAYMENT") {
      continue;
    }
    const status = String(t.transaction_status ?? "").toUpperCase();
    if (status && !SETTLED_TRANSACTION_STATUS.has(status)) continue;
    const id = String(t.transaction_id ?? t.id ?? "").trim();
    if (id) return id;
  }
  const orderId = String(root.order_id ?? "").trim();
  return orderId || null;
}

/**
 * Xác minh phản hồi của `client.order.retrieve()` — CẤU TRÚC KHÁC IPN.
 *
 * IPN gửi tới dạng lồng nhau: { order: {...}, transaction: {...} }.
 * API tra cứu trả về PHẲNG: các trường order_* nằm thẳng ở gốc, còn các khoản
 * thanh toán nằm trong mảng `transactions`.
 *
 * Dùng nhầm `checkIpnPaidPayload` cho phản hồi này thì lần nào cũng ra
 * MISSING_ORDER, nghĩa là đơn ĐÃ trả tiền vẫn kẹt ở "Đang chờ" và bấm Đối soát
 * bao nhiêu lần cũng vô ích. Đó chính là lỗi hàm này sinh ra để chữa.
 *
 * Vẫn giữ nguyên nguyên tắc chặn khi nghi ngờ: số tiền và đơn vị tiền phải
 * khớp tuyệt đối với đơn mình đã chốt.
 */
export function checkRetrievedOrderPaid(
  payload: unknown,
  order: { amount: number; currency: string }
): IpnPaidCheck {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, reason: "PAYLOAD_NOT_OBJECT" };
  }
  const root = payload as Record<string, unknown>;

  if (root.order_status !== "CAPTURED") {
    return { ok: false, reason: `ORDER_STATUS:${String(root.order_status)}` };
  }
  if (root.order_currency !== order.currency) {
    return { ok: false, reason: `ORDER_CURRENCY:${String(root.order_currency)}` };
  }

  // "9000.00" là dạng SePay hay trả về; parseVndAmount vẫn loại được số lẻ thật.
  const orderAmount = parseVndAmount(root.order_amount);
  if (orderAmount === null || orderAmount !== order.amount) {
    return { ok: false, reason: `ORDER_AMOUNT:${String(root.order_amount)}` };
  }

  const transactionId = pickSettledTransactionId(root);
  if (!transactionId) return { ok: false, reason: "MISSING_TRANSACTION_ID" };

  return { ok: true, transactionId };
}
