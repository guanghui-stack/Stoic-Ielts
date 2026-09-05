import { CampaignMap } from "@/components/campaign/campaign-map";
import { StoicPillarCards } from "@/components/campaign/stoic-pillar-cards";
import { CAMPAIGN_MAP_SECTION_ORDER } from "@/lib/campaign/campaign-map-layout";
import type { CampaignWorld } from "@/lib/campaign/world";

/**
 * Khối bản đồ chiến dịch.
 *
 * Phần "ba trụ" từng có hai bản: bản bản-đồ ba vòng tròn và bản thẻ. Nay chỉ
 * còn bản thẻ — bản bản-đồ vẽ ba trụ thành ba vùng tách rời, ngược với điều
 * chính nó dạy ("ba trụ không phải ba giai đoạn tách rời"), nên đã gỡ hẳn.
 */
export function CampaignMapStack({
  world,
  variant,
  territoryOwnerLabel = null,
  seasonCode = null,
}: {
  world: CampaignWorld;
  variant: "portal" | "student";
  territoryOwnerLabel?: string | null;
  seasonCode?: string | null;
}) {
  return (
    <div className="space-y-8">
      {CAMPAIGN_MAP_SECTION_ORDER.map((section) =>
        section === "territories" ? (
          <StoicPillarCards
            key={section}
            territories={world.territories}
            ownerLabel={territoryOwnerLabel}
            seasonCode={seasonCode}
          />
        ) : (
          <CampaignMap key={section} world={world} variant={variant} />
        ),
      )}
    </div>
  );
}
