import Link from "next/link";
import { Check, Flag, Lock, Play } from "lucide-react";
import type { CSSProperties } from "react";
import { ART_ASSETS } from "@/lib/brand/art-manifest";
import { InkWashArt } from "@/components/brand/ink-wash-art";
import { WorldLandmarkRail } from "@/components/campaign/world-landmark-rail";
import { STATE_LABELS, type CampaignNodeView } from "@/lib/campaign/view";
import { stoicTrialLabel, stoicTrialTitle, type CampaignWorld } from "@/lib/campaign/world";

const NODE_STYLE: Record<
  CampaignNodeView["state"],
  { ring: string; dot: string; Icon: typeof Lock }
> = {
  LOCKED: { ring: "border-line text-muted", dot: "bg-cream-deep", Icon: Lock },
  AVAILABLE: { ring: "border-gold text-gold-ink", dot: "bg-gold-pale", Icon: Play },
  ACTIVE: { ring: "border-azure text-azure-ink", dot: "bg-azure-pale", Icon: Play },
  PASSED: {
    ring: "border-vermilion text-vermilion-ink",
    dot: "bg-vermilion-pale",
    Icon: Check,
  },
};

type MarkerStyle = CSSProperties & { "--world-marker-delay": string };

function nodeLabel(node: CampaignNodeView): string {
  const parts = [
    `${stoicTrialTitle(node)} — ${stoicTrialLabel(node)}`,
    STATE_LABELS[node.state],
  ];
  if (node.hint) parts.push(`Còn thiếu: ${node.hint}`);
  return parts.join(". ");
}

function GateMarkerContent({ node }: { node: CampaignNodeView }) {
  const style = NODE_STYLE[node.state];
  const Icon = style.Icon;

  return (
    <>
      <span
        className={`world-map-marker-seal flex size-10 items-center justify-center rounded-full border-2 ${style.ring} ${style.dot}`}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      {node.isCurrent ? (
        <span className="world-map-marker-current flex items-center gap-1 text-[11px] font-semibold text-vermilion-ink">
          <Flag className="size-3" aria-hidden />
          Đang ở đây
        </span>
      ) : null}
      <span className="font-display text-sm font-semibold text-navy-deep">
        {stoicTrialTitle(node)}
      </span>
      <span className="font-ui text-[11px] leading-tight text-muted">
        {stoicTrialLabel(node)}
      </span>
    </>
  );
}

function GateMarker({ node, index }: { node: CampaignNodeView; index: number }) {
  const content = <GateMarkerContent node={node} />;
  const style = {
    "--world-marker-delay": `${Math.min(index * 70, 350)}ms`,
  } as MarkerStyle;

  if (node.state === "LOCKED") {
    return (
      <div
        aria-disabled="true"
        aria-label={nodeLabel(node)}
        className="world-map-marker is-locked"
        style={style}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/hoc-vien/thi-luyen/${node.trialCode}`}
      aria-label={nodeLabel(node)}
      className="world-map-marker world-action"
      style={style}
    >
      {content}
    </Link>
  );
}

function campaignPath(nodes: CampaignNodeView[]): string {
  return nodes.map((node, index) => `${index === 0 ? "M" : "L"} ${node.x} ${node.y}`).join(" ");
}

export function CampaignMap({
  world,
  variant,
}: {
  world: CampaignWorld;
  variant: "portal" | "student";
}) {
  return (
    <div className="world-map-desktop hidden lg:block" data-map-variant={variant}>
        <section
        aria-label="Bản đồ tám chặng thực hành"
        className="world-map-stage relative overflow-hidden border border-line bg-paper"
      >
        <div className="world-map-art-layer" aria-hidden="true">
          <div className="world-map-art-fallback" />
          <InkWashArt asset={ART_ASSETS.campaignMap} className="object-cover opacity-70" />
        </div>

        <div className="world-map-route-layer">
          <svg
            className="world-map-path-layer"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              className="world-map-path-shadow"
              d={campaignPath(world.gates)}
              pathLength="1"
            />
            <path className="world-map-path" d={campaignPath(world.gates)} pathLength="1" />
          </svg>

          <ol className="world-map-gates m-0 list-none p-0">
            {world.gates.map((node, index) => (
              <li
                key={node.code}
                className="world-map-gate"
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                <GateMarker node={node} index={index} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <WorldLandmarkRail
        landmarks={world.landmarks}
        competitions={world.competitions}
      />
    </div>
  );
}
