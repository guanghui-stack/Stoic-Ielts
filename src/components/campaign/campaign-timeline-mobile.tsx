import Link from "next/link";
import { Check, Flag, Lock, Play } from "lucide-react";
import { STATE_LABELS, type CampaignNodeView } from "@/lib/campaign/view";
import type { CampaignWorld, WorldPlace } from "@/lib/campaign/world";

const NODE_STYLE: Record<
  CampaignNodeView["state"],
  { ring: string; Icon: typeof Lock }
> = {
  LOCKED: { ring: "border-line bg-cream-deep text-muted", Icon: Lock },
  AVAILABLE: { ring: "border-gold bg-gold-pale text-gold-ink", Icon: Play },
  ACTIVE: { ring: "border-azure bg-azure-pale text-azure-ink", Icon: Play },
  PASSED: { ring: "border-vermilion bg-vermilion-pale text-vermilion-ink", Icon: Check },
};

function GateDetails({ node }: { node: CampaignNodeView }) {
  return (
    <>
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-display font-semibold text-navy-deep">{node.shortTitle}</span>
        <span className="font-ui text-xs text-muted">{node.functionalLabel}</span>
        {node.isCurrent ? (
          <span className="flex items-center gap-1 font-ui text-[11px] font-semibold text-vermilion-ink">
            <Flag className="size-3" aria-hidden />
            Đang ở đây
          </span>
        ) : null}
      </span>
      <span className="mt-1 block font-ui text-xs text-muted">{STATE_LABELS[node.state]}</span>
      {node.hint ? (
        <span className="mt-1 block text-xs text-ink-soft">Còn thiếu: {node.hint}</span>
      ) : null}
    </>
  );
}

function MobilePlaceList({ label, items }: { label: string; items: readonly WorldPlace[] }) {
  return (
    <section aria-label={label}>
      <p className="label-caps">{label}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) =>
          item.href ? (
            <li key={item.code}>
              <Link
                href={item.href}
                className="world-action block min-h-11 border border-line bg-paper px-4 py-3"
              >
                <span className="block font-display font-semibold text-navy-deep">{item.title}</span>
                <span className="block font-ui text-xs text-muted">{item.functionalLabel}</span>
              </Link>
            </li>
          ) : null,
        )}
      </ul>
    </section>
  );
}

export function CampaignTimelineMobile({ world }: { world: CampaignWorld }) {
  return (
    <div className="world-mobile-map space-y-8 lg:hidden">
      <ol className="m-0 list-none space-y-3 p-0">
        {world.gates.map((node, index) => {
          const style = NODE_STYLE[node.state];
          const Icon = style.Icon;
          const last = index === world.gates.length - 1;
          const gateClass =
            "flex-1 border border-line bg-paper p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

          return (
            <li key={node.code} className="relative flex gap-3">
              {!last ? (
                <span
                  aria-hidden="true"
                  className="absolute left-5 top-11 h-[calc(100%-0.5rem)] w-px bg-line"
                />
              ) : null}
              <span
                className={`z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 ${style.ring}`}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              {node.state === "LOCKED" ? (
                <div aria-disabled="true" className={`${gateClass} opacity-60`}>
                  <GateDetails node={node} />
                </div>
              ) : (
                <Link
                  href={`/hoc-vien/thi-luyen/${node.trialCode}`}
                  className={`world-action ${gateClass}`}
                >
                  <GateDetails node={node} />
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <MobilePlaceList label="Địa điểm" items={world.landmarks} />
      <MobilePlaceList label="Đại thí" items={world.competitions} />
    </div>
  );
}
