# Stoic IELTS Cinematic Campaign Map Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp toàn bộ Stoic IELTS ngoài Reading/Feynman thành trải nghiệm bản đồ chiến dịch thủy mặc điện ảnh, mượt và sang trọng hơn, trong khi giữ nguyên branding, nghiệp vụ và tuyệt đối không để shell/motion mới lọt vào vùng học tập được bảo vệ.

**Architecture:** Một hàm phân loại route thuần quyết định route nào nhận `WorldShell` và motion tier nào. `WorldShell` chỉ namespace token/style/motion cho route được phép. Bản đồ nhận một `CampaignWorld` đã chuẩn hóa từ server component; nó không đọc Prisma. Các trang công khai, học viên và quản trị dùng component trình bày riêng, còn component dùng chung hiện tại giữ mặc định để Reading/Feynman không đổi.

**Tech Stack:** Next.js 16 App Router, React 19 Server/Client Components, TypeScript 5, Tailwind CSS 4, CSS keyframes/transitions, Prisma 6 + MySQL, Lucide React, custom Node test scripts, Codex in-app Browser cho visual QA.

## Global Constraints

- Không sửa giao diện hoặc hành vi của `/luyen-tap/reading/**`, `/lam-bai/**`, `/hoc-vien/bai-lam/**`, `/quan-tri/ai-feynman/**`, `/xem-thu-cbt` và các alias Reading đã nêu trong đặc tả.
- Không đặt style mới trên `body`, `html`, selector `*` hoặc component dùng chung theo cách tự động ảnh hưởng route bảo vệ. Mọi style mới phải bắt đầu dưới `.world-shell` hoặc được bật bằng prop rõ ràng.
- Không đổi Prisma schema, migration, database, server action, luật cấp bậc, luật danh hiệu, luật cuộc thi hoặc API.
- Không thêm thư viện animation. Dùng CSS `transform`, `opacity`, `clip-path` có kiểm soát và media query Reduce Motion.
- Không dùng chữ Hán, emoji hoặc asset có chữ trong ảnh. Dùng art hiện có trong `public/art` và fallback CSS; ảnh tham chiếu của người dùng chỉ là mood reference.
- Ba lãnh địa tương lai luôn khóa, không có `href`, không gọi API và hiển thị đúng “Mở khi đạt cấp bậc yêu cầu”.
- Desktop là sân khấu chính; mobile dùng danh sách/timeline tương đương, vùng chạm tối thiểu 44px.
- Mỗi task chỉ được commit sau khi test liên quan, TypeScript và `git diff --check` đạt.

## File Structure and Responsibilities

### New files

- `src/lib/motion/route-policy.ts` — nguồn sự thật duy nhất cho ranh giới route và motion tier.
- `src/components/world/world-shell.tsx` — gắn namespace giao diện/motion theo pathname; trả children nguyên trạng ở Tier 0.
- `src/components/world/scene-hero.tsx` — hero điện ảnh opt-in; không thay `PageHero` hiện tại.
- `src/components/world/narrative-section.tsx` — section có nhịp, tone và landmark id rõ ràng.
- `src/components/world/next-step-guide.tsx` — trình bày hành động tiếp theo từ model có sẵn.
- `src/components/world/quiet-world-panel.tsx` — khung gọn cho đăng nhập, đăng ký, đổi mật khẩu và thanh toán.
- `src/components/world/ceremony-layer.tsx` — nghi thức một lần cho sự kiện có định danh.
- `src/components/admin/admin-page-shell.tsx` — khung “quân trướng” cho trang quản trị, không chứa nghiệp vụ.
- `src/lib/campaign/world.ts` — catalog địa điểm công khai, cụm kỳ thi, ba lãnh địa khóa và adapter `CampaignWorld`.
- `src/components/campaign/world-landmark-rail.tsx` — điều hướng chức năng bằng văn bản song song với map.
- `scripts/test-motion-route-policy.ts` — test bảng route Tier 0/1/2.
- `scripts/test-campaign-world.ts` — test mô hình map, next step và ba lãnh địa khóa.
- `scripts/test-cinematic-contracts.mjs` — kiểm tra source contract cho namespace, shell, protected routes và các trang đã chuyển đổi.
- `docs/qa/2026-08-14-cinematic-campaign-map-redesign.md` — bằng chứng route, keyboard, reduced motion, fallback và visual QA.

### Existing files with bounded changes

- `src/app/(site)/layout.tsx` — chỉ ghép `WorldShell` quanh header/main/footer; Tier 0 phải trả đúng cấu trúc cũ.
- `src/app/globals.css` — thêm token và motion namespace; không đổi token Reading/Feynman.
- `src/components/campaign/campaign-map.tsx`, `campaign-timeline-mobile.tsx`, `campaign-home-block.tsx`, `campaign-mini.tsx` — nhận model trình bày mới và loại link `#` giả.
- `src/app/(site)/page.tsx` — cổng thế giới, map và lộ trình học.
- Các trang công khai: `nghi-su-duong`, `dien-danh-vong`, `bang-vang`, `nguyet-thi`, `duong-thi`, `thien-thi` — dùng hero/next-step cùng hệ.
- Các trang tài khoản/thanh toán — chỉ thay khung trình bày, giữ action và logic.
- Các trang `hoc-vien` ngoài `bai-lam/**` — cá nhân hóa bản đồ, ưu tiên bước kế tiếp, danh hiệu và cấp bậc.
- Các trang `quan-tri` ngoài `ai-feynman/**` — dùng `AdminPageShell`; giữ truy vấn, form và bảng hiện có.
- `package.json` — đăng ký ba test script mới và nối vào `npm test`.

---

## Task 1: Lock the route boundary before any visual work

**Files:**

- Create: `src/lib/motion/route-policy.ts`
- Create: `scripts/test-motion-route-policy.ts`
- Create: `src/components/world/world-shell.tsx`
- Modify: `src/app/(site)/layout.tsx`
- Modify: `package.json`

**Interfaces:**

- Produces `routeExperience(pathname: string): RouteExperience`.
- Produces `WorldShell({ header, children, footer }: WorldShellProps): ReactNode`.
- Consumes only `usePathname()` and React nodes; no session, Prisma or feature flag.

- [ ] Capture baseline screenshots before code changes for `/luyen-tap/reading`, `/luyen-tap/reading/general`, `/xem-thu-cbt`, one `/hoc-vien/bai-lam/{id}`, its `/feynman` child and `/quan-tri/ai-feynman`. Save locally under `.superpowers/qa/cinematic-redesign/baseline/` and record the exact tested URLs in the QA document later.

- [ ] Add the failing table-driven test in `scripts/test-motion-route-policy.ts`:

```ts
import { routeExperience } from "../src/lib/motion/route-policy.ts";

const cases = [
  ["/luyen-tap/reading", 0, false],
  ["/luyen-tap/reading/general", 0, false],
  ["/luyen-tap/reading/ghep-de", 0, false],
  ["/luyen-tap/academic", 0, false],
  ["/luyen-tap/general", 0, false],
  ["/luyen-tap/ghep-de", 0, false],
  ["/lam-bai/attempt-1", 0, false],
  ["/hoc-vien/bai-lam/attempt-1", 0, false],
  ["/hoc-vien/bai-lam/attempt-1/feynman", 0, false],
  ["/quan-tri/ai-feynman", 0, false],
  ["/quan-tri/ai-feynman/queue", 0, false],
  ["/xem-thu-cbt", 0, false],
  ["/dang-nhap", 1, true],
  ["/thanh-toan/INV-1", 1, true],
  ["/quan-tri", 1, true],
  ["/", 2, true],
  ["/hoc-vien", 2, true],
  ["/hoc-vien/thi-luyen/TRIAL_01_DAO_VIEN", 2, true],
] as const;

let failures = 0;
for (const [pathname, tier, shell] of cases) {
  const actual = routeExperience(pathname);
  if (actual.motionTier !== tier || actual.renderWorldShell !== shell) {
    console.error("FAIL", pathname, actual);
    failures += 1;
  }
}
process.exit(failures === 0 ? 0 : 1);
```

