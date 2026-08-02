import Link from "next/link";
import { Award, Users } from "lucide-react";
import { db } from "@/lib/db";
import {
  CATEGORY_LABELS,
  RARITY_LABELS,
  quoteAttribution,
  type Rarity,
  type TitleCategory,
} from "@/lib/achievements/catalog";
import { PageHero, NoteBox } from "@/components/ui";

export const metadata = {
  title: "Điện Danh Vọng",
  description:
    "Bảng vinh danh học viên STOIC-IELTS — danh hiệu, độ hiếm và số người đã đạt.",
};
export const dynamic = "force-dynamic";

export default async function HallOfFamePage() {
  const [definitions, awards, profiles, eligibleCount] = await Promise.all([
    // Danh hiệu RIÊNG TƯ không bao giờ lọt ra trang công khai
    db.titleDefinition.findMany({
      where: { active: true, visibility: "PUBLIC" },
      orderBy: { sortOrder: "asc" },
    }),
    db.userTitle.findMany({
      where: { status: "EARNED", title: { visibility: "PUBLIC" } },
      select: { titleId: true, userId: true, earnedAt: true },
      orderBy: { earnedAt: "desc" },
    }),
    db.publicProfile.findMany({
      where: { allowHall: true },
      select: { userId: true, displayName: true },
    }),
    // Mẫu số là học viên đã thật sự làm bài, không phải mọi tài khoản đăng ký
    db.user.count({
      where: { role: "STUDENT", active: true, attempts: { some: { status: "GRADED" } } },
    }),
  ]);

  const nameOf = new Map(profiles.map((p) => [p.userId, p.displayName]));
  const countOf = new Map<string, number>();
  for (const award of awards) {
    countOf.set(award.titleId, (countOf.get(award.titleId) ?? 0) + 1);
  }

  const recent = awards
    .filter((a) => nameOf.has(a.userId))
    .slice(0, 12);

  return (
    <>
      <PageHero
        label="Vinh danh"
        title="Điện Danh Vọng"
        lede="Nơi ghi lại những cột mốc học viên STOIC-IELTS đã vượt qua. Danh hiệu không mua được — chỉ có làm bài đàng hoàng, sửa sai có chiều sâu và giữ được kỷ luật."
      />

      <section className="mx-auto max-w-5xl px-6 py-14">
        {recent.length > 0 && (
          <div className="mb-12">
            <h2 className="font-display text-2xl font-bold text-navy-deep">
              Vừa đạt được
            </h2>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {recent.map((award, i) => {
                const def = definitions.find((d) => d.id === award.titleId);
                if (!def) return null;
                return (
                  <li
                    key={`${award.userId}-${award.titleId}-${i}`}
                    className="border border-line bg-paper px-4 py-2.5 font-ui text-sm"
                  >
                    <span className="font-semibold text-navy">
                      {nameOf.get(award.userId)}
                    </span>
                    <span className="text-muted"> · </span>
                    <span className="text-ink-soft">{def.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <h2 className="font-display text-2xl font-bold text-navy-deep">
          Danh mục danh hiệu
        </h2>
        <p className="mt-2 flex items-center gap-2 font-ui text-sm text-muted">
          <Users className="h-4 w-4" aria-hidden="true" />
          Tỷ lệ tính trên {eligibleCount} học viên đã hoàn thành ít nhất một bài
        </p>

        <div className="mt-6 space-y-3">
          {definitions.map((def) => {
            const count = countOf.get(def.id) ?? 0;
            const percent =
              eligibleCount > 0 ? Math.round((count / eligibleCount) * 100) : 0;
            const attribution = quoteAttribution({
              quoteKind: def.quoteKind as "EXACT" | "ADAPTED" | "ORIGINAL",
              quoteSource: def.quoteSource,
            });
            return (
              <article
                key={def.id}
                className="flex flex-wrap items-start justify-between gap-4 border border-line bg-paper p-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Award className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                    <span className="font-display text-lg font-bold text-navy-deep">
                      {def.name}
                    </span>
                    <span className="border border-line-strong px-2 py-0.5 font-ui text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted">
                      {RARITY_LABELS[def.rarity as Rarity] ?? def.rarity}
                    </span>
                    <span className="font-ui text-[0.65rem] uppercase tracking-[0.06em] text-muted">
                      {CATEGORY_LABELS[def.category as TitleCategory] ?? def.category}
                    </span>
                  </p>
                  {attribution && (
                    <p className="mt-1.5 font-ui text-xs italic text-muted">{attribution}</p>
                  )}
                  <p className="mt-2.5 text-[0.93rem] leading-relaxed text-ink-soft">
                    {def.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-3xl font-bold text-navy-deep tabular-nums">
                    {count}
                  </p>
                  <p className="font-ui text-xs text-muted">
                    {percent}% học viên
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <NoteBox className="mt-10" title="Về quyền riêng tư">
          Tên chỉ xuất hiện ở trang này khi học viên tự bật trong mục{" "}
          <Link
            href="/hoc-vien/danh-hieu"
            className="font-semibold text-navy underline underline-offset-4"
          >
            Danh hiệu của tôi
          </Link>
          . Người không bật vẫn được tính vào tổng số, nhưng ẩn danh hoàn toàn.
          Email, điểm số chi tiết và lịch sử học tập không bao giờ hiển thị công khai.
        </NoteBox>
      </section>
    </>
  );
}
