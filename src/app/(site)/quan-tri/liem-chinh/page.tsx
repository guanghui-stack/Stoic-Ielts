import { requireAdmin } from "@/lib/session";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { IntegrityCaseCard } from "@/components/arena/integrity-case-card";
import { HeldTitleRow } from "@/components/arena/held-title-row";
import { listIntegrityCases } from "@/lib/arena/integrity-service";
import { listHeldArenaTitles } from "@/lib/arena/title-service";
import { INTEGRITY_RULE_VERSION } from "@/lib/arena/integrity.ts";

export const metadata = { title: "Liêm chính đấu trường" };

/**
 * Hàng chờ xét duyệt liêm chính.
 *
 * Trang này tồn tại vì một câu trong đặc tả: máy xếp thứ tự, NGƯỜI kết luận.
 * Không có màn hình này thì phần liêm chính của đấu trường chỉ là mấy hàm chạy
 * trong bóng tối và không ai đọc kết quả.
 *
 * Xếp theo mức nghi vấn chứ không theo thời gian: người xét duyệt có hạn thời
 * gian, và đọc theo thứ tự thời gian nghĩa là hồ sơ nặng nhất nằm cuối hàng.
 */
export default async function AdminIntegrityPage() {
  await requireAdmin();

  const [open, recent, held] = await Promise.all([
    listIntegrityCases({ status: "OPEN", take: 40 }),
    listIntegrityCases({ take: 20 }),
    listHeldArenaTitles(60),
  ]);

  const resolved = recent.filter((c) => c.status !== "OPEN").slice(0, 10);

  return (
    <AdminPageShell
      eyebrow="Đấu trường"
      title="Liêm chính và danh hiệu chất vấn"
      lede="Máy chỉ xếp thứ tự hồ sơ. Nó không kết luận ai gian lận, không khoá ai, và không tự gắn hai danh hiệu nặng nhất. Việc đó cần một con người bấm nút, và tên người đó được ghi lại."
    >
      <section className="grid gap-px border border-line bg-line sm:grid-cols-3">
        <div className="bg-paper p-6">
          <p className="label-caps">Đang chờ xét</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-navy-deep">
            {open.length}
          </p>
        </div>
        <div className="bg-paper p-6">
          <p className="label-caps">Danh hiệu đang mang</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-navy-deep">
            {held.length}
          </p>
        </div>
        <div className="bg-paper p-6">
          <p className="label-caps">Phiên bản chính sách</p>
          <p className="mt-2 font-ui text-[0.95rem] font-semibold text-ink">
            {INTEGRITY_RULE_VERSION}
          </p>
          <p className="mt-1 font-ui text-xs text-ink-soft">
            Hồ sơ được xét theo luật lúc mở, không phải luật hôm nay
          </p>
        </div>
      </section>

      <h2 className="mt-10 font-display text-xl font-bold text-navy-deep">
        Hàng chờ
      </h2>
      {open.length === 0 ? (
        <p className="mt-3 border border-line bg-paper p-6 text-[0.95rem] text-ink-soft">
          Không có hồ sơ nào đang chờ. Đây là trạng thái bình thường: hầu hết
          trận đấu không sinh ra tín hiệu nào.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {open.map((item) => (
            <IntegrityCaseCard
              key={item.id}
              item={{
                id: item.id,
                createdAt: item.createdAt.toLocaleString("vi-VN"),
                priority: item.priority,
                duelId: item.duelId,
                signals: item.signals.map((s) => ({
                  code: s.code,
                  strength: s.strength,
                  detail: s.detail,
                })),
                subject: item.subject,
                peer: item.peer,
              }}
            />
          ))}
        </div>
      )}

      <h2 className="mt-10 font-display text-xl font-bold text-navy-deep">
        Danh hiệu đang mang
      </h2>
      <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink-soft">
        Năm danh hiệu máy gắn sẽ tự rời đi khi điều kiện hết đúng. Nút gỡ ở đây
        dành cho hai danh hiệu người xử, và cho những lần máy sai mà học viên
        khiếu nại đúng.
      </p>
      {held.length === 0 ? (
        <p className="mt-3 border border-line bg-paper p-6 text-[0.95rem] text-ink-soft">
          Chưa ai mang danh hiệu chất vấn nào.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {held.map((row) => (
            <HeldTitleRow
              key={`${row.user.id}-${row.title.code}`}
              item={{
                userId: row.user.id,
                userLabel: row.user.name ?? row.user.email,
                code: row.title.code,
                titleName: row.title.name,
                category: row.title.category,
                earnedAt: row.earnedAt.toLocaleDateString("vi-VN"),
              }}
            />
          ))}
        </div>
      )}

      <h2 className="mt-10 font-display text-xl font-bold text-navy-deep">
        Hồ sơ đã đóng gần đây
      </h2>
      {resolved.length === 0 ? (
        <p className="mt-3 border border-line bg-paper p-6 text-[0.95rem] text-ink-soft">
          Chưa có hồ sơ nào được đóng.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {resolved.map((item) => (
            <li key={item.id} className="border border-line bg-paper px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="font-ui text-[0.92rem] font-semibold text-ink">
                  {item.subject.name ?? item.subject.email}
                </span>
                {/* Chữ chứ không chỉ màu. */}
                <span className="border border-line-strong px-2 py-0.5 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-ink-soft">
                  {item.status === "CLEARED" ? "Không có gì" : "Có vi phạm"}
                </span>
              </div>
              <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-soft">
                {item.resolveNote}
              </p>
              <p className="mt-1 font-ui text-xs text-muted">
                {item.resolvedBy
                  ? `${item.resolvedBy.name ?? item.resolvedBy.email} đóng`
                  : "Đã đóng"}
                {item.resolvedAt
                  ? ` lúc ${item.resolvedAt.toLocaleString("vi-VN")}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AdminPageShell>
  );
}
