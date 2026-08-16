import { LOCKED_TERRITORIES } from "../src/lib/campaign/world.ts";
import { CAMPAIGN_MAP_SECTION_ORDER } from "../src/lib/campaign/campaign-map-layout.ts";
import {
  TERRITORY_HIT_PATHS,
  TERRITORY_INTERACTION_IDLE,
  TERRITORY_LABEL_POSITIONS,
  territoryActiveCode,
  territoryInteractionState,
  territoryLayerOpacity,
  territoryLayerState,
} from "../src/lib/campaign/territory-map.ts";

let failures = 0;

type Point = Readonly<{ x: number; y: number }>;

function cubicPoint(start: Point, controlA: Point, controlB: Point, end: Point, t: number): Point {
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * start.x +
      3 * inverse ** 2 * t * controlA.x +
      3 * inverse * t ** 2 * controlB.x +
      t ** 3 * end.x,
    y:
      inverse ** 3 * start.y +
      3 * inverse ** 2 * t * controlA.y +
      3 * inverse * t ** 2 * controlB.y +
      t ** 3 * end.y,
  };
}

function flattenSvgPath(path: string): readonly Point[] {
  const tokens = path.match(/[MLCZ]|-?\d+(?:\.\d+)?/gi) ?? [];
  const points: Point[] = [];
  let cursor: Point = { x: 0, y: 0 };
  let command = "";
  let index = 0;

  const readPoint = (): Point => {
    const point = { x: Number(tokens[index]), y: Number(tokens[index + 1]) };
    index += 2;
    return point;
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[MLCZ]$/i.test(token)) {
      command = token.toUpperCase();
      index += 1;
    }

    if (command === "M" || command === "L") {
      cursor = readPoint();
      points.push(cursor);
      command = "L";
      continue;
    }

    if (command === "C") {
      const controlA = readPoint();
      const controlB = readPoint();
      const end = readPoint();
      for (let step = 1; step <= 24; step += 1) {
        points.push(cubicPoint(cursor, controlA, controlB, end, step / 24));
      }
      cursor = end;
      continue;
    }

    if (command === "Z") break;
    throw new Error(`Unsupported SVG path command near ${tokens[index] ?? "end"}`);
  }

  return points;
}

function pointIsInsidePolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crossesRay =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;
    if (crossesRay) inside = !inside;
  }
  return inside;
}

function territoryOwnersAtCanvasPoint(point: Point) {
  const svgPoint = { x: (point.x / 100) * 1672, y: (point.y / 100) * 941 };
  return LOCKED_TERRITORIES.filter((territory) =>
    pointIsInsidePolygon(svgPoint, flattenSvgPath(TERRITORY_HIT_PATHS[territory.code])),
  ).map((territory) => territory.code);
}

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failures += 1;
}

check(
  "campaign map section order keeps territories before gates",
  CAMPAIGN_MAP_SECTION_ORDER,
  ["territories", "gates"],
);

check(
  "approved territory identity and art mapping",
  LOCKED_TERRITORIES.map((item) => ({
    code: item.code,
    artKey: item.artKey,
    title: item.title,
    functionalLabel: item.functionalLabel,
  })),
  [
    { code: "TERRITORY_WEI", artKey: "wei", title: "Ngụy", functionalLabel: "Lãnh địa phía bắc" },
    { code: "TERRITORY_SHU", artKey: "shu", title: "Thục", functionalLabel: "Lãnh địa phía tây" },
    { code: "TERRITORY_WU", artKey: "wu", title: "Ngô", functionalLabel: "Lãnh địa phía đông nam" },
  ],
);
check("idle opacity", territoryLayerOpacity(null, "TERRITORY_WEI"), 0.68);
check("active opacity", territoryLayerOpacity("TERRITORY_WEI", "TERRITORY_WEI"), 1);
check("dimmed opacity", territoryLayerOpacity("TERRITORY_WEI", "TERRITORY_SHU"), 0.18);

let interaction = territoryInteractionState(TERRITORY_INTERACTION_IDLE, {
  type: "pointer-enter",
  code: "TERRITORY_WEI",
});
check("hover A activates A", territoryActiveCode(interaction), "TERRITORY_WEI");

