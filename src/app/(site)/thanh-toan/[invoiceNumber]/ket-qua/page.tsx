import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatVnd } from "@/lib/payments/catalog";
import { orderCodeLabel } from "@/lib/payments/coins";
import { PaymentStatusPoller } from "@/components/payments/payment-status-poller";
import { QuietWorldPanel } from "@/components/world/quiet-world-panel";

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

  // Đơn nạp ví mang mã mốc nạp chứ không phải mã gói, nên phải tra bằng
  // `orderCodeLabel` — tra thẳng `OFFERS` sẽ in ra mã thô cho học viên đọc.
  const label = orderCodeLabel(order.offerCode);

  return (
    <QuietWorldPanel eyebrow="Đơn hàng" title={label}>
      {/*
        Mã đơn luôn hiển thị, kể cả khi mọi thứ suôn sẻ: khi có trục trặc thật
        thì đây là thứ duy nhất giúp trung tâm tra được giao dịch với SePay.
      */}
      <dl className="grid gap-x-10 gap-y-3 font-ui text-sm text-ink-soft sm:grid-cols-2">
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
    </QuietWorldPanel>
  );
}
