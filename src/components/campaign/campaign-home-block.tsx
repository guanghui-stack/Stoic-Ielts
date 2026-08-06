import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { features } from "@/lib/features";
import { getCurrentUser } from "@/lib/session";
import { CampaignMap25D } from "@/components/campaign/campaign-map-2-5d";
import { CampaignTimelineMobile } from "@/components/campaign/campaign-timeline-mobile";
import { campaignView, type TrialStatusMap } from "@/lib/campaign/view";
import { ensureUserRank, syncTrialEligibility } from "@/lib/ranks/engine";
import { loadRankFacts } from "@/lib/ranks/facts";
import { rankByLevel } from "@/lib/ranks/catalog";

/**
 * Bản đồ Chiến Dịch trên trang chủ.
 *
 * Phục vụ hai loại người đọc bằng CÙNG một bản đồ:
 *
 *  - Khách chưa đăng nhập thấy bản đồ ở trạng thái giới thiệu — tám cửa ải,
 *    cửa đầu mở sẵn. Đây là lời mời, không phải tiến độ giả. Cố ý không bịa
 *    ra cửa nào "đã vượt" cho đẹp: người mới bước vào sẽ thấy đúng thứ họ sắp
 *    bắt đầu, không bị hụt hẫng khi đăng ký xong thấy khác.
 *  - Người đã đăng nhập thấy tiến độ thật của mình.
 *
 * Trả về null khi cờ tắt, nên trang chủ không cần biết gì về hệ cấp bậc.
 */
export async function CampaignHomeBlock() {
  if (!features.campaignMap) return null;

  const user = await getCurrentUser();

  // Khách: bản đồ giới thiệu, cửa đầu mở, không truy vấn gì thêm.
  if (!user) {
    const nodes = campaignView(1, { TRIAL_01_DAO_VIEN: { status: "ELIGIBLE" } });
    return (
      <Section
        eyebrow="Chiến Dịch"
        title="Tám cửa ải, chín cấp bậc"
        lede="Mỗi cấp bậc phải vượt một cửa ải mới lên được, và mỗi cửa ải đo một năng lực đọc thật. Không mua được, không tự rơi xuống."
        nodes={nodes}
        cta={{ href: "/dang-ky", label: "Bắt đầu từ Bạch thân" }}
      />
    );
  }

  const profile = await ensureUserRank(user.id);
  const facts = await loadRankFacts(user.id);
  await syncTrialEligibility(user.id, facts, profile.currentLevel);

  const rows = await db.userTrial.findMany({
    where: { userId: user.id },
    select: { trialCode: true, status: true },
  });
  const trials: TrialStatusMap = {};
  for (const row of rows) trials[row.trialCode] = { status: row.status };

  const nodes = campaignView(profile.currentLevel, trials);
  const rank = rankByLevel(profile.currentLevel);
  const passed = nodes.filter((node) => node.state === "PASSED").length;

  return (
    <Section
      eyebrow="Chiến Dịch"
      title={`Bạn đang ở ${rank?.name ?? "Bạch thân"}`}
      lede={`Đã vượt ${passed} trên 8 cửa ải. Cấp bậc chỉ tăng, không bao giờ tụt.`}
      nodes={nodes}
      cta={{ href: "/hoc-vien/chien-dich", label: "Xem toàn bộ Chiến Dịch" }}
    />
  );
}

function Section({
  eyebrow,
  title,
  lede,
  nodes,
  cta,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  nodes: ReturnType<typeof campaignView>;
  cta: { href: string; label: string };
}) {
  return (
    <section className="border-y border-line bg-cream">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <p className="label-caps">{eyebrow}</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-navy-deep md:text-4xl">
          {title}
        </h2>
        <div className="rule-gold mt-5" />
        <p className="mt-5 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
          {lede}
        </p>

        <div className="mt-8">
          <CampaignMap25D nodes={nodes} />
          <CampaignTimelineMobile nodes={nodes} />
        </div>

        <Link
          href={cta.href}
          className="mt-8 inline-flex items-center gap-2 font-ui text-sm font-semibold text-navy hover:underline"
        >
          {cta.label}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
