import { db } from "@/lib/db";
import { features } from "@/lib/features";
import { CurrentRankCard } from "@/components/ranks/current-rank-card";
import { RankPromotionMoment } from "@/components/ranks/rank-promotion-moment";
import { TrialProgress } from "@/components/ranks/trial-progress";
import { CampaignMini } from "@/components/campaign/campaign-mini";
import { NextStepGuide } from "@/components/world/next-step-guide";
import { campaignView, type TrialStatusMap } from "@/lib/campaign/view";
import { buildCampaignWorld, stoicTrialTitle } from "@/lib/campaign/world";
import { ensureUserRank, syncTrialEligibility } from "@/lib/ranks/engine";
import { loadRankFacts } from "@/lib/ranks/facts";
import { evaluateTrialGate, evaluateTrialSuccess } from "@/lib/ranks/rules";
import {
  CARDINAL_TITLES,
  MAX_RANK_LEVEL,
  rankByLevel,
  trialFromLevel,
} from "@/lib/ranks/catalog";

/**
 * Khối cấp bậc trên Trung Quân Trướng, theo đặc tả §3.1.
 *
 * Là một component riêng chứ không viết thẳng vào trang hồ sơ: hồ sơ đã có
 * sẵn nhiều thẻ đang chạy tốt, và cấp bậc còn nằm sau cờ tính năng. Tách ra
 * thì bật tắt là thêm hoặc bớt đúng một thẻ, không phải sửa lại cả trang.
 *
 * Trả về null khi cờ tắt, nên trang hồ sơ không cần biết gì về hệ cấp bậc.
 */
export async function RankDashboardBlock({ userId }: { userId: string }) {
  if (!features.ranks) return null;

  const profile = await ensureUserRank(userId);
  const rank = rankByLevel(profile.currentLevel);
  if (!rank) return null;

  const facts = await loadRankFacts(userId);
  await syncTrialEligibility(userId, facts, profile.currentLevel);

  const rows = await db.userTrial.findMany({
    where: { userId },
    select: { trialCode: true, status: true, startedAt: true },
  });

  const trials: TrialStatusMap = {};
  for (const row of rows) trials[row.trialCode] = { status: row.status };

  const nodes = campaignView(profile.currentLevel, trials);
  const world = buildCampaignWorld({ audience: "STUDENT", nodes });
  const trial = trialFromLevel(profile.currentLevel);
  const record = trial ? rows.find((row) => row.trialCode === trial.code) : undefined;

  const active = record?.status === "ACTIVE" && record.startedAt !== null;
  const gate = trial ? evaluateTrialGate(trial, facts) : null;
  const progress =
    trial && active
      ? evaluateTrialSuccess(trial, facts, record.startedAt as Date)
      : null;

  const cardinalName = CARDINAL_TITLES.find(
    (title) => title.code === profile.cardinalTitleCode,
  )?.name;

  // Dùng `facts.now` chứ không gọi Date.now() ở đây: mốc thời gian phải là
  // cùng một mốc mà engine đã dùng để xét, nếu không thẻ có thể nói "Nhàn cư"
  // trong khi engine vừa tính là còn hoạt động.
  const lastActivity = facts.attempts.at(-1)?.submittedAt ?? profile.promotedAt;
  const isActive =
    facts.now.getTime() - lastActivity.getTime() < 30 * 24 * 60 * 60 * 1000;
  const promotionAge = facts.now.getTime() - profile.promotedAt.getTime();
  const promotionIsFresh =
    profile.currentLevel > 1 &&
    promotionAge >= 0 &&
    promotionAge <= 14 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      <RankPromotionMoment
        userId={userId}
        promotionId={`${profile.currentLevel}:${profile.version}:${profile.promotedAt.toISOString()}`}
        level={profile.currentLevel}
        rankName={cardinalName ?? rank.name}
        eligible={promotionIsFresh}
      />

      <CurrentRankCard
        level={profile.currentLevel}
        rankName={rank.name}
        era={rank.era}
        bandAnchor={rank.bandAnchor}
        active={isActive}
        cardinalTitleName={cardinalName}
      />

      <NextStepGuide step={world.nextStep} />

      <section aria-label="Hành Trình" className="border border-line bg-paper p-7">
        <p className="label-caps">Vị trí hiện tại</p>
        <h3 className="mb-4 mt-2.5 font-display text-lg font-bold text-navy-deep">
          Ba chặng quanh bạn
        </h3>
        <CampaignMini nodes={world.gates} />
      </section>

      {trial && profile.currentLevel < MAX_RANK_LEVEL && (
        <section
          aria-label="Chặng kế tiếp"
          className="border border-line bg-paper p-7"
        >
          <p className="label-caps">Chặng kế tiếp</p>
          <h3 className="mt-2.5 font-display text-lg font-bold text-navy-deep">
            {stoicTrialTitle({ trialCode: trial.code, shortTitle: trial.name })}
          </h3>
          <p className="mt-2 font-ui text-sm text-muted">
            {trial.skill} · {trial.estimate}
          </p>

          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
            {active
              ? (progress?.explanation ?? "Đang theo dõi tiến độ.")
              : (gate?.explanation ?? "")}
          </p>

          <div className="mt-5">
            <TrialProgress
              items={active ? (progress?.progress ?? []) : (gate?.progress ?? [])}
              tone={active ? "azure" : "gold"}
            />
          </div>
        </section>
      )}
    </div>
  );
}
