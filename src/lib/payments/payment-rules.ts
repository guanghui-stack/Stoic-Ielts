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
 * Học viên có quyền dùng `feature` cho bài `exerciseId` không.
 *
 * Quyền gói (scope ALL) phủ mọi bài, kể cả bài được tạo sau khi mua — đó là
 * lý do không lưu sẵn danh sách bài mà tính lại mỗi lần hỏi.
 */
export function decideGrantAccess(input: {
  grants: GrantLike[];
  feature: string;
  exerciseId?: string | null;
  at: Date;
}): boolean {
  return input.grants.some((grant) => {
    if (grant.feature !== input.feature) return false;
    if (!isGrantLive(grant, input.at)) return false;
    if (grant.scope === "ALL") return true;
    if (grant.scope === "EXERCISE") {
      // Grant mở lẻ mà thiếu exerciseId là dữ liệu hỏng → không mở quyền
      return Boolean(
        input.exerciseId && grant.exerciseId === input.exerciseId
      );
    }
    return false; // scope lạ → chặn
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
  const type = input.notificationType || "UNKNOWN";
  const subject = input.transactionId || input.invoiceNumber || "na";
  const stamp =
    typeof input.timestamp === "number" || typeof input.timestamp === "string"
      ? String(input.timestamp)
      : "na";
  return `${type}:${subject}:${stamp}`;
}
