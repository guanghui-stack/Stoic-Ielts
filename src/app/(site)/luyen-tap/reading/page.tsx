import type { Metadata } from "next";
import { ReadingModulePage } from "@/components/reading-module-page";

export const metadata: Metadata = {
  title: "IELTS Reading Academic",
  description:
    "Kho đề IELTS Reading Academic của STOIC-IELTS — passage học thuật chuẩn format, đồng hồ đếm ngược và quy đổi band ngay khi nộp.",
};

export default function ReadingAcademicPage() {
  return <ReadingModulePage module="ACADEMIC" />;
}
