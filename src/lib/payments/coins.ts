/**
 * Ví xu — LUẬT THUẦN, không chạm database, không giữ bí mật.
 *
 * Tách khỏi `coin-service.ts` để kiểm thử được bằng node thuần
 * (`scripts/test-coins.ts`). Mọi câu hỏi "được mua không, hết bao nhiêu, còn
 * lại bao nhiêu" phải trả lời ở đây, để nơi hiển thị và nơi chặn ở máy chủ
 * dùng chung một luật và không bao giờ lệch nhau.
 *
 * BA ĐIỀU ĐÃ CHỐT VỚI CHỦ DỰ ÁN (11/08/2026), đừng tự đổi:
 * 1. Xu **không hoàn lại tiền**, **không hết hạn**, **không chuyển nhượng**.
 *    Nó là tín dụng dịch vụ trả trước, không phải tiền gửi.
 * 2. Tỉ giá gốc 1 xu = 1.000đ. Mốc lớn được thưởng thêm, thưởng nằm ở bảng
 *    `TOPUP_TIERS` chứ không phải một công thức nhân đâu đó.
 * 3. Xu và **lượt AI chấm** (`FeynmanAiBudget`) là HAI thứ khác đơn vị. Xu mua
 *    gói; gói tặng lượt AI. Không có đường nào đổi thẳng xu ra lượt AI ngoài
 *    việc mua gói — gộp hai ví lại là gỡ mất trần chi phí OpenAI mô tả ở mục
 *    10.3 của bản bàn giao.
 */

import { OFFERS, type OfferCode, type Offer } from "./catalog.ts";

/** Một xu đúng bằng 1.000đ. Mọi phép đổi đều là số nguyên, không có xu lẻ. */
export const COIN_UNIT_VND = 1_000;

/**
 * Đổi bản này khi thay mốc nạp hoặc mức thưởng, để đơn cũ vẫn tra được mình đã
 * nạp theo tỉ lệ nào. Tách khỏi `PRICE_VERSION` của bảng giá gói: hai thứ đổi
 * vì hai lý do khác nhau.
 */
export const COIN_RATE_VERSION = "2026-08-11-v1";

/**
 * Quà chào mừng, tặng MỘT LẦN cho mỗi tài khoản đã xác minh email.
 *
 * 150 xu = 16 đề mở lẻ, hoặc 5 lượt làm bài được mở trọn vẹn (9 xu mở đề +
 * 19 xu gói Feynman = 28 xu mỗi lượt). Chủ dự án chốt 12/08/2026.
 *
 * ĐIỀU KIỆN XÁC MINH EMAIL LÀ MỘT PHẦN CỦA CON SỐ NÀY, đừng tách rời: tặng xu
 * cho tài khoản chưa xác minh là mở đường lập tài khoản ảo hàng loạt để lấy
 * lượt AI chấm — thứ có hóa đơn OpenAI thật.
 */
export const WELCOME_COINS = 150;

export type TopUpTierCode =
  | "COIN_50K"
  | "COIN_100K"
  | "COIN_200K"
  | "COIN_500K";

export type TopUpTier = {
  amountVnd: number;
  /** TỔNG số xu được cộng, đã gồm thưởng. Đây là con số duy nhất máy chủ dùng. */
  coins: number;
  label: string;
};

/**
 * Bốn mốc nạp.
 *
 * `coins` khai TỔNG luôn thay vì "gốc + thưởng" để không có chỗ nào phải cộng
 * lại: cộng ở hai nơi là sớm muộn có một nơi quên. Phần thưởng suy ra bằng
 * `bonusCoinsOf()` và chỉ dùng để hiển thị.
 *
 * Mốc 50.000đ cố ý KHÔNG thưởng — nó là cửa thử cho học viên mua lần đầu, và
 * gói rẻ nhất là 19 xu nên mốc này đủ cho hai lần chữa bài.
 */
export const TOPUP_TIERS = {
  COIN_50K: { amountVnd: 50_000, coins: 50, label: "Nạp 50.000đ" },
  COIN_100K: { amountVnd: 100_000, coins: 100, label: "Nạp 100.000đ" },
  COIN_200K: { amountVnd: 200_000, coins: 210, label: "Nạp 200.000đ" },
  COIN_500K: { amountVnd: 500_000, coins: 550, label: "Nạp 500.000đ" },
} as const satisfies Record<TopUpTierCode, TopUpTier>;

export function isTopUpTierCode(value: string): value is TopUpTierCode {
  return Object.prototype.hasOwnProperty.call(TOPUP_TIERS, value);
}

