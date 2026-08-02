import type { Metadata } from "next";
import { PageHero, NoteBox } from "@/components/ui";
import { ExerciseList } from "@/components/exercise-list";

export const metadata: Metadata = {
  title: "IELTS Reading General",
  description:
    "Kho luyện IELTS General Training Reading của Wobridges, tách biệt với nội dung Academic.",
};

export default function GeneralReadingPage() {
  return (
    <>
      <PageHero
        label="IELTS Reading · General"
        title="Kho Reading General"
        lede="Không gian riêng cho định dạng General Training Reading. Các đề Academic không xuất hiện trong kho này."
      />
      <section className="mx-auto max-w-5xl px-6 py-14">
        <ExerciseList readingType="GENERAL" />
        <NoteBox className="mt-10" title="Kho đề riêng">
          Nội dung General sẽ được cập nhật tại đây. Khi quản trị viên tạo và
          xuất bản đề General đầu tiên, đề sẽ tự động xuất hiện mà không ảnh
          hưởng đến kho Academic.
        </NoteBox>
      </section>
    </>
  );
}
