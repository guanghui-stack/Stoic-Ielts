import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { buildSePayCheckout } from "@/lib/payments/sepay";
import { expireOrderIfStale } from "@/lib/payments/fulfillment";
import { formatVnd } from "@/lib/payments/catalog";
import { AutoSubmitSePayForm } from "@/components/payments/auto-submit-sepay-form";

export const metadata = { title: "Đang chuyển đến cổng thanh toán" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Trang trung gian: ký biểu mẫu ở máy chủ rồi để trình duyệt POST sang SePay.
 * Không dùng lại được cho đơn đã trả tiền hay đã hủy — tránh cảnh học viên
 * quay lại bằng nút Back rồi trả tiền lần hai cho cùng một đơn.
 */
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ invoiceNumber: string }>;
}) {
  const { invoiceNumber } = await params;
  const user = await requireUser();

  const order = await db.paymentOrder.findUnique({ where: { invoiceNumber } });
  if (!order || order.userId !== user.id) redirect("/thanh-toan");
  if (order.status !== "PENDING") {
    redirect(`/thanh-toan/${order.invoiceNumber}/ket-qua`);
  }
  if (await expireOrderIfStale(order)) {
    redirect(`/thanh-toan/${order.invoiceNumber}/ket-qua`);
  }

  const checkout = buildSePayCheckout(order);

  return (
    <section className="mx-auto max-w-xl px-6 py-20 text-center">
      <p className="label-caps">Thanh toán an toàn</p>
      <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-navy-deep">
        Đang chuyển đến cổng thanh toán…
      </h1>
      <div className="rule-gold mx-auto mt-5" />

      <dl className="mt-8 space-y-2 font-ui text-sm text-ink-soft">
        <div>
          <dt className="inline font-semibold text-ink">Mã đơn: </dt>
          <dd className="inline tabular-nums">{order.invoiceNumber}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">Số tiền: </dt>
          <dd className="inline tabular-nums">{formatVnd(order.amount)}</dd>
        </div>
      </dl>

      <AutoSubmitSePayForm {...checkout} />

      <p className="mt-8 flex items-start justify-center gap-2 font-ui text-xs leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          STOIC-IELTS không nhìn thấy và không lưu thông tin ngân hàng của bạn.
          Việc thanh toán diễn ra trên hệ thống của SePay.
        </span>
      </p>
    </section>
  );
}
