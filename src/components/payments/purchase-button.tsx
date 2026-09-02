import type { ReactNode } from "react";
import {
  buyWithCoinsAction,
  createTopUpOrderAction,
} from "@/lib/actions/payments";
import type { OfferCode } from "@/lib/payments/catalog";
import type { TopUpTierCode } from "@/lib/payments/coins";
import { SubmitButton } from "@/components/ui";

/**
 * Hai nút, hai việc khác hẳn nhau — cố ý KHÔNG gộp thành một:
 *
 * - `TopUpButton` đưa tiền thật vào hệ thống, đi qua cổng thanh toán.
 * - `CoinPurchaseButton` tiêu xu đã có, xong ngay, không qua cổng nào.
 *
 * Gộp lại thành một nút "mua" chung sẽ có ngày một biểu mẫu gửi nhầm loại và
 * học viên trả tiền thật cho thứ đáng lẽ trừ xu, hoặc ngược lại.
 */

/** Nạp xu. Biểu mẫu chỉ mang MÃ MỐC — số tiền do máy chủ quyết định. */
export function TopUpButton({
  tierCode,
  attemptId,
  variant = "primary",
  className = "",
  children,
}: {
  tierCode: TopUpTierCode;
  /** Chỉ dùng để quay về đúng chỗ sau khi nạp; không ghim vào ví. */
  attemptId?: string;
  variant?: "primary" | "outline" | "gold" | "stoicPrimary" | "stoicOutline";
  className?: string;
  children: ReactNode;
}) {
  return (
    <form action={createTopUpOrderAction}>
      <input type="hidden" name="tierCode" value={tierCode} />
      {attemptId && <input type="hidden" name="attemptId" value={attemptId} />}
      <SubmitButton variant={variant} className={className}>
        {children}
      </SubmitButton>
    </form>
  );
}

/**
 * Mua gói bằng xu.
 *
 * `spendToken` là khóa chống trừ hai lần cho gói KHÔNG có khóa tự nhiên (gói
 * nạp lượt AI, vốn mua lại nhiều lần là đúng ý). Máy chủ sinh token lúc dựng
 * trang, nên hai cú bấm trên cùng một trang là một lần trừ, còn tải lại trang
 * thì mua tiếp được. Gói bán theo lượt làm bài không cần token: khóa của nó là
 * chính mã lượt.
 */
export function CoinPurchaseButton({
  offerCode,
  exerciseId,
  attemptId,
  spendToken,
  variant = "gold",
  className = "",
  children,
}: {
  offerCode: OfferCode;
  exerciseId?: string;
  attemptId?: string;
  spendToken?: string;
  variant?: "primary" | "outline" | "gold" | "stoicPrimary" | "stoicOutline";
  className?: string;
  children: ReactNode;
}) {
  return (
    <form action={buyWithCoinsAction}>
      <input type="hidden" name="offerCode" value={offerCode} />
      {exerciseId && <input type="hidden" name="exerciseId" value={exerciseId} />}
      {attemptId && <input type="hidden" name="attemptId" value={attemptId} />}
      {spendToken && <input type="hidden" name="spendToken" value={spendToken} />}
      <SubmitButton variant={variant} className={className}>
        {children}
      </SubmitButton>
    </form>
  );
}
