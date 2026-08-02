import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Library,
  Timer,
  CheckCircle2,
  Brain,
  Trophy,
} from "lucide-react";
import { ButtonLink, NoteBox, SectionHeading } from "@/components/ui";

const READING_MODULES = [
  {
    href: "/luyen-tap/reading",
    title: "Academic",
    label: "Kho đề hiện tại",
    description:
      "Passage học thuật, đề Full Test 60 phút, chấm điểm tự động và chữa sâu bằng phương pháp Feynman.",
    icon: BookOpen,
  },
  {
    href: "/luyen-tap/reading/general",
    title: "General",
    label: "Kho đề riêng",
    description:
      "Không gian dành riêng cho IELTS General Training Reading. Nội dung sẽ được cập nhật trong thời gian tới.",
    icon: Library,
  },
] as const;

const FEATURES = [
  {
    icon: Timer,
    title: "Đúng áp lực phòng thi",
    description: "Đồng hồ đếm ngược và tự động nộp bài khi hết thời gian.",
  },
  {
    icon: CheckCircle2,
    title: "Kết quả tức thì",
    description: "Chấm điểm tự động ngay sau khi nộp và lưu lại lịch sử học tập.",
  },
  {
    icon: Brain,
    title: "Chữa bài có phương pháp",
    description: "Nhận diện bẫy, tìm bằng chứng và tự giảng lại bằng Feynman.",
  },
  {
    icon: Trophy,
    title: "Hành trình có thành tựu",
    description: "Theo dõi tiến bộ qua danh hiệu, Điện Danh Vọng và Bảng Vàng.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="label-caps">Wobridges IELTS Reading</p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.12] text-navy-deep md:text-6xl">
              Luyện Reading có chiến lược, tiến bộ có dấu mốc
            </h1>
            <div className="rule-gold mt-7" />
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-ink-soft">
              Tập trung chuyên sâu vào IELTS Reading với kho đề tách biệt cho
              <strong className="text-ink"> Academic</strong> và
              <strong className="text-ink"> General</strong>, điều kiện làm bài
              sát phòng thi và hệ thống theo dõi hành trình học tập.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/luyen-tap/reading" variant="primary">
                Reading Academic
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/luyen-tap/reading/general" variant="outline">
                Reading General
              </ButtonLink>
            </div>
          </div>

          <dl className="mt-14 grid gap-x-12 gap-y-8 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <dt className="label-caps flex items-center gap-2">
                  <feature.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {feature.title}
                </dt>
                <dd className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft">
                  {feature.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <SectionHeading
          label="Kho Reading"
          title="Chọn đúng định dạng bài thi của bạn"
          align="center"
        />
        <div className="mt-12 grid gap-px border border-line bg-line md:grid-cols-2">
          {READING_MODULES.map((module) => (
            <Link
              key={module.title}
              href={module.href}
              className="group bg-paper p-8 transition-colors hover:bg-cream md:p-10"
            >
              <module.icon className="h-7 w-7 text-gold" aria-hidden="true" />
              <p className="label-caps mt-6">{module.label}</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-navy-deep">
                Reading {module.title}
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
                {module.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-navy transition-colors group-hover:text-gold">
                Mở kho đề
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-paper">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center md:py-20">
          <SectionHeading
            label="Bắt đầu hành trình"
            title="Sẵn sàng chinh phục IELTS Reading?"
            align="center"
          />
          <p className="mx-auto mt-6 max-w-xl text-[1.02rem] leading-relaxed text-ink-soft">
            Tạo tài khoản để làm đề, lưu kết quả và theo dõi từng dấu mốc tiến bộ.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/dang-ky" variant="gold">
              Đăng ký
            </ButtonLink>
            <ButtonLink href="/luyen-tap/reading" variant="outline">
              Xem kho Academic
            </ButtonLink>
          </div>
          <NoteBox className="mt-12 text-left" title="Lưu ý">
            Kho General đã được tách riêng và sẽ hiển thị đề ngay khi trung tâm
            xuất bản nội dung phù hợp với định dạng General Training.
          </NoteBox>
        </div>
      </section>
    </>
  );
}
