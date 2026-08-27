import type { Metadata } from "next";
import { ReadingModulePage } from "@/components/reading-module-page";

export const metadata: Metadata = {
  title: "STOIC · IELTS — Reading General",
  description:
    "Kho luyện IELTS General Training Reading theo tinh thần học có chủ đích, tách rõ với Academic để bạn luyện đúng kỳ thi mình sắp dự.",
};

export default function ReadingGeneralPage() {
  return <ReadingModulePage module="GENERAL" />;
}
