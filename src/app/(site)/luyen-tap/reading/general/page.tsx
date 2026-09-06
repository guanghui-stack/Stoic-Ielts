import type { Metadata } from "next";
import { ReadingModulePage } from "@/components/reading-module-page";

export const metadata: Metadata = {
  title: "STOIC · IELTS — Reading General",
  description:
    "Kho luyện IELTS General Training Reading theo tinh thần học có chủ đích, tách rõ với Academic để bạn luyện đúng kỳ thi mình sắp dự.",
};

export default async function ReadingGeneralPage({searchParams}: {searchParams: Promise<{bai?: string}>}) {
  const {bai} = await searchParams;
  return <ReadingModulePage module="GENERAL" exerciseId={typeof bai === "string" && bai.length <= 191 ? bai : undefined} />;
}
