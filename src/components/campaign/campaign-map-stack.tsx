import { CampaignMap } from "@/components/campaign/campaign-map";
import { FactionTerritoryMap } from "@/components/campaign/faction-territory-map";
import { StoicPillarCards } from "@/components/campaign/stoic-pillar-cards";
import { CAMPAIGN_MAP_SECTION_ORDER } from "@/lib/campaign/campaign-map-layout";
import type { CampaignWorld } from "@/lib/campaign/world";

export function CampaignMapStack({
  world,
  variant,
  territoryOwnerCode = null,
  territoryOwnerLabel = null,
  seasonCode = null,
  showPillarCards = false,
}: {
  world: CampaignWorld;
  variant: "portal" | "student";
  territoryOwnerCode?: string | null;
  territoryOwnerLabel?: string | null;
  seasonCode?: string | null;
  showPillarCards?: boolean;
}) {
  return (
    <div className="space-y-8">
      {CAMPAIGN_MAP_SECTION_ORDER.map((section) =>
        section === "territories" ? (
          showPillarCards ? (
            <StoicPillarCards
              key={section}
              territories={world.territories}
              ownerLabel={territoryOwnerLabel}
              seasonCode={seasonCode}
            />
          ) : (
            <FactionTerritoryMap
              key={section}
              territories={world.territories}
              ownerCode={territoryOwnerCode}
              ownerLabel={territoryOwnerLabel}
              seasonCode={seasonCode}
            />
          )
        ) : (
          <CampaignMap key={section} world={world} variant={variant} />
        ),
      )}
    </div>
  );
}