- [ ] Run `node --experimental-strip-types scripts/test-motion-route-policy.ts`. Expected: module-not-found failure for `src/lib/motion/route-policy.ts`.

- [ ] Implement the pure route policy in `src/lib/motion/route-policy.ts`:

```ts
export type MotionTier = 0 | 1 | 2;
export type RouteArea = "study-static" | "transaction" | "admin" | "world";
export type RouteExperience = {
  area: RouteArea;
  motionTier: MotionTier;
  renderWorldShell: boolean;
};

const STATIC_EXACT = new Set([
  "/luyen-tap/academic",
  "/luyen-tap/general",
  "/luyen-tap/ghep-de",
  "/xem-thu-cbt",
]);
const STATIC_PREFIXES = [
  "/luyen-tap/reading",
  "/lam-bai",
  "/hoc-vien/bai-lam",
  "/quan-tri/ai-feynman",
];
const TRANSACTION_PREFIXES = [
  "/dang-nhap",
  "/dang-ky",
  "/doi-mat-khau",
  "/thanh-toan",
];

export function normalizePathname(value: string): string {
  const path = value.split(/[?#]/, 1)[0] || "/";
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function routeExperience(value: string): RouteExperience {
  const pathname = normalizePathname(value);
  if (
    STATIC_EXACT.has(pathname) ||
    STATIC_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))
  ) {
    return { area: "study-static", motionTier: 0, renderWorldShell: false };
  }
  if (TRANSACTION_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return { area: "transaction", motionTier: 1, renderWorldShell: true };
  }
  if (matchesPrefix(pathname, "/quan-tri")) {
    return { area: "admin", motionTier: 1, renderWorldShell: true };
  }
  return { area: "world", motionTier: 2, renderWorldShell: true };
}
```

- [ ] Run the route test again. Expected: exit 0 with no `FAIL` lines.

- [ ] Implement `WorldShell` so Tier 0 returns the existing children without a wrapper:

```tsx
"use client";

import { Fragment, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { routeExperience } from "@/lib/motion/route-policy";

type WorldShellProps = {
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
};

export function WorldShell({ header, children, footer }: WorldShellProps) {
  const pathname = usePathname();
  const experience = routeExperience(pathname);
  if (!experience.renderWorldShell) {
    return <Fragment>{header}{children}{footer}</Fragment>;
  }
  return (
    <div
      className="world-shell"
      data-world-shell="true"
      data-route-area={experience.area}
      data-motion-tier={experience.motionTier}
    >
      {header}
      <div key={pathname} className="world-route-scene">{children}</div>
      {footer}
    </div>
  );
}
```

- [ ] Change `src/app/(site)/layout.tsx` only at composition level:

```tsx
return (
  <WorldShell header={<SiteHeader />} footer={<SiteFooter />}>
    <main className="paper-grain flex-1">{children}</main>
  </WorldShell>
);
```

- [ ] Add `test:motion-route` to `package.json` and place it before `test:no-han` in the aggregate `test` script.

- [ ] Run `npm run test:motion-route`, `npx tsc --noEmit`, and `git diff --check`. Expected: all exit 0.

- [ ] Commit:

```bash
git add package.json scripts/test-motion-route-policy.ts src/lib/motion/route-policy.ts src/components/world/world-shell.tsx "src/app/(site)/layout.tsx"
git commit -m "feat: enforce cinematic route boundary"
```

---

## Task 2: Add the namespaced visual and motion foundation

**Files:**

- Create: `src/components/world/scene-hero.tsx`
- Create: `src/components/world/narrative-section.tsx`
- Create: `src/components/world/quiet-world-panel.tsx`
- Modify: `src/app/globals.css`
- Create: `scripts/test-cinematic-contracts.mjs`
- Modify: `package.json`

**Interfaces:**

- `SceneHero` consumes existing `ArtAsset` and produces an opt-in cinematic hero.
- `NarrativeSection` consumes `id`, `eyebrow`, `title`, `tone`, `children`.
- `QuietWorldPanel` consumes `eyebrow`, `title`, optional `lede`, `children`.
- No existing shared component changes its default class list.

- [ ] Create a failing source-contract test that reads `globals.css` and asserts all new roots are namespaced, the layout contains `WorldShell`, and protected page source files do not import from `components/world`:

```js
import fs from "node:fs";

const css = fs.readFileSync("src/app/globals.css", "utf8");
const protectedFiles = [
  "src/app/(site)/luyen-tap/reading/page.tsx",
  "src/app/(site)/luyen-tap/reading/general/page.tsx",
  "src/app/(site)/luyen-tap/reading/ghep-de/page.tsx",
  "src/app/(exam)/lam-bai/[attemptId]/page.tsx",
  "src/app/(exam)/xem-thu-cbt/page.tsx",
  "src/app/(site)/hoc-vien/bai-lam/[attemptId]/page.tsx",
  "src/app/(site)/hoc-vien/bai-lam/[attemptId]/feynman/page.tsx",
  "src/app/(site)/quan-tri/ai-feynman/page.tsx",
];
const checks = [
  [css.includes(".world-shell"), "missing .world-shell namespace"],
  [css.includes('[data-motion-tier="2"] .world-route-scene'), "missing Tier 2 scene"],
  [css.includes("prefers-reduced-motion: reduce"), "missing reduced motion"],
  [protectedFiles.every((file) => !fs.readFileSync(file, "utf8").includes("components/world")), "world import leaked into protected page"],
];
const failed = checks.filter(([ok]) => !ok);
for (const [, message] of failed) console.error("FAIL", message);
process.exit(failed.length === 0 ? 0 : 1);
```

- [ ] Run `node scripts/test-cinematic-contracts.mjs`. Expected: failure for the missing `.world-shell` CSS contract.

- [ ] Add only namespaced tokens and selectors to `globals.css`:

```css
.world-shell {
  --world-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --world-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --world-duration-press: 120ms;
  --world-duration-utility: 180ms;
  --world-duration-scene: 520ms;
  --world-duration-map: 680ms;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  isolation: isolate;
}

.world-shell .world-route-scene {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.world-shell > header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--color-paper) 88%, transparent);
  backdrop-filter: blur(18px) saturate(115%);
  box-shadow: 0 1px 0 rgb(34 48 62 / 0.08);
}

.world-shell > footer { margin-top: auto; }

.world-shell[data-motion-tier="1"] .world-route-scene {
  animation: world-utility-enter var(--world-duration-utility) var(--world-ease-out) both;
}

.world-shell[data-motion-tier="2"] .world-route-scene {
  animation: world-scene-enter var(--world-duration-scene) var(--world-ease-out) both;
}

.world-shell .world-action {
  transition:
    transform var(--world-duration-press) var(--world-ease-out),
    color var(--world-duration-utility) ease,
    background-color var(--world-duration-utility) ease,
    border-color var(--world-duration-utility) ease,
    box-shadow var(--world-duration-utility) ease;
}

.world-shell .world-action:active:not(:disabled) { transform: scale(0.975); }

@keyframes world-utility-enter {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes world-scene-enter {
  from { opacity: 0; transform: translateY(12px) scale(0.995); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .world-shell .world-route-scene,
  .world-shell .world-map-stage,
  .world-shell .world-scene-reveal {
    animation: world-utility-enter 120ms ease both !important;
    transform: none !important;
  }
  .world-shell .world-action:active:not(:disabled) { transform: none; }
}
```