interaction = territoryInteractionState(interaction, {
  type: "focus",
  code: "TERRITORY_SHU",
});
check("focus B takes precedence while A remains hovered", territoryActiveCode(interaction), "TERRITORY_SHU");
check(
  "focus B preserves the independently hovered A",
  interaction,
  { hoveredCode: "TERRITORY_WEI", focusedCode: "TERRITORY_SHU" },
);

interaction = territoryInteractionState(interaction, { type: "pointer-leave" });
check("pointer leave keeps focused B active", territoryActiveCode(interaction), "TERRITORY_SHU");

interaction = territoryInteractionState(TERRITORY_INTERACTION_IDLE, {
  type: "pointer-enter",
  code: "TERRITORY_WEI",
});
interaction = territoryInteractionState(interaction, {
  type: "focus",
  code: "TERRITORY_SHU",
});
interaction = territoryInteractionState(interaction, { type: "blur" });
check("blur B restores hovered A", territoryActiveCode(interaction), "TERRITORY_WEI");

interaction = territoryInteractionState(TERRITORY_INTERACTION_IDLE, {
  type: "pointer-enter",
  code: "TERRITORY_WEI",
});
interaction = territoryInteractionState(interaction, { type: "pointer-leave" });
check("individual hit-region leave returns an unfocused map to idle", territoryActiveCode(interaction), null);

for (const territory of LOCKED_TERRITORIES) {
  check(`${territory.title} is active when selected`, territoryLayerOpacity(territory.code, territory.code), 1);
  check(
    `${territory.title} dims every other territory`,
    LOCKED_TERRITORIES
      .filter((candidate) => candidate.code !== territory.code)
      .every((candidate) => territoryLayerOpacity(territory.code, candidate.code) === 0.18),
    true,
  );
  check(
    `${territory.title} synchronizes its active overlay and label state`,
    territoryLayerState(territory.code, territory.code),
    { opacity: 1, isActive: true },
  );
  check(
    `${territory.title} leaves dimmed labels inactive`,
    LOCKED_TERRITORIES
      .filter((candidate) => candidate.code !== territory.code)
      .every(
        (candidate) => {
          const state = territoryLayerState(territory.code, candidate.code);
          return state.opacity === 0.18 && state.isActive === false;
        },
      ),
    true,
  );
}
check("all hit paths exist", Object.values(TERRITORY_HIT_PATHS).every(Boolean), true);
for (const { title, point, expectedOwner } of [
  { title: "Ngụy", point: { x: 70, y: 18 }, expectedOwner: "TERRITORY_WEI" },
  { title: "Thục", point: { x: 40, y: 52 }, expectedOwner: "TERRITORY_SHU" },
  { title: "Ngô", point: { x: 75, y: 72 }, expectedOwner: "TERRITORY_WU" },
] as const) {
  const owners = territoryOwnersAtCanvasPoint(point);
  check(`${title} representative interior has exactly one owner`, owners, [expectedOwner]);
  check(
    `${title} representative interior resolves to its visible territory`,
    owners.at(-1),
    expectedOwner,
  );
}
let overlappingInteriorSamples = 0;
for (let x = 1; x < 100; x += 2) {
  for (let y = 1; y < 100; y += 2) {
    if (territoryOwnersAtCanvasPoint({ x, y }).length > 1) overlappingInteriorSamples += 1;
  }
}
check("sampled territorial interiors never have competing hit owners", overlappingInteriorSamples, 0);
check(
  "all label positions stay inside the canvas",
  Object.values(TERRITORY_LABEL_POSITIONS).every(
    ({ x, y }) => x >= 0 && x <= 100 && y >= 0 && y <= 100,
  ),
  true,
);
check("territories remain inert", LOCKED_TERRITORIES.every((item) => item.href === null), true);
check(
  "locked copy remains exact",
  LOCKED_TERRITORIES.every((item) => item.lockedMessage === "Mở khi đạt cấp bậc yêu cầu"),
  true,
);

process.exit(failures === 0 ? 0 : 1);
