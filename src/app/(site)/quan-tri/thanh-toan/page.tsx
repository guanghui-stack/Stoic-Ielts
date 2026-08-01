import Link from "next/link";
import { CircleSlash } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatVnd, OFFERS, isOfferCode } from "@/lib/payments/catalog";
import { isSePayConfigured, sePayEnvironment } from "@/lib/payments/sepay";
import { closePendingOrderAction } from "@/lib/actions/admin-payments";
import {
  ReconcileButton,
  RefundButton,
} from "@/components/admin/payment-order-actions";

export const metadata = { title: "Đơn hàng và thanh toán" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "tat-ca", label: "Tất cả", status: null },
  { key: "cho", label: "Đang chờ", status: "PENDING" },
  { key: "da-tra", label: "Đã thanh toán", status: "PAID" },
  { key: "doi-soat", label: "Cần đối soát", status: "REQUIRES_REVIEW" },
  { key: "huy", label: "Đã hủy", status: "CANCELLED" },
  { key: "hoan", label: "Đã hoàn tiền", status: "REFUNDED" },
] as const;

const STATUS_STYLE: Record<string, string> = {
  PENDING: "border-line-strong bg-cream-deep text-ink-soft",
  PAID: "border-success bg-success-pale text-success",
  REQUIRES_REVIEW: "border-gold bg-gold-pale text-ink",
  CANCELLED: "border-line-strong bg-cream-deep text-muted",
  FAILED: "border-danger bg-danger-pale text-danger",
  EXPIRED: "border-line-strong bg-cream-deep text-muted",
  VOIDED: "border-danger bg-danger-pale text-danger",
  REFUNDED: "border-danger bg-danger-pale text-danger",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Đang chờ",
  PAID: "Đã thanh toán",
  REQUIRES_REVIEW: "Cần đối soát",
  CANCELLED: "Đã hủy",
  FAILED: "Thất bại",
  EXPIRED: "Quá hạn",
  VOIDED: "Bị hủy giao dịch",
  REFUNDED: "Đã hoàn tiền",
};