- [ ] Implement `SceneHero` as a wrapper around the proven `InkWashHero`, adding only world classes and explicit props:

```tsx
import type { ReactNode } from "react";
import type { ArtAsset } from "@/lib/brand/art-manifest";
import { InkWashHero } from "@/components/brand/ink-wash-hero";

export function SceneHero(props: {
  asset: ArtAsset;
  eyebrow: string;
  title: ReactNode;
  functionalLabel: string;
  videoSrc?: string;
  children?: ReactNode;
}) {
  return (
    <div className="world-scene-hero world-scene-reveal">
      <InkWashHero {...props} />
    </div>
  );
}
```

- [ ] Implement `NarrativeSection` with fixed variants and no pathname or data access:

```tsx
import type { ReactNode } from "react";

const TONE = {
  paper: "bg-paper text-ink",
  mist: "ink-wash-fallback text-ink",
  ink: "bg-navy-deep text-paper",
} as const;

export function NarrativeSection({ id, eyebrow, title, tone = "paper", children }: {
  id: string;
  eyebrow: string;
  title: string;
  tone?: keyof typeof TONE;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`world-narrative-section ${TONE[tone]}`}>
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <p className="label-caps">{eyebrow}</p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight md:text-5xl">{title}</h2>
        <div className="rule-gold mt-6" />
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
```

- [ ] Implement `QuietWorldPanel` as the Tier 1 transaction frame:

```tsx
import type { ReactNode } from "react";

export function QuietWorldPanel({ eyebrow, title, lede, children }: {
  eyebrow: string;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <section className="world-quiet-frame ink-wash-fallback px-6 py-14 md:py-20">
      <div className="mx-auto max-w-lg border border-line bg-paper p-7 shadow-lift md:p-10">
        <p className="label-caps">{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep">{title}</h1>
        {lede && <p className="mt-4 text-[0.96rem] leading-relaxed text-ink-soft">{lede}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
```

- [ ] Add `test:cinematic-contracts` to `package.json` and aggregate `npm test`.

- [ ] Run `npm run test:cinematic-contracts`, `npx tsc --noEmit`, and `npm run test:no-han`. Expected: all exit 0.

- [ ] Commit:

```bash
git add package.json scripts/test-cinematic-contracts.mjs src/app/globals.css src/components/world/scene-hero.tsx src/components/world/narrative-section.tsx src/components/world/quiet-world-panel.tsx
git commit -m "feat: add namespaced cinematic world foundation"
```

---

## Task 3: Define the complete campaign world as pure presentation data

**Files:**

- Create: `src/lib/campaign/world.ts`
- Create: `scripts/test-campaign-world.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes `CampaignNodeView[]` and audience `"GUEST" | "STUDENT"`.
- Produces `CampaignWorld`, including gates, landmarks, competitions, three future territories and `NextStepModel`.
- Does not consume Prisma, `features`, session or React.

- [ ] Add a failing `scripts/test-campaign-world.ts` covering catalog integrity and next-step selection:

```ts
import { campaignView } from "../src/lib/campaign/view.ts";
import {
  buildCampaignWorld,
  WORLD_COMPETITIONS,
  WORLD_LANDMARKS,
  LOCKED_TERRITORIES,
} from "../src/lib/campaign/world.ts";

const guestNodes = campaignView(1, {
  TRIAL_01_DAO_VIEN: { status: "ELIGIBLE" },
});
const guest = buildCampaignWorld({ audience: "GUEST", nodes: guestNodes });
const active = buildCampaignWorld({
  audience: "STUDENT",
  nodes: campaignView(1, { TRIAL_01_DAO_VIEN: { status: "ACTIVE" } }),
});

const checks = [
  [WORLD_LANDMARKS.length === 3, "three public landmarks"],
  [WORLD_COMPETITIONS.map((item) => item.title).join("|") === "Nguyệt Thí|Dương Thí|Thiên Thí", "competition order"],
  [LOCKED_TERRITORIES.length === 3, "three locked territories"],
  [LOCKED_TERRITORIES.every((item) => item.href === null), "territories have no href"],
  [LOCKED_TERRITORIES.every((item) => item.lockedMessage === "Mở khi đạt cấp bậc yêu cầu"), "locked copy"],
  [guest.nextStep.href === "/dang-ky", "guest starts at registration"],
  [active.nextStep.href === "/hoc-vien/thi-luyen/TRIAL_01_DAO_VIEN", "active student resumes trial"],
];
const failed = checks.filter(([ok]) => !ok);
for (const [, label] of failed) console.error("FAIL", label);
process.exit(failed.length === 0 ? 0 : 1);
```

- [ ] Run `node --experimental-strip-types scripts/test-campaign-world.ts`. Expected: module-not-found failure for `src/lib/campaign/world.ts`.

- [ ] Implement the complete type contract in `src/lib/campaign/world.ts`:

```ts
import type { CampaignNodeView } from "./view.ts";

export type WorldPlaceKind = "LANDMARK" | "COMPETITION" | "TERRITORY";
export type WorldPlace = {
  code: string;
  kind: WorldPlaceKind;
  title: string;
  functionalLabel: string;
  href: string | null;
  lockedMessage: string | null;
};
export type NextStepModel = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  actionLabel: string;
  entersStudy: boolean;
};
export type CampaignWorld = {
  audience: "GUEST" | "STUDENT";
  gates: CampaignNodeView[];
  landmarks: readonly WorldPlace[];
  competitions: readonly WorldPlace[];
  territories: readonly WorldPlace[];
  nextStep: NextStepModel;
};
```

- [ ] Fill the immutable catalogs with these exact destinations:

```ts
export const WORLD_LANDMARKS = [
  { code: "LANDMARK_COUNCIL", kind: "LANDMARK", title: "Nghị Sự Đường", functionalLabel: "Cộng đồng thảo luận", href: "/nghi-su-duong", lockedMessage: null },
  { code: "LANDMARK_HONORS", kind: "LANDMARK", title: "Điện Danh Vọng", functionalLabel: "Danh hiệu và thành tích", href: "/dien-danh-vong", lockedMessage: null },
  { code: "LANDMARK_RESULTS", kind: "LANDMARK", title: "Bảng Vàng", functionalLabel: "Kết quả kỳ thi", href: "/bang-vang", lockedMessage: null },
] as const satisfies readonly WorldPlace[];

export const WORLD_COMPETITIONS = [
  { code: "COMP_MONTHLY", kind: "COMPETITION", title: "Nguyệt Thí", functionalLabel: "Cuộc thi hằng tháng", href: "/nguyet-thi", lockedMessage: null },
  { code: "COMP_QUARTERLY", kind: "COMPETITION", title: "Dương Thí", functionalLabel: "Cuộc thi hằng quý", href: "/duong-thi", lockedMessage: null },
  { code: "COMP_ANNUAL", kind: "COMPETITION", title: "Thiên Thí", functionalLabel: "Cuộc thi hằng năm", href: "/thien-thi", lockedMessage: null },
] as const satisfies readonly WorldPlace[];

