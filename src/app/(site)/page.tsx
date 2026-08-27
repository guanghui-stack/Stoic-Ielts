import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Layers,
  Trophy,
} from "lucide-react";
import { ART_ASSETS } from "@/lib/brand/art-manifest";
import { READING_NAV } from "@/lib/nav";
import { BADGE_INFO } from "@/components/competition/badges";
import { CampaignHomeBlock } from "@/components/campaign/campaign-home-block";
import { NarrativeSection } from "@/components/world/narrative-section";
import { SceneHero } from "@/components/world/scene-hero";
import { ButtonLink, NoteBox } from "@/components/ui";
import { StoicSpotlightCard } from "@/components/ui/spotlight-card";

const PILLARS = [
  {
    icon: "brain" as const,
    title: "Nhận thức",
    functional: "Nhìn đúng dữ kiện",
    body: "Đọc đúng yêu cầu, tách dữ kiện khỏi suy đoán và biết rõ mình sai ở đâu. Một lỗi được gọi đúng tên sẽ dễ sửa hơn một band điểm mơ hồ.",
    tone: "lavender" as const,
  },
  {
    icon: "book-open" as const,
    title: "Hành động",
    functional: "Làm và chữa bằng bằng chứng",
    body: "Làm bài trong điều kiện thật, rồi quay lại passage để tìm bằng chứng. Phản hồi chỉ có giá trị khi nó dẫn tới một việc cụ thể cho lần tiếp theo.",
    tone: "sage" as const,
  },
  {
    icon: "repeat" as const,
    title: "Ý chí",
    functional: "Giữ ngày học thật",
    body: "Năng lực ổn định đến từ một nhịp học có thể lặp lại. Hệ thống chỉ ghi nhận thời gian bạn thực sự học, không tính tab mở quên tắt.",
    tone: "gold" as const,
  },
];

export default async function HomePage() {
  return (
    <div>
      <SceneHero
        asset={ART_ASSETS.homeTrieuVan}
        eyebrow="STOIC · IELTS · Luyện Reading Academic và General"
        title={
          <>
            Tập trung vào điều
            <br />
            bạn có thể làm hôm nay.
          </>
        }
        functionalLabel="Điểm Khởi Tâm — Trang chủ STOIC · IELTS"
      >
        <p className="text-lg leading-relaxed text-ink-soft">
          Bạn không kiểm soát độ khó của đề hay kết quả của một lần thi. Bạn kiểm
          soát cách đọc, thời gian, bằng chứng mình chọn và việc quay lại chữa lỗi.
          STOIC · IELTS biến những lựa chọn đó thành một tiến trình rõ ràng: làm
          trong điều kiện thật, nhìn đúng điều cần sửa và giữ nhịp đủ lâu.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="#hanh-trinh" variant="primary">
            Xem hành trình rèn luyện
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href="#lo-trinh-hoc" variant="outline">
            Chọn kho Reading
          </ButtonLink>
        </div>
      </SceneHero>

      <div id="hanh-trinh">
        <CampaignHomeBlock />
      </div>

      <NarrativeSection
        id="lo-trinh-hoc"
        eyebrow="Bắt đầu rõ ràng"
        title="Chọn đúng dạng đề trước khi bắt đầu"
        tone="paper"
      >
        <LearningPath />
      </NarrativeSection>

      <NarrativeSection
        id="ba-tru"
        eyebrow="Ba trụ thực hành"
        title="Nhìn đúng, làm đúng, giữ được nhịp"
        tone="mist"
      >
        <Pillars />
      </NarrativeSection>

      <NarrativeSection
        id="thu-thach"
        eyebrow="Thử thách định kỳ"
        title="Đo tiến bộ mà không chạy theo một lần bùng nổ"
        tone="ink"
      >
        <CompetitionPath />
      </NarrativeSection>
    </div>
  );
}