function fmt(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  await requireAdmin();
  const { loc } = await searchParams;
  const active = FILTERS.find((f) => f.key === loc) ?? FILTERS[0];

  const [orders, totals, needReview] = await Promise.all([
    db.paymentOrder.findMany({
      where: active.status ? { status: active.status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { name: true, email: true } },
        exercise: { select: { title: true } },
        grants: { select: { id: true, status: true, expiresAt: true } },
      },
    }),
    db.paymentOrder.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.paymentOrder.count({ where: { status: "REQUIRES_REVIEW" } }),
  ]);

  const configured = isSePayConfigured();

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <p className="label-caps">Doanh thu</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep md:text-4xl">
        Đơn hàng và thanh toán
      </h1>
      <div className="rule-gold mt-5" />
      <p className="mt-5 max-w-3xl text-[0.95rem] leading-relaxed text-ink-soft">
        Quyền học chỉ được mở khi máy chủ SePay xác nhận đã nhận tiền. Nếu học
        viên báo đã chuyển khoản mà đơn vẫn ở trạng thái{" "}
        <strong>Đang chờ</strong>, hãy bấm <strong>Đối soát</strong> để hỏi lại
        SePay — đừng tự đánh dấu đã trả tiền.
      </p>

      {!configured && (
        <p className="mt-6 border-l-4 border-gold bg-cream-deep px-5 py-4 font-ui text-sm leading-relaxed text-ink-soft">
          Cổng thanh toán <strong>chưa được bật</strong>. Nút mua đang ẩn với
          học viên. Thêm các biến <code>APP_URL</code>,{" "}
          <code>SEPAY_MERCHANT_ID</code>, <code>SEPAY_SECRET_KEY</code> trong
          hPanel rồi triển khai lại.
        </p>
      )}

      <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-3">
        <div className="bg-paper p-6 text-center">
          <p className="label-caps">Đã thu</p>
          <p className="mt-2.5 font-display text-3xl font-bold text-navy-deep">
            {formatVnd(totals._sum.amount ?? 0)}
          </p>
        </div>
        <div className="bg-paper p-6 text-center">
          <p className="label-caps">Đơn thành công</p>
          <p className="mt-2.5 font-display text-3xl font-bold text-navy-deep tabular-nums">
            {totals._count._all}
          </p>
        </div>
        <div className="bg-paper p-6 text-center">
          <p className="label-caps">Cần đối soát</p>
          <p
            className={`mt-2.5 font-display text-3xl font-bold tabular-nums ${
              needReview > 0 ? "text-danger" : "text-navy-deep"
            }`}
          >
            {needReview}
          </p>
        </div>
      </div>

      <p className="mt-6 font-ui text-xs text-muted">
        Môi trường cổng thanh toán:{" "}
        <strong className="uppercase">{configured ? sePayEnvironment() : "chưa bật"}</strong>
        {configured && sePayEnvironment() === "sandbox" && (
          <> — đang ở chế độ thử nghiệm, tiền không có thật.</>
        )}
      </p>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Lọc đơn hàng">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/quan-tri/thanh-toan?loc=${f.key}`}
            className={`border px-4 py-1.5 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.06em] transition-colors ${
              f.key === active.key
                ? "border-navy bg-navy text-paper"
                : "border-line-strong text-ink-soft hover:border-navy hover:text-navy"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="mt-10 border border-line bg-paper p-8 text-center text-ink-soft">
          Chưa có đơn hàng nào ở mục này.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[1000px] border border-line font-ui text-sm">
            <thead>
              <tr className="bg-navy text-paper">
                <th className="px-4 py-3 text-left font-semibold">Mã đơn</th>
                <th className="px-4 py-3 text-left font-semibold">Học viên</th>
                <th className="px-4 py-3 text-left font-semibold">Sản phẩm</th>
                <th className="px-4 py-3 text-right font-semibold">Số tiền</th>
                <th className="px-4 py-3 text-center font-semibold">Trạng thái</th>
                <th className="px-4 py-3 text-center font-semibold">Quyền</th>
                <th className="px-4 py-3 text-center font-semibold">Thời gian</th>
                <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => {
                const label = isOfferCode(o.offerCode)
                  ? OFFERS[o.offerCode].label
                  : o.offerCode;
                const liveGrant = o.grants.find((g) => g.status === "ACTIVE");
                return (
                  <tr key={o.id} className="bg-paper align-top">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs tabular-nums text-ink">
                        {o.invoiceNumber}
                      </span>
                      {o.priceRule === "FIRST_FEYNMAN_9K" && (
                        <span className="mt-1 block font-ui text-[0.68rem] text-gold">
                          ưu đãi lần đầu
                        </span>
                      )}
                      {o.lastError && (
                        <span className="mt-1 block max-w-[14rem] font-ui text-[0.68rem] leading-snug text-danger">
                          {o.lastError}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-ink">{o.user.name}</span>
                      <span className="block text-xs text-muted">{o.user.email}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {label}
                      {o.exercise && (
                        <span className="mt-1 block max-w-[16rem] text-xs text-muted">
                          {o.exercise.title}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">
                      {formatVnd(o.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block border px-2.5 py-0.5 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.06em] ${
                          STATUS_STYLE[o.status] ?? "border-line-strong text-ink-soft"
                        }`}
                      >
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-ink-soft">
                      {liveGrant ? (
                        <>
                          <span className="text-success">Đang mở</span>
                          <span className="mt-0.5 block text-muted">
                            {liveGrant.expiresAt
                              ? `tới ${liveGrant.expiresAt.toLocaleDateString("vi-VN")}`
                              : "vĩnh viễn"}
                          </span>
                        </>
                      ) : o.grants.length > 0 ? (
                        <span className="text-danger">Đã thu hồi</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs tabular-nums text-muted">
                      <span className="block">Tạo: {fmt(o.createdAt)}</span>
                      {o.paidAt && <span className="block">Trả: {fmt(o.paidAt)}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-2">
                        {(o.status === "PENDING" || o.status === "REQUIRES_REVIEW") && (
                          <>
                            <ReconcileButton invoiceNumber={o.invoiceNumber} />
                            <form action={closePendingOrderAction.bind(null, o.invoiceNumber)}>
                              <button
                                type="submit"
                                title="Đóng đơn mà KHÔNG cấp quyền"
                                className="inline-flex cursor-pointer items-center gap-1.5 border border-line-strong px-3 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-ink-soft transition-colors hover:border-danger hover:text-danger"
                              >
                                <CircleSlash className="h-3.5 w-3.5" aria-hidden="true" />
                                Đóng đơn
                              </button>
                            </form>
                          </>
                        )}
                        {o.status === "PAID" && (
                          <RefundButton
                            invoiceNumber={o.invoiceNumber}
                            amountLabel={formatVnd(o.amount)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-8 border-l-4 border-gold bg-cream-deep px-5 py-4 font-ui text-sm leading-relaxed text-ink-soft">
        <strong className="text-ink">Không có nút “đánh dấu đã trả tiền”. </strong>
        Đó là cố ý. Nếu cần tặng quyền cho học viên (học phí đóng tại lớp, đền
        bù sự cố), hãy dùng nút mở khóa ở trang <strong>Học viên</strong> — quyền
        đó ghi nhãn riêng nên sổ sách doanh thu không bị sai.
      </p>
    </section>
  );
}
