/**
 * Kiểm thử quy tắc thanh toán và quyền truy cập.
 * Chạy: node --experimental-strip-types scripts/test-payments.ts
 *
 * Đây là phần logic mà sai một chút là mất tiền thật hoặc mở nhầm quyền, nên
 * mọi tình huống trong Phụ lục B của đặc tả đều có ít nhất một phép thử.
 */
import { OFFERS, PRICE_VERSION } from "../src/lib/payments/catalog.ts";
import * as topupService from "../src/lib/payments/topup-reversal-service.ts";
import * as paymentRules from "../src/lib/payments/payment-rules.ts";
import {
  buildEventKey,
  canTransitionToPaid,
  checkIpnPaidPayload,
  checkRetrievedOrderPaid,
  boundPaymentEventErrorMessage,
  decidePaymentEventClaim,
  decideVoidOutcome,
  computeGrantWindow,
  decideGrantAccess,
  introPromoTokenFor,
  introTokenStillHeld,
  isGrantLive,
  parseVndAmount,
  resolveOfferPrice,
  type GrantLike,
} from "../src/lib/payments/payment-rules.ts";

const reverseTopupOrderWithRepo = topupService.reverseTopupOrderWithRepo;

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-08-01T10:00:00.000Z");
const at = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY);

const grant = (o: Partial<GrantLike>): GrantLike => ({
  feature: "READING",
  scope: "EXERCISE",
  exerciseId: "ex-A",
  status: "ACTIVE",
  startsAt: at(-1),
  expiresAt: null,
  ...o,
});

const access = (grants: GrantLike[], o: { feature?: string; exerciseId?: string | null; at?: Date } = {}) =>
  decideGrantAccess({
    grants,
    feature: o.feature ?? "READING",
    exerciseId: o.exerciseId === undefined ? "ex-A" : o.exerciseId,
    at: o.at ?? NOW,
  });

/* ---------------------------------------------------------------- */
console.log("\nBẢNG GIÁ — bốn sản phẩm đúng giá đã cam kết với học viên");
check("Reading toàn bộ 30 ngày = 99.000đ", OFFERS.READING_ALL_30D.amount, 99_000);
check("Reading mở lẻ = 9.000đ", OFFERS.READING_SINGLE.amount, 9_000);
check("Feynman toàn bộ 30 ngày = 299.000đ", OFFERS.FEYNMAN_ALL_30D.amount, 299_000);
check("Feynman mở lẻ = 49.000đ", OFFERS.FEYNMAN_SINGLE.amount, 49_000);
check("Ưu đãi Feynman lần đầu = 9.000đ", OFFERS.FEYNMAN_SINGLE.introAmount, 9_000);
check("Gói 30 ngày có thời hạn", OFFERS.READING_ALL_30D.durationDays, 30);
check("Mua lẻ là vĩnh viễn", OFFERS.READING_SINGLE.durationDays, null);

/* ---------------------------------------------------------------- */
console.log("\nƯU ĐÃI FEYNMAN ĐẦU TIÊN");
const firstBuy = resolveOfferPrice({
  offerCode: "FEYNMAN_SINGLE",
  userId: "u1",
  hasPaidFeynmanSingleBefore: false,
});
check("lần đầu tính 9.000đ", firstBuy.amount, 9_000);
check("đánh dấu đúng quy tắc giá", firstBuy.priceRule, "FIRST_FEYNMAN_9K");
check("có khóa giữ chỗ theo tài khoản", firstBuy.introPromoToken, "FEYNMAN_FIRST:u1");
check("ghi lại phiên bản bảng giá", firstBuy.priceVersion, PRICE_VERSION);

const secondBuy = resolveOfferPrice({
  offerCode: "FEYNMAN_SINGLE",
  userId: "u1",
  hasPaidFeynmanSingleBefore: true,
});
check("lần thứ hai về giá thường 49.000đ", secondBuy.amount, 49_000);
check("không còn giữ khóa ưu đãi", secondBuy.introPromoToken, null);

check(
  "ưu đãi KHÔNG áp cho gói 299.000đ dù chưa từng mua lẻ",
  resolveOfferPrice({
    offerCode: "FEYNMAN_ALL_30D",
    userId: "u1",
    hasPaidFeynmanSingleBefore: false,
  }).amount,
  299_000
);
check(
  "ưu đãi KHÔNG áp cho Reading",
  resolveOfferPrice({
    offerCode: "READING_SINGLE",
    userId: "u1",
    hasPaidFeynmanSingleBefore: false,
  }).amount,
  9_000
);
check("khóa ưu đãi khác nhau giữa hai tài khoản", introPromoTokenFor("u2"), "FEYNMAN_FIRST:u2");

console.log("\n  Nhả khóa ưu đãi khi đơn không thành");
check("đơn đang chờ vẫn giữ chỗ", introTokenStillHeld("PENDING"), true);
check("đơn đã trả tiền giữ chỗ vĩnh viễn", introTokenStillHeld("PAID"), true);
check("đơn bị hủy phải nhả khóa", introTokenStillHeld("CANCELLED"), false);
check("đơn lỗi phải nhả khóa", introTokenStillHeld("FAILED"), false);
check("đơn quá hạn phải nhả khóa", introTokenStillHeld("EXPIRED"), false);

