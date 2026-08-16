import { TierCompetitionView } from "@/components/competition/tier-competition-view";

export const metadata = { title: "Dương Thí — Cuộc thi Reading hằng quý" };
export const dynamic = "force-dynamic";

export default function QuarterlyCompetitionPage() {
  return <TierCompetitionView tier="QUARTERLY" />;
}
