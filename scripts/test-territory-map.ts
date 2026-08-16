import { LOCKED_TERRITORIES } from "../src/lib/campaign/world.ts";
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

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failures += 1;
}

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
