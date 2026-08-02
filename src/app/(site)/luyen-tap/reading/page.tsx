import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { PageHero, NoteBox, ButtonLink } from "@/components/ui";
import { ExerciseList } from "@/components/exercise-list";

export const metadata: Metadata = {
  title: "Luyện tập Reading",
  description:
    "Phòng luyện IELTS Reading của Wobridges — passage học thuật chuẩn format, đồng hồ đếm ngược và chấm điểm tự động ngay khi nộp.",
};

export default function ReadingPage() {
  return (
    <>
      <PageHero
        label="Luyện tập 4 kỹ năng · Reading"
        title="Phòng luyện Reading"
        lede="Mỗi bài gồm một passage học thuật với đầy đủ dạng câu hỏi thi thật. Đồng hồ bắt đầu chạy ngay khi bạn mở đề — hết giờ, bài tự động nộp và được chấm ngay lập tức."
      />
      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-5 border border-gold bg-gold-pale p-7">
          <div className="min-w-0">
            <p className="label-caps flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              Đề Full Test
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
          <ButtonLink href="/luyen-tap/reading/ghep-de" variant="gold">
            <Layers className="h-4 w-4" aria-hidden="true" />
            Ghép đề
          </ButtonLink>
        </div>

        <ExerciseList skill="READING" />
        <NoteBox className="mt-10" title="Mẹo làm bài">
          Đọc câu hỏi trước khi đọc passage để biết cần tìm gì. Với dạng
          TRUE/FALSE/NOT GIVEN, hãy bám sát nghĩa đen của câu — đừng suy diễn từ
          kiến thức bên ngoài. Phân bổ tối đa 20 phút cho mỗi passage.
        </NoteBox>
      </section>
    </>
  );
}
