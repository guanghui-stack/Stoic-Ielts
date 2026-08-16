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
