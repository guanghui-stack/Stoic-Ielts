import Link from "next/link";
import { Users } from "lucide-react";
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
import { AchievementDisclosure } from "@/components/achievements/achievement-disclosure";
import { ART_ASSETS } from "@/lib/brand/art-manifest";
import type { NextStepModel } from "@/lib/campaign/world";
import { NextStepGuide } from "@/components/world/next-step-guide";
import { SceneHero } from "@/components/world/scene-hero";
import { NoteBox } from "@/components/ui";

export const metadata = {
  title: "Điện Danh Vọng",
  description:
    "Bảng vinh danh học viên HỔ PHÙ · IELTS — danh hiệu, độ hiếm và số người đã đạt.",
};
export const dynamic = "force-dynamic";

const HALL_NEXT_STEP: NextStepModel = {
  eyebrow: "Bước đầu tiên",
  title: "Xem danh hiệu đầu tiên bạn có thể đạt",
  body: "Mỗi danh hiệu chứng minh một hành vi học thật: làm bài, chữa sai hoặc giữ kỷ luật. Không danh hiệu nào được mua bằng điểm hay tiền.",
  href: "/hoc-vien/danh-hieu",
  actionLabel: "Xem danh hiệu của tôi",
  entersStudy: false,
};

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
    <div>
      <SceneHero
        asset={ART_ASSETS.generalHoangTrung}
        eyebrow="Vinh danh"
        title="Điện Danh Vọng"
        functionalLabel="Danh hiệu và thành tích học tập"
      >
        <p className="text-lg leading-relaxed text-ink-soft">
          Nơi ghi lại những cột mốc học viên HỔ PHÙ · IELTS đã vượt qua. Danh
          hiệu không mua được — chỉ có làm bài đàng hoàng, sửa sai có chiều sâu
          và giữ được kỷ luật.
        </p>
      </SceneHero>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <NextStepGuide step={HALL_NEXT_STEP} />

        {recent.length > 0 && (
          <div className="mb-12 mt-12">
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

        <h2 className="mt-12 font-display text-2xl font-bold text-navy-deep">
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
                    <AchievementDisclosure
                      key={def.id}
                      index={index + 1}
                      name={def.name}
                      rarity={rarityLabel(def.rarity)}
                      attribution={attribution}
                      description={def.description}
                      count={count}
                      percent={percent}
                      guide={guide}
                    />
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
    </div>
  );
}
