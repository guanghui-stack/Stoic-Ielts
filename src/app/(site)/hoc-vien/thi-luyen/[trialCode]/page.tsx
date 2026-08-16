import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ScrollText } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { features } from "@/lib/features";
import { NoteBox } from "@/components/ui";
import { ART_ASSETS } from "@/lib/brand/art-manifest";
import { SceneHero } from "@/components/world/scene-hero";
import { TrialGateCard } from "@/components/ranks/trial-gate-card";
import { TrialProgress } from "@/components/ranks/trial-progress";
import { TrialReflectionForm } from "@/components/ranks/trial-reflection-form";
import { campaignNodeByTrial } from "@/lib/campaign/catalog";
import { ensureUserRank, syncTrialEligibility } from "@/lib/ranks/engine";
import { loadRankFacts } from "@/lib/ranks/facts";
import { evaluateTrialGate, evaluateTrialSuccess } from "@/lib/ranks/rules";
import { trialByCode, rankByLevel } from "@/lib/ranks/catalog";
import { generalByCode } from "@/lib/story/generals";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ trialCode: string }>;
}) {
  const { trialCode } = await params;
  const trial = trialByCode(trialCode);
  return { title: trial ? `${trial.name} — Thí luyện` : "Thí luyện" };
}

export default async function TrialPage({
  params,
}: {
  params: Promise<{ trialCode: string }>;
}) {
  if (!features.ranks) notFound();

  const { trialCode } = await params;
  const trial = trialByCode(trialCode);
  if (!trial) notFound();

  const user = await requireUser();
  const profile = await ensureUserRank(user.id);
  const facts = await loadRankFacts(user.id);
  await syncTrialEligibility(user.id, facts, profile.currentLevel);

  const userTrial = await db.userTrial.findUnique({
    where: { userId_trialCode: { userId: user.id, trialCode } },
  });

  const gate = evaluateTrialGate(trial, facts);
  const isActive = userTrial?.status === "ACTIVE" && userTrial.startedAt !== null;
  const progress = isActive
    ? evaluateTrialSuccess(trial, facts, userTrial.startedAt as Date)
    : null;

  const node = campaignNodeByTrial(trialCode);
  const general = generalByCode(trial.featuredGeneralCode);
  const fromRank = rankByLevel(trial.fromLevel);
  const toRank = rankByLevel(trial.toLevel);

  // Cửa ải không thuộc cấp bậc hiện tại thì chỉ cho xem, không cho bắt đầu.
  const ownLevel = profile.currentLevel === trial.fromLevel;
  const passed = userTrial?.status === "PASSED" || profile.currentLevel > trial.fromLevel;

  // Dạng câu học viên từng làm, để chọn nhanh khi phục bàn.
  const questionTypes = [
    ...new Set(
      facts.attempts.flatMap((attempt) => Object.keys(attempt.questionTypeStats)),
    ),
  ].sort();

  return (
    <main>
      <div className="mx-auto max-w-6xl px-6 pt-10">
        <Link
          href="/hoc-vien/chien-dich"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-navy"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Chiến Dịch
        </Link>
      </div>

      <SceneHero
        asset={node ? ART_ASSETS[node.artKey] : ART_ASSETS.campaignMap}
        eyebrow={node?.functionalLabel ?? "Thí luyện"}
        title={trial.name}
        functionalLabel="Cửa ải thăng cấp cá nhân"
      >
        <p className="font-ui text-sm text-muted">
          {fromRank?.name} → {toRank?.name} · {general.name} · {trial.estimate}
        </p>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
          {trial.narrative}
        </p>
      </SceneHero>

      <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">

      <div className="mt-6 border-l-4 border-gold bg-cream-deep px-6 py-5">
        <p className="label-caps flex items-center gap-2">
          <ScrollText className="h-3.5 w-3.5" aria-hidden />
          Cửa ải này rèn điều gì
        </p>
        <p className="mt-2 font-ui text-sm font-semibold text-navy-deep">
          {trial.skill}
        </p>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
          {trial.rationale}
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {passed ? (
          <section
            aria-label="Trạng thái cửa ải"
            className="border border-vermilion bg-vermilion-pale p-7"
          >
            <p className="label-caps">Đã vượt</p>
            <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep">
              Bạn đã qua cửa ải này
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
              Cấp bậc chỉ tăng, không bao giờ tụt — cửa ải đã vượt thì vượt vĩnh viễn.
            </p>
          </section>
        ) : !ownLevel ? (
          <NoteBox title="Chưa tới lượt cửa ải này">
            Bạn đang ở bậc {profile.currentLevel}, còn cửa ải này đi ra từ bậc{" "}
            {trial.fromLevel}. Hãy vượt các cửa trước đã — bản đồ Chiến Dịch cho
            bạn thấy đường đi.
          </NoteBox>
        ) : (
          <TrialGateCard
            trialCode={trial.code}
            trialName={trial.name}
            estimate={trial.estimate}
            status={userTrial?.status ?? "LOCKED"}
            gateComplete={gate.complete}
            gateExplanation={gate.explanation}
            gateProgress={gate.progress}
          />
        )}

        {isActive && progress && (
          <section
            aria-label="Tiến độ vượt cửa ải"
            className="border border-line bg-paper p-7"
          >
            <p className="label-caps">Tiến độ</p>
            <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep">
              Điều kiện vượt cửa
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
              {progress.explanation}
            </p>
            <div className="mt-5">
              <TrialProgress items={progress.progress} tone="azure" />
            </div>
          </section>
        )}

        {isActive && (
          <TrialReflectionForm trialCode={trial.code} questionTypes={questionTypes} />
        )}
      </div>
      </section>
    </main>
  );
}