function LearningPath() {
  return (
    <div className="space-y-14">
      <div>
        <p className="max-w-2xl text-[1.02rem] leading-relaxed text-ink-soft">
          IELTS có hai dạng Reading khác nhau. Luyện nhầm dạng khiến thời gian và
          nỗ lực đi sai hướng, vì vậy hệ thống tách Academic và General từ danh
          sách đề cho tới cách ghép Full Test.
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {READING_NAV.map((module) => (
            <Link
              key={module.module}
              href={module.href}
              className="group flex flex-col border border-line bg-paper p-8 shadow-card transition-colors hover:border-navy"
            >
              <p className="label-caps flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Kho thực hành
              </p>
              <h3 className="mt-3 font-display text-2xl font-medium text-navy-deep group-hover:text-navy">
                Reading {module.label}
              </h3>
              <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-ink-soft">
                {module.blurb}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.09em] text-navy group-hover:text-navy-deep">
                Vào kho đề
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
        <NoteBox title="Phòng thi được giữ nguyên" className="mt-6 max-w-2xl">
          Khi bắt đầu làm bài, giao diện chuyển sang chế độ mô phỏng thi thật và
          loại bỏ mọi chuyển động trang trí để bạn tập trung vào passage, câu hỏi
          và thời gian.
        </NoteBox>
      </div>

      <div className="grid gap-10 border-t border-line pt-12 md:grid-cols-2 md:items-center">
        <div>
          <p className="label-caps">Dấu mốc tiến bộ</p>
          <h3 className="mt-3 font-display text-2xl font-medium leading-tight text-navy-deep md:text-3xl">
            Mỗi dấu mốc phải nói được bạn đã làm gì
          </h3>
          <p className="mt-5 text-[1.02rem] leading-relaxed text-ink-soft">
            Không có đường tắt để mua một năng lực. Mỗi dấu mốc gắn với một việc
            đã được kiểm chứng: số bài hoàn thành, lỗi đã chữa, ngày học thật hoặc
            khả năng quay lại sau giai đoạn sa sút.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/dien-danh-vong" variant="outline">
              <Award className="h-4 w-4" aria-hidden="true" />
              Dấu mốc cộng đồng
            </ButtonLink>
            <ButtonLink href="/luyen-tap/reading" variant="outline">
              <Layers className="h-4 w-4" aria-hidden="true" />
              Xem đề luyện
            </ButtonLink>
          </div>
        </div>
        <NoteBox title="Bắt đầu từ điều nhỏ nhất">
          Một bài đọc hoàn thành trong điều kiện thật cho bạn nhiều dữ liệu hơn
          một kế hoạch hoàn hảo chưa bắt đầu. Hãy làm bài đầu tiên, rồi chọn đúng
          một điều cần sửa cho lần sau.
        </NoteBox>
      </div>

      <div className="border-t border-line pt-12">
        <h3 className="font-display text-2xl font-medium leading-tight text-navy-deep md:text-3xl">
          Hành trình bắt đầu bằng một lựa chọn có thể thực hiện
        </h3>
        <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-ink-soft">
          Tài khoản miễn phí, đề công khai miễn phí và đáp án miễn phí. Bạn chỉ
          trả tiền khi muốn mở thêm học liệu hoặc dùng lớp chữa bài sâu.
        </p>
        <div className="mt-8">
          <ButtonLink href="/thanh-toan" variant="outline">
            Xem học liệu
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

function Pillars() {
  return (
    <>
      <div className="grid gap-5 md:grid-cols-3">
        {PILLARS.map((pillar, index) => (
          <StoicSpotlightCard
            key={pillar.title}
            index={String(index + 1).padStart(2, "0")}
            title={pillar.title}
            functional={pillar.functional}
            body={pillar.body}
            tone={pillar.tone}
            icon={pillar.icon}
          />
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-2xl text-center text-[0.98rem] leading-relaxed text-ink-soft">
        Ba trụ không phải ba giai đoạn tách rời. Mỗi lần học tốt đều cần đủ
        <strong className="text-ink"> nhận thức để thấy đúng, hành động để sửa và ý chí để quay lại.</strong>
      </p>
    </>
  );
}

function CompetitionPath() {
  const stageNames = ["Thử thách tháng", "Thử thách quý", "Thử thách năm"];

  return (
    <>
      <p className="max-w-2xl text-[1.02rem] leading-relaxed text-paper/80">
        Thử thách định kỳ không thay thế việc học hằng ngày. Nó chỉ tạo một mốc
        để bạn kiểm tra năng lực dưới áp lực thời gian, rồi quay lại với dữ liệu
        rõ hơn về điều cần rèn.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {BADGE_INFO.map(({ code, Badge, prizeLabel, requirement }, index) => (
          <article
            key={code}
            className="flex flex-col items-center rounded-stoic-md border border-line bg-cream p-7 text-center"
          >
            <Badge className="h-20 w-20" />
            <h3 className="mt-4 font-display text-lg font-medium leading-snug text-navy-deep">
              {stageNames[index] ?? "Thử thách"}
            </h3>
            <p className="mt-2 font-display text-2xl font-medium text-navy">
              {prizeLabel}
            </p>
            <p className="mt-2 font-ui text-xs leading-relaxed text-ink-soft">
              {requirement}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-10">
        <ButtonLink href="/nguyet-thi" variant="gold">
          <Trophy className="h-4 w-4" aria-hidden="true" />
          Xem thử thách tháng
        </ButtonLink>
      </div>
    </>
  );
}
