import { notFound } from "next/navigation";
import { features } from "@/lib/features";
import { TierCompetitionView } from "@/components/competition/tier-competition-view";

export const metadata = { title: "Thiên Thí — Cuộc thi Reading hằng năm" };
export const dynamic = "force-dynamic";

export default function AnnualCompetitionPage() {
  if (!features.competitionTiers) notFound();
  return <TierCompetitionView tier="ANNUAL" />;
}
