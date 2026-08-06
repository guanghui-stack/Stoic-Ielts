import Link from "next/link";
import { notFound } from "next/navigation";
import { Shield } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { features } from "@/lib/features";
import { RANK_SEEDS, TRIAL_SEEDS, RANK_ERAS, trialByCode } from "@/lib/ranks/catalog";
import { generalByCode } from "@/lib/story/generals";

export const metadata = { title: "Cấp bậc và thí luyện" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  LOCKED: "Chưa mở",
  ELIGIBLE: "Đã mở",
  ACTIVE: "Đang thí luyện",
  PASSED: "Đã vượt",
};

/**
 * Trang quản trị cấp bậc — CHỈ ĐỌC, theo đúng đặc tả §11.1.
 *
 * Cố ý không có form sửa `ruleConfig`. Ngưỡng của một cửa ải là luật chơi;
 * đổi nó bằng một ô nhập trên production nghĩa là đổi luật giữa chừng cho
 * những người đang đi dở, mà không ai review và không có kiểm thử nào chạy.
 * Muốn đổi ngưỡng thì sửa `src/lib/ranks/catalog.ts`, chạy kiểm thử, mở PR.
 *
 * Cũng không có nút "tăng cấp nhanh". Cấp bậc chỉ đến từ việc vượt cửa ải.
 */
