# Faction Territory Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate layered Ngụy — Thục — Ngô map above the existing eight-gate campaign map, with accessible locked-state hover/focus highlighting and no faction-selection writes.

**Architecture:** Add a typed territory model and pure layer-state helpers, then render the four approved aligned images in a dedicated client component. Transparent SVG hit paths and focusable locked labels control only overlay opacity; the existing campaign map retains the learning gates and loses its three generic territory cards.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4, project CSS tokens, `next/image`, `lucide-react`, Node test scripts, Sharp already installed through Next.js.

## Global Constraints

- Use the approved 1672 × 941 mapping: `(1)` Base Map, `(2)` Ngụy, `(3)` Thục, `(4)` Ngô.
- Keep all three territories locked with the exact copy `Mở khi đạt cấp bậc yêu cầu` and `href: null`.
- Do not add database schema, DDL, API, faction membership, rank thresholds, or click-to-join behavior.
- Place the territory map immediately above the eight-gate map on the homepage and student campaign page.
- Remove the three generic locked-territory cards from the desktop gate map and mobile gate timeline.
- Motion is state indication only: CSS `opacity`, 180ms `ease`; reduced motion uses 120ms opacity only.
- Gate pointer hover with `@media (hover: hover) and (pointer: fine)` and provide equivalent keyboard focus.
- Do not add a motion library or any dependency.
- Keep all Reading, exam, Reading result, Feynman Review, and admin AI Feynman source files unchanged.
- Keep Nguyệt Thí → Dương Thí → Thiên Thí order unchanged.
- All user-facing copy is Vietnamese; icons come from `lucide-react`; no emoji or Han characters.
- The two-mode ADMIN feature is explicitly deferred to the next project cycle.

---

## File Structure

### Create

- `src/lib/campaign/territory-map.ts` — pure opacity resolution, approved SVG hit paths, and label positions.
- `src/components/campaign/faction-territory-map.tsx` — layered visual, pointer hit areas, focusable locked labels, and mobile fallback.
- `scripts/test-territory-map.ts` — pure data and interaction tests.
- `scripts/test-territory-integration.mjs` — source-level structural test for placement and removal of legacy territory cards.
- `public/art/territories/base-map.webp` — optimized approved base.
- `public/art/territories/wei.webp` — optimized Ngụy overlay with alpha.
- `public/art/territories/shu.webp` — optimized Thục overlay with alpha.
- `public/art/territories/wu.webp` — optimized Ngô overlay with alpha.

### Modify

- `src/lib/campaign/world.ts` — meaningful territory codes, names, art keys, and specialized type.
- `src/lib/brand/art-manifest.ts` — four territory art registrations.
- `src/components/campaign/campaign-home-block.tsx` — render the territory map before the gate map.
- `src/app/(site)/hoc-vien/chien-dich/page.tsx` — render the same territory map before the student gate map.
- `src/components/campaign/campaign-map.tsx` — remove generic territory cards and their positions.
- `src/components/campaign/campaign-timeline-mobile.tsx` — remove the duplicate territory list.
- `src/app/globals.css` — territory canvas, layer opacity, hit areas, focus, responsive fallback, and removal of legacy territory CSS.
- `scripts/test-campaign-world.ts` — assert the approved Ngụy — Thục — Ngô model.
- `package.json` — add territory tests to the full suite.

---

### Task 1: Define the typed territory model and layer-state contract

**Files:**
- Create: `src/lib/campaign/territory-map.ts`
- Create: `scripts/test-territory-map.ts`
- Modify: `src/lib/campaign/world.ts:1-32,86-99,151-162`
- Modify: `scripts/test-campaign-world.ts:52-108`
- Modify: `package.json:6-36`

**Interfaces:**
- Produces: `TerritoryCode`, `TerritoryArtKey`, `TerritoryPlace`, and `LOCKED_TERRITORIES` from `src/lib/campaign/world.ts`.
- Produces: `territoryLayerOpacity(activeCode, candidateCode): number`, `TERRITORY_HIT_PATHS`, and `TERRITORY_LABEL_POSITIONS` from `src/lib/campaign/territory-map.ts`.
- Consumed by: `FactionTerritoryMap` in Task 3.