/* ---------------------------------------------------------------- */
console.log("\nQUYỀN TRUY CẬP — mua lẻ chỉ mở đúng bài đã mua (A1)");
check("mở đúng bài đã mua", access([grant({})]), true);
check("KHÔNG mở bài khác", access([grant({})], { exerciseId: "ex-B" }), false);
check(
  "quyền Reading KHÔNG mở được Feynman",
  access([grant({ feature: "READING" })], { feature: "FEYNMAN" }),
  false
);
check(
  "quyền Feynman KHÔNG mở được Reading",
  access([grant({ feature: "FEYNMAN" })], { feature: "READING" }),
  false
);
check("quyền đã thu hồi thì hết hiệu lực", access([grant({ status: "REVOKED" })]), false);
check(
  "grant mở lẻ mà thiếu exerciseId (dữ liệu hỏng) → chặn",
  access([grant({ exerciseId: null })]),
  false
);
check("scope lạ → chặn", access([grant({ scope: "EVERYTHING" })]), false);
check("không có grant nào → chặn", access([]), false);

console.log("\n  Gói 30 ngày (A2)");
const pkg = grant({ scope: "ALL", exerciseId: null, expiresAt: at(30) });
check("gói phủ bài A", access([pkg]), true);
check("gói phủ luôn bài mới tạo sau khi mua", access([pkg], { exerciseId: "ex-MOI" }), true);
check("gói còn hạn ngày thứ 29", access([pkg], { at: at(29) }), true);
check("gói HẾT hạn ngày thứ 31 → chặn", access([pkg], { at: at(31) }), false);
check(
  "quyền chưa tới ngày bắt đầu (gia hạn nối tiếp) → chưa dùng được",
  access([grant({ scope: "ALL", exerciseId: null, startsAt: at(10), expiresAt: at(40) })]),
  false
);

console.log("\n  Đã mua lẻ rồi mua thêm gói (A14)");
const both = [grant({}), pkg];
check("cả hai cùng có hiệu lực", access(both), true);
check(
  "gói hết hạn nhưng quyền mua lẻ VẪN CÒN — không được xóa nhầm",
  access(both, { at: at(60) }),
  true
);
check(
  "sau khi gói hết hạn, bài khác thì mất quyền",
  access(both, { at: at(60), exerciseId: "ex-B" }),
  false
);

console.log("\n  isGrantLive tại đúng mốc thời gian");
check("đúng giây hết hạn coi như đã hết", isGrantLive(grant({ expiresAt: NOW }), NOW), false);
check("quyền vĩnh viễn luôn sống", isGrantLive(grant({ expiresAt: null }), at(3650)), true);

/* ---------------------------------------------------------------- */
console.log("\nTHỜI HẠN KHI CẤP QUYỀN (A3 — gia hạn không mất ngày còn lại)");
const fresh = computeGrantWindow({ durationDays: 30, paidAt: NOW, currentExpiresAt: null });
check("mua mới bắt đầu ngay", fresh.startsAt.toISOString(), NOW.toISOString());
check("mua mới hết hạn sau đúng 30 ngày", fresh.expiresAt?.toISOString(), at(30).toISOString());

const renew = computeGrantWindow({ durationDays: 30, paidAt: NOW, currentExpiresAt: at(10) });
check("gia hạn khi còn 10 ngày → bắt đầu ở ngày thứ 10", renew.startsAt.toISOString(), at(10).toISOString());
check("gia hạn → hết hạn ở ngày thứ 40", renew.expiresAt?.toISOString(), at(40).toISOString());

const expired = computeGrantWindow({ durationDays: 30, paidAt: NOW, currentExpiresAt: at(-5) });
check(
  "gói cũ đã hết hạn thì tính lại từ hôm nay, không cộng lùi",
  expired.expiresAt?.toISOString(),
  at(30).toISOString()
);

const single = computeGrantWindow({ durationDays: null, paidAt: NOW, currentExpiresAt: at(10) });
check("mua lẻ luôn vĩnh viễn", single.expiresAt, null);

/* ---------------------------------------------------------------- */
console.log("\nXÁC MINH THÔNG BÁO IPN — nơi chặn gian lận số tiền (A11)");
const ORDER = { amount: 99_000, currency: "VND" };
const validPayload = {
  timestamp: 1_785_000_000,
  notification_type: "ORDER_PAID",
  order: {
    order_id: "SP123",
    order_status: "CAPTURED",
    order_currency: "VND",
    order_amount: 99_000,
    order_invoice_number: "WB-260801-ABC123",
  },
  transaction: {
    transaction_id: "TX-1",
    transaction_type: "PAYMENT",
    transaction_status: "APPROVED",
    transaction_amount: 99_000,
    transaction_currency: "VND",
    payment_method: "BANK_TRANSFER",
  },
};
const withOrder = (patch: Record<string, unknown>) => ({
  ...validPayload,
  order: { ...validPayload.order, ...patch },
});
const withTx = (patch: Record<string, unknown>) => ({
  ...validPayload,
  transaction: { ...validPayload.transaction, ...patch },
});

