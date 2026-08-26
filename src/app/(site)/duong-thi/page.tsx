import { TierCompetitionView } from "@/components/competition/tier-competition-view";

export const metadata = { title: "Thử Thách Quý — IELTS Reading" };
export const dynamic = "force-dynamic";

export default function QuarterlyCompetitionPage() {
  return <TierCompetitionView tier="QUARTERLY" />;
}