/** Mốc nạp theo thứ tự hiển thị, từ nhỏ tới lớn. */
export function listTopUpTiers(): TopUpTierCode[] {
  return (Object.keys(TOPUP_TIERS) as TopUpTierCode[]).sort(
    (a, b) => TOPUP_TIERS[a].amountVnd - TOPUP_TIERS[b].amountVnd
  );
}

/** Số xu thưởng thêm so với tỉ giá gốc. 0 nghĩa là mốc này không thưởng. */
export function bonusCoinsOf(code: TopUpTierCode): number {
  const tier = TOPUP_TIERS[code];
  return tier.coins - Math.floor(tier.amountVnd / COIN_UNIT_VND);
}

/**
 * Giá gói tính bằng xu.
 *
 * `null` nghĩa là gói này KHÔNG mua bằng xu được — ba gói cũ đã dừng bán nằm ở
 * nhóm đó. Trả `null` thay vì 0: 0 sẽ bị đọc nhầm thành "miễn phí" và mở toang
 * gói cũ cho tất cả mọi người.
 */
export function coinPriceOf(code: OfferCode): number | null {
  const offer = OFFERS[code] as Offer;
  if (offer.retired === true) return null;
  return offer.priceCoins ?? null;
}

export type WalletLike = { grantedTotal: number; spentTotal: number };

/**
 * Số dư là HÀM DẪN XUẤT, không phải một cột ai cũng ghi đè được.
 *
 * Chặn sàn ở 0 vì số âm không có nghĩa nào đúng: nếu `spentTotal` vượt
 * `grantedTotal` thì dữ liệu đã hỏng, và lúc đó khóa ví lại vẫn an toàn hơn là
 * để một số âm trôi vào phép so sánh "còn đủ xu không".
 */
export function coinBalance(wallet: WalletLike): number {
  return Math.max(0, wallet.grantedTotal - wallet.spentTotal);
}

export type CoinPurchaseDecision =
  | { ok: true; cost: number; balanceAfter: number }
  | {
      ok: false;
      reason: "NOT_BUYABLE" | "ALREADY_OWNED" | "NOT_ENOUGH_COINS";
      cost: number | null;
      missing: number;
    };

/**
 * Có được tiêu xu cho gói này không.
 *
 * Thứ tự xét là cố ý: **chặn gói không bán được TRƯỚC khi xét số dư**. Ngược
 * lại thì học viên hết xu sẽ được mời đi nạp cho một gói mà nạp xong vẫn không
 * mua được — mất tiền vì một câu thông báo sai thứ tự.
 */
export function decideCoinPurchase(input: {
  offerCode: OfferCode;
  balance: number;
  alreadyOwned: boolean;
}): CoinPurchaseDecision {
  const cost = coinPriceOf(input.offerCode);
  if (cost === null) {
    return { ok: false, reason: "NOT_BUYABLE", cost: null, missing: 0 };
  }

  // Đã có quyền rồi thì đừng bán tiếp. Đây là tiền của học viên, và mua lại
  // đúng thứ mình đang có là lỗi của hệ thống chứ không phải lựa chọn của họ.
  if (input.alreadyOwned) {
    return { ok: false, reason: "ALREADY_OWNED", cost, missing: 0 };
  }

  if (input.balance < cost) {
    return {
      ok: false,
      reason: "NOT_ENOUGH_COINS",
      cost,
      missing: cost - input.balance,
    };
  }

  return { ok: true, cost, balanceAfter: input.balance - cost };
}

/**
 * Mốc nạp nhỏ nhất đủ bù số xu còn thiếu.
 *
 * Dùng cho câu "bạn còn thiếu N xu" trên giao diện. Thiếu nhiều hơn mốc lớn
 * nhất thì trả về mốc lớn nhất — vẫn hơn là không gợi ý gì.
 */
export function suggestTierFor(missingCoins: number): TopUpTierCode {
  const tiers = listTopUpTiers();
  return (
    tiers.find((code) => TOPUP_TIERS[code].coins >= missingCoins) ??
    tiers[tiers.length - 1]
  );
}

/** Định dạng cho giao diện: 39 → "39 xu". */
export function formatCoins(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} xu`;
}

/** Nhãn hiển thị cho một mã trên đơn hàng, dù đó là gói hay mốc nạp. */
export function orderCodeLabel(code: string): string {
  if (isTopUpTierCode(code)) return TOPUP_TIERS[code].label;
  if (Object.prototype.hasOwnProperty.call(OFFERS, code)) {
    return (OFFERS[code as OfferCode] as Offer).label;
  }
  return code;
}
