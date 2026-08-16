import type { TerritoryCode } from "./world.ts";

export const TERRITORY_LAYER_OPACITY = {
  idle: 0.68,
  active: 1,
  dimmed: 0.18,
} as const;

export type TerritoryInteractionState = Readonly<{
  hoveredCode: TerritoryCode | null;
  focusedCode: TerritoryCode | null;
}>;

export type TerritoryInteractionEvent =
  | { type: "pointer-enter"; code: TerritoryCode }
  | { type: "pointer-leave" }
  | { type: "focus"; code: TerritoryCode }
  | { type: "blur" };

export const TERRITORY_INTERACTION_IDLE: TerritoryInteractionState = {
  hoveredCode: null,
  focusedCode: null,
};

export function territoryInteractionState(
  state: TerritoryInteractionState,
  event: TerritoryInteractionEvent,
): TerritoryInteractionState {
  switch (event.type) {
    case "pointer-enter":
      return { ...state, hoveredCode: event.code };
    case "pointer-leave":
      return { ...state, hoveredCode: null };
    case "focus":
      return { ...state, focusedCode: event.code };
    case "blur":
      return { ...state, focusedCode: null };
  }
}

export function territoryActiveCode({
  hoveredCode,
  focusedCode,
}: TerritoryInteractionState): TerritoryCode | null {
  return focusedCode ?? hoveredCode;
}

export function territoryLayerOpacity(
  activeCode: TerritoryCode | null,
  candidateCode: TerritoryCode,
): number {
  if (activeCode === null) return TERRITORY_LAYER_OPACITY.idle;
  return activeCode === candidateCode
    ? TERRITORY_LAYER_OPACITY.active
    : TERRITORY_LAYER_OPACITY.dimmed;
}

export function territoryLayerState(
  activeCode: TerritoryCode | null,
  candidateCode: TerritoryCode,
) {
  return {
    opacity: territoryLayerOpacity(activeCode, candidateCode),
    isActive: activeCode === candidateCode,
  };
}

export const TERRITORY_HIT_PATHS: Record<TerritoryCode, string> = {
  TERRITORY_WEI:
    "M 367 90 C 560 30 1000 20 1300 55 C 1500 85 1560 250 1500 430 C 1390 520 1180 535 1030 570 C 870 530 700 500 565 420 C 450 350 365 220 367 90 Z",
  TERRITORY_SHU:
    "M 164 245 C 230 115 430 70 610 95 C 780 120 965 210 1131 360 C 1080 500 1030 665 920 865 C 690 850 460 830 310 735 C 185 625 135 420 164 245 Z",
  TERRITORY_WU:
    "M 780 330 C 940 190 1190 45 1390 28 C 1510 90 1555 300 1527 540 L 1495 914 C 1250 905 1030 900 820 870 C 650 800 530 705 451 590 C 555 480 660 400 780 330 Z",
};

export const TERRITORY_LABEL_POSITIONS: Record<
  TerritoryCode,
  { x: number; y: number }
> = {
  TERRITORY_WEI: { x: 70, y: 28 },
  TERRITORY_SHU: { x: 34, y: 65 },
  TERRITORY_WU: { x: 74, y: 68 },
};