check("payload hợp lệ được chấp nhận", checkIpnPaidPayload(validPayload, ORDER).ok, true);
check(
  "lấy đúng mã giao dịch",
  (checkIpnPaidPayload(validPayload, ORDER) as { transactionId: string }).transactionId,
  "TX-1"
);
check("trả tiền THIẾU → từ chối", checkIpnPaidPayload(withTx({ transaction_amount: 1_000 }), ORDER).ok, false);
check("trả tiền THỪA → cũng từ chối (phải đối soát)", checkIpnPaidPayload(withTx({ transaction_amount: 999_000 }), ORDER).ok, false);
check("số tiền đơn khác số tiền mình chốt → từ chối", checkIpnPaidPayload(withOrder({ order_amount: 9_000 }), ORDER).ok, false);
check("sai đơn vị tiền → từ chối", checkIpnPaidPayload(withOrder({ order_currency: "USD" }), ORDER).ok, false);
check("đơn chưa CAPTURED → từ chối", checkIpnPaidPayload(withOrder({ order_status: "PENDING" }), ORDER).ok, false);
check("giao dịch chưa APPROVED → từ chối", checkIpnPaidPayload(withTx({ transaction_status: "DECLINED" }), ORDER).ok, false);
check("không phải giao dịch thanh toán → từ chối", checkIpnPaidPayload(withTx({ transaction_type: "REFUND" }), ORDER).ok, false);
check("thiếu mã giao dịch → từ chối", checkIpnPaidPayload(withTx({ transaction_id: "" }), ORDER).ok, false);
check("thiếu hẳn khối transaction → từ chối", checkIpnPaidPayload({ order: validPayload.order }, ORDER).ok, false);
check("payload không phải object → từ chối", checkIpnPaidPayload("hacked", ORDER).ok, false);
check("payload null → từ chối", checkIpnPaidPayload(null, ORDER).ok, false);

console.log("\n  Đọc số tiền an toàn");
check("chuỗi số hợp lệ", parseVndAmount("99000"), 99_000);
check("số âm bị loại", parseVndAmount(-1), null);
check("số thập phân bị loại", parseVndAmount(99_000.5), null);
check("chuỗi rác bị loại", parseVndAmount("99k"), null);
check("null bị loại", parseVndAmount(null), null);
check("true KHÔNG được hiểu thành 1", parseVndAmount(true), null);

/* ---------------------------------------------------------------- */
console.log("\nĐỐI SOÁT — phản hồi API tra cứu có cấu trúc PHẰNG, khác IPN");
const ORDER_9K = { amount: 9_000, currency: "VND" };

// Chép nguyên văn phản hồi thật của SePay sandbox cho một đơn đã thu tiền:
// các trường order_* nằm thẳng ở gốc, và `transactions` CÓ THỂ RỖNG.
const retrieved = {
  id: "31660e1b-8d84-11f1-b21a-a6006ab65aca",
  customer_id: "cmsa43ntn00005a6lpde128xv",
  order_id: "PAY84166A6DAFD995C35",
  order_invoice_number: "WB-260801083712-6C811F",
  order_status: "CAPTURED",
  order_amount: "9000.00",
  order_currency: "VND",
  order_description: "Wobridges - Reading — mở một bài",
  authentication_status: null,
  transactions: [] as unknown[],
};
const withRetrieved = (patch: Record<string, unknown>) => ({ ...retrieved, ...patch });
const txIdOf = (payload: unknown) =>
  (checkRetrievedOrderPaid(payload, ORDER_9K) as { transactionId: string }).transactionId;

check("phản hồi tra cứu thật được chấp nhận", checkRetrievedOrderPaid(retrieved, ORDER_9K).ok, true);
check("transactions rỗng → rơi về order_id làm khóa chống lặp", txIdOf(retrieved), "PAY84166A6DAFD995C35");
check(
  "có khoản thanh toán thì ưu tiên mã giao dịch thật",
  txIdOf(
    withRetrieved({
      transactions: [
        { transaction_id: "6a6db0c8e3fb9", transaction_type: "PAYMENT", transaction_status: "APPROVED" },
      ],
    })
  ),
  "6a6db0c8e3fb9"
);
check(
  "khoản hoàn tiền KHÔNG được coi là bằng chứng đã trả",
  txIdOf(
    withRetrieved({
      transactions: [
        { transaction_id: "RF-1", transaction_type: "REFUND", transaction_status: "APPROVED" },
      ],
    })
  ),
  "PAY84166A6DAFD995C35"
);
check("đơn chưa CAPTURED → chưa mở quyền", checkRetrievedOrderPaid(withRetrieved({ order_status: "PENDING" }), ORDER_9K).ok, false);
check("trả thiếu tiền → từ chối", checkRetrievedOrderPaid(withRetrieved({ order_amount: "1000.00" }), ORDER_9K).ok, false);
check("trả thừa tiền → cũng từ chối", checkRetrievedOrderPaid(withRetrieved({ order_amount: "99000.00" }), ORDER_9K).ok, false);
check("sai đơn vị tiền → từ chối", checkRetrievedOrderPaid(withRetrieved({ order_currency: "USD" }), ORDER_9K).ok, false);
check("số tiền có phần lẻ thật → từ chối", checkRetrievedOrderPaid(withRetrieved({ order_amount: "9000.50" }), ORDER_9K).ok, false);
check("gói IPN đưa nhầm vào đây → từ chối", checkRetrievedOrderPaid(validPayload, ORDER_9K).ok, false);
check("payload null → từ chối", checkRetrievedOrderPaid(null, ORDER_9K).ok, false);

/* ---------------------------------------------------------------- */
console.log("\nCHỐNG XỬ LÝ LẶP (A10)");
const key = (o: Partial<Parameters<typeof buildEventKey>[0]> = {}) =>
  buildEventKey({
    notificationType: "ORDER_PAID",
    transactionId: "TX-1",
    invoiceNumber: "WB-1",
    timestamp: 1_785_000_000,
    ...o,
  });
