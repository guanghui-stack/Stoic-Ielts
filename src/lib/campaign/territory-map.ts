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
    "M 164 245 L 367 90 L 900 25 L 1390 28 L 1400 260 L 1250 400 L 870 470 L 565 420 Z",
  TERRITORY_SHU:
    "M 164 245 L 565 420 L 870 470 L 820 870 L 310 735 Z",
  TERRITORY_WU:
    "M 1390 28 L 1527 540 L 1495 914 L 820 870 L 870 470 L 1250 400 L 1400 260 Z",
};

export const TERRITORY_LABEL_POSITIONS: Record<
  TerritoryCode,
  { x: number; y: number }
> = {
  TERRITORY_WEI: { x: 70, y: 28 },
  TERRITORY_SHU: { x: 34, y: 65 },
  TERRITORY_WU: { x: 74, y: 68 },
};