export const LOCKED_TERRITORIES = ["TERRITORY_01", "TERRITORY_02", "TERRITORY_03"].map((code) => ({
  code,
  kind: "TERRITORY" as const,
  title: "Lãnh địa chưa khai mở",
  functionalLabel: "Lựa chọn phe trong tương lai",
  href: null,
  lockedMessage: "Mở khi đạt cấp bậc yêu cầu",
})) satisfies WorldPlace[];
```

- [ ] Implement `buildCampaignWorld` with deterministic next-step priority:

```ts
function trialStep(node: CampaignNodeView, active: boolean): NextStepModel {
  return {
    eyebrow: "Bước tiếp theo của bạn",
    title: active ? `Tiếp tục ${node.shortTitle}` : `Bước vào ${node.shortTitle}`,
    body: active
      ? "Thí luyện đang dở được giữ nguyên. Tiếp tục từ đúng tiến độ hiện tại."
      : (node.hint ?? "Cửa ải đã mở. Xem điều kiện và chủ động bắt đầu khi sẵn sàng."),
    href: `/hoc-vien/thi-luyen/${node.trialCode}`,
    actionLabel: active ? "Tiếp tục thí luyện" : "Xem cửa ải",
    entersStudy: false,
  };
}

export function buildCampaignWorld({ audience, nodes }: {
  audience: "GUEST" | "STUDENT";
  nodes: CampaignNodeView[];
}): CampaignWorld {
  let nextStep: NextStepModel;
  if (audience === "GUEST") {
    nextStep = {
      eyebrow: "Bước tiếp theo",
      title: "Bắt đầu từ Bạch thân",
      body: "Tạo tài khoản miễn phí, hiểu ba trụ và chọn đúng kho Reading trước khi làm bài đầu tiên.",
      href: "/dang-ky",
      actionLabel: "Tạo tài khoản",
      entersStudy: false,
    };
  } else {
    const active = nodes.find((node) => node.state === "ACTIVE");
    const available = nodes.find((node) => node.state === "AVAILABLE");
    const lockedCurrent = nodes.find((node) => node.isCurrent && node.state === "LOCKED");
    nextStep = active
      ? trialStep(active, true)
      : available
        ? trialStep(available, false)
        : lockedCurrent
          ? {
              eyebrow: "Bước tiếp theo của bạn",
              title: `Chuẩn bị cho ${lockedCurrent.shortTitle}`,
              body: lockedCurrent.hint ?? "Hoàn thành điều kiện còn thiếu để mở cửa ải kế tiếp.",
              href: "/hoc-vien/chien-dich#dieu-kien",
              actionLabel: "Xem điều kiện",
              entersStudy: false,
            }
          : {
              eyebrow: "Hành trình hiện tại",
              title: "Tám cửa ải đã hoàn tất",
              body: "Cấp bậc đã được giữ vĩnh viễn. Tiếp tục xây danh hiệu và chuẩn bị cho các kỳ đại thí.",
              href: "/hoc-vien/danh-hieu",
              actionLabel: "Xem danh hiệu",
              entersStudy: false,
            };
  }
  return {
    audience,
    gates: nodes,
    landmarks: WORLD_LANDMARKS,
    competitions: WORLD_COMPETITIONS,
    territories: LOCKED_TERRITORIES,
    nextStep,
  };
}
```

- [ ] Add `test:campaign-world` to `package.json` and aggregate `npm test` immediately after `test:campaign`.

- [ ] Run `npm run test:campaign`, `npm run test:campaign-world`, `npx tsc --noEmit`, and `npm run test:no-han`. Expected: all exit 0.

- [ ] Commit:

```bash
git add package.json scripts/test-campaign-world.ts src/lib/campaign/world.ts
git commit -m "feat: model the cinematic campaign world"
```

---

## Task 4: Rebuild the campaign map, locked territories and next-step UI

**Files:**

- Create: `src/components/world/next-step-guide.tsx`
- Create: `src/components/campaign/world-landmark-rail.tsx`
- Modify: `src/components/campaign/campaign-map.tsx`
- Modify: `src/components/campaign/campaign-timeline-mobile.tsx`
- Modify: `src/components/campaign/campaign-home-block.tsx`
- Modify: `src/app/(site)/hoc-vien/chien-dich/page.tsx`
- Modify: `src/app/(site)/xem-thu-cap-bac/page.tsx`
- Modify: `src/app/(site)/duong-thi/page.tsx`
- Modify: `src/app/(site)/thien-thi/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `scripts/test-cinematic-contracts.mjs`

**Interfaces:**

- `CampaignMap({ world, variant }: { world: CampaignWorld; variant: "portal" | "student" })`.
- `CampaignTimelineMobile({ world }: { world: CampaignWorld })`.
- `WorldLandmarkRail({ landmarks, competitions }: Pick<CampaignWorld, "landmarks" | "competitions">)`.
- `NextStepGuide({ step }: { step: NextStepModel })`.

- [ ] Extend the source-contract test so it fails when `campaign-map.tsx` contains `href={locked ? "#"`, when `CampaignMap` does not accept `CampaignWorld`, or when `NextStepGuide` is absent.

- [ ] Run `npm run test:cinematic-contracts`. Expected: failure identifying the old fake locked link and missing new interface.

- [ ] Change map rendering from “always Link” to an explicit accessible branch:

```tsx
function GateMarker({ node }: { node: CampaignNodeView }) {
  const content = <GateMarkerContent node={node} />;
  if (node.state === "LOCKED") {
    return (
      <div aria-disabled="true" aria-label={nodeLabel(node)} className="world-map-marker is-locked">
        {content}
      </div>
    );
  }
  return (
    <Link
      href={`/hoc-vien/thi-luyen/${node.trialCode}`}
      aria-label={nodeLabel(node)}
      className="world-map-marker world-action"
    >
      {content}
    </Link>
  );
}
```

- [ ] Render the map canvas in three explicit layers: art fallback/image, campaign path + eight gates, and three misted locked territories. Render the landmark/competition rail immediately below the canvas. Locked territories use plain non-interactive cards:

```tsx
<section aria-label="Ba lãnh địa chưa khai mở" className="world-locked-territories">
  {world.territories.map((territory) => (
    <article key={territory.code} aria-disabled="true" className="world-locked-territory">
      <Lock className="size-4" aria-hidden />
      <h3>{territory.title}</h3>
      <p>{territory.lockedMessage}</p>
    </article>
  ))}
</section>
```

- [ ] Implement `WorldLandmarkRail` using real `Link` elements for all six destinations and dual labels. Do not hide Dương Thí/Thiên Thí just because the competition feature flag is off; their public pages already explain eligibility and may show no open season.