export default async function RankAdminPage() {
  if (!features.ranks) notFound();
  await requireAdmin();

  const [rankCounts, trialRows, graceCount, activeTrials] = await Promise.all([
    db.userRank.groupBy({ by: ["currentLevel"], _count: { _all: true } }),
    db.userTrial.groupBy({
      by: ["trialCode", "status"],
      _count: { _all: true },
    }),
    db.userGraceState.count({ where: { availableCount: { gt: 0 } } }),
    // Hoạt động GẦN NHẤT chứ không chỉ ACTIVE: nếu lọc ACTIVE thì lúc không
    // ai đang thí luyện sẽ không có đường nào tới trang hành trình, mà đó
    // đúng là lúc bộ phận hỗ trợ cần tra "vì sao em chưa lên cấp".
    // Giới hạn 50: trang này để tra cứu nhanh, không phải để duyệt toàn bộ.
    db.userTrial.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        userId: true,
        trialCode: true,
        status: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  const byLevel = new Map(rankCounts.map((r) => [r.currentLevel, r._count._all]));
  const totalStudents = rankCounts.reduce((sum, r) => sum + r._count._all, 0);

  /** trialCode -> { LOCKED, ELIGIBLE, ACTIVE, PASSED } */
  const byTrial = new Map<string, Record<string, number>>();
  for (const row of trialRows) {
    const current = byTrial.get(row.trialCode) ?? {};
    current[row.status] = row._count._all;
    byTrial.set(row.trialCode, current);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <p className="label-caps flex items-center gap-2">
        <Shield className="h-3.5 w-3.5" aria-hidden />
        Quản trị
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep">
        Cấp bậc và thí luyện
      </h1>
      <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        Trang này chỉ đọc. Ngưỡng của mỗi cửa ải là luật chơi — đổi nó bằng một
        ô nhập trên production nghĩa là đổi luật giữa chừng cho người đang đi
        dở, không ai review và không kiểm thử nào chạy. Muốn đổi thì sửa{" "}
        <code className="text-xs">src/lib/ranks/catalog.ts</code> rồi mở PR.
      </p>

      <section aria-label="Phân bố cấp bậc" className="mt-8 border border-line bg-paper p-7">
        <h2 className="font-display text-lg font-bold text-navy-deep">
          Học viên theo cấp bậc
        </h2>
        <p className="mt-1 font-ui text-sm text-muted">
          Tổng {totalStudents} hồ sơ cấp bậc
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 font-ui text-xs uppercase tracking-wide text-muted">Bậc</th>
                <th scope="col" className="py-2 font-ui text-xs uppercase tracking-wide text-muted">Tên</th>
                <th scope="col" className="py-2 font-ui text-xs uppercase tracking-wide text-muted">Thời đại</th>
                <th scope="col" className="py-2 font-ui text-xs uppercase tracking-wide text-muted">Neo năng lực</th>
                <th scope="col" className="py-2 text-right font-ui text-xs uppercase tracking-wide text-muted">Học viên</th>
              </tr>
            </thead>
            <tbody>
              {RANK_SEEDS.map((rank) => (
                <tr key={rank.code} className="border-b border-line last:border-0">
                  <td className="py-2 font-ui text-sm tabular-nums text-ink-soft">{rank.level}</td>
                  <td className="py-2 font-ui text-sm font-medium text-navy-deep">{rank.name}</td>
                  <td className="py-2 font-ui text-sm text-ink-soft">{RANK_ERAS[rank.era].name}</td>
                  <td className="py-2 font-ui text-sm text-muted">{rank.bandAnchor}</td>
                  <td className="py-2 text-right font-ui text-sm tabular-nums text-navy-deep">
                    {byLevel.get(rank.level) ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Tám cửa ải" className="mt-6 border border-line bg-paper p-7">
        <h2 className="font-display text-lg font-bold text-navy-deep">
          Tám cửa ải
        </h2>
        <p className="mt-1 font-ui text-sm text-muted">
          Hoa Dung đạo: {graceCount} học viên còn token
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 font-ui text-xs uppercase tracking-wide text-muted">Cửa</th>
                <th scope="col" className="py-2 font-ui text-xs uppercase tracking-wide text-muted">Tên</th>
                <th scope="col" className="py-2 font-ui text-xs uppercase tracking-wide text-muted">Nhân vật</th>
                <th scope="col" className="py-2 text-right font-ui text-xs uppercase tracking-wide text-muted">Đã mở</th>
                <th scope="col" className="py-2 text-right font-ui text-xs uppercase tracking-wide text-muted">Đang làm</th>
                <th scope="col" className="py-2 text-right font-ui text-xs uppercase tracking-wide text-muted">Đã vượt</th>
              </tr>
            </thead>
            <tbody>
              {TRIAL_SEEDS.map((trial) => {
                const stats = byTrial.get(trial.code) ?? {};
                return (
                  <tr key={trial.code} className="border-b border-line last:border-0">
                    <td className="py-2 font-ui text-sm tabular-nums text-ink-soft">
                      {trial.fromLevel}→{trial.toLevel}
                    </td>
                    <td className="py-2 font-ui text-sm font-medium text-navy-deep">
                      {trial.name}
                      <span className="block text-xs font-normal text-muted">{trial.skill}</span>
                    </td>
                    <td className="py-2 font-ui text-sm text-ink-soft">
                      {generalByCode(trial.featuredGeneralCode).name}
                    </td>
                    <td className="py-2 text-right font-ui text-sm tabular-nums text-ink-soft">
                      {stats.ELIGIBLE ?? 0}
                    </td>
                    <td className="py-2 text-right font-ui text-sm tabular-nums text-azure-ink">
                      {stats.ACTIVE ?? 0}
                    </td>
                    <td className="py-2 text-right font-ui text-sm tabular-nums text-jade-ink">
                      {stats.PASSED ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Đang thí luyện" className="mt-6 border border-line bg-paper p-7">
        <h2 className="font-display text-lg font-bold text-navy-deep">
          Hoạt động cấp bậc gần nhất
        </h2>
        <p className="mt-1 font-ui text-sm text-muted">
          Bấm vào tên để xem hành trình đầy đủ — dùng khi cần trả lời câu hỏi
          &ldquo;vì sao em chưa lên cấp?&rdquo;
        </p>

        {activeTrials.length === 0 ? (
          <p className="mt-4 font-ui text-sm text-muted">
            Chưa có học viên nào bắt đầu hành trình cấp bậc.
          </p>
        ) : (
          <ul className="mt-4 m-0 list-none space-y-2 p-0">
            {activeTrials.map((row) => (
              <li key={`${row.userId}-${row.trialCode}`}>
                <Link
                  href={`/quan-tri/cap-bac/${row.userId}`}
                  className="flex flex-wrap items-center justify-between gap-3 border border-line bg-cream px-4 py-3 transition-colors hover:border-navy"
                >
                  <span className="font-ui text-sm font-medium text-navy-deep">
                    {row.user.name}
                    <span className="ml-2 text-xs font-normal text-muted">
                      {row.user.email}
                    </span>
                  </span>
                  <span className="font-ui text-xs text-ink-soft">
                    {trialByCode(row.trialCode)?.name ?? row.trialCode} ·{" "}
                    {STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 border-l-4 border-gold bg-cream-deep px-6 py-5 text-sm leading-relaxed text-ink-soft">
        Không có nút tăng cấp nhanh, và sẽ không bao giờ có. Cấp bậc chỉ đến từ
        việc vượt cửa ải bằng dữ liệu học thật — đó là toàn bộ thứ khiến nó có
        giá trị với học viên. Trường hợp sự cố kỹ thuật cần can thiệp thì phải
        đi qua migration có ghi nhật ký, không phải một cú bấm trên trang này.
      </p>
    </main>
  );
}
