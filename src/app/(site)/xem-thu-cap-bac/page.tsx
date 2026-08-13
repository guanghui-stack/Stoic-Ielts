import { notFound } from "next/navigation";
import { CurrentRankCard } from "@/components/ranks/current-rank-card";
import { TrialGateCard } from "@/components/ranks/trial-gate-card";
import { TrialProgress } from "@/components/ranks/trial-progress";
import { CardinalTitlePicker } from "@/components/ranks/cardinal-title-picker";
import { TrialReflectionForm } from "@/components/ranks/trial-reflection-form";
import { CampaignMap } from "@/components/campaign/campaign-map";
import { CampaignTimelineMobile } from "@/components/campaign/campaign-timeline-mobile";
import { campaignView } from "@/lib/campaign/view";
import {
  RankInsignia,
  RankInsigniaWithLevel,
} from "@/components/ranks/rank-insignia";
import { RANK_ERAS, RANK_SEEDS } from "@/lib/ranks/catalog";

/**
 * Trang xem thử hệ cấp bậc — CHỈ tồn tại ở môi trường dev.
 *
 * Lý do tồn tại: mọi trang thật của hệ cấp bậc đều đòi đăng nhập và truy vấn
 * MySQL, mà máy phát triển không có MySQL. Không có trang này thì phần giao
 * diện phải viết mù cho tới khi deploy, và lỗi bố cục chỉ lộ ra trên
 * production trước mặt học viên.
 *
 * Trang dựng mọi trạng thái cạnh nhau bằng dữ liệu giả, nên kiểm được một
 * lượt: bố cục, tương phản, thứ tự tab của bàn phím, và bản đồ ở 375px.
 * Không đụng database, không cần đăng nhập.
 */

export const metadata = { title: "Xem thử hệ cấp bậc" };

const GATE_PROGRESS = [
  { label: "Đề khác nhau đã làm", current: 2, target: 3 },
  { label: "Lượt phục bàn đạt chuẩn", current: 3, target: 3 },
];