```tsx
export function WorldLandmarkRail({ landmarks, competitions }: Pick<CampaignWorld, "landmarks" | "competitions">) {
  return (
    <nav aria-label="Các địa điểm trên bản đồ" className="world-landmark-rail">
      <PlaceGroup label="Địa điểm" items={landmarks} />
      <PlaceGroup label="Đại thí" items={competitions} />
    </nav>
  );
}

function PlaceGroup({ label, items }: { label: string; items: readonly WorldPlace[] }) {
  return (
    <section aria-label={label}>
      <p className="label-caps">{label}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {items.map((item) => item.href && (
          <li key={item.code}>
            <Link href={item.href} className="world-action block min-h-11 border border-line bg-paper px-4 py-3">
              <span className="block font-display font-semibold text-navy-deep">{item.title}</span>
              <span className="block font-ui text-xs text-muted">{item.functionalLabel}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] Remove the `notFound()` feature-gate branches from `duong-thi/page.tsx` and `thien-thi/page.tsx` so both map destinations always resolve to their explanatory `TierCompetitionView`. Do not enable registration or alter qualification rules.

- [ ] Implement `NextStepGuide`:

```tsx
export function NextStepGuide({ step }: { step: NextStepModel }) {
  return (
    <aside className="world-next-step" aria-labelledby="world-next-step-title">
      <p className="label-caps">{step.eyebrow}</p>
      <h2 id="world-next-step-title" className="mt-3 font-display text-2xl font-bold text-navy-deep">
        {step.title}
      </h2>
      <p className="mt-3 text-[0.96rem] leading-relaxed text-ink-soft">{step.body}</p>
      <Link href={step.href} className="world-action mt-6 inline-flex min-h-11 items-center gap-2 border border-navy bg-navy px-6 py-3 font-ui text-sm font-semibold text-paper">
        {step.actionLabel}<ArrowRight className="size-4" aria-hidden />
      </Link>
      <p className="mt-3 font-ui text-xs text-muted">
        {step.entersStudy ? "Bước này đưa bạn vào khu học tập tĩnh." : "Bước này tiếp tục trong bản đồ hành trình."}
      </p>
    </aside>
  );
}
```

- [ ] Update mobile timeline so locked items are `<div aria-disabled="true">`, and append textual lists for landmarks, competitions and territories after the eight gates.

- [ ] Add map-only Tier 2 styles under `.world-shell`: one 680ms stage reveal, path draw using `stroke-dashoffset`, marker opacity/translate with capped stagger, no looping background animation. Under Reduce Motion, path and marker transforms are disabled.

- [ ] Update every direct map consumer in the same commit so TypeScript remains green: `CampaignHomeBlock`, the student campaign page and `/xem-thu-cap-bac` each call `buildCampaignWorld(...)` and pass `world`. Keep `CampaignMini({ nodes })` and `nearestNodes(nodes)` unchanged; Task 8 passes `world.gates` into that stable interface.

- [ ] Run `npm run test:campaign`, `npm run test:campaign-world`, `npm run test:cinematic-contracts`, `npx tsc --noEmit`, and `npm run lint`. Expected: all exit 0.

- [ ] Commit:

```bash
git add src/components/campaign/campaign-map.tsx src/components/campaign/campaign-timeline-mobile.tsx src/components/campaign/campaign-home-block.tsx src/components/campaign/world-landmark-rail.tsx src/components/world/next-step-guide.tsx src/app/globals.css scripts/test-cinematic-contracts.mjs "src/app/(site)/duong-thi/page.tsx" "src/app/(site)/thien-thi/page.tsx" "src/app/(site)/hoc-vien/chien-dich/page.tsx" "src/app/(site)/xem-thu-cap-bac/page.tsx"
git commit -m "feat: rebuild campaign map as an accessible world"
```

---

## Task 5: Turn the homepage into the campaign-world gateway

**Files:**

- Modify: `src/components/campaign/campaign-home-block.tsx`
- Modify: `src/app/(site)/page.tsx`
- Modify: `scripts/test-cinematic-contracts.mjs`

**Interfaces:**

- `CampaignHomeBlock` builds either a safe guest world or a personalized student world and passes it to presentational components.
- Homepage retains direct links into both Reading modules but does not apply world motion inside those destination routes.

- [ ] Extend the source-contract test to require `SceneHero`, `CampaignHomeBlock`, `NextStepGuide`, `id="lo-trinh-hoc"`, and direct hrefs for both Reading modules on the homepage.

- [ ] Run `npm run test:cinematic-contracts`. Expected: failure for missing gateway structure.

- [ ] Change `CampaignHomeBlock` so the public map always renders. Personalization remains conditional on `features.campaignMap`; database/session errors fall back to the guest world rather than returning `null`:

```tsx
const guestNodes = campaignView(1, { TRIAL_01_DAO_VIEN: { status: "ELIGIBLE" } });
const guestWorld = buildCampaignWorld({ audience: "GUEST", nodes: guestNodes });
if (!features.campaignMap) return <CampaignWorldSection world={guestWorld} />;

try {
  const user = await getCurrentUser();
  if (!user) return <CampaignWorldSection world={guestWorld} />;
  return <CampaignWorldSection world={await loadStudentWorld(user.id)} />;
} catch (error) {
  console.error("[campaign-home] Khong tai duoc tien do ca nhan", error);
  return <CampaignWorldSection world={guestWorld} />;
}
```

- [ ] Extract the existing personalized loading into this bounded server helper; it reuses the current engine and does not change eligibility:

```tsx
async function loadStudentWorld(userId: string): Promise<CampaignWorld> {
  const profile = await ensureUserRank(userId);
  const facts = await loadRankFacts(userId);
  await syncTrialEligibility(userId, facts, profile.currentLevel);
  const rows = await db.userTrial.findMany({
    where: { userId },
    select: { trialCode: true, status: true },
  });
  const trials: TrialStatusMap = {};
  for (const row of rows) trials[row.trialCode] = { status: row.status };
  return buildCampaignWorld({
    audience: "STUDENT",
    nodes: campaignView(profile.currentLevel, trials),
  });
}

function CampaignWorldSection({ world }: { world: CampaignWorld }) {
  return (
    <section id="ban-do-chien-dich" className="world-map-stage border-y border-line bg-cream">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <CampaignMap world={world} variant={world.audience === "STUDENT" ? "student" : "portal"} />
        <CampaignTimelineMobile world={world} />
        <WorldLandmarkRail landmarks={world.landmarks} competitions={world.competitions} />
        <NextStepGuide step={world.nextStep} />
      </div>
    </section>
  );
}
```

- [ ] Replace the home hero call with `SceneHero` and keep the approved brand proposition. Use one primary CTA to `#ban-do-chien-dich` and one functional CTA to `#lo-trinh-hoc`; registration remains visible inside the guest next-step guide.

- [ ] Put the campaign map immediately after the hero with `id="ban-do-chien-dich"`; render `CampaignMap`, `WorldLandmarkRail`, mobile timeline and `NextStepGuide` from the same `CampaignWorld`.

- [ ] Recompose the remaining content into three narrative scenes without rewriting business claims:

```tsx
<NarrativeSection id="lo-trinh-hoc" eyebrow="Lộ trình học" title="Hiểu đúng trước khi bước vào trận" tone="paper">
  <LearningPath />
</NarrativeSection>
<NarrativeSection id="ba-tru" eyebrow="Ba trụ" title="Làm đề, chữa sai, giữ kỷ luật" tone="mist">
  <Pillars />
</NarrativeSection>
<NarrativeSection id="dai-thi" eyebrow="Đại thí" title="Từ Nguyệt Thí tới Thiên Thí" tone="ink">
  <CompetitionPath />
</NarrativeSection>
```

- [ ] Keep “Reading Academic” and “Reading General” labels literal beside any cổ phong label, and add a short note that entering Reading switches to the static study interface.

- [ ] Run `npm run test:cinematic-contracts`, `npm run test:no-han`, `npx tsc --noEmit`, and `npm run lint`. Expected: all exit 0.

- [ ] Start `npm run dev` and visually verify desktop widths 1440px and 1920px plus keyboard order: hero CTA → map gates → six landmarks → next step → Reading links. Expected: no overlapping marker labels, no inaccessible locked link, no layout jump when map art is hidden in DevTools.

- [ ] Commit:

```bash
git add "src/app/(site)/page.tsx" src/components/campaign/campaign-home-block.tsx scripts/test-cinematic-contracts.mjs
git commit -m "feat: make the homepage a cinematic campaign gateway"
```

---

## Task 6: Connect all public destinations into one world

**Files:**

- Modify: `src/app/(site)/nghi-su-duong/page.tsx`
- Modify: `src/app/(site)/nghi-su-duong/template.tsx`
- Modify: `src/app/(site)/dien-danh-vong/page.tsx`
- Modify: `src/app/(site)/bang-vang/page.tsx`
- Modify: `src/app/(site)/nguyet-thi/page.tsx`
- Modify: `src/components/competition/tier-competition-view.tsx`
- Modify: `scripts/test-cinematic-contracts.mjs`

**Interfaces:**

- Public pages consume `SceneHero` or a compact `NarrativeSection` and one explicit `NextStepModel`.
- Competition/service/database return types remain unchanged.

