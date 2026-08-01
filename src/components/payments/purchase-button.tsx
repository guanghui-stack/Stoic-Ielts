import type { ReactNode } from "react";
import { createPaymentOrderAction } from "@/lib/actions/payments";
import type { OfferCode } from "@/lib/payments/catalog";
import { SubmitButton } from "@/components/ui";

/**
 * Nút mua dùng chung. Biểu mẫu chỉ mang MÃ sản phẩm — không bao giờ mang số
 * tiền, vì giá phải do máy chủ quyết định.
 */
export function PurchaseButton({
  offerCode,
  exerciseId,
  attemptId,
  variant = "primary",
  className = "",
  children,
}: {
  offerCode: OfferCode;
  exerciseId?: string;
  attemptId?: string;
  variant?: "primary" | "outline" | "gold";
  className?: string;
  children: ReactNode;
}) {
  return (
    <form action={createPaymentOrderAction}>
      <input type="hidden" name="offerCode" value={offerCode} />
      {exerciseId && <input type="hidden" name="exerciseId" value={exerciseId} />}
      {attemptId && <input type="hidden" name="attemptId" value={attemptId} />}
      <SubmitButton variant={variant} className={className}>
        {children}
      </SubmitButton>
    </form>
  );
}
