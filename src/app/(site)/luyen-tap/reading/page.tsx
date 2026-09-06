import type { Metadata } from "next";
import { ReadingModulePage } from "@/components/reading-module-page";

export const metadata: Metadata = {
  title: "STOIC · IELTS — Reading Academic",
  description:
    "Kho luyện IELTS Reading Academic theo tinh thần học có chủ đích: passage học thuật, format rõ ràng và quy đổi band sau khi nộp.",
};

export default async function ReadingAcademicPage({searchParams}: {searchParams: Promise<{bai?: string}>}) {
  const {bai} = await searchParams;
  return <ReadingModulePage module="ACADEMIC" exerciseId={typeof bai === "string" && bai.length <= 191 ? bai : undefined} />;
}
