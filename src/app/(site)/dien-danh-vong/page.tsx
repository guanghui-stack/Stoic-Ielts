import Link from "next/link";
import { Award, ChevronDown, Info, Users } from "lucide-react";
import { db } from "@/lib/db";
import {
  CATEGORY_LABELS,
  quoteAttribution,
  type TitleCategory,
} from "@/lib/achievements/catalog";
import {
  CATEGORY_BLURBS,
  categoryAnchor,
  explainTitleRule,
  groupByCategory,
  rarityLabel,
} from "@/lib/achievements/explain";
import { CatalogToc } from "@/components/achievements/catalog-toc";
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

  // Gom theo nhóm, mỗi nhóm xếp từ dễ đến khó (xem `explain.ts`)
  const groups = groupByCategory(definitions);
  // Danh hiệu trụ cột được nhắc tới bằng MÃ trong ruleConfig — đổi sang tên thật
  const nameOfCode = new Map(definitions.map((d) => [d.code, d.name]));

  const tocItems = groups.map(({ category, items }) => ({
    anchor: categoryAnchor(category),
    label: CATEGORY_LABELS[category as TitleCategory] ?? category,
    count: items.length,
    blurb: CATEGORY_BLURBS[category] ?? "",
  }));

  return (
    <>
      <PageHero
        label="Vinh danh"
        title="Điện Danh Vọng"
        lede="Nơi ghi lại những cột mốc học viên STOIC-IELTS đã vượt qua. Danh hiệu không mua được — chỉ có làm bài đàng hoàng, sửa sai có chiều sâu và giữ được kỷ luật."
      />

      <section className="mx-auto max-w-6xl px-6 py-14">
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

        <p className="mt-1 font-ui text-sm text-muted">
          Mỗi nhóm xếp từ dễ đến khó. Bấm vào tên danh hiệu để xem điều kiện chi tiết.
        </p>

        <div className="mt-8 grid gap-x-12 gap-y-6 lg:grid-cols-[190px_minmax(0,1fr)]">
          <CatalogToc items={tocItems} />

          <div className="space-y-14">
          {groups.map(({ category, items }, groupIndex) => (
            <section key={category} id={categoryAnchor(category)} className="scroll-mt-24">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-2 border-navy-deep pb-2.5">
                <span className="font-display text-2xl font-bold tabular-nums text-gold">
                  {String(groupIndex + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-xl font-bold text-navy-deep">
                  {CATEGORY_LABELS[category as TitleCategory] ?? category}
                </h3>
                <span className="font-ui text-xs text-muted">
                  {items.length} danh hiệu
                </span>
              </div>
              <p className="mt-3 max-w-2xl text-[0.93rem] leading-relaxed text-ink-soft">
                {CATEGORY_BLURBS[category] ?? ""}
              </p>

              <div className="mt-5 space-y-2.5">
                {items.map((def, index) => {
                  const count = countOf.get(def.id) ?? 0;
                  const percent =
                    eligibleCount > 0
                      ? Math.round((count / eligibleCount) * 100)
                      : 0;
                  const attribution = quoteAttribution({
                    quoteKind: def.quoteKind as "EXACT" | "ADAPTED" | "ORIGINAL",
                    quoteSource: def.quoteSource,
                  });

                  // ruleConfigJson do chính hệ thống ghi ra, nhưng vẫn bọc try
                  // để một bản ghi hỏng không làm sập cả trang công khai
                  let ruleConfig: Record<string, unknown> = {};
                  try {
                    ruleConfig = JSON.parse(def.ruleConfigJson ?? "{}");
                  } catch {
                    ruleConfig = {};
                  }
                  const guide = explainTitleRule({
                    ruleKey: def.ruleKey,
                    ruleConfig,
                    repeatPolicy: def.repeatPolicy,
                    rewardCode: def.rewardCode,
                    titleNameOf: (code) => nameOfCode.get(code),
                  });

                  return (
                    <details
                      key={def.id}
                      className="group border border-line bg-paper open:border-navy open:shadow-card"
                    >
                      <summary className="flex cursor-pointer list-none flex-wrap items-start gap-4 p-6 transition-colors hover:bg-cream [&::-webkit-details-marker]:hidden">
                        <span className="flex shrink-0 items-baseline gap-2 pt-0.5">
                          <span className="font-ui text-xs font-semibold tabular-nums text-muted">
                            {index + 1}
                          </span>
                          <Award className="h-4 w-4 text-gold" aria-hidden="true" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-display text-lg font-bold text-navy-deep">
                              {def.name}
                            </span>
                            <span className="border border-line-strong px-2 py-0.5 font-ui text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted">
                              {rarityLabel(def.rarity)}
                            </span>
                          </span>
                          {attribution && (
                            <span className="mt-1.5 block font-ui text-xs italic text-muted">
                              {attribution}
                            </span>
                          )}
                          <span className="mt-2.5 block text-[0.93rem] leading-relaxed text-ink-soft">
                            {def.description}
                          </span>
                          <span className="mt-3 inline-flex items-center gap-1.5 font-ui text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-navy">
                            <ChevronDown
                              className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
                              aria-hidden="true"
                            />
                            <span className="group-open:hidden">Cách đạt được</span>
                            <span className="hidden group-open:inline">Thu gọn</span>
                          </span>
                        </span>

                        <span className="shrink-0 text-right">
                          <span className="block font-display text-3xl font-bold tabular-nums text-navy-deep">
                            {count}
                          </span>
                          <span className="block font-ui text-xs text-muted">
                            {percent}% học viên
                          </span>
                        </span>
                      </summary>

                      <div className="border-t border-line bg-cream px-6 py-6">
                        <p className="font-ui text-sm font-semibold text-navy-deep">
                          {guide.summary}
                        </p>

                        {guide.steps.length > 0 && (
                          <>
                            <p className="label-caps mt-5">
                              Cần đạt đủ các điều kiện sau
                            </p>
                            <ul className="mt-3 space-y-2">
                              {guide.steps.map((step, i) => (
                                <li
                                  key={i}
                                  className="flex gap-3 text-[0.93rem] leading-relaxed text-ink-soft"
                                >
                                  <span
                                    className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 bg-gold"
                                    aria-hidden="true"
                                  />
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}

                        {guide.notes.length > 0 && (
                          <div className="mt-6 space-y-2.5 border-t border-line pt-5">
                            {guide.notes.map((note, i) => (
                              <p
                                key={i}
                                className="flex gap-2.5 font-ui text-[0.85rem] leading-relaxed text-muted"
                              >
                                <Info
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                                <span>{note}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          ))}
          </div>
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
