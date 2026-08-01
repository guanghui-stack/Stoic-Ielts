import "server-only";
import { SePayPgClient } from "sepay-pg-node";
import { OFFERS, type OfferCode } from "@/lib/payments/catalog";

/**
 * Cầu nối tới cổng thanh toán SePay — CHỈ chạy phía máy chủ.
 *
 * Merchant ID và Secret Key đọc từ biến môi trường trên hPanel, không bao giờ
 * nằm trong mã nguồn (kho GitHub của dự án là kho công khai) và không bao giờ
 * đi xuống trình duyệt. Ký biểu mẫu cũng làm ở đây, nên client chỉ nhận được
 * chữ ký chứ không nhận được khóa tạo ra chữ ký đó.
 */

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Thiếu biến môi trường ${name}. Thêm trong hPanel → Ứng dụng web Node.js → Biến môi trường.`
    );
  }
  return value;
}

export function sePayEnvironment(): "sandbox" | "production" {
  const value = (process.env.SEPAY_ENV ?? "sandbox").trim();
  if (value !== "sandbox" && value !== "production") {
    throw new Error("SEPAY_ENV chỉ nhận giá trị 'sandbox' hoặc 'production'.");
  }
  return value;
}

/** Đã cấu hình đủ để bật tính năng thanh toán chưa (dùng để ẩn/hiện nút mua). */
export function isSePayConfigured(): boolean {
  return Boolean(
    process.env.SEPAY_MERCHANT_ID?.trim() &&
      process.env.SEPAY_SECRET_KEY?.trim() &&
      process.env.APP_URL?.trim()
  );
}

let singleton: SePayPgClient | null = null;

export function getSePayClient(): SePayPgClient {
  if (!singleton) {
    singleton = new SePayPgClient({
      env: sePayEnvironment(),
      merchant_id: requiredEnv("SEPAY_MERCHANT_ID"),
      secret_key: requiredEnv("SEPAY_SECRET_KEY"),
    });
  }
  return singleton;
}

/** Địa chỉ gốc của website, bỏ dấu "/" thừa ở cuối. */
export function appUrl(): string {
  return requiredEnv("APP_URL").replace(/\/+$/, "");
}

export type CheckoutForm = {
  checkoutUrl: string;
  fields: Record<string, string | number>;
};

/**
 * Dựng biểu mẫu đã ký để trình duyệt POST thẳng sang trang thanh toán SePay.
 *
 * BANK_TRANSFER đưa học viên vào ngay màn hình QR/chuyển khoản — bớt được một
 * bước chọn phương thức, vốn là chỗ nhiều người bỏ dở nhất.
 */
export function buildSePayCheckout(order: {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  offerCode: string;
  userId: string;
}): CheckoutForm {
  const client = getSePayClient();
  const base = appUrl();
  const resultPath = `${base}/thanh-toan/${encodeURIComponent(
    order.invoiceNumber
  )}/ket-qua`;

  const label =
    order.offerCode in OFFERS
      ? OFFERS[order.offerCode as OfferCode].label
      : order.offerCode;

  const fields = client.checkout.initOneTimePaymentFields({
    operation: "PURCHASE",
    payment_method: "BANK_TRANSFER",
    order_invoice_number: order.invoiceNumber,
    order_amount: order.amount,
    currency: order.currency,
    order_description: `Wobridges - ${label}`,
    customer_id: order.userId,
    // Ba đường quay về này CHỈ để hiển thị giao diện. Việc mở quyền hoàn toàn
    // dựa vào IPN máy chủ-tới-máy chủ, nên tự mở success_url không ăn thua.
    success_url: `${resultPath}?return=success`,
    error_url: `${resultPath}?return=error`,
    cancel_url: `${resultPath}?return=cancel`,
    custom_data: JSON.stringify({ localOrderId: order.id, v: 1 }),
  });

  return { checkoutUrl: client.checkout.initCheckoutUrl(), fields };
}
