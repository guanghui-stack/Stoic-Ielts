import Link from "next/link";
import { ArrowLeft, Award, Gift, Lock, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { titleOverviewFor, type TitleCard } from "@/lib/achievements/view";
import { SectionHeading, NoteBox } from "@/components/ui";
import { StudentNav } from "@/components/student/student-nav";
import { RewardClaimForm } from "@/components/achievements/reward-claim-form";
import { PublicProfileForm } from "@/components/achievements/public-profile-form";

export const metadata = { title: "Danh hiệu của tôi" };
export const dynamic = "force-dynamic";

export default async function MyTitlesPage() {
  const user = await requireUser();
  const [overview, pendingRewards, profile] = await Promise.all([
    titleOverviewFor(user.id),
    db.rewardGrant.findMany({
      where: { userId: user.id, status: { in: ["EARNED", "REQUESTED"] } },
      orderBy: { createdAt: "asc" },
      include: { titleAward: { include: { title: { select: { name: true } } } } },
    }),
    db.publicProfile.findUnique({ where: { userId: user.id } }),
  ]);

  // Bài đang khóa mà học viên CHƯA có quyền — đó là những bài đổi thưởng được
  const claimable = pendingRewards.some((r) => r.status === "EARNED")
    ? await db.exercise.findMany({
        where: {
          skill: "READING",
          published: true,
          accessLevel: "RESTRICTED",
          competitionOnly: false,
          accessGrants: { none: { userId: user.id, status: "ACTIVE" } },
        },
        select: { id: true, title: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const byCategory = new Map<string, TitleCard[]>();
  for (const card of overview.cards) {
    const list = byCategory.get(card.categoryLabel) ?? [];
    list.push(card);
    byCategory.set(card.categoryLabel, list);
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <StudentNav current="titles" />

      <Link
        href="/hoc-vien"
        className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-navy hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Hồ sơ học tập
      </Link>

      <div className="mt-6">
        <SectionHeading label="Hành trình" title="Danh hiệu của tôi" />
      </div>
      <p className="mt-6 max-w-2xl text-[0.98rem] leading-relaxed text-ink-soft">
        Danh hiệu ghi nhận những gì bạn đã thật sự làm được: giải đề đàng hoàng,
        sửa sai có chiều sâu, và giữ được kỷ luật. Không có điểm kinh nghiệm,
        không có cửa hàng đổi điểm — chỉ có hành trình của bạn.
      </p>

      <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-3">
        <div className="bg-paper p-6 text-center">
          <p className="label-caps">Đã đạt</p>
          <p className="mt-2.5 font-display text-4xl font-bold text-navy-deep">
            {overview.earnedCount}
            <span className="text-xl text-muted">/{overview.totalCount}</span>
          </p>
        </div>
        <div className="bg-paper p-6 text-center">
          <p className="label-caps">Đang tiến gần</p>
          <p className="mt-2.5 font-display text-2xl font-bold leading-snug text-ink">
            {overview.nextUp ? `${overview.nextUp.percent}%` : "—"}
          </p>
          {overview.nextUp && (
            <p className="mt-1 font-ui text-xs leading-snug text-muted">
              {overview.nextUp.name}
            </p>
          )}
        </div>
        <div className="bg-paper p-6 text-center">
          <p className="label-caps">Mới nhận</p>
          <p className="mt-2.5 font-ui text-sm font-semibold leading-snug text-success">
            {overview.latest?.name ?? "Chưa có"}
          </p>
        </div>
      </div>

      {pendingRewards.map((reward) =>
        reward.status === "REQUESTED" ? (
          <p
            key={reward.id}
            className="mt-8 border-l-4 border-gold bg-gold-pale px-6 py-5 font-ui text-sm leading-relaxed text-ink"
          >
            <strong>Yêu cầu đã gửi.</strong> Trung tâm đang kiểm tra và sẽ mở bài
            bạn chọn. Phần thưởng từ danh hiệu{" "}
            <em>{reward.titleAward.title.name}</em>.
          </p>
        ) : (
          <RewardClaimForm
            key={reward.id}
            rewardId={reward.id}
            titleName={reward.titleAward.title.name}
            expiresLabel={reward.expiresAt.toLocaleDateString("vi-VN")}
            options={claimable}
          />
        )
      )}

      {overview.earnedCount === 0 && (
        <NoteBox className="mt-8" title="Bắt đầu từ đâu">
          Danh hiệu đầu tiên chỉ cần ba bài đọc khác nhau, mỗi bài đạt từ band
          4.0 ngay lần làm đầu.{" "}
          <Link
            href="/luyen-tap/reading"
            className="font-semibold text-navy underline underline-offset-4"
          >
            Vào phòng luyện Reading
          </Link>
        </NoteBox>
      )}

      <PublicProfileForm
        displayName={profile?.displayName ?? user.name}
        allowHall={profile?.allowHall ?? false}
      />

      {[...byCategory.entries()].map(([category, cards]) => (
        <div key={category} className="mt-12">
          <h2 className="font-display text-2xl font-bold text-navy-deep">{category}</h2>
          <div className="mt-5 space-y-4">
            {cards.map((card) => (
              <TitleRow key={card.code} card={card} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function TitleRow({ card }: { card: TitleCard }) {
  return (
    <article
      className={`border p-6 ${
        card.earned
          ? "border-success bg-success-pale"
          : card.isPrivate
            ? "border-line-strong bg-cream-deep"
            : "border-line bg-paper"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            {card.earned ? (
              <Award className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <Lock className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            )}
            <span className="font-display text-lg font-bold text-navy-deep">
              {card.name}
            </span>
            <span className="border border-line-strong px-2 py-0.5 font-ui text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted">
              {card.rarityLabel}
            </span>
            {card.hasReward && (
              <span className="inline-flex items-center gap-1 border border-gold px-2 py-0.5 font-ui text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-gold">
                <Gift className="h-3 w-3" aria-hidden="true" />
                Có thưởng
              </span>
            )}
            {card.isPrivate && (
              <span className="border border-line-strong px-2 py-0.5 font-ui text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted">
                Chỉ mình bạn thấy
              </span>
            )}
          </p>
          {card.attribution && (
            <p className="mt-1.5 font-ui text-xs italic text-muted">
              {card.quoteSourceUrl ? (
                <a
                  href={card.quoteSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-2 hover:underline"
                >
                  {card.attribution}
                </a>
              ) : (
                card.attribution
              )}
            </p>
          )}
        </div>
        {card.earned && card.earnedAt && (
          <span className="shrink-0 font-ui text-xs tabular-nums text-success">
            {card.earnedAt.toLocaleDateString("vi-VN")}
          </span>
        )}
      </div>

      <p className="mt-3 text-[0.93rem] leading-relaxed text-ink-soft">
        {card.description}
      </p>

      {!card.earned && (
        <div className="mt-4">
          <div
            className="h-1.5 w-full bg-line"
            role="progressbar"
            aria-valuenow={card.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Tiến độ ${card.name}`}
          >
            <div className="h-full bg-gold" style={{ width: `${card.percent}%` }} />
          </div>
          <p className="mt-2 flex items-start gap-1.5 font-ui text-xs leading-relaxed text-ink-soft">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
            <span>
              <strong className="tabular-nums">{card.percent}%</strong>
              {card.hint && ` — ${card.hint}`}
            </span>
          </p>
        </div>
      )}
    </article>
  );
}
