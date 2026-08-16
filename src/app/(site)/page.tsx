import Link from "next/link";
import {
  ArrowRight,
  Award,
  Brain,
  BookOpen,
  Layers,
  Repeat,
  Trophy,
} from "lucide-react";
import { ART_ASSETS } from "@/lib/brand/art-manifest";
import { READING_NAV } from "@/lib/nav";
import { BADGE_INFO } from "@/components/competition/badges";
import { CampaignHomeBlock } from "@/components/campaign/campaign-home-block";
import { NarrativeSection } from "@/components/world/narrative-section";
import { SceneHero } from "@/components/world/scene-hero";
import { ButtonLink, NoteBox } from "@/components/ui";

const PILLARS = [
  {
    icon: BookOpen,
    title: "Chiến trận",
    functional: "Làm đề Reading",
    body: "Làm bài trong đúng điều kiện phòng thi máy tính, chấm và quy đổi band ngay khi nộp. Không có band ảo: điểm được tính theo bảng quy đổi IELTS thật, không phải phần trăm số câu đúng.",
  },
  {
    icon: Brain,
    title: "Phục bàn",
    functional: "Chữa bài Feynman",
    body: "Làm thêm đề không tự khiến bạn giỏi hơn. Sau mỗi bài, bạn tự giảng lại vì sao mình sai, tìm bằng chứng trong đoạn văn, rồi rút một quy tắc dùng được cho bài sau.",
  },
  {
    icon: Repeat,
    title: "Luyện binh",
    functional: "Ngày học thật",
    body: "Hệ thống đếm thời gian học THẬT — chỉ tính khi bạn đang thực sự làm bài, không tính tab mở quên tắt. Danh hiệu kỷ luật cần hàng chục ngày, và không có cách nào rút ngắn.",
  },
];

