import { notFound } from "next/navigation";
import { features } from "@/lib/features";
import { TierCompetitionView } from "@/components/competition/tier-competition-view";

export const metadata = { title: "Dương Thí — Cuộc thi Reading hằng quý" };
export const dynamic = "force-dynamic";

export default function QuarterlyCompetitionPage() {
  // Cờ tắt thì trang coi như chưa tồn tại, không hiện trang trống kèm lời hứa.
  if (!features.competitionTiers) notFound();
  return <TierCompetitionView tier="QUARTERLY" />;
}
