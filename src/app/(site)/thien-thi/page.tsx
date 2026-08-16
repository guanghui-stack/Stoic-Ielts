import { TierCompetitionView } from "@/components/competition/tier-competition-view";

export const metadata = { title: "Thiên Thí — Cuộc thi Reading hằng năm" };
export const dynamic = "force-dynamic";

export default function AnnualCompetitionPage() {
  return <TierCompetitionView tier="ANNUAL" />;
}
