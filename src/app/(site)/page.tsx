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
import { READING_NAV } from "@/lib/nav";
import { BADGE_INFO } from "@/components/competition/badges";
import { SectionHeading, NoteBox, ButtonLink } from "@/components/ui";
import { InkWashHero } from "@/components/brand/ink-wash-hero";
import { ART_ASSETS } from "@/lib/brand/art-manifest";
import { CampaignHomeBlock } from "@/components/campaign/campaign-home-block";

/**
 * Ba trụ — cũng chính là ba khấc răng cưa trên binh phù.
 *
 * Mỗi trụ hiển thị theo nhãn kép: tên cổ phong để ghi nhớ, dòng chức năng
 * ngay bên dưới để người mới không phải đoán. Ai chưa từng nghe "Phục bàn"
 * vẫn phải đọc được "Chữa bài Feynman" mà hiểu ngay.
 */
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
    <>
      {/* ===== Hero ===== */}
      <InkWashHero
        asset={ART_ASSETS.homeTrieuVan}
        videoSrc="/art/home/trieu-van-hero.mp4"
        eyebrow="HỔ PHÙ · IELTS · Luyện Reading Academic và General"
        title={
          <>
            Binh phù chỉ hiệu lực<br />khi hai nửa khớp nhau.
          </>
        }
        functionalLabel="Cổng Doanh — Trang chủ HỔ PHÙ · IELTS"
      >
        <p className="text-lg leading-relaxed text-ink-soft">
          Hổ phù là binh phù xẻ đôi: lệnh chỉ có giá trị khi hai mảnh ăn khớp.
          Ở đây, một nửa là kết quả đo được — band, độ chính xác, thời gian
          làm bài. Nửa còn lại là quá trình kiểm chứng được — bài đã chữa,
          ngày đã học thật. Bạn không mua được cấp bậc, không cày tắt được
          Nguyệt Thí: cấp bậc chỉ trao khi cả hai nửa cùng hợp lệ.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/dang-ky" variant="primary">
            Bắt đầu miễn phí
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href="/nguyet-thi" variant="outline">
            Tìm hiểu Nguyệt Thí
          </ButtonLink>
        </div>
      </InkWashHero>

      {/* ===== Bản đồ Chiến Dịch — tự ẩn khi cờ ENABLE_CAMPAIGN_MAP tắt ===== */}
      <CampaignHomeBlock />

      {/* ===== Hai dạng đề ===== */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <SectionHeading
          label="Luyện tập"
          title="Hai dạng đề, không trộn lẫn"
        />
        <p className="mt-6 max-w-2xl text-[1.02rem] leading-relaxed text-ink-soft">
          IELTS có hai dạng Reading khác hẳn nhau. Luyện nhầm dạng nghĩa là bạn
          đang giỏi lên ở một kỳ thi mà mình không dự — nên hệ thống tách riêng
          từ danh sách đề cho tới cách ghép đề Full Test.
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {READING_NAV.map((m) => (
            <Link
              key={m.module}
              href={m.href}
              className="group flex flex-col border border-line bg-paper p-8 shadow-card transition-colors hover:border-navy"
            >
              <p className="label-caps flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Reading
              </p>
              <h3 className="mt-3 font-display text-2xl font-bold text-navy-deep group-hover:text-navy">
                Reading {m.label}
              </h3>
              <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-ink-soft">
                {m.blurb}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-navy group-hover:text-gold">
                Vào luyện tập
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Ba trụ ===== */}
      <section className="border-y border-line bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <SectionHeading
            label="Ba trụ"
            title="Thứ tạo ra tiến bộ, theo đúng thứ tự"
            align="center"
          />
          <div className="mt-12 grid gap-px border border-line bg-line md:grid-cols-3">
            {PILLARS.map((p) => (
              <article key={p.title} className="bg-paper p-8">
                <p.icon className="h-6 w-6 text-gold-ink" aria-hidden="true" />
                <h3 className="mt-5 font-display text-xl font-semibold text-navy-deep">
                  {p.title}
                </h3>
                <p className="dual-label__function mt-1">{p.functional}</p>
                <p className="mt-3 text-[0.92rem] leading-relaxed text-ink-soft">
                  {p.body}
                </p>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-center text-[0.98rem] leading-relaxed text-ink-soft">
            Đủ cả ba trụ, bạn nhận danh hiệu{" "}
            <strong className="text-ink">Nhận thức — Hành động — Ý chí</strong> —
            tấm vé duy nhất bước vào Nguyệt Thí.
          </p>
        </div>
      </section>

      {/* ===== Danh hiệu ===== */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <SectionHeading label="Hành trình" title="Mười tám danh hiệu, không mua được cái nào" />
            <p className="mt-6 text-[1.02rem] leading-relaxed text-ink-soft">
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
      </section>

      {/* ===== Nguyệt Thí ===== */}
      <section className="border-y border-line bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <SectionHeading
            label="Cuộc thi hàng tháng"
            title="Nguyệt Thí"
            align="center"
          />
          <p className="mx-auto mt-6 max-w-2xl text-center text-[1.02rem] leading-relaxed text-ink-soft">
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

          <div className="mt-10 text-center">
            <ButtonLink href="/nguyet-thi" variant="gold">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              Cách tham gia Nguyệt Thí
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ===== CTA cuối ===== */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="border border-line bg-paper p-10 text-center shadow-card md:p-14">
          <h2 className="font-display text-3xl font-bold leading-tight text-navy-deep md:text-4xl">
            Hành trình bắt đầu bằng một bài đọc
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[1.02rem] leading-relaxed text-ink-soft">
            Tài khoản miễn phí, đề công khai miễn phí, đáp án miễn phí. Bạn chỉ
            trả tiền khi muốn mở thêm đề hoặc dùng lớp chữa bài sâu.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/dang-ky" variant="primary">
              Tạo tài khoản
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/thanh-toan" variant="outline">
              Xem bảng giá
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
