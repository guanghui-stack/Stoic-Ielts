/**
 * Bảng giá — nguồn sự thật DUY NHẤT, nằm phía máy chủ.
 *
 * Trình duyệt chỉ gửi lên mã sản phẩm (offerCode); số tiền không bao giờ đi từ
 * client lên. Nhờ vậy người dùng có sửa HTML cũng không mua được giá rẻ hơn.
 *
 * File này KHÔNG import "server-only" vì `scripts/test-payments.ts` cần đọc nó
 * khi chạy bằng node thuần. Bù lại, file cũng không chứa bất cứ bí mật nào —
 * chỉ là giá công khai đã in trên trang bảng giá.
 */

/** Đổi bản này khi thay giá, để đơn cũ vẫn tra được mình đã bán theo giá nào. */
export const PRICE_VERSION = "2026-08-11-v3";

export type AccessFeature = "READING" | "FEYNMAN";

/**
 * Phạm vi quyền.
 *
 * - `ALL`      — mọi bài đủ điều kiện, trong thời hạn
 * - `EXERCISE` — quyền cũ, mở mọi lượt làm của một bài
 * - `ATTEMPT`  — mô hình hiện tại, mở đúng một lượt làm bài
 * - `NONE`     — gói không cấp quyền truy cập (gói nạp lượt AI)
 *
 * `NONE` tồn tại để `decideGrantAccess` có thứ để chặn: gói nạp lượt lẽ ra
 * không bao giờ tạo `AccessGrant`, nhưng nếu lỗi ở đâu đó tạo nhầm thì grant
 * mang scope này vẫn không mở được gì.
 */
export type AccessScope = "ALL" | "EXERCISE" | "ATTEMPT" | "NONE";

/** `ACCESS` mở tính năng; `AI_TOPUP` chỉ cộng lượt AI vào ví, không mở gì cả. */
export type OfferKind = "ACCESS" | "AI_TOPUP";

export type Offer = {
  kind: OfferKind;
  feature: AccessFeature;
  scope: AccessScope;
  /**
   * Giá VND. Với gói đang bán đây chỉ là con số ĐỐI CHIẾU cho học viên hiểu
   * "39 xu là bao nhiêu tiền" — không còn đường nào trả VND trực tiếp cho gói
   * nữa, tiền thật chỉ đi qua mốc nạp ví. Với ba gói đã dừng bán thì đây là giá
   * họ đã trả thật, phải giữ để tra cứu đơn cũ.
   */
  amount: number;
  /**
   * Giá thật đang thu, tính bằng xu. Thiếu trường này nghĩa là gói không mua
   * bằng xu được — xem `coinPriceOf()` trong `coins.ts`.
   */
  priceCoins?: number;
  /** Giá ưu đãi lần đầu, chỉ có ở FEYNMAN_SINGLE. */
  introAmount?: number;
  /** null = quyền vĩnh viễn với đúng phạm vi đã mua. */
  durationDays: number | null;
  label: string;
  /** Câu mô tả ngắn hiện trên nút và trang bảng giá. */
  blurb: string;
  /**
   * Số lượt AI chấm cộng vào ví CHUNG của tài khoản khi đơn được thanh toán.
   * Ví không gắn với lượt làm bài nào — mua ở đề nào cũng tiêu được ở đề khác.
   */
  aiGradingCredits?: number;
  /** Số câu được hỏi AI trong mỗi lượt chấm mở bởi gói này. */
  aiChatLimit?: number;
  /**
   * Gói đã dừng bán. Không hiện ở trang bán nữa, nhưng KHÔNG xóa khỏi bảng giá:
   * đơn cũ phải tra cứu được và `AccessGrant` cũ phải đọc quyền được bình
   * thường cho tới khi hết hạn. Người đã trả tiền phải dùng hết thứ đã mua.
   */
  retired?: boolean;
};

