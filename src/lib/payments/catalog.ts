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
export const PRICE_VERSION = "2026-08-01-v1";

export type AccessFeature = "READING" | "FEYNMAN";
export type AccessScope = "ALL" | "EXERCISE";

export type Offer = {
  feature: AccessFeature;
  scope: AccessScope;
  amount: number;
  /** Giá ưu đãi lần đầu, chỉ có ở FEYNMAN_SINGLE. */
  introAmount?: number;
  /** null = quyền vĩnh viễn với đúng bài đã mua. */
  durationDays: number | null;
  label: string;
  /** Câu mô tả ngắn hiện trên nút và trang bảng giá. */
  blurb: string;
};

export const OFFERS = {
  READING_ALL_30D: {
    feature: "READING",
    scope: "ALL",
    amount: 99_000,
    durationDays: 30,
    label: "Reading — toàn bộ 30 ngày",
    blurb: "Làm mọi bài Reading cần mở khóa trong 30 ngày.",
  },
  READING_SINGLE: {
    feature: "READING",
    scope: "EXERCISE",
    amount: 9_000,
    durationDays: null,
    label: "Reading — mở một bài",
    blurb: "Mở đúng một bài, giữ vĩnh viễn.",
  },
  FEYNMAN_ALL_30D: {
    feature: "FEYNMAN",
    scope: "ALL",
    amount: 299_000,
    durationDays: 30,
    label: "Feynman — toàn bộ 30 ngày",
    blurb: "Chữa sâu mọi bài Reading đã hoàn thành, trong 30 ngày.",
  },
  FEYNMAN_SINGLE: {
    feature: "FEYNMAN",
    scope: "EXERCISE",
    amount: 49_000,
    introAmount: 9_000,
    durationDays: null,
    label: "Feynman — mở một bài",
    blurb: "Chữa sâu đúng một bài, giữ vĩnh viễn.",
  },
} as const satisfies Record<string, Offer>;

export type OfferCode = keyof typeof OFFERS;

export function isOfferCode(value: string): value is OfferCode {
  return Object.prototype.hasOwnProperty.call(OFFERS, value);
}

/** Định dạng tiền Việt cho giao diện: 99000 → "99.000đ". */
export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

export const INTRO_PROMO_NOTICE =
  "Ưu đãi trải nghiệm: Bài Feynman đầu tiên của bạn chỉ 9.000đ " +
  "(giá thường 49.000đ). Ưu đãi áp dụng một lần cho mỗi tài khoản.";
