import { CampaignMapStack } from "@/components/campaign/campaign-map-stack";
import { CampaignTimelineMobile } from "@/components/campaign/campaign-timeline-mobile";
import { NextStepGuide } from "@/components/world/next-step-guide";
import { db } from "@/lib/db";
import { features } from "@/lib/features";
import { getCurrentUser } from "@/lib/session";
import { campaignView, type TrialStatusMap } from "@/lib/campaign/view";
import { buildCampaignWorld, type CampaignWorld } from "@/lib/campaign/world";
import { ensureUserRank, syncTrialEligibility } from "@/lib/ranks/engine";
import { loadRankFacts } from "@/lib/ranks/facts";

/**
 * Bản đồ công khai luôn có một thế giới khách an toàn. Khi cá nhân hóa được
 * bật, mọi truy vấn phiên và tiến độ đều nằm trong cùng một ranh giới lỗi để
 * sự cố dữ liệu không làm biến mất cổng vào Chiến Dịch trên trang chủ.
 */
export async function CampaignHomeBlock() {
  const guestNodes = campaignView(1, {
    TRIAL_01_DAO_VIEN: { status: "ELIGIBLE" },
  });
  const guestWorld = buildCampaignWorld({ audience: "GUEST", nodes: guestNodes });

  if (!features.campaignMap) {
    return <CampaignWorldSection world={guestWorld} />;
  }

  let world = guestWorld;
  try {
    const user = await getCurrentUser();
    if (user) world = await loadStudentWorld(user.id);
  } catch (error) {
    console.error("[campaign-home] Không tải được tiến độ cá nhân", error);
  }

  return <CampaignWorldSection world={world} />;
}

async function loadStudentWorld(userId: string): Promise<CampaignWorld> {
  const profile = await ensureUserRank(userId);
  const facts = await loadRankFacts(userId);
  await syncTrialEligibility(userId, facts, profile.currentLevel);

  const rows = await db.userTrial.findMany({
    where: { userId },
    select: { trialCode: true, status: true },
  });
  const trials: TrialStatusMap = {};
  for (const row of rows) trials[row.trialCode] = { status: row.status };

  return buildCampaignWorld({
    audience: "STUDENT",
    nodes: campaignView(profile.currentLevel, trials),
  });
}

function CampaignWorldSection({ world }: { world: CampaignWorld }) {
  return (
    <section
      id="ban-do-chien-dich"
      className="scroll-mt-44 border-y border-line bg-cream"
    >
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <CampaignMapStack
          world={world}
          variant={world.audience === "STUDENT" ? "student" : "portal"}
        />
        <CampaignTimelineMobile world={world} />
        <NextStepGuide step={world.nextStep} />
      </div>
    </section>
  );
}