export default async function HomePage() {
  return (
    <div className="motion-page-entry">
      <SceneHero
        asset={ART_ASSETS.homeTrieuVan}
        eyebrow="HỔ PHÙ · IELTS · Luyện Reading Academic và General"
        title={
          <>
            Binh phù chỉ hiệu lực
            <br />
            khi hai nửa khớp nhau.
          </>
        }
        functionalLabel="Cổng Doanh — Trang chủ HỔ PHÙ · IELTS"
      >
        <p className="text-lg leading-relaxed text-ink-soft">
          Hổ phù là binh phù xẻ đôi: lệnh chỉ có giá trị khi hai mảnh ăn khớp. Ở
          đây, một nửa là kết quả đo được — band, độ chính xác, thời gian làm
          bài. Nửa còn lại là quá trình kiểm chứng được — bài đã chữa, ngày đã
          học thật. Bạn không mua được cấp bậc, không cày tắt được Nguyệt Thí:
          cấp bậc chỉ trao khi cả hai nửa cùng hợp lệ.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="#ban-do-chien-dich" variant="primary">
            Mở bản đồ Chiến Dịch
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href="#lo-trinh-hoc" variant="outline">
            Chọn kho Reading
          </ButtonLink>
        </div>
      </SceneHero>

      <CampaignHomeBlock />

      <NarrativeSection
        id="lo-trinh-hoc"
        eyebrow="Lộ trình học"
        title="Hiểu đúng trước khi bước vào trận"
        tone="paper"
      >
        <LearningPath />
      </NarrativeSection>

      <NarrativeSection
        id="ba-tru"
        eyebrow="Ba trụ"
        title="Làm đề, chữa sai, giữ kỷ luật"
        tone="mist"
      >
        <Pillars />
      </NarrativeSection>

      <NarrativeSection
        id="dai-thi"
        eyebrow="Đại thí"
        title="Từ Nguyệt Thí tới Thiên Thí"
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
          IELTS có hai dạng Reading khác hẳn nhau. Luyện nhầm dạng nghĩa là bạn
          đang giỏi lên ở một kỳ thi mà mình không dự — nên hệ thống tách riêng
          từ danh sách đề cho tới cách ghép đề Full Test.
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
                Kho luyện tập
              </p>
              <h3 className="mt-3 font-display text-2xl font-bold text-navy-deep group-hover:text-navy">
                Reading {module.label}
              </h3>
              <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-ink-soft">
                {module.blurb}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-navy group-hover:text-gold">
                Vào luyện tập
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
        <NoteBox title="Giao diện khi học" className="mt-6 max-w-2xl">
          Khi vào Reading, trang sẽ chuyển sang giao diện học tập tĩnh để bạn
          tập trung vào passage, câu hỏi và thời gian làm bài.
        </NoteBox>
      </div>

      <div className="grid gap-10 border-t border-line pt-12 md:grid-cols-2 md:items-center">
        <div>
          <p className="label-caps">Hành trình danh hiệu</p>
          <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-navy-deep md:text-3xl">
            Mười tám danh hiệu, không mua được cái nào
          </h3>
          <p className="mt-5 text-[1.02rem] leading-relaxed text-ink-soft">
            Không có điểm kinh nghiệm, không có cửa hàng đổi điểm. Mỗi danh
            hiệu nói đúng một điều bạn đã thật sự làm được — và có cả danh hiệu
            dành cho người đi lên từ giai đoạn sa sút, bởi vì ngã rồi đứng dậy
            cũng là một loại năng lực.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/dien-danh-vong" variant="outline">
              <Award className="h-4 w-4" aria-hidden="true" />
              Điện Danh Vọng
            </ButtonLink>
            <ButtonLink href="/luyen-tap/reading" variant="outline">
              <Layers className="h-4 w-4" aria-hidden="true" />
              Xem đề luyện
            </ButtonLink>
          </div>
        </div>
        <NoteBox title="Danh hiệu đầu tiên rất gần">
          Chỉ cần ba bài đọc khác nhau, mỗi bài đạt từ band 4.0 ngay lần làm
          đầu. Nhưng danh hiệu cuối cùng cần sáu mươi ngày học thật trong ba
          tháng — và đó là điểm mấu chốt: hệ thống này thưởng cho người ở lại
          lâu, không thưởng cho người bùng nổ một tuần rồi biến mất.
        </NoteBox>
      </div>

      <div className="border-t border-line pt-12">
        <h3 className="font-display text-2xl font-bold leading-tight text-navy-deep md:text-3xl">
          Hành trình bắt đầu bằng một bài đọc
        </h3>
        <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-ink-soft">
          Tài khoản miễn phí, đề công khai miễn phí, đáp án miễn phí. Bạn chỉ
          trả tiền khi muốn mở thêm đề hoặc dùng lớp chữa bài sâu.
        </p>
        <div className="mt-8">
          <ButtonLink href="/thanh-toan" variant="outline">
            Xem bảng giá
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

function Pillars() {
  return (
    <>
      <div className="grid gap-px border border-line bg-line md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <article key={pillar.title} className="bg-paper p-8">
            <pillar.icon className="h-6 w-6 text-gold-ink" aria-hidden="true" />
            <h3 className="mt-5 font-display text-xl font-semibold text-navy-deep">
              {pillar.title}
            </h3>
            <p className="dual-label__function mt-1">{pillar.functional}</p>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-ink-soft">
              {pillar.body}
            </p>
          </article>
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-2xl text-center text-[0.98rem] leading-relaxed text-ink-soft">
        Đủ cả ba trụ, bạn nhận danh hiệu{" "}
        <strong className="text-ink">Nhận thức — Hành động — Ý chí</strong> —
        tấm vé duy nhất bước vào Nguyệt Thí.
      </p>
    </>
  );
}

function CompetitionPath() {
  return (
    <>
      <p className="max-w-2xl text-[1.02rem] leading-relaxed text-paper/80">
        Bảy ngày, ba đề Reading, và một danh sách rất ngắn những người đủ tư
        cách bước vào. Không ai đạt chuẩn thì giải để trống — chúng tôi không
        hạ chuẩn để trao cho đủ mâm.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {BADGE_INFO.map(({ code, Badge, title, prizeLabel, requirement }) => (
          <article
            key={code}
            className="flex flex-col items-center border border-line bg-cream p-7 text-center"
          >
            <Badge className="h-20 w-20" />
            <h3 className="mt-4 font-display text-lg font-bold leading-snug text-navy-deep">
              {title}
            </h3>
            <p className="mt-2 font-display text-2xl font-bold text-gold">
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
          Cách tham gia Nguyệt Thí
        </ButtonLink>
      </div>
    </>
  );
}
