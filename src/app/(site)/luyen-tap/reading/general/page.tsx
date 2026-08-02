import type { Metadata } from "next";
import { ReadingModulePage } from "@/components/reading-module-page";

export const metadata: Metadata = {
  title: "IELTS Reading General",
  description:
    "Kho đề IELTS General Training Reading của STOIC-IELTS, tách hoàn toàn khỏi kho Academic để bạn luyện đúng kỳ thi mình sắp dự.",
};

export default function ReadingGeneralPage() {
  return <ReadingModulePage module="GENERAL" />;
}