export const OFFERS = {
  /* --- Đang bán ------------------------------------------------------ */

  /**
   * Mở một đề Reading. Mã MỚI chứ không dùng lại `READING_SINGLE`: mã cũ mang
   * giá 9.000đ và cả một lịch sử đơn hàng VND, trộn vào sẽ không còn phân biệt
   * được ai đã trả tiền mặt và ai đã tiêu xu.
   *
   * Scope `EXERCISE` là cố ý — mở một lần rồi làm lại bao nhiêu lượt cũng được.
   * Học viên đã trả tiền cho BÀI, không phải cho một lần bấm.
   */
  READING_UNLOCK: {
    kind: "ACCESS",
    feature: "READING",
    scope: "EXERCISE",
    amount: 9_000,
    priceCoins: 9,
    durationDays: null,
    label: "Mở một đề Reading",
    blurb: "Mở đúng một đề, làm lại không giới hạn, giữ vĩnh viễn.",
  },

  FEYNMAN_ATTEMPT_FULL: {
    kind: "ACCESS",
    feature: "FEYNMAN",
    scope: "ATTEMPT",
    amount: 39_000,
    priceCoins: 39,
    durationDays: null,
    aiGradingCredits: 10,
    aiChatLimit: 10,
    label: "Full Test — đáp án chi tiết + Feynman + AI",
    blurb: "Mở đúng lượt làm bài này, giữ vĩnh viễn. Tặng 10 lượt AI chấm.",
  },
  FEYNMAN_ATTEMPT_SINGLE: {
    kind: "ACCESS",
    feature: "FEYNMAN",
    scope: "ATTEMPT",
    amount: 19_000,
    priceCoins: 19,
    durationDays: null,
    aiGradingCredits: 10,
    aiChatLimit: 5,
    label: "Đề đơn — đáp án chi tiết + Feynman + AI",
    blurb: "Mở đúng lượt làm bài này, giữ vĩnh viễn. Tặng 10 lượt AI chấm.",
  },
  FEYNMAN_AI_TOPUP: {
    kind: "AI_TOPUP",
    feature: "FEYNMAN",
    scope: "NONE",
    amount: 29_000,
    priceCoins: 29,
    durationDays: null,
    aiGradingCredits: 10,
    label: "Nạp thêm 10 lượt AI chấm",
    blurb: "Cộng vào ví chung của tài khoản, dùng được cho mọi lượt làm bài.",
  },

  /* --- Đã dừng bán, giữ lại để đơn cũ và quyền cũ vẫn đọc được -------- */

  READING_ALL_30D: {
    kind: "ACCESS",
    feature: "READING",
    scope: "ALL",
    amount: 99_000,
    durationDays: 30,
    retired: true,
    label: "Reading — toàn bộ 30 ngày",
    blurb: "Làm mọi bài Reading cần mở khóa trong 30 ngày.",
  },
  READING_SINGLE: {
    kind: "ACCESS",
    feature: "READING",
    scope: "EXERCISE",
    amount: 9_000,
    durationDays: null,
    retired: true,
    label: "Reading — mở một bài",
    blurb: "Mở đúng một bài, giữ vĩnh viễn.",
  },
  FEYNMAN_ALL_30D: {
    kind: "ACCESS",
    feature: "FEYNMAN",
    scope: "ALL",
    amount: 299_000,
    durationDays: 30,
    retired: true,
    label: "Feynman — toàn bộ 30 ngày",
    blurb: "Chữa sâu mọi bài Reading đã hoàn thành, trong 30 ngày.",
  },
  FEYNMAN_SINGLE: {
    kind: "ACCESS",
    feature: "FEYNMAN",
    scope: "EXERCISE",
    amount: 49_000,
    introAmount: 9_000,
    durationDays: null,
    retired: true,
    label: "Feynman — mở một bài",
    blurb: "Chữa sâu đúng một bài, giữ vĩnh viễn.",
  },
} as const satisfies Record<string, Offer>;

export type OfferCode = keyof typeof OFFERS;

/**
 * Hai gói bán theo lượt làm bài. Khai riêng để chỗ nào mời mua "cho lượt này"
 * không lỡ tay nhận vào một gói Reading cũ hay gói nạp ví — TypeScript chặn
 * trước, thay vì để lộ ra lúc học viên đã bấm nút.
 */
export type AttemptOfferCode =
  | "FEYNMAN_ATTEMPT_FULL"
  | "FEYNMAN_ATTEMPT_SINGLE";

export function isOfferCode(value: string): value is OfferCode {
  return Object.prototype.hasOwnProperty.call(OFFERS, value);
}

/**
 * Các gói còn bán, dùng cho trang bảng giá.
 *
 * Gói `retired` bị lọc ở ĐÂY chứ không bị xóa khỏi `OFFERS` — mọi đường tra
 * cứu đơn cũ và đọc quyền cũ vẫn phải tìm thấy chúng.
 */
export function listOffersForSale(): OfferCode[] {
  return (Object.keys(OFFERS) as OfferCode[]).filter(
    (code) => !("retired" in OFFERS[code] && OFFERS[code].retired)
  );
}

/** Gói này có còn bán không. Đơn mới cho gói đã dừng bán phải bị từ chối. */
export function isOfferOnSale(code: OfferCode): boolean {
  const offer = OFFERS[code] as Offer;
  return offer.retired !== true;
}

/** Định dạng tiền Việt cho giao diện: 99000 → "99.000đ". */
export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

/**
 * Hai câu dưới đây là CAM KẾT với học viên, không phải câu quảng cáo tuỳ nghi.
 * `docs/DAC-TA-FEYNMAN-AI.md` §2.3 buộc in đúng chữ này trên website — đổi chữ
 * thì phải đổi đặc tả trước, vì chúng mô tả đúng thứ hệ thống thật sự làm.
 */
export const FREE_PRACTICE_NOTICE =
  "Luyện Feynman không giới hạn và không tốn phí. Chỉ phần AI chấm và hỏi đáp " +
  "AI mới tính lượt, vì mỗi lần gọi AI là một chi phí thật.";

export const AI_EVIDENCE_NOTICE =
  "AI chỉ kết luận điểm yếu khi đã đủ bằng chứng tích lũy — không phán xét bạn " +
  "dựa trên một lần làm bài.";