check("cùng một sự kiện sinh cùng một khóa", key(), key());
check("giao dịch khác → khóa khác", key() === key({ transactionId: "TX-2" }), false);
check("loại thông báo khác → khóa khác", key() === key({ notificationType: "TRANSACTION_VOID" }), false);
check(
  "cùng transaction_id nhưng khác timestamp vẫn phải cùng khóa để không xử lý lặp lần hai",
  key(),
  key({ timestamp: 1_785_999_999 })
);
check(
  "thiếu mã giao dịch thì rơi về mã đơn, không sinh khóa rỗng",
  key({ transactionId: "" }),
  "ORDER_PAID:WB-1"
);
check(
  "fallback theo mã đơn phải bị chặn độ dài để payload lỗi không phình khóa unique",
  buildEventKey({
    notificationType: "ORDER_PAID",
    transactionId: "",
    invoiceNumber: `WB-${"X".repeat(300)}`,
    timestamp: 1_785_000_000,
  }).length <= 180,
  true
);
check(
  "notificationType quá dài vẫn phải cho ra eventKey không vượt VARCHAR(191)",
  buildEventKey({
    notificationType: "TYPE-".repeat(80),
    transactionId: "TX-1",
    invoiceNumber: "WB-1",
    timestamp: 1_785_000_000,
  }).length <= 191,
  true
);
check(
  "không có transaction_id thì cùng invoice + loại thông báo vẫn phải cùng khóa dù timestamp khác",
  key({ transactionId: "", timestamp: 1_785_000_000 }),
  key({ transactionId: "", timestamp: 1_786_000_000 })
);

console.log("\nCHUYỂN TRẠNG THÁI ĐƠN");
check("đơn đang chờ có thể chuyển sang đã trả", canTransitionToPaid("PENDING"), true);
check("đơn cần đối soát có thể chuyển sang đã trả", canTransitionToPaid("REQUIRES_REVIEW"), true);
check("đơn đã hủy KHÔNG được tự chuyển sang đã trả", canTransitionToPaid("CANCELLED"), false);
check("đơn đã hoàn tiền KHÔNG được chuyển sang đã trả", canTransitionToPaid("REFUNDED"), false);
check("đơn đã void KHÔNG được chuyển sang đã trả", canTransitionToPaid("VOIDED"), false);

/* ---------------------------------------------------------------- */
console.log("\nLẶP IPN — chỉ PROCESSED là trạng thái cuối");
const CLAIM_TIMEOUT_MS = 30_000;
const claim = (
  existing:
    | {
        processingStatus: string;
        receivedAt: Date;
        processedAt: Date | null;
      }
    | null,
  now = NOW
) =>
  decidePaymentEventClaim({
    existing,
    now,
    processingTimeoutMs: CLAIM_TIMEOUT_MS,
  });