- [ ] **Step 1: Write the failing territory test**

Create `scripts/test-territory-map.ts` with explicit checks:

```ts
import { LOCKED_TERRITORIES } from "../src/lib/campaign/world.ts";
import {
  TERRITORY_HIT_PATHS,
  TERRITORY_LABEL_POSITIONS,
  territoryLayerOpacity,
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
```

Add this script to `package.json`:

```json
"test:territory-map": "node --experimental-strip-types scripts/test-territory-map.ts"
```

Insert `npm run test:territory-map` immediately after `npm run test:campaign-world` in the full `test` chain.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm.cmd run test:territory-map
```

Expected: FAIL because `src/lib/campaign/territory-map.ts` and the meaningful territory fields do not exist.

- [ ] **Step 3: Implement the minimal typed model**

In `src/lib/campaign/world.ts`, add:

```ts
export const TERRITORY_CODES = [
  "TERRITORY_WEI",
  "TERRITORY_SHU",
  "TERRITORY_WU",
] as const;

export type TerritoryCode = (typeof TERRITORY_CODES)[number];
export type TerritoryArtKey = "wei" | "shu" | "wu";

export type TerritoryPlace = Omit<WorldPlace, "code" | "kind"> & {
  code: TerritoryCode;
  kind: "TERRITORY";
  artKey: TerritoryArtKey;
};
```

Change `CampaignWorld.territories` to `readonly TerritoryPlace[]`, then replace the generic mapped values with:

```ts
export const LOCKED_TERRITORIES = [
  {
    code: "TERRITORY_WEI",
    kind: "TERRITORY",
    artKey: "wei",
    title: "Ngụy",
    functionalLabel: "Lãnh địa phía bắc",
    href: null,
    lockedMessage: "Mở khi đạt cấp bậc yêu cầu",
  },
  {
    code: "TERRITORY_SHU",
    kind: "TERRITORY",
    artKey: "shu",
    title: "Thục",
    functionalLabel: "Lãnh địa phía tây",
    href: null,
    lockedMessage: "Mở khi đạt cấp bậc yêu cầu",
  },
  {
    code: "TERRITORY_WU",
    kind: "TERRITORY",
    artKey: "wu",
    title: "Ngô",
    functionalLabel: "Lãnh địa phía đông nam",
    href: null,
    lockedMessage: "Mở khi đạt cấp bậc yêu cầu",
  },
] as const satisfies readonly TerritoryPlace[];
```

Create `src/lib/campaign/territory-map.ts`:

```ts
import type { TerritoryCode } from "./world.ts";

export const TERRITORY_LAYER_OPACITY = {
  idle: 0.68,
  active: 1,
  dimmed: 0.18,
} as const;