const SUCCESS_PROGRESS = [
  { label: "Đề khác nhau đạt band 4.5", current: 3, target: 5 },
  { label: "Lượt phục bàn", current: 1, target: 3 },
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 border-b border-line pb-2 font-ui text-sm font-bold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function RankPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // Bốn ảnh chụp trạng thái bản đồ, đủ để thấy mọi kiểu node cùng lúc.
  const mapNodes = campaignView(3, {
    TRIAL_01_DAO_VIEN: { status: "PASSED" },
    TRIAL_02_HOANG_CAN: { status: "PASSED" },
    TRIAL_03_HOA_HUNG: { status: "ACTIVE" },
    TRIAL_04_NGU_QUAN: { status: "LOCKED", hint: "Cần 2 bài đạt band 5.5 trong 30 ngày." },
  });

  const earlyNodes = campaignView(1, {
    TRIAL_01_DAO_VIEN: { status: "ELIGIBLE" },
  });

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-navy-deep">
        Xem thử hệ cấp bậc (dev)
      </h1>
      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        Trang này chỉ chạy ở môi trường phát triển. Mọi số liệu đều là giả, không
        có truy vấn database nào. Các nút bấm được sẽ gọi Server Action thật và
        báo lỗi thiếu đăng nhập — đó là hành vi đúng.
      </p>

      <Block title="Chín ấn triện — huy hiệu cấp bậc">
        <p className="mb-5 max-w-2xl font-ui text-sm leading-relaxed text-ink-soft">
          Núm ấn đổi theo thời đại (thanh ngang · vòng · vòng kép), số vạch
          trong lòng ấn là bậc trong thời đại đó. Dải nhỏ bên dưới là cỡ thật
          khi huy hiệu nằm cạnh tên trong bảng — đó mới là chỗ dễ vỡ.
        </p>
        <div className="flex flex-wrap gap-5">
          {RANK_SEEDS.map((rank) => (
            <div key={rank.code} className="w-28 text-center">
              <RankInsignia level={rank.level} className="mx-auto h-16 w-16" />
              <p className="mt-1.5 font-ui text-xs font-semibold text-navy-deep">
                {rank.name}
              </p>
              <p className="font-ui text-[0.68rem] text-muted">
                Bậc {rank.level} · {RANK_ERAS[rank.era].name}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-7 label-caps">Cỡ nhỏ trong bảng</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {RANK_SEEDS.map((rank) => (
            <RankInsignia
              key={rank.code}
              level={rank.level}
              className="h-7 w-7"
            />
          ))}
        </div>

        <p className="mt-7 label-caps">Kèm số bậc</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          {[1, 5, 9].map((level) => (
            <RankInsigniaWithLevel key={level} level={level} />
          ))}
        </div>
      </Block>

      <Block title="Thẻ cấp bậc — đang trấn thủ">
        <CurrentRankCard
          level={3}
          rankName="Thập trưởng"
          era="LOAN_THE"
          bandAnchor="Band 4.5 ổn định"
          active
        />
      </Block>

      <Block title="Thẻ cấp bậc — nhàn cư, và bậc 8 có hiệu">
        <div className="space-y-6">
          <CurrentRankCard
            level={5}
            rankName="Nha tướng"
            era="QUAN_HUNG"
            bandAnchor="Band 5.5 - 6.0"
            active={false}
          />
          <CurrentRankCard
            level={8}
            rankName="Tứ phương tướng quân"
            era="TAM_PHAN"
            bandAnchor="Band 7.0 - 7.5"
            active
            cardinalTitleName="Trấn Bắc tướng quân"
          />
        </div>
      </Block>

      <Block title="Cửa ải — chưa mở">
        <TrialGateCard
          trialCode="TRIAL_02_HOANG_CAN"
          trialName="Trương Phi phá Hoàng Cân"
          estimate="Khoảng 2 tuần"
          status="LOCKED"
          gateComplete={false}
          gateExplanation="Cần làm đủ 3 đề khác nhau, hiện có 2."
          gateProgress={GATE_PROGRESS}
        />
      </Block>

      <Block title="Cửa ải — đã mở, có nút Khởi thí luyện">
        <TrialGateCard
          trialCode="TRIAL_02_HOANG_CAN"
          trialName="Trương Phi phá Hoàng Cân"
          estimate="Khoảng 2 tuần"
          status="ELIGIBLE"
          gateComplete
          gateExplanation="Đã đủ số đề để mở cửa ải."
          gateProgress={GATE_PROGRESS}
        />
      </Block>

      <Block title="Cửa ải — đang thí luyện">
        <div className="space-y-6">
          <TrialGateCard
            trialCode="TRIAL_02_HOANG_CAN"
            trialName="Trương Phi phá Hoàng Cân"
            estimate="Khoảng 2 tuần"
            status="ACTIVE"
            gateComplete
            gateExplanation=""
            gateProgress={[]}
          />
          <div className="border border-line bg-paper p-7">
            <p className="label-caps">Tiến độ</p>
            <div className="mt-5">
              <TrialProgress items={SUCCESS_PROGRESS} tone="azure" />
            </div>
          </div>
        </div>
      </Block>

      <Block title="Phục bàn miễn phí">
        <TrialReflectionForm
          trialCode="TRIAL_02_HOANG_CAN"
          questionTypes={["TRUE_FALSE_NOT_GIVEN", "MATCHING_HEADINGS", "SUMMARY_COMPLETION"]}
        />
      </Block>

      <Block title="Chọn hiệu bậc 8">
        <CardinalTitlePicker current="TRAN_BAC" />
      </Block>

      <Block title="Bản đồ — đang ở bậc 3, đã vượt 2 cửa">
        <CampaignMap nodes={mapNodes} />
        <CampaignTimelineMobile nodes={mapNodes} />
      </Block>

      <Block title="Bản đồ — người mới, chỉ cửa đầu đã mở">
        <CampaignMap nodes={earlyNodes} />
        <CampaignTimelineMobile nodes={earlyNodes} />
      </Block>
    </section>
  );
}