check("chưa có event → tạo mới và nhận quyền xử lý", claim(null), {
  kind: "CREATE_AND_CLAIM",
});
check(
  "PROCESSED là cuối cùng, bản lặp không xử lý lại",
  claim({
    processingStatus: "PROCESSED",
    receivedAt: at(-1),
    processedAt: NOW,
  }),
  { kind: "SKIP_FINAL" }
);
check(
  "FAILED phải cho retry",
  claim({
    processingStatus: "FAILED",
    receivedAt: at(-1),
    processedAt: NOW,
  }),
  { kind: "CLAIM_EXISTING" }
);
check(
  "RECEIVED cũ cũng phải cho retry, không bị bỏ luôn",
  claim({
    processingStatus: "RECEIVED",
    receivedAt: at(-1),
    processedAt: null,
  }),
  { kind: "CLAIM_EXISTING" }
);
check(
  "PROCESSING còn mới → giữ nguyên người đang xử lý",
  claim({
    processingStatus: "PROCESSING",
    receivedAt: at(-1),
    processedAt: new Date(NOW.getTime() - 5_000),
  }),
  { kind: "SKIP_IN_FLIGHT" }
);
check(
  "PROCESSING quá hạn → được quyền chiếm lại",
  claim(
    {
      processingStatus: "PROCESSING",
      receivedAt: at(-1),
      processedAt: new Date(NOW.getTime() - 45_000),
    },
    NOW
  ),
  { kind: "RECLAIM_STALE" }
);
check(
  "lỗi IPN được cắt gọn trước khi ghi vào event",
  boundPaymentEventErrorMessage("X".repeat(500), 32),
  "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

/* ---------------------------------------------------------------- */
console.log("\nVOID GIAO DỊCH — nạp ví phải thu xu trước khi đóng đơn");
check(
  "TOPUP thu xu thành công mới được VOIDED",
  decideVoidOutcome({
    orderKind: "TOPUP",
    revokeCoins: { ok: true },
  }),
  {
    orderStatus: "VOIDED",
    eventStatus: "PROCESSED",
    revokeGrants: false,
  }
);
check(
  "TOPUP đã tiêu mất xu → chuyển REQUIRES_REVIEW, không VOIDED im lặng",
  decideVoidOutcome({
    orderKind: "TOPUP",
    revokeCoins: { ok: false, reason: "ALREADY_SPENT" },
  }),
  {
    orderStatus: "REQUIRES_REVIEW",
    eventStatus: "PROCESSED",
    revokeGrants: false,
  }
);
check(
  "PACKAGE void thì thu hồi grant và đánh dấu PROCESSED",
  decideVoidOutcome({
    orderKind: "PACKAGE",
    revokeCoins: null,
  }),
  {
    orderStatus: "VOIDED",
    eventStatus: "PROCESSED",
    revokeGrants: true,
  }
);

console.log("\nQUY TẮC HOÀN/VOID — helper thuần cho ca khó");
const decideTopupReversal = (
  paymentRules as Record<string, unknown>
).decideTopupReversal as
  | undefined
  | ((input: {
      orderStatus: string;
      expectedCoins: number;
      creditedCoins: number;
      revokedCoins: number;
      remainingCreditedCoins: number;
    }) => unknown);
check("có helper thuần cho hoàn/void TOPUP", typeof decideTopupReversal, "function");
if (typeof decideTopupReversal === "function") {
  check(
    "đơn TOPUP chưa từng cộng xu thì void sạch mà không trừ ví",
    decideTopupReversal({
      orderStatus: "PENDING",
      expectedCoins: 100,
      creditedCoins: 0,
      revokedCoins: 0,
      remainingCreditedCoins: 0,
    }),
    {
      action: "VOID_NOOP",
      orderStatus: "VOIDED",
      eventStatus: "PROCESSED",
      reviewReason: null,
      coinsToRevoke: 0,
    }
  );
  check(
    "chỉ phần xu gốc còn nguyên mới được thu hồi",
    decideTopupReversal({
      orderStatus: "PAID",
      expectedCoins: 100,
      creditedCoins: 100,
      revokedCoins: 0,
      remainingCreditedCoins: 100,
    }),
    {
      action: "REVOKE_ORIGINAL_CREDIT",
      orderStatus: "VOIDED",
      eventStatus: "PROCESSED",
      reviewReason: null,
      coinsToRevoke: 100,
    }
  );
  check(
    "học viên đã tiêu mất một phần xu gốc thì phải chuyển review",
    decideTopupReversal({
      orderStatus: "PAID",
      expectedCoins: 100,
      creditedCoins: 100,
      revokedCoins: 0,
      remainingCreditedCoins: 40,
    }),
    {
      action: "REVIEW",
      orderStatus: "REQUIRES_REVIEW",
      eventStatus: "PROCESSED",
      reviewReason: "TOPUP_CREDIT_ALREADY_SPENT",
      coinsToRevoke: 0,
    }
  );
  check(
    "đơn đã PAID mà thiếu ledger gốc phải chuyển review, không được coi như PENDING",
    decideTopupReversal({
      orderStatus: "PAID",
      expectedCoins: 100,
      creditedCoins: 0,
      revokedCoins: 0,
      remainingCreditedCoins: 0,
    }),
    {
      action: "REVIEW",
      orderStatus: "REQUIRES_REVIEW",
      eventStatus: "PROCESSED",
      reviewReason: "TOPUP_LEDGER_MISSING",
      coinsToRevoke: 0,
    }
  );
  check(
    "đơn REQUIRES_REVIEW thiếu ledger gốc vẫn phải giữ review, không được void sạch",
    decideTopupReversal({
      orderStatus: "REQUIRES_REVIEW",
      expectedCoins: 100,
      creditedCoins: 0,
      revokedCoins: 0,
      remainingCreditedCoins: 0,
    }),
    {
      action: "REVIEW",
      orderStatus: "REQUIRES_REVIEW",
      eventStatus: "PROCESSED",
      reviewReason: "TOPUP_LEDGER_MISSING",
      coinsToRevoke: 0,
    }
  );
}

const decideTopupReversalFromLedger = (
  paymentRules as Record<string, unknown>
).decideTopupReversalFromLedger as
  | undefined
  | ((input: {
      orderId: string;
      orderStatus: string;
      expectedCoins: number;
      ledgerRows: Array<{
        kind: string;
        amount: number;
        orderId: string | null;
        ledgerKey: string;
      }>;
    }) => unknown);
check(
  "có helper thuần tính reversal TOPUP theo thứ tự ledger",
  typeof decideTopupReversalFromLedger,
  "function"
);
if (typeof decideTopupReversalFromLedger === "function") {
  check(
    "A tiêu hết rồi mới nạp B thì refund A phải review, không được trừ nhầm của B",
    decideTopupReversalFromLedger({
      orderId: "A",
      orderStatus: "PAID",
      expectedCoins: 100,
      ledgerRows: [
        { kind: "TOPUP", amount: 100, orderId: "A", ledgerKey: "TOPUP:A" },
        { kind: "SPEND", amount: 100, orderId: null, ledgerKey: "SPEND:X" },
        { kind: "TOPUP", amount: 100, orderId: "B", ledgerKey: "TOPUP:B" },
      ],
    }),
    {
      action: "REVIEW",
      orderStatus: "REQUIRES_REVIEW",
      eventStatus: "PROCESSED",
      reviewReason: "TOPUP_CREDIT_ALREADY_SPENT",
      coinsToRevoke: 0,
    }
  );
  check(
    "ledger gốc sai kind/orderId/amount thì phải fail-closed sang review",
    decideTopupReversalFromLedger({
      orderId: "A",
      orderStatus: "PAID",
      expectedCoins: 100,
      ledgerRows: [
        { kind: "GIFT", amount: 100, orderId: "A", ledgerKey: "TOPUP:A" },
      ],
    }),
    {
      action: "REVIEW",
      orderStatus: "REQUIRES_REVIEW",
      eventStatus: "PROCESSED",
      reviewReason: "TOPUP_LEDGER_CORRUPTED",
      coinsToRevoke: 0,
    }
  );
}

console.log("\nTOPUP ATOMICITY — stale lease/crash không được để side effect lọt ra ngoài");
type FakeTopupState = {
  order: {
    id: string;
    userId: string;
    status: string;
    coinsGranted: number;
    lastError: string | null;
  };
  wallet: { grantedTotal: number; spentTotal: number } | null;
  ledgerRows: Array<{
    kind: string;
    amount: number;
    orderId: string | null;
    ledgerKey: string;
    note?: string | null;
    balanceAfter?: number;
  }>;
  event:
    | {
        processingStatus: string;
        processingLeaseToken: string | null;
        errorMessage: string | null;
      }
    | null;
};

async function runFakeTopupTx(
  state: FakeTopupState,
  o: {
    failOnUpdateOrder?: boolean;
    eventLeaseToken?: string;
    workerLeaseToken?: string;
  } = {}
) {
  const original = structuredClone(state);
  const draft = structuredClone(state);
  try {
    const result = await reverseTopupOrderWithRepo(
      {
        getOrder: async () => draft.order,
        getWallet: async () => draft.wallet,
        getLedger: async () => draft.ledgerRows,
        incrementWalletSpent: async (_userId, amount) => {
          if (!draft.wallet) throw new Error("MISSING_WALLET");
          draft.wallet.spentTotal += amount;
        },
        createRevokeLedger: async (entry) => {
          draft.ledgerRows.push({
            kind: "REVOKE",
            amount: entry.amount,
            orderId: entry.orderId,
            ledgerKey: `REVOKE:${entry.orderId}`,
            note: entry.note,
            balanceAfter: entry.balanceAfter,
          });
        },
        updateOrder: async (_orderId, data) => {
          if (o.failOnUpdateOrder) throw new Error("ORDER_WRITE_CRASH");
          draft.order = {
            ...draft.order,
            status: data.status,
            lastError: data.lastError ?? null,
          };
        },
        finalizeEvent: draft.event
          ? async (event) => {
              const ok =
                draft.event?.processingStatus === "PROCESSING" &&
                draft.event.processingLeaseToken === event.processingLeaseToken;
              if (!ok) return false;
              const currentEvent = draft.event;
              if (!currentEvent) return false;
              draft.event = {
                ...currentEvent,
                processingStatus: event.processingStatus,
                processingLeaseToken: currentEvent.processingLeaseToken ?? null,
                errorMessage: event.errorMessage ?? null,
              };
              return true;
            }
          : undefined,
      },
      {
        orderId: draft.order.id,
        targetStatus: "VOIDED",
        reason: "SEPAY_VOID",
        reviewCodePrefix: "SEPAY_VOID",
        now: NOW,
        ...(draft.event
          ? {
              eventFinalize: {
                eventKey: "ORDER_PAID:TX-1",
                processingLeaseToken:
                  o.workerLeaseToken ?? draft.event.processingLeaseToken ?? "lease-A",
              },
            }
          : {}),
      }
    );
    return { committed: true as const, state: draft, result };
  } catch (error) {
    return {
      committed: false as const,
      state: original,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const atomicBase: FakeTopupState = {
  order: {
    id: "ord-A",
    userId: "u1",
    status: "PAID",
    coinsGranted: 100,
    lastError: null,
  },
  wallet: { grantedTotal: 100, spentTotal: 0 },
  ledgerRows: [{ kind: "TOPUP", amount: 100, orderId: "ord-A", ledgerKey: "TOPUP:ord-A" }],
  event: {
    processingStatus: "PROCESSING",
    processingLeaseToken: "lease-B",
    errorMessage: null,
  },
};

const staleLeaseTx = await runFakeTopupTx(atomicBase, { workerLeaseToken: "lease-A" });
check("stale lease phải làm cả transaction rollback", staleLeaseTx.committed, false);
check(
  "stale lease rollback giữ nguyên wallet/order/ledger",
  staleLeaseTx.state,
  atomicBase
);

const crashWindowTx = await runFakeTopupTx(
  {
    ...atomicBase,
    event: null,
  },
  { failOnUpdateOrder: true }
);
check("lỗi giữa đường ở admin refund cũng phải rollback cả ví và order", crashWindowTx.committed, false);
check("admin crash rollback giữ nguyên state", crashWindowTx.state, {
  ...atomicBase,
  event: null,
});

console.log("\nTOPUP RETRY — unique/deadlock phải đọc lại state và chốt đúng lease");
const runTopupReversalWithRetry = (
  topupService as Record<string, unknown>
).runTopupReversalWithRetry as
  | undefined
  | (<T>(operation: (attempt: number) => Promise<T>, maxAttempts?: number) => Promise<T>);
check(
  "có retry bounded dùng lại cho transaction reversal",
  typeof runTopupReversalWithRetry,
  "function"
);
if (typeof runTopupReversalWithRetry === "function") {
  let attempts = 0;
  const stateAfterConcurrentCommit: FakeTopupState = {
    ...structuredClone(atomicBase),
    order: { ...structuredClone(atomicBase.order), status: "VOIDED" },
    wallet: { grantedTotal: 100, spentTotal: 100 },
    ledgerRows: [
      ...structuredClone(atomicBase.ledgerRows),
      {
        kind: "REVOKE",
        amount: 100,
        orderId: "ord-A",
        ledgerKey: "REVOKE:ord-A",
        balanceAfter: 0,
      },
    ],
    event: {
      processingStatus: "PROCESSING",
      processingLeaseToken: "lease-A",
      errorMessage: null,
    },
  };
  const recovered = await runTopupReversalWithRetry(async () => {
    attempts++;
    if (attempts === 1) {
      throw { code: "P2002" };
    }
    return runFakeTopupTx(stateAfterConcurrentCommit, { workerLeaseToken: "lease-A" });
  });
  check("P2002 chỉ retry đúng một lần rồi đọc terminal state mới", attempts, 2);
  check("retry chốt event đang giữ lease thay vì trả NOOP giả", recovered, {
    committed: true,
    state: {
      ...stateAfterConcurrentCommit,
      event: {
        processingStatus: "PROCESSED",
        processingLeaseToken: "lease-A",
        errorMessage: null,
      },
    },
    result: {
      ok: true,
      action: "NOOP_FINAL",
      orderStatus: "VOIDED",
      coinsRevoked: 0,
      balanceAfter: 0,
    },
  });

  let leaseLostAttempts = 0;
  const lostLeaseState: FakeTopupState = {
    ...structuredClone(stateAfterConcurrentCommit),
    event: {
      processingStatus: "PROCESSING",
      processingLeaseToken: "lease-B",
      errorMessage: null,
    },
  };
  let leaseLostMessage = "";
  try {
    await runTopupReversalWithRetry(async () => {
      leaseLostAttempts++;
      if (leaseLostAttempts === 1) throw { code: "P2002" };
      const result = await runFakeTopupTx(lostLeaseState, {
        workerLeaseToken: "lease-A",
      });
      if (!result.committed) throw new Error(result.error);
      return result;
    });
  } catch (error) {
    leaseLostMessage = error instanceof Error ? error.message : String(error);
  }
  check("lease mất sau retry phải throw để webhook thử lại", leaseLostMessage, "PAYMENT_EVENT_LEASE_LOST");
  check("lease lost không bị retry vô hạn", leaseLostAttempts, 2);

  let deadlockAttempts = 0;
  let deadlockMessage = "";
  try {
    await runTopupReversalWithRetry(async () => {
      deadlockAttempts++;
      throw { code: "P2034" };
    }, 3);
  } catch (error) {
    deadlockMessage = String((error as { code?: string }).code ?? error);
  }
  check("P2034 dừng đúng giới hạn", deadlockAttempts, 3);
  check("hết retry phải ném lỗi gốc cho webhook", deadlockMessage, "P2034");
}

console.log("\nP2002 FULFILLMENT — chỉ success khi chứng minh đúng đơn đã hoàn tất");
const canRecoverFulfillmentP2002 = (
  paymentRules as Record<string, unknown>
).canRecoverFulfillmentP2002 as
  | undefined
  | ((input: {
      orderStatus: string;
      expectedProviderTransactionId: string;
      actualProviderTransactionId: string | null;
      hasExpectedFulfillmentEvidence: boolean;
    }) => boolean);
check("có helper fail-closed cho P2002 fulfillment", typeof canRecoverFulfillmentP2002, "function");
if (typeof canRecoverFulfillmentP2002 === "function") {
  check("đúng PAID + đúng transaction + đủ evidence mới recover", canRecoverFulfillmentP2002({
    orderStatus: "PAID",
    expectedProviderTransactionId: "TX-1",
    actualProviderTransactionId: "TX-1",
    hasExpectedFulfillmentEvidence: true,
  }), true);
  check("providerTransactionId đụng đơn khác không được false-success", canRecoverFulfillmentP2002({
    orderStatus: "PENDING",
    expectedProviderTransactionId: "TX-1",
    actualProviderTransactionId: null,
    hasExpectedFulfillmentEvidence: false,
  }), false);
  check("PAID cùng transaction nhưng thiếu grant/ledger cũng phải fail-closed", canRecoverFulfillmentP2002({
    orderStatus: "PAID",
    expectedProviderTransactionId: "TX-1",
    actualProviderTransactionId: "TX-1",
    hasExpectedFulfillmentEvidence: false,
  }), false);
  check("PAID bởi transaction khác không được nhận nhầm", canRecoverFulfillmentP2002({
    orderStatus: "PAID",
    expectedProviderTransactionId: "TX-1",
    actualProviderTransactionId: "TX-OTHER",
    hasExpectedFulfillmentEvidence: true,
  }), false);
}

console.log("\nMIGRATION ERROR — chỉ nuốt đúng duplicate-column MySQL");
const isDuplicateColumnMigrationError = (
  paymentRules as Record<string, unknown>
).isDuplicateColumnMigrationError as undefined | ((error: unknown) => boolean);
check("có helper phân loại lỗi migration", typeof isDuplicateColumnMigrationError, "function");
if (typeof isDuplicateColumnMigrationError === "function") {
  check("nhận duplicate top-level mysql errno", isDuplicateColumnMigrationError({ errno: 1060 }), true);
  check("nhận Prisma P2010 với MySQL code nằm trong meta", isDuplicateColumnMigrationError({
    code: "P2010",
    meta: { code: "1060", message: "Duplicate column name 'processingLeaseToken'" },
  }), true);
  check("nhận ER_DUP_FIELDNAME nằm sâu trong Prisma meta", isDuplicateColumnMigrationError({
    code: "P2010",
    meta: { driverAdapterError: { cause: { code: "ER_DUP_FIELDNAME" } } },
  }), true);
  check("nhận MySQL 1060 chỉ xuất hiện trong nested database_error", isDuplicateColumnMigrationError({
    code: "P2010",
    meta: {
      driverAdapterError: {
        cause: { database_error: "ERROR 1060 (42S21): Duplicate column name" },
      },
    },
  }), true);
  check("không nuốt lỗi permission", isDuplicateColumnMigrationError({
    code: "P2010",
    meta: { code: "1142", message: "ALTER command denied" },
  }), false);
  check("không nuốt lỗi lock/deadlock", isDuplicateColumnMigrationError({ code: "P2034" }), false);
}

const requirePaymentEventFinalized = (
  paymentRules as Record<string, unknown>
).requirePaymentEventFinalized as undefined | ((finalized: boolean) => void);
check("có guard bắt buộc mọi terminal event phải giữ đúng lease", typeof requirePaymentEventFinalized, "function");
if (typeof requirePaymentEventFinalized === "function") {
  let leaseGuardMessage = "";
  try {
    requirePaymentEventFinalized(false);
  } catch (error) {
    leaseGuardMessage = error instanceof Error ? error.message : String(error);
  }
  check("terminal CAS miss phải throw cho webhook retry", leaseGuardMessage, "PAYMENT_EVENT_LEASE_LOST");
  let ownedLeaseThrows = false;
  try {
    requirePaymentEventFinalized(true);
  } catch {
    ownedLeaseThrows = true;
  }
  check("terminal CAS đúng lease không throw", ownedLeaseThrows, false);
}

const decidePackageReversal = (
  paymentRules as Record<string, unknown>
).decidePackageReversal as
  | undefined
  | ((input: {
      orderStatus: string;
      targetStatus: "VOIDED" | "REFUNDED";
      grantedAiCredits: number;
      availableAiCredits: number;
      usedTotal?: number;
      grantCount?: number;
    }) => unknown);
check("có helper thuần cho hoàn/void PACKAGE", typeof decidePackageReversal, "function");
if (typeof decidePackageReversal === "function") {
  check(
    "thiếu lượt AI còn lại thì không được hoàn sạch, phải đưa đi review",
    decidePackageReversal({
      orderStatus: "PAID",
      targetStatus: "REFUNDED",
      grantedAiCredits: 10,
      availableAiCredits: 3,
    }),
    {
      action: "REVIEW",
      orderStatus: "REQUIRES_REVIEW",
      eventStatus: "PROCESSED",
      reviewReason: "AI_CREDITS_ALREADY_USED",
      aiCreditsToRevoke: 0,
      revokeGrants: false,
    }
  );
  check(
    "đã dùng lượt AI của A rồi mới mua B thì refund A phải review, không được trừ nhầm của B",
    decidePackageReversal({
      orderStatus: "PAID",
      targetStatus: "REFUNDED",
      grantedAiCredits: 10,
      availableAiCredits: 10,
      usedTotal: 10,
      grantCount: 1,
    }),
    {
      action: "REVIEW",
      orderStatus: "REQUIRES_REVIEW",
      eventStatus: "PROCESSED",
      reviewReason: "AI_CREDITS_ALREADY_USED",
      aiCreditsToRevoke: 0,
      revokeGrants: false,
    }
  );
  check(
    "đơn đã REFUNDED mà nhận VOIDED muộn thì NOOP_FINAL, không được regress về review",
    decidePackageReversal({
      orderStatus: "REFUNDED",
      targetStatus: "VOIDED",
      grantedAiCredits: 10,
      availableAiCredits: 10,
      usedTotal: 0,
      grantCount: 0,
    }),
    {
      action: "NOOP_FINAL",
      orderStatus: "REFUNDED",
      eventStatus: "PROCESSED",
      reviewReason: null,
      aiCreditsToRevoke: 0,
      revokeGrants: false,
    }
  );
}

console.log("\nLEASE TOKEN — worker cũ không được chốt event của worker mới");
const canFinalizePaymentEventLease = (
  paymentRules as Record<string, unknown>
).canFinalizePaymentEventLease as
  | undefined
  | ((input: {
      processingStatus: string;
      processingLeaseToken: string | null;
      workerLeaseToken: string;
    }) => boolean);
check(
  "có helper thuần chặn worker cũ ghi đè event đã bị chiếm lại",
  typeof canFinalizePaymentEventLease,
  "function"
);
if (typeof canFinalizePaymentEventLease === "function") {
  check(
    "đúng lease đang giữ quyền thì được finalize",
    canFinalizePaymentEventLease({
      processingStatus: "PROCESSING",
      processingLeaseToken: "lease-A",
      workerLeaseToken: "lease-A",
    }),
    true
  );
  check(
    "worker cũ hết lease thì không được ghi đè sang FAILED/PROCESSED",
    canFinalizePaymentEventLease({
      processingStatus: "PROCESSING",
      processingLeaseToken: "lease-B",
      workerLeaseToken: "lease-A",
    }),
    false
  );
  check(
    "event đã PROCESSED thì mọi worker khác đều phải đứng lại",
    canFinalizePaymentEventLease({
      processingStatus: "PROCESSED",
      processingLeaseToken: "lease-A",
      workerLeaseToken: "lease-A",
    }),
    false
  );
}

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