export function territoryLayerOpacity(
  activeCode: TerritoryCode | null,
  candidateCode: TerritoryCode,
): number {
  if (activeCode === null) return TERRITORY_LAYER_OPACITY.idle;
  return activeCode === candidateCode
    ? TERRITORY_LAYER_OPACITY.active
    : TERRITORY_LAYER_OPACITY.dimmed;
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
```

Update the territory expectation in `scripts/test-campaign-world.ts` to the same three literal objects, including `artKey`.

- [ ] **Step 4: Run the focused tests**

Run:

```powershell
npm.cmd run test:territory-map
npm.cmd run test:campaign-world
```

Expected: both commands exit `0`; competition order remains Nguyệt Thí — Dương Thí — Thiên Thí.

- [ ] **Step 5: Commit the model**

```powershell
git add package.json scripts/test-territory-map.ts scripts/test-campaign-world.ts src/lib/campaign/world.ts src/lib/campaign/territory-map.ts
git commit -m "feat: define faction territory model"
```

---

### Task 2: Optimize and register the four approved art layers

**Files:**
- Create: `public/art/territories/base-map.webp`
- Create: `public/art/territories/wei.webp`
- Create: `public/art/territories/shu.webp`
- Create: `public/art/territories/wu.webp`
- Modify: `src/lib/brand/art-manifest.ts:20-45,104-117`

**Interfaces:**
- Consumes: approved local PNG files from the Downloads folder.
- Produces: `ART_ASSETS.territoryBase`, `territoryWei`, `territoryShu`, and `territoryWu` for Task 3.

- [ ] **Step 1: Convert the aligned assets with Sharp**

Create the destination directory with PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path 'public\art\territories'
```

Run this one-time conversion from the repository root; do not add a conversion dependency or script to the repository:

```powershell
node -e "const sharp=require('sharp'); const jobs=[['C:/Users/LENOVO/Downloads/ChatGPT Image Aug 16, 2026, 06_15_16 PM (1).png','public/art/territories/base-map.webp'],['C:/Users/LENOVO/Downloads/ChatGPT Image Aug 16, 2026, 06_15_16 PM (2).png','public/art/territories/wei.webp'],['C:/Users/LENOVO/Downloads/ChatGPT Image Aug 16, 2026, 06_15_17 PM (3).png','public/art/territories/shu.webp'],['C:/Users/LENOVO/Downloads/ChatGPT Image Aug 16, 2026, 06_15_17 PM (4).png','public/art/territories/wu.webp']]; Promise.all(jobs.map(([input,output])=>sharp(input).webp({quality:88,alphaQuality:100,smartSubsample:true}).toFile(output))).catch(error=>{console.error(error);process.exit(1);});"
```

- [ ] **Step 2: Verify dimensions and alpha**

Run:

```powershell
node -e "const sharp=require('sharp'); const files=['base-map.webp','wei.webp','shu.webp','wu.webp']; Promise.all(files.map(async file=>({file,...await sharp('public/art/territories/'+file).metadata()}))).then(rows=>console.log(rows.map(({file,width,height,hasAlpha})=>({file,width,height,hasAlpha}))));"
```

Expected:

```text
base-map.webp  1672 × 941  hasAlpha=false
wei.webp       1672 × 941  hasAlpha=true
shu.webp       1672 × 941  hasAlpha=true
wu.webp        1672 × 941  hasAlpha=true
```

- [ ] **Step 3: Register the assets in the art manifest**

Add these keys inside `ART_ASSETS`, immediately before `campaignMap`:

```ts
  territoryBase: {
    src: "/art/territories/base-map.webp",
    alt: "",
    ratio: "16:9",
    focal: { x: 50, y: 50 },
    accent: "INK",
    containsText: false,
    version: 1,
  },
  territoryWei: {
    src: "/art/territories/wei.webp",
    alt: "",
    ratio: "16:9",
    focal: { x: 50, y: 50 },
    accent: "SILVER_BLUE",
    containsText: false,
    version: 1,
  },
  territoryShu: {
    src: "/art/territories/shu.webp",
    alt: "",
    ratio: "16:9",
    focal: { x: 50, y: 50 },
    accent: "GOLD",
    containsText: false,
    version: 1,
  },
  territoryWu: {
    src: "/art/territories/wu.webp",
    alt: "",
    ratio: "16:9",
    focal: { x: 50, y: 50 },
    accent: "JADE",
    containsText: false,
    version: 1,
  },
```

- [ ] **Step 4: Type-check the manifest and inspect the assets**

Run:

```powershell
npx.cmd tsc --noEmit
```

Then open each generated WebP with the local image viewer and verify that Base has no black fill and each faction overlay retains transparent surroundings.

- [ ] **Step 5: Commit the art**

```powershell
git add public/art/territories src/lib/brand/art-manifest.ts
git commit -m "feat: add layered faction territory art"
```

---

### Task 3: Build the accessible layered territory component and motion

**Files:**
- Create: `src/components/campaign/faction-territory-map.tsx`
- Modify: `src/app/globals.css:694-845,928-955`

**Interfaces:**
- Consumes: `territories: readonly TerritoryPlace[]`.
- Consumes: `ART_ASSETS.territoryBase`, `territoryWei`, `territoryShu`, and `territoryWu`.
- Consumes: `territoryLayerOpacity`, `TERRITORY_HIT_PATHS`, and `TERRITORY_LABEL_POSITIONS`.
- Produces: `FactionTerritoryMap({ territories }): JSX.Element` for Task 4.

- [ ] **Step 1: Extend the focused test with the exact interaction matrix**

Add these checks to `scripts/test-territory-map.ts`:

```ts
for (const territory of LOCKED_TERRITORIES) {
  check(`${territory.title} is active when selected`, territoryLayerOpacity(territory.code, territory.code), 1);
  check(
    `${territory.title} dims every other territory`,
    LOCKED_TERRITORIES
      .filter((candidate) => candidate.code !== territory.code)
      .every((candidate) => territoryLayerOpacity(territory.code, candidate.code) === 0.18),
    true,
  );
}
```

- [ ] **Step 2: Run the focused test**

Run:

```powershell
npm.cmd run test:territory-map
```

Expected: PASS. This locks the state matrix before the React component consumes it.

- [ ] **Step 3: Create the client component**

Create `src/components/campaign/faction-territory-map.tsx` with this structure and exact behaviors:

```tsx
"use client";

import Image from "next/image";
import { Lock } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { ART_ASSETS, type ArtAsset } from "@/lib/brand/art-manifest";
import {
  TERRITORY_HIT_PATHS,
  TERRITORY_LABEL_POSITIONS,
  territoryLayerOpacity,
} from "@/lib/campaign/territory-map";
import type {
  TerritoryArtKey,
  TerritoryCode,
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
  const [activeCode, setActiveCode] = useState<TerritoryCode | null>(null);

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
        onPointerLeave={() => setActiveCode(null)}
      >
        <Image
          src={ART_ASSETS.territoryBase.src}
          alt=""
          fill
          sizes="(min-width: 1280px) 1216px, 100vw"
          className="territory-map-layer territory-map-base territory-base-layer object-contain"
          aria-hidden="true"
        />

        {territories.map((territory) => (
          <Image
            key={territory.code}
            src={ART_BY_KEY[territory.artKey].src}
            alt=""
            fill
            sizes="(min-width: 1280px) 1216px, 100vw"
            className={`territory-map-layer territory-map-overlay territory-${territory.artKey}-layer object-contain`}
            data-territory-layer={territory.code}
            style={{ opacity: territoryLayerOpacity(activeCode, territory.code) }}
            aria-hidden="true"
          />
        ))}

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
              onPointerEnter={() => setActiveCode(territory.code)}
            />
          ))}
        </svg>

        <div className="territory-map-labels territory-landmarks-layer">
          {territories.map((territory) => {
            const position = TERRITORY_LABEL_POSITIONS[territory.code];
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
                data-active={activeCode === territory.code ? "true" : "false"}
                style={style}
                onPointerEnter={() => setActiveCode(territory.code)}
                onFocus={() => setActiveCode(territory.code)}
                onBlur={() => setActiveCode(null)}
              >
                <Lock className="size-4" aria-hidden="true" />
                <span className="font-display font-bold text-navy-deep">{territory.title}</span>
                <span className="font-ui text-[11px] text-muted">{territory.lockedMessage}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:hidden">
        <div className="territory-map-canvas territory-map-mobile-composite" aria-hidden="true">
          <Image src={ART_ASSETS.territoryBase.src} alt="" fill sizes="100vw" className="territory-map-layer territory-map-base territory-base-layer object-contain" />
          {territories.map((territory) => (
            <Image key={territory.code} src={ART_BY_KEY[territory.artKey].src} alt="" fill sizes="100vw" className={`territory-map-layer territory-map-overlay territory-${territory.artKey}-layer object-contain`} style={{ opacity: 0.68 }} />
          ))}
        </div>
        <ul className="territory-map-mobile-list">
          {territories.map((territory) => (
            <li key={territory.code} className="territory-map-mobile-card">
              <Lock className="size-4" aria-hidden="true" />
              <span>
                <strong className="block font-display text-navy-deep">{territory.title}</strong>
                <span className="font-ui text-xs text-muted">{territory.lockedMessage}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

Keep the buttons inert: do not add `onClick`, a link, or a form action.

- [ ] **Step 4: Add scoped CSS with exact motion values**

Add the following scoped rules near the existing world-map rules in `src/app/globals.css`:

```css
.world-shell .faction-territory-map {
  margin-bottom: 2rem;
  border: 1px solid var(--color-line);
  background: var(--color-paper);
  padding: 1.25rem;
}

.world-shell .territory-map-heading {
  margin-bottom: 1rem;
}

.world-shell .territory-map-canvas {
  position: relative;
  isolation: isolate;
  aspect-ratio: 1672 / 941;
  overflow: hidden;
  background: var(--color-cream-deep);
}

.world-shell .territory-map-layer,
.world-shell .territory-map-hit-layer,
.world-shell .territory-map-labels {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
}

.world-shell .territory-map-base { z-index: 0; }

.world-shell .territory-map-overlay {
  z-index: 1;
  transition: opacity 180ms ease;
}

.world-shell .territory-map-hit-layer {
  z-index: 3;
  pointer-events: none;
}

.world-shell .territory-map-hit-path {
  fill: rgb(34 48 62 / 0.001);
  pointer-events: none;
}

.world-shell .territory-map-labels {
  z-index: 4;
  pointer-events: none;
}

.world-shell .territory-map-label {
  position: absolute;
  left: var(--territory-x);
  top: var(--territory-y);
  display: flex;
  width: 10rem;
  min-height: 5.5rem;
  transform: translate(-50%, -50%);
  cursor: default;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  border: 1px dashed var(--color-line-strong);
  background: rgb(255 253 249 / 0.88);
  box-shadow: var(--shadow-card);
  pointer-events: auto;
  text-align: center;
}

.world-shell .territory-map-label[data-active="true"] {
  border-color: var(--color-gold);
  background: var(--color-paper);
}

.world-shell .territory-map-label:focus-visible {
  outline: 2px solid var(--color-navy);
  outline-offset: 3px;
}

.world-shell .territory-map-mobile-composite {
  min-height: 15rem;
}

.world-shell .territory-map-mobile-list {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.world-shell .territory-map-mobile-card {
  display: flex;
  gap: 0.75rem;
  border: 1px solid var(--color-line);
  background: var(--color-cream-deep);
  padding: 0.875rem 1rem;
}

@media (hover: hover) and (pointer: fine) {
  .world-shell .territory-map-hit-path {
    pointer-events: visiblePainted;
  }
}

@media (prefers-reduced-motion: reduce) {
  .world-shell .territory-map-overlay {
    transition-duration: 120ms;
  }
}
```

- [ ] **Step 5: Verify focused behavior and compilation**

Run:

```powershell
npm.cmd run test:territory-map
npx.cmd tsc --noEmit
npm.cmd run lint -- src/components/campaign/faction-territory-map.tsx src/lib/campaign/territory-map.ts
```

Expected: all commands exit `0`; ESLint reports no `transition: all`, missing keys, or accessibility errors.

- [ ] **Step 6: Commit the component**

```powershell
git add scripts/test-territory-map.ts src/components/campaign/faction-territory-map.tsx src/app/globals.css
git commit -m "feat: build interactive faction territory map"
```

---

### Task 4: Place the new map and remove the legacy territory cards

**Files:**
- Create: `scripts/test-territory-integration.mjs`
- Modify: `package.json:6-36`
- Modify: `src/components/campaign/campaign-home-block.tsx:1-75`
- Modify: `src/app/(site)/hoc-vien/chien-dich/page.tsx:1-92`
- Modify: `src/components/campaign/campaign-map.tsx:1-172`
- Modify: `src/components/campaign/campaign-timeline-mobile.tsx:1-126`
- Modify: `src/app/globals.css:694-850`

**Interfaces:**
- Consumes: `FactionTerritoryMap({ territories })` from Task 3.
- Produces: exactly one territory map before each eight-gate map, with no duplicate legacy territory cards.

- [ ] **Step 1: Write the failing structural integration test**

Create `scripts/test-territory-integration.mjs`:

```js
import { readFileSync } from "node:fs";

const home = readFileSync("src/components/campaign/campaign-home-block.tsx", "utf8");
const student = readFileSync("src/app/(site)/hoc-vien/chien-dich/page.tsx", "utf8");
const desktopMap = readFileSync("src/components/campaign/campaign-map.tsx", "utf8");
const mobileMap = readFileSync("src/components/campaign/campaign-timeline-mobile.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");

const checks = [
  [
    "homepage territory map precedes gate map",
    home.indexOf("<FactionTerritoryMap") >= 0 &&
      home.indexOf("<FactionTerritoryMap") < home.indexOf("<CampaignMap"),
  ],
  [
    "student territory map precedes gate map",
    student.indexOf("<FactionTerritoryMap") >= 0 &&
      student.indexOf("<FactionTerritoryMap") < student.indexOf("<CampaignMap"),
  ],
  ["desktop legacy territory cards removed", !desktopMap.includes("world-locked-territories")],
  ["mobile legacy territory list removed", !mobileMap.includes("world.territories.map")],
  ["legacy territory CSS removed", !css.includes(".world-locked-territory")],
];

let failures = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failures += 1;
}
process.exit(failures === 0 ? 0 : 1);
```

Add to `package.json`:

```json
"test:territory-integration": "node scripts/test-territory-integration.mjs"
```

Insert it immediately after `test:territory-map` in the full `test` chain.

- [ ] **Step 2: Run the integration test to verify it fails**

Run:

```powershell
npm.cmd run test:territory-integration
```

Expected: FAIL for both placements and all three legacy-removal checks.

- [ ] **Step 3: Integrate on the homepage**

In `src/components/campaign/campaign-home-block.tsx`:

```tsx
import { FactionTerritoryMap } from "@/components/campaign/faction-territory-map";
```

Render before `CampaignMap`:

```tsx
<FactionTerritoryMap territories={world.territories} />
<CampaignMap
  world={world}
  variant={world.audience === "STUDENT" ? "student" : "portal"}
/>
```

- [ ] **Step 4: Integrate on the student campaign page**

Import the same component in `src/app/(site)/hoc-vien/chien-dich/page.tsx`, then render:

```tsx
<FactionTerritoryMap territories={world.territories} />
<CampaignMap world={world} variant="student" />
```

- [ ] **Step 5: Remove legacy territory presentation**

In `campaign-map.tsx`, remove:

- `TERRITORY_POSITIONS`.
- The complete `<section aria-label="Ba lãnh địa chưa khai mở">` block.

Keep `Lock` because gate state `LOCKED` still uses it.

In `campaign-timeline-mobile.tsx`, remove the final `<section aria-label="Ba lãnh địa chưa khai mở">` block. Keep `Lock` because locked gate nodes still use it.

In `globals.css`, remove all rules rooted at:

```css
.world-shell .world-locked-territories
.world-shell .world-locked-territory
```

Also remove `.world-locked-territories` from the absolute-layer selector shared with `.world-map-art-layer` and `.world-map-route-layer`.

- [ ] **Step 6: Run integration and campaign tests**

Run:

```powershell
npm.cmd run test:territory-integration
npm.cmd run test:territory-map
npm.cmd run test:campaign-world
npm.cmd run test:campaign
```

Expected: all four commands exit `0`.

- [ ] **Step 7: Commit the integration**

```powershell
git add package.json scripts/test-territory-integration.mjs src/components/campaign/campaign-home-block.tsx 'src/app/(site)/hoc-vien/chien-dich/page.tsx' src/components/campaign/campaign-map.tsx src/components/campaign/campaign-timeline-mobile.tsx src/app/globals.css
git commit -m "feat: separate faction map from campaign gates"
```

---

### Task 5: Visual QA, protected-route audit, and full verification

**Files:**
- Modify only files from Tasks 1–4 when a verified defect is found.

**Interfaces:**
- Consumes: complete territory-map implementation.
- Produces: verified desktop, keyboard, reduced-motion, mobile, build, and protected-route evidence.

- [ ] **Step 1: Run static verification**

Run each command separately and require exit `0`:

```powershell
npm.cmd run test:territory-map
npm.cmd run test:territory-integration
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd test
npm.cmd run build -- --webpack
git diff --check origin/main...HEAD
```

The build may retain the two pre-existing non-failing Reading Custom Highlight selector warnings; no new warning is accepted.

- [ ] **Step 2: Audit protected source paths**

Run:

```powershell
git diff --name-only origin/main...HEAD -- 'src/app/(exam)' 'src/components/exam' 'src/components/feynman' 'src/app/(site)/hoc-vien/bai-lam' 'src/app/(site)/quan-tri/ai-feynman'
```

Expected: no output.

- [ ] **Step 3: Start a local production-like preview**

Run the app with campaign flags enabled for the process:

```powershell
$env:ENABLE_CAMPAIGN_MAP='true'
$env:ENABLE_RANK_ENGINE='true'
npm.cmd run dev -- --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000/` in the in-app browser at a desktop viewport of at least 1280 × 800.

- [ ] **Step 4: Verify desktop placement and all three hover states**

Confirm visually and through computed styles:

- The new map appears before the eight-gate map.
- Default overlay opacity is `0.68` for Ngụy, Thục, and Ngô.
- Hover Ngụy: Ngụy is `1`; Thục and Ngô are `0.18`.
- Hover Thục: Thục is `1`; Ngụy and Ngô are `0.18`.
- Hover Ngô: Ngô is `1`; Ngụy and Thục are `0.18`.
- Pointer movement across boundaries retargets the transition without keyframe restart.
- The labels visually sit inside the intended territories; adjust only `TERRITORY_HIT_PATHS` or `TERRITORY_LABEL_POSITIONS` if the screenshot proves a mismatch.

- [ ] **Step 5: Verify keyboard, locked behavior, and reduced motion**

- Tab to each territory label and confirm the same opacity matrix plus a visible focus ring.
- Press Enter and Space; confirm URL and network state do not change.
- Confirm every label says `Mở khi đạt cấp bậc yêu cầu`.
- Emulate `prefers-reduced-motion: reduce`; confirm only a 120ms opacity crossfade remains.

- [ ] **Step 6: Verify responsive fallback**

At a viewport below 1024px:

- SVG pointer hit areas and desktop labels are absent.
- The same four images form one static composite.
- Three locked cards appear in Ngụy — Thục — Ngô order.
- The eight-gate mobile timeline no longer repeats generic territories.

- [ ] **Step 7: Re-run verification after any visual correction**

If Step 4–6 changed code, run again:

```powershell
npm.cmd run test:territory-map
npm.cmd run test:territory-integration
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd test
npm.cmd run build -- --webpack
git diff --check origin/main...HEAD
```

Require every command to exit `0` before reporting completion.

- [ ] **Step 8: Commit verified visual corrections when present**

If visual QA required a correction:

```powershell
git add src/lib/campaign/territory-map.ts src/components/campaign/faction-territory-map.tsx src/app/globals.css
git commit -m "fix: align faction territory interactions"
```

If no correction was required, do not create an empty commit.

---

## Completion Evidence

Before handoff, record:

- Final commit SHA and clean `git status --short --branch`.
- Exit codes for focused tests, TypeScript, lint, full test suite, and Webpack production build.
- Desktop screenshot in default state and one focused faction state.
- Mobile screenshot showing the static composite and three locked cards.
- Empty protected-route diff output.
- Confirmation that no API, Prisma, DDL, payment, rank, or faction-membership logic changed.