- [ ] Extend the source-contract test with a page matrix requiring `NextStepGuide` on Nghị Sự Đường, Điện Danh Vọng, Bảng Vàng, Nguyệt Thí and `TierCompetitionView`, and prohibiting `motion-page-entry` in those files after conversion.

- [ ] Run `npm run test:cinematic-contracts`. Expected: failures naming each unconverted public page.

- [ ] Convert the public roots using these fixed guidance destinations:

| Page | What to understand | First action | Next destination |
| --- | --- | --- | --- |
| Nghị Sự Đường | Cộng đồng dùng để bàn cách học, không thay thế chữa bài | Chọn một phòng phù hợp cấp bậc | `/hoc-vien` |
| Điện Danh Vọng | Danh hiệu chứng minh hành vi học thật | Xem danh hiệu đầu tiên | `/hoc-vien/danh-hieu` |
| Bảng Vàng | Chỉ công bố kết quả đã rà soát | Xem kỳ gần nhất | `/nguyet-thi` |
| Nguyệt Thí | Điều kiện dự thi đến từ ba trụ | Kiểm tra điều kiện | `/hoc-vien/danh-hieu` |
| Dương Thí | Vé đến từ Nguyệt Thí | Xem đường tuyển chọn | `/nguyet-thi` |
| Thiên Thí | Vé đến từ Dương Thí | Xem đường tuyển chọn | `/duong-thi` |

- [ ] Remove `motion-page-entry` from these page/template roots so the route-level scene is the only page transition. Keep local form/status motion classes because they express causality.

- [ ] Preserve all existing database queries, conditions, server actions, error copy and eligibility calculations. Limit page diffs to imports, wrapper/section markup, class names and the new guidance model.

- [ ] Run `npm run test:competition`, `npm run test:qualification`, `npm run test:forum`, `npm run test:achievements`, `npm run test:cinematic-contracts`, `npx tsc --noEmit`, and `npm run lint`. Expected: all exit 0.

- [ ] Browser-check all six destinations at 1440px and keyboard-only. Expected: each page identifies the location, explains its function and offers exactly one dominant next step; status/error content remains next to its cause.

- [ ] Commit:

```bash
git add "src/app/(site)/nghi-su-duong/page.tsx" "src/app/(site)/nghi-su-duong/template.tsx" "src/app/(site)/dien-danh-vong/page.tsx" "src/app/(site)/bang-vang/page.tsx" "src/app/(site)/nguyet-thi/page.tsx" src/components/competition/tier-competition-view.tsx scripts/test-cinematic-contracts.mjs
git commit -m "feat: connect public destinations to the campaign world"
```

---

## Task 7: Give account and payment flows a quiet premium frame

**Files:**

- Modify: `src/app/(site)/dang-nhap/page.tsx`
- Modify: `src/app/(site)/dang-ky/page.tsx`
- Modify: `src/app/(site)/doi-mat-khau/page.tsx`
- Modify: `src/app/(site)/thanh-toan/page.tsx`
- Modify: `src/app/(site)/thanh-toan/template.tsx`
- Modify: `src/app/(site)/thanh-toan/[invoiceNumber]/page.tsx`
- Modify: `src/app/(site)/thanh-toan/[invoiceNumber]/ket-qua/page.tsx`
- Modify: `scripts/test-cinematic-contracts.mjs`

**Interfaces:**

- Pages consume `QuietWorldPanel`; form fields, actions, submit states and payment poller interfaces remain unchanged.
- Route policy fixes these routes at Tier 1.

- [ ] Extend the source-contract test to require `QuietWorldPanel` on account pages, a Tier 1 route assertion for invoice descendants, and no `motion-page-entry` in `thanh-toan/template.tsx`.

- [ ] Run `npm run test:cinematic-contracts`. Expected: failure for each missing quiet frame.

- [ ] Wrap each form/page with `QuietWorldPanel`, using only one ink wash in the outer frame and a clean paper form surface. Keep payment CTA labels literal and functional; do not apply cổ phong terms to monetary actions.

- [ ] Remove duplicate route-entry animation from the payment template. Keep `motion-status-enter`, payment polling and dialog behavior where they already explain a state change.

- [ ] Verify by diff that imports from `@/lib/actions`, all `<form action={...}>` expressions, hidden inputs and payment status branching are unchanged.

- [ ] Run `npm run test:payments`, `npm run test:coins`, `npm run test:cinematic-contracts`, `npx tsc --noEmit`, and `npm run lint`. Expected: all exit 0.

- [ ] Browser-check login error, registration error, payment loading, payment success and payment failure. Expected: no layout jump, `role="alert"` remains, submit focus remains visible, only Tier 1 fade/press motion runs.

- [ ] Commit:

```bash
git add "src/app/(site)/dang-nhap/page.tsx" "src/app/(site)/dang-ky/page.tsx" "src/app/(site)/doi-mat-khau/page.tsx" "src/app/(site)/thanh-toan/page.tsx" "src/app/(site)/thanh-toan/template.tsx" "src/app/(site)/thanh-toan/[invoiceNumber]/page.tsx" "src/app/(site)/thanh-toan/[invoiceNumber]/ket-qua/page.tsx" scripts/test-cinematic-contracts.mjs
git commit -m "feat: refine account and payment presentation"
```

---

## Task 8: Make the student area a personalized campaign command view

**Files:**

- Modify: `src/app/(site)/hoc-vien/page.tsx`
- Modify: `src/app/(site)/hoc-vien/chien-dich/page.tsx`
- Modify: `src/app/(site)/hoc-vien/danh-hieu/page.tsx`
- Modify: `src/app/(site)/hoc-vien/nhat-khoa/page.tsx`
- Modify: `src/app/(site)/hoc-vien/so-so-ho/page.tsx`
- Modify: `src/app/(site)/hoc-vien/du-lieu-cua-toi/page.tsx`
- Modify: `src/app/(site)/hoc-vien/thi-luyen/[trialCode]/page.tsx`
- Modify: `src/components/student/student-nav.tsx`
- Modify: `src/components/ranks/rank-dashboard-block.tsx`
- Modify: `scripts/test-cinematic-contracts.mjs`

**Interfaces:**

- `RankDashboardBlock` continues to consume `{ userId: string }` but builds one `CampaignWorld` for map mini + next step.
- `CampaignPage` continues to normalize Prisma rows into `TrialStatusMap`, then calls `buildCampaignWorld`.
- No file below `src/app/(site)/hoc-vien/bai-lam/` is modified.

- [ ] Extend the source-contract test to require `buildCampaignWorld` and `NextStepGuide` on the campaign/dashboard path, and to assert every protected student result/Feynman file remains free of world imports/classes.

- [ ] Run `npm run test:cinematic-contracts`. Expected: failure for missing personalized world usage.

- [ ] In `hoc-vien/chien-dich/page.tsx`, keep all current rank/facts/trial loading, then replace the old direct map props:

```tsx
const nodes = campaignView(profile.currentLevel, trials);
const world = buildCampaignWorld({ audience: "STUDENT", nodes });

<CampaignMap world={world} variant="student" />
<CampaignTimelineMobile world={world} />
<NextStepGuide step={world.nextStep} />
```

- [ ] Recompose the dashboard hierarchy in this order: current rank + current location; dominant next step; compact map around the learner; weekly discipline and goals; achievements; attempt history. Do not change the data queries or attempt links.

- [ ] Update `RankDashboardBlock` to render the same next step as the full campaign page. Keep `ensureUserRank`, `syncTrialEligibility`, `evaluateTrialGate` and `evaluateTrialSuccess` unchanged.

