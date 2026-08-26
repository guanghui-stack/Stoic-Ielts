import { TierCompetitionView } from "@/components/competition/tier-competition-view";

export const metadata = { title: "Thử Thách Năm — IELTS Reading" };
export const dynamic = "force-dynamic";

export default function AnnualCompetitionPage() {
  return <TierCompetitionView tier="ANNUAL" />;
}
