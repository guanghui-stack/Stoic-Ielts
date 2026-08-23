import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { features } from "@/lib/features";
import { NoteBox } from "@/components/ui";
import { StudentNav } from "@/components/student/student-nav";
import { CampaignMapStack } from "@/components/campaign/campaign-map-stack";
import { CampaignTimelineMobile } from "@/components/campaign/campaign-timeline-mobile";
import { NextStepGuide } from "@/components/world/next-step-guide";
import { NarrativeSection } from "@/components/world/narrative-section";
import { campaignView, type TrialStatusMap } from "@/lib/campaign/view";
import { buildCampaignWorld } from "@/lib/campaign/world";
import { ensureUserRank, syncTrialEligibility } from "@/lib/ranks/engine";
import { loadRankFacts } from "@/lib/ranks/facts";
import { rankByLevel, RANK_ERAS } from "@/lib/ranks/catalog";
import { currentSeason, territoryOwner } from "@/lib/arena/season-service";
import { FACTION_LABEL, FACTION_TERRITORY } from "@/lib/arena/season.ts";

export const metadata = { title: "Chiến Dịch — Bản đồ thăng cấp" };
export const dynamic = "force-dynamic";

export default async function CampaignPage() {
  // Cờ tắt thì trang coi như chưa tồn tại. Không hiện trang trống kèm lời hứa
  // "sắp có" — người học không dùng được gì từ một trang như vậy.
  if (!features.campaignMap) notFound();

  const user = await requireUser();
  const profile = await ensureUserRank(user.id);
  const rank = rankByLevel(profile.currentLevel);

  // Cập nhật trạng thái cửa ải kế tiếp ngay khi mở bản đồ, để người vừa đủ
  // điều kiện không phải chờ một lượt nộp bài nữa mới thấy cửa mở.
  const facts = await loadRankFacts(user.id);
  await syncTrialEligibility(user.id, facts, profile.currentLevel);

  const rows = await db.userTrial.findMany({
    where: { userId: user.id },
    select: { trialCode: true, status: true, gateSnapshotJson: true },
  });

  const trials: TrialStatusMap = {};
  for (const row of rows) {
    let hint: string | null = null;
    try {
      const gate = JSON.parse(row.gateSnapshotJson ?? "null") as {
        complete?: boolean;
        explanation?: string;
      } | null;
      if (gate && gate.complete === false) hint = gate.explanation ?? null;
    } catch {
      // Bản ghi cũ hoặc hỏng: bỏ phần gợi ý chứ không làm sập cả bản đồ.
    }
    trials[row.trialCode] = { status: row.status, hint };
  }

  const nodes = campaignView(profile.currentLevel, trials);
  const world = buildCampaignWorld({ audience: "STUDENT", nodes });

  // Chủ lãnh địa là phe thắng mùa TRƯỚC, giữ tới hết mùa này. Đây là chỗ duy
  // nhất bản đồ biết tới khái niệm phe: mọi thứ còn lại vẫn khoá theo cấp bậc.
  const [season, owner] = await Promise.all([currentSeason(), territoryOwner()]);
  const passed = nodes.filter((node) => node.state === "PASSED").length;

  return (
    <main>
      <div className="mx-auto max-w-6xl px-6 pt-10">
        <StudentNav current="campaign" />
      </div>

      <NarrativeSection
        id="ban-do-thang-cap"
        eyebrow="Chiến Dịch"
        title="Bản đồ thăng cấp"
        tone="mist"
      >
        <p className="max-w-3xl text-[0.95rem] leading-relaxed text-ink-soft">
          Tám cửa ải nối chín cấp bậc. Mỗi cửa chỉ mở khi bạn đã đủ điều kiện,
          và chỉ vượt được khi bạn chủ động bước vào.
        </p>

        <p className="mb-6 mt-2 text-sm text-muted">
          Bạn đang ở{" "}
          <strong className="text-navy-deep">{rank?.name ?? "Bạch thân"}</strong>
          {rank && <> · thời {RANK_ERAS[rank.era].name}</>} · đã vượt {passed}/8 cửa ải.
        </p>

        <CampaignMapStack
          world={world}
          variant="student"
          territoryOwnerCode={owner ? FACTION_TERRITORY[owner] : null}
          territoryOwnerLabel={owner ? FACTION_LABEL[owner] : null}
          seasonCode={season.code}
        />
        <CampaignTimelineMobile world={world} />
        <div id="dieu-kien">
          <NextStepGuide step={world.nextStep} />
        </div>

        <NoteBox className="mt-6">
          Cấp bậc chỉ tăng, không bao giờ tụt. Nếu bạn nghỉ một thời gian, cấp
          bậc vẫn giữ nguyên và chỉ chuyển sang trạng thái Nhàn cư cho tới ngày
          học thật tiếp theo.
        </NoteBox>
      </NarrativeSection>
    </main>
  );
}
