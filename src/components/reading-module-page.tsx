import Link from "next/link";
import { Layers } from "lucide-react";
import { READING_NAV } from "@/lib/nav";
import { PageHero, NoteBox, ButtonLink } from "@/components/ui";
import { ExerciseList } from "@/components/exercise-list";

/**
 * Khung chung cho hai trang Reading Academic và General.
 *
 * Hai dạng đề dùng chung mọi thứ trừ nội dung, nên viết một lần rồi truyền
 * tham số — sửa một chỗ là cả hai trang cùng đúng.
 */
export function ReadingModulePage({
  module,
}: {
  module: "ACADEMIC" | "GENERAL";
}) {
  const info = READING_NAV.find((m) => m.module === module)!;
  const other = READING_NAV.find((m) => m.module !== module)!;

  return (
    <div className="stoic-reading-surface" data-reading-module={module.toLowerCase()}>
      <PageHero
        label={`Luyện tập · Reading ${info.label}`}
        title={`Kho Reading ${info.label}`}
        lede={info.blurb}
      />

      <section className="mx-auto max-w-5xl px-6 py-14">
        <p className="mb-10 flex flex-wrap items-center gap-x-2 gap-y-1 border-l-4 border-line-strong bg-cream-deep px-5 py-4 font-ui text-sm text-ink-soft">
          Bạn đang xem đề <strong className="text-ink">{info.label}</strong>. Thi
          dạng khác?
          <Link
            href={other.href}
            className="font-semibold text-navy underline underline-offset-4 transition-colors hover:text-stoic-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/40"
          >
            Chuyển sang {other.label}
          </Link>
        </p>

        <div className="mb-10 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-stoic-primary/35 bg-stoic-primary-soft/55 p-7 shadow-card">
          <div className="min-w-0">
            <p className="label-caps flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-stoic-primary-deep" aria-hidden="true" />
              Vùng luyện Full Test
            </p>
            <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep">
              Ghép ba bài đọc thành một đề 60 phút
            </h2>
            <p className="mt-2 max-w-xl text-[0.93rem] leading-relaxed text-ink-soft">
              Band trên đề một bài đọc dễ chênh vì quá ít câu. Làm trọn ba bài
              cho con số sát thực tế hơn — và chỉ đề do hệ thống ghép mới được
              tính vào danh hiệu.
            </p>
          </div>
            <ButtonLink
              href={`/luyen-tap/reading/ghep-de?dang=${module}`}
              variant="primary"
            >
              <Layers className="h-4 w-4" aria-hidden="true" />
              Ghép đề
            </ButtonLink>
        </div>

        <ExerciseList readingType={module} />

        <NoteBox className="mt-10 rounded-2xl" title="Cách luyện cho hiệu quả">
          Đọc câu hỏi trước khi đọc bài để biết mình cần tìm gì. Với dạng
          TRUE/FALSE/NOT GIVEN, bám sát nghĩa đen của câu — đừng suy diễn từ
          kiến thức bên ngoài. Làm xong đừng vội đóng trang: phần chữa bài mới
          là chỗ điểm số thật sự tăng lên.
        </NoteBox>
      </section>
    </div>
  );
}
