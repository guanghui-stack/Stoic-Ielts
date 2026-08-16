"use client";

import Image from "next/image";
import { Lock } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { ART_ASSETS, type ArtAsset } from "@/lib/brand/art-manifest";
import {
  TERRITORY_HIT_PATHS,
  TERRITORY_INTERACTION_IDLE,
  TERRITORY_LABEL_POSITIONS,
  territoryActiveCode,
  territoryInteractionState,
  territoryLayerState,
} from "@/lib/campaign/territory-map";
import type {
  TerritoryArtKey,
  TerritoryPlace,
} from "@/lib/campaign/world";

const ART_BY_KEY: Record<TerritoryArtKey, ArtAsset> = {
  wei: ART_ASSETS.territoryWei,
  shu: ART_ASSETS.territoryShu,
  wu: ART_ASSETS.territoryWu,
};

type LabelStyle = CSSProperties & {
  "--territory-x": string;
  "--territory-y": string;
};

export function FactionTerritoryMap({
  territories,
}: {
  territories: readonly TerritoryPlace[];
}) {
  const [interaction, setInteraction] = useState(TERRITORY_INTERACTION_IDLE);
  const activeCode = territoryActiveCode(interaction);

  return (
    <section className="faction-territory-map" aria-labelledby="faction-territory-title">
      <div className="territory-map-heading">
        <p className="label-caps">Lãnh địa Tam Quốc</p>
        <h2 id="faction-territory-title" className="font-display text-2xl font-bold text-navy-deep">
          Ba cõi chưa khai mở
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Ngụy, Thục và Ngô sẽ trở thành lựa chọn phe khi bạn đạt cấp bậc yêu cầu.
        </p>
      </div>

      <div
        className="territory-map-canvas hidden lg:block"
        data-active-territory={activeCode ?? "none"}
        onPointerLeave={() =>
          setInteraction((state) => territoryInteractionState(state, { type: "pointer-leave" }))
        }
      >
        <Image
          src={ART_ASSETS.territoryBase.src}
          alt=""
          fill
          sizes="(min-width: 1280px) 1216px, 100vw"
          className="territory-map-layer territory-map-base territory-base-layer object-contain"
          aria-hidden="true"
        />

        {territories.map((territory) => {
          const layerState = territoryLayerState(activeCode, territory.code);

          return (
            <Image
              key={territory.code}
              src={ART_BY_KEY[territory.artKey].src}
              alt=""
              fill
              sizes="(min-width: 1280px) 1216px, 100vw"
              className={`territory-map-layer territory-map-overlay territory-${territory.artKey}-layer object-contain`}
              data-territory-layer={territory.code}
              style={{ opacity: layerState.opacity }}
              aria-hidden="true"
            />
          );
        })}

        <svg
          className="territory-map-hit-layer territory-interaction-layer"
          viewBox="0 0 1672 941"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {territories.map((territory) => (
            <path
              key={territory.code}
              d={TERRITORY_HIT_PATHS[territory.code]}
              className="territory-map-hit-path"
              data-territory-hit={territory.code}
              onPointerEnter={() =>
                setInteraction((state) =>
                  territoryInteractionState(state, { type: "pointer-enter", code: territory.code }),
                )
              }
              onPointerLeave={() =>
                setInteraction((state) => territoryInteractionState(state, { type: "pointer-leave" }))
              }
            />
          ))}
        </svg>

        <div className="territory-map-labels territory-landmarks-layer">
          {territories.map((territory) => {
            const position = TERRITORY_LABEL_POSITIONS[territory.code];
            const layerState = territoryLayerState(activeCode, territory.code);
            const style = {
              "--territory-x": `${position.x}%`,
              "--territory-y": `${position.y}%`,
            } as LabelStyle;

            return (
              <button
                key={territory.code}
                type="button"
                aria-disabled="true"
                aria-label={`${territory.title} — ${territory.lockedMessage}`}
                className="territory-map-label"
                data-active={layerState.isActive ? "true" : "false"}
                style={style}
                onPointerEnter={() =>
                  setInteraction((state) =>
                    territoryInteractionState(state, { type: "pointer-enter", code: territory.code }),
                  )
                }
                onPointerLeave={() =>
                  setInteraction((state) => territoryInteractionState(state, { type: "pointer-leave" }))
                }
                onFocus={() =>
                  setInteraction((state) =>
                    territoryInteractionState(state, { type: "focus", code: territory.code }),
                  )
                }
                onBlur={() =>
                  setInteraction((state) => territoryInteractionState(state, { type: "blur" }))
                }
              >
                <Lock className="size-4" aria-hidden="true" />
                <span className="font-display font-bold text-navy-deep">{territory.title}</span>
                <span className="font-ui text-xs text-ink-soft">{territory.lockedMessage}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:hidden">
        <div className="territory-map-canvas territory-map-mobile-composite" aria-hidden="true">
          <Image
            src={ART_ASSETS.territoryBase.src}
            alt=""
            fill
            sizes="100vw"
            className="territory-map-layer territory-map-base territory-base-layer object-contain"
          />
          {territories.map((territory) => (
            <Image
              key={territory.code}
              src={ART_BY_KEY[territory.artKey].src}
              alt=""
              fill
              sizes="100vw"
              className={`territory-map-layer territory-map-overlay territory-${territory.artKey}-layer object-contain`}
              style={{ opacity: 0.68 }}
            />
          ))}
        </div>
        <ul className="territory-map-mobile-list">
          {territories.map((territory) => (
            <li key={territory.code} className="territory-map-mobile-card">
              <Lock className="size-4" aria-hidden="true" />
              <span>
                <strong className="block font-display text-navy-deep">{territory.title}</strong>
                <span className="font-ui text-xs text-ink-soft">{territory.lockedMessage}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