- [ ] Apply `NarrativeSection`/world surface classes to Danh hiệu, Nhật Khóa, Sổ Sơ Hở, Dữ liệu của tôi and Thí luyện. Each page keeps one dominant local action. Thí luyện may use Tier 2 orientation, but no motion is added after following a link into Reading or Feynman.

- [ ] Enhance `StudentNav` presentation only through `.world-shell` descendants. Its existing server-only feature checks and `current` prop remain unchanged, so the nav on protected pages (if ever reused) retains the legacy appearance.

- [ ] Run `npm run test:ranks`, `npm run test:rank-rules`, `npm run test:campaign`, `npm run test:campaign-world`, `npm run test:achievements`, `npm run test:weakness`, `npm run test:data-rights`, `npm run test:student-pages`, `npx tsc --noEmit`, and `npm run lint`. Expected: all exit 0.

- [ ] Browser-check a logged-in learner at low rank and a preview high-rank state. Expected: map position, next gate and next-step CTA agree; all three locked territories remain identical and inert; the Reading/result destination drops the world shell.

- [ ] Commit:

```bash
git add "src/app/(site)/hoc-vien/page.tsx" "src/app/(site)/hoc-vien/chien-dich/page.tsx" "src/app/(site)/hoc-vien/danh-hieu/page.tsx" "src/app/(site)/hoc-vien/nhat-khoa/page.tsx" "src/app/(site)/hoc-vien/so-so-ho/page.tsx" "src/app/(site)/hoc-vien/du-lieu-cua-toi/page.tsx" "src/app/(site)/hoc-vien/thi-luyen/[trialCode]/page.tsx" src/components/student/student-nav.tsx src/components/ranks/rank-dashboard-block.tsx scripts/test-cinematic-contracts.mjs
git commit -m "feat: personalize the student campaign experience"
```

---

## Task 9: Generalize rare one-shot ceremonies for rank and title events

**Files:**

- Create: `src/components/world/ceremony-layer.tsx`
- Modify: `src/components/ranks/rank-promotion-moment.tsx`
- Modify: `src/app/(site)/hoc-vien/danh-hieu/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `scripts/test-cinematic-contracts.mjs`

**Interfaces:**

- `CeremonyLayer` consumes `eventId`, `storageScope`, `eligible`, `label`, render-function `children(dismiss)`, optional `delayMs`.
- Rank and title wrappers supply event IDs; `CeremonyLayer` owns one-shot storage, visibility and dismissal only.

- [ ] Extend the source-contract test to require `CeremonyLayer`, forbid an animation duration outside 900–1600ms for `.world-ceremony`, and require the reduced-motion override.

- [ ] Run `npm run test:cinematic-contracts`. Expected: failure for missing ceremony component and style.

- [ ] Implement one-shot behavior with a versioned storage key and no repeated timer:

```tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";

export function CeremonyLayer({ eventId, storageScope, eligible, label, delayMs = 520, children }: {
  eventId: string;
  storageScope: "rank" | "title" | "competition";
  eligible: boolean;
  label: string;
  delayMs?: number;
  children: (dismiss: () => void) => ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!eligible) return;
    const key = `wb-ceremony:v1:${storageScope}:${eventId}`;
    try {
      if (localStorage.getItem(key) === "seen") return;
    } catch {
      // Storage có thể bị chặn; nghi thức vẫn chạy an toàn trong lượt hiện tại.
    }
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(key, "seen");
      } catch {
        // Không lưu được chỉ làm mất cơ chế một lần, không làm hỏng giao diện.
      }
      setVisible(true);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, eligible, eventId, storageScope]);
  if (!visible) return null;
  return (
    <section role="status" aria-label={label} className="world-ceremony">
      {children(() => setVisible(false))}
    </section>
  );
}
```

- [ ] Refactor `RankPromotionMoment` to delegate storage/timing to `CeremonyLayer` while retaining its public props and semantic copy. Use `promotionId` as the event identity.

- [ ] On Danh hiệu, render a title ceremony only when the latest award is within 14 days. Do not create a database event or mutate award state:

```tsx
const latest = overview.latest;
const ceremonyNow = new Date();
const latestAge = latest?.earnedAt ? ceremonyNow.getTime() - latest.earnedAt.getTime() : Number.POSITIVE_INFINITY;
const latestIsFresh = latestAge >= 0 && latestAge <= 14 * 24 * 60 * 60 * 1000;

{latest?.earnedAt && (
  <CeremonyLayer
    eventId={`${user.id}:${latest.code}:${latest.earnedAt.toISOString()}`}
    storageScope="title"
    eligible={latestIsFresh}
    label={`Đã nhận danh hiệu ${latest.name}`}
  >
    {(dismiss) => <TitleCeremonyContent title={latest} onDismiss={dismiss} />}
  </CeremonyLayer>
)}
```

- [ ] Add a 1200ms one-shot sequence under `.world-shell .world-ceremony`: ink veil fade, insignia/title rise, seal confirmation. No loop, bounce, audio or confetti. Reduced Motion collapses it to a 120ms opacity change.

- [ ] Run `npm run test:ranks`, `npm run test:achievements`, `npm run test:cinematic-contracts`, `npx tsc --noEmit`, and `npm run lint`. Expected: all exit 0.

- [ ] Browser-check first view, dismissal, reload, another user/event ID and Reduce Motion. Expected: one display per event ID; reload does not repeat; blocked localStorage does not crash.

- [ ] Commit:

```bash
git add src/components/world/ceremony-layer.tsx src/components/ranks/rank-promotion-moment.tsx "src/app/(site)/hoc-vien/danh-hieu/page.tsx" src/app/globals.css scripts/test-cinematic-contracts.mjs
git commit -m "feat: add one-shot rank and title ceremonies"
```

---

## Task 10: Redesign administration as a dense command tent

**Files:**

- Create: `src/components/admin/admin-page-shell.tsx`
- Modify: `src/app/(site)/quan-tri/layout.tsx`
- Modify: `src/components/admin/admin-nav.tsx`
- Modify: every `src/app/(site)/quan-tri/**/page.tsx` except `ai-feynman/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `scripts/test-cinematic-contracts.mjs`

**Interfaces:**

- `AdminPageShell({ eyebrow, title, lede, actions, width, children })` owns layout only.
- Existing page queries, action bindings, form state, tables and feature gates remain in their current files.
- AI Feynman receives no `WorldShell`, no `AdminPageShell` and no new CSS because its route is Tier 0.

- [ ] Extend the source-contract test to enumerate admin page files, exclude `ai-feynman/page.tsx`, require `AdminPageShell` on every remaining page and assert AI Feynman has no import from `admin-page-shell` or `components/world`.

- [ ] Run `npm run test:cinematic-contracts`. Expected: failures listing each admin page not yet converted.

- [ ] Implement `AdminPageShell`:

```tsx
export function AdminPageShell({ eyebrow, title, lede, actions, width = "wide", children }: {
  eyebrow: string;
  title: string;
  lede?: string;
  actions?: React.ReactNode;
  width?: "medium" | "wide";
  children: React.ReactNode;
}) {
  return (
    <main className={`command-tent-page ${width === "wide" ? "max-w-6xl" : "max-w-4xl"} mx-auto px-6 py-10`}>
      <header className="command-tent-heading">
        <div><p className="label-caps">{eyebrow}</p><h1>{title}</h1>{lede && <p>{lede}</p>}</div>
        {actions && <div className="command-tent-actions">{actions}</div>}
      </header>
      {children}
    </main>
  );
}
```

- [ ] Add a stable `data-admin-chrome="true"` hook to the existing admin bar. Style it only through `.world-shell [data-admin-chrome="true"]`; therefore the same bar on AI Feynman retains current styling when the outer shell is absent.

