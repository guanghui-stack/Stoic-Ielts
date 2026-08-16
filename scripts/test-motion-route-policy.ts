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
