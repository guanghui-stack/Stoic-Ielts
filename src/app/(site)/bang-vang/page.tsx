import Link from "next/link";
import { Crown, Medal, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { honorBoard } from "@/lib/competition/service";
import { formatVnd } from "@/lib/payments/catalog";
import { PageHero, NoteBox } from "@/components/ui";
import { features } from "@/lib/features";

export const metadata = {
  title: "Bảng Vàng Nguyệt Thí",
  description:
    "Kết quả các kỳ Nguyệt Thí của HỔ PHÙ · IELTS — công bố sau khi đã rà soát.",
};
export const dynamic = "force-dynamic";

const RANK_ICON = [Crown, Trophy, Medal];

/**
 * Ba tab tương ứng ba tầng. Trạng thái nằm ở URL chứ không ở React state:
 * trang vẫn render hoàn toàn ở máy chủ, và người học chia sẻ được đường dẫn
 * tới đúng tầng mình muốn khoe.
 */
const TABS = [
  { key: "nguyet", tier: "MONTHLY", label: "Nguyệt Thí" },
  { key: "duong", tier: "QUARTERLY", label: "Dương Thí" },
  { key: "thien", tier: "ANNUAL", label: "Thiên Thí" },
] as const;

export default async function HonorBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ tang?: string }>;
}) {
  const { tang } = await searchParams;
  const showTabs = features.competitionTiers;
  const active = TABS.find((t) => t.key === tang) ?? TABS[0];

  // Chỉ hiện kỳ ĐÃ CHỐT. Kỳ đang chạy không bao giờ lộ kết quả — đó là toàn bộ
  // lý do không có bảng xếp hạng trực tiếp.
  const competitions = await db.competition.findMany({
    where: {
      status: "FINALIZED",
      // Cờ tắt thì giữ nguyên hành vi cũ: chỉ Nguyệt Thí, không lọc theo tier
      // để không giấu mất kỳ cũ chưa có cột tier.
      ...(showTabs ? { tier: active.tier } : {}),
    },
    orderBy: { finalizedAt: "desc" },
    take: 12,
  });

  const boards = await Promise.all(
    competitions.map(async (c) => ({
      competition: c,
      rows: await honorBoard(c.id),
    }))
  );

  return (
    <>
      <PageHero
        label="Nguyệt Thí"
        title="Bảng Vàng"
        lede="Kết quả các kỳ thi đã khép lại và đã được rà soát. Không có bảng xếp hạng trực tiếp trong lúc thi — thứ hạng chỉ có ý nghĩa khi đã được kiểm chứng."
      />

      <section className="mx-auto max-w-4xl px-6 py-14">
        {showTabs && (
          <nav aria-label="Ba tầng đại thí" className="mb-10 border-b border-line">
            <ul className="m-0 flex list-none flex-wrap gap-6 p-0 pb-3">
              {TABS.map((tab) => {
                const isActive = tab.key === active.key;
                return (
                  <li key={tab.key}>
                    <Link
                      href={`/bang-vang?tang=${tab.key}`}
                      aria-current={isActive ? "page" : undefined}
                      className={`block border-b-2 pb-1 font-ui text-sm font-medium transition-colors ${
                        isActive
                          ? "border-gold text-navy-deep"
                          : "border-transparent text-ink-soft hover:text-navy"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {boards.length === 0 ? (
          <NoteBox title="Chưa có kỳ thi nào khép lại">
            Nguyệt Thí đầu tiên đang được chuẩn bị. Điều kiện dự thi là danh hiệu{" "}
            <em>Nhận thức — Hành động — Ý chí</em>, đạt được qua ba trụ: giải đề,
            sửa đề và kỷ luật.
          </NoteBox>
        ) : (
          boards.map(({ competition, rows }) => (
            <article key={competition.id} className="mb-14">
              <h2 className="font-display text-2xl font-bold text-navy-deep">
                {competition.name}
              </h2>
              <p className="mt-1.5 font-ui text-sm text-muted">
                Chốt ngày{" "}
                {competition.finalizedAt?.toLocaleDateString("vi-VN") ?? "—"}
              </p>

              {rows.length === 0 ? (
                <p className="mt-5 border border-line bg-paper p-6 text-center text-ink-soft">
                  Kỳ này không có thí sinh nào đạt chuẩn lên Bảng Vàng.
                </p>
              ) : (
                <ol className="mt-5 divide-y divide-line border-y border-line">
                  {rows.map((row) => {
                    const Icon = RANK_ICON[row.rank - 1];
                    return (
                      <li
                        key={`${competition.id}-${row.rank}`}
                        className="flex flex-wrap items-center gap-4 py-4"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-line-strong font-ui text-sm font-bold tabular-nums text-navy">
                          {Icon ? (
                            <Icon className="h-4 w-4 text-gold" aria-hidden="true" />
                          ) : (
                            row.rank
                          )}
                        </span>
                        <span className="min-w-0 flex-1 font-semibold text-ink">
                          {row.displayName}
                        </span>
                        <span className="font-ui text-sm tabular-nums text-ink-soft">
                          Band {row.averageBand?.toFixed(1) ?? "—"}
                          <span className="text-muted">
                            {" "}
                            · thấp nhất {row.lowestBand?.toFixed(1) ?? "—"}
                          </span>
                        </span>
                        {row.prizeAmount && (
                          <span className="border border-gold bg-gold-pale px-2.5 py-0.5 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-gold">
                            {formatVnd(row.prizeAmount)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </article>
          ))
        )}

        <NoteBox title="Về cách xếp hạng">
          Thí sinh phải đạt từ band 7.5 ở <strong>cả ba đề</strong> mới lên Bảng
          Vàng. Khi hai người bằng điểm trung bình, người có band thấp nhất cao
          hơn được xếp trên — hệ thống thưởng sự đều tay, không thưởng một bài
          xuất sắc kèm hai bài lẹt đẹt. Không ai đạt chuẩn của một giải thì giải
          đó để trống, không hạ chuẩn.
        </NoteBox>
      </section>
    </>
  );
}