- [ ] Add only `data-admin-nav="true"` to the root `<nav>` in `AdminNav`. Preserve `allowPressMotion`, `isActive`, link/button class expressions, logout action and all AI Feynman branches exactly; new navigation appearance comes solely from `.world-shell [data-admin-nav="true"]` selectors.

- [ ] Convert admin pages in this order, running TypeScript after each group: overview/stats; students/ranks; exercises/sets; competitions/selection; payments/rewards; forum/images. Remove page-level `motion-page-entry` because Tier 1 comes from the route shell.

- [ ] Add command-tent styles under `.world-shell`: compact 8px spacing rhythm, clear table headers, sticky horizontal overflow affordance, one gold accent, 180ms panel/status transitions. Do not add Tier 2 scene movement or Tier 3 ceremonies to normal admin actions.

- [ ] Verify the AI page in Browser before and after admin conversion. Expected: no `data-world-shell` ancestor, identical header/bar/page geometry, no new animation name and no new transition property from command-tent CSS.

- [ ] Run `npm run test:admin`, `npm run test:access`, `npm run test:payments`, `npm run test:competition`, `npm run test:qualification`, `npm run test:forum`, `npm run test:ranks`, `npm run test:cinematic-contracts`, `npx tsc --noEmit`, and `npm run lint`. Expected: all exit 0.

- [ ] Browser-check overview, one dense table, one edit form, one dialog and one empty state at 1440px. Expected: primary action is obvious, focus ring visible, tables scroll without clipping, no cinematic ceremony.

- [ ] Commit:

```bash
git add src/components/admin/admin-page-shell.tsx src/components/admin/admin-nav.tsx "src/app/(site)/quan-tri/layout.tsx" "src/app/(site)/quan-tri/page.tsx" "src/app/(site)/quan-tri/bai-tap/page.tsx" "src/app/(site)/quan-tri/bai-tap/moi/page.tsx" "src/app/(site)/quan-tri/bai-tap/[exerciseId]/page.tsx" "src/app/(site)/quan-tri/bo-de/page.tsx" "src/app/(site)/quan-tri/cap-bac/page.tsx" "src/app/(site)/quan-tri/cap-bac/[userId]/page.tsx" "src/app/(site)/quan-tri/cuoc-thi/page.tsx" "src/app/(site)/quan-tri/hinh-anh/page.tsx" "src/app/(site)/quan-tri/hoc-vien/page.tsx" "src/app/(site)/quan-tri/nghi-su-duong/page.tsx" "src/app/(site)/quan-tri/phan-thuong/page.tsx" "src/app/(site)/quan-tri/thanh-toan/page.tsx" "src/app/(site)/quan-tri/tuyen-chon/page.tsx" "src/app/(site)/quan-tri/tuyen-chon/[competitionId]/page.tsx" src/app/globals.css scripts/test-cinematic-contracts.mjs
git commit -m "feat: redesign administration as a command tent"
```

---

## Task 11: Prove protected routes stayed static and finish the release evidence

**Files:**

- Create: `docs/qa/2026-08-14-cinematic-campaign-map-redesign.md`
- Modify: `docs/CHANGELOG-MOTION-2026-08-14.md`
- Modify: `scripts/test-cinematic-contracts.mjs`

**Interfaces:**

- Produces release evidence only; no product behavior changes unless a verification failure is found and fixed in the owning task.

- [ ] Add final source contracts: exactly three future territories; no territory href; no new dependency; no direct `db`/Prisma import in `campaign-map.tsx`, `world-landmark-rail.tsx`, `next-step-guide.tsx`; no world imports in protected pages.

- [ ] Run focused gates:

```bash
npm run test:motion-route
npm run test:campaign-world
npm run test:cinematic-contracts
npm run test:no-han
npx tsc --noEmit
```

Expected: every command exits 0.

- [ ] Run the full mandatory gates:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: every command exits 0; build lists all routes without compile or page-data errors.

- [ ] Compare protected route source scope from the approved spec commit:

```bash
git diff --name-only 1b9fc54 -- "src/app/(exam)" "src/app/(site)/luyen-tap/reading" "src/app/(site)/hoc-vien/bai-lam" "src/app/(site)/quan-tri/ai-feynman"
```

Expected: no output. If output exists, inspect and revert only changes introduced by this redesign; do not discard unrelated user work.

- [ ] Repeat the six protected-route screenshots at the same viewport and state as baseline. For each page, record `document.querySelector('[data-world-shell="true"]') === null` and the computed `animationName`, `animationDuration`, `transitionProperty` of the main content root.

- [ ] Perform final visual matrix:

| Area | Routes | Viewports | Required proof |
| --- | --- | --- | --- |
| Public | `/`, `/nghi-su-duong`, `/dien-danh-vong`, `/bang-vang`, three exam pages | 1440, 1920, 390 | world continuity, next step, mobile list |
| Student | `/hoc-vien`, `/hoc-vien/chien-dich`, `/hoc-vien/danh-hieu` | 1440, 390 | correct location, next gate, locked territories |
| Transaction | `/dang-nhap`, `/thanh-toan` | 1440, 390 | Tier 1 only, no layout shift |
| Admin | `/quan-tri`, one table, one form | 1440 | density, focus, dialog |
| Protected | six baseline routes | same baseline viewport | no shell and no visual regression |

- [ ] Toggle Reduce Motion and repeat home map, student map, ceremony preview and admin dialog. Expected: no translate, scale, path draw, parallax or clip reveal; only short opacity feedback remains outside Tier 0.

- [ ] Hide each used image/video request in DevTools and reload. Expected: CSS ink fallback preserves contrast, height and CTA access; no blank hero/map.

- [ ] Manually inspect all new/used art for embedded text or glyphs because `test:no-han` cannot scan pixels. Record each checked asset path in the QA document.

- [ ] Update `docs/CHANGELOG-MOTION-2026-08-14.md` to state that the earlier restrained system was expanded into the approved tiered cinematic world outside protected study routes; preserve the historical notes and list the unchanged boundaries.

- [ ] Write `docs/qa/2026-08-14-cinematic-campaign-map-redesign.md` with command outputs, route matrix, browser observations, baseline/result screenshot locations, reduced-motion result, art audit and any known non-blocking warning.

- [ ] Run `npm run test:no-han`, `git diff --check`, and `git status --short`. Expected: tests exit 0; only intended documentation/test changes are uncommitted.

- [ ] Commit:

```bash
git add docs/qa/2026-08-14-cinematic-campaign-map-redesign.md docs/CHANGELOG-MOTION-2026-08-14.md scripts/test-cinematic-contracts.mjs
git commit -m "docs: record cinematic redesign verification"
```

- [ ] Invoke `superpowers:requesting-code-review`, address only verified findings, rerun the full gates after any code change, then invoke `superpowers:finishing-a-development-branch` to offer push/PR or local handoff.

## Completion Checklist

- [ ] Branding kem–navy–vàng đồng, typography editorial và chất giấy/mực vẫn nhận ra ngay.
- [ ] Homepage and public pages form one campaign world with clear learning guidance.
- [ ] Student map reflects actual rank/trial data and provides one clear next action.
- [ ] Three unnamed territories are visible, misted, locked and non-interactive.
- [ ] Nguyệt Thí, Dương Thí and Thiên Thí appear in that order.
- [ ] Tier 1/2/3 motion values and Reduce Motion behavior match the approved spec.
- [ ] Reading/Feynman routes have no world shell and match baseline evidence.
- [ ] Admin AI Feynman remains outside the new command-tent styling.
- [ ] No database, API, rule or faction-system change exists.
- [ ] TypeScript, full tests, lint, build, no-Han, diff check and browser QA all pass.
