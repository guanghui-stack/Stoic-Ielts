/**
 * Kiểm thử quy tắc thanh toán và quyền truy cập.
 * Chạy: node --experimental-strip-types scripts/test-payments.ts
 *
 * Đây là phần logic mà sai một chút là mất tiền thật hoặc mở nhầm quyền, nên
 * mọi tình huống trong Phụ lục B của đặc tả đều có ít nhất một phép thử.
 */
import { OFFERS, PRICE_VERSION } from "../src/lib/payments/catalog.ts";
import {
  buildEventKey,
  canTransitionToPaid,
  checkIpnPaidPayload,
  checkRetrievedOrderPaid,
  computeGrantWindow,
  decideGrantAccess,
  introPromoTokenFor,
  introTokenStillHeld,
  isGrantLive,
  parseVndAmount,
  resolveOfferPrice,
  type GrantLike,
} from "../src/lib/payments/payment-rules.ts";

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
  "thiếu mã giao dịch thì rơi về mã đơn, không sinh khóa rỗng",
  key({ transactionId: "" }),
  "ORDER_PAID:WB-1:1785000000"
);

console.log("\nCHUYỂN TRẠNG THÁI ĐƠN");
check("đơn đang chờ có thể chuyển sang đã trả", canTransitionToPaid("PENDING"), true);
check("đơn cần đối soát có thể chuyển sang đã trả", canTransitionToPaid("REQUIRES_REVIEW"), true);
check("đơn đã hủy KHÔNG được tự chuyển sang đã trả", canTransitionToPaid("CANCELLED"), false);
check("đơn đã hoàn tiền KHÔNG được chuyển sang đã trả", canTransitionToPaid("REFUNDED"), false);
check("đơn đã void KHÔNG được chuyển sang đã trả", canTransitionToPaid("VOIDED"), false);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
