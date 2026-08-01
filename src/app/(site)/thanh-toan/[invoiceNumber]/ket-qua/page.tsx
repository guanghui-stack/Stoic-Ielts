import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatVnd, OFFERS, isOfferCode } from "@/lib/payments/catalog";
import { PaymentStatusPoller } from "@/components/payments/payment-status-poller";

export const metadata = { title: "Kết quả thanh toán" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fmt(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default async function PaymentResultPage({
  params,
}: {
  params: Promise<{ invoiceNumber: string }>;
}) {
  const { invoiceNumber } = await params;
  const user = await requireUser();

  const order = await db.paymentOrder.findUnique({
    where: { invoiceNumber },
    select: {
      userId: true,
      invoiceNumber: true,
      offerCode: true,
      amount: true,
      status: true,
      returnPath: true,
      createdAt: true,
      paidAt: true,
    },
  });
  if (!order || (order.userId !== user.id && user.role !== "ADMIN")) {
    redirect("/thanh-toan");
  }

  const label = isOfferCode(order.offerCode)
    ? OFFERS[order.offerCode].label
    : order.offerCode;

  return (
    <section className="mx-auto max-w-2xl px-6 py-12 md:py-16">
      <p className="label-caps">Đơn hàng</p>
      <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-navy-deep md:text-4xl">
        {label}
      </h1>
      <div className="rule-gold mt-5" />

      {/*
        Mã đơn luôn hiển thị, kể cả khi mọi thứ suôn sẻ: khi có trục trặc thật
        thì đây là thứ duy nhất giúp trung tâm tra được giao dịch với SePay.
      */}
      <dl className="mt-6 grid gap-x-10 gap-y-3 font-ui text-sm text-ink-soft sm:grid-cols-2">
        <div>
          <dt className="inline font-semibold text-ink">Mã đơn: </dt>
          <dd className="inline tabular-nums">{order.invoiceNumber}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">Số tiền: </dt>
          <dd className="inline tabular-nums">{formatVnd(order.amount)}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">Tạo lúc: </dt>
          <dd className="inline tabular-nums">{fmt(order.createdAt)}</dd>
        </div>
        {order.paidAt && (
          <div>
            <dt className="inline font-semibold text-ink">Thanh toán lúc: </dt>
            <dd className="inline tabular-nums">{fmt(order.paidAt)}</dd>
          </div>
        )}
      </dl>

      <PaymentStatusPoller
        invoiceNumber={order.invoiceNumber}
        initialStatus={order.status}
        initialReturnPath={order.status === "PAID" ? order.returnPath : null}
      />
    </section>
  );
}
