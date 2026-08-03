/**
 * Kiểm thử xác thực Safe Exam Browser và cổng vào phòng thi.
 * Chạy: node --experimental-strip-types scripts/test-attestation.ts
 *
 * Phủ các tình huống bảo mật ở §19.2 của đặc tả. Với phương án thi từ xa rút
 * gọn (không webcam, không ảnh màn hình), đây là lớp phòng thủ chính — nên nó
 * cũng là bộ kiểm thử đáng tin nhất phải có.
 */
import {
  verifySebAttestation,
  sebKeyHash,
  normalizeExamUrl,
  evaluateCheckIn,
  canReleaseContent,
  examDeadlineMs,
  IDENTITY_CHECKPOINTS,
  BLOCKER_MESSAGES,
  ATTESTATION_MESSAGES,
  type SebAllowlist,
  type CheckInInput,
} from "../src/lib/integrity/attestation.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const URL_THI = "https://stoic-ielts.online/lam-bai/abc123";
const CONFIG_SECRET = "config-key-bi-mat-cua-ky-thi-thang-9";
const BEK_SECRET = "browser-exam-key-thang-9";

const ALLOWLIST: SebAllowlist = {
  allowedVersions: ["SEB_Win_3.9.0", "SEB_macOS_3.4.0"],
  configKeys: [CONFIG_SECRET],
  browserExamKeys: [BEK_SECRET],
};

const goodAttestation = {
  version: "SEB_Win_3.9.0",
  configKeyHash: sebKeyHash(URL_THI, CONFIG_SECRET),
  browserExamKeyHash: sebKeyHash(URL_THI, BEK_SECRET),
  pageUrl: URL_THI,
};

/* ================================================================== */
console.log("\nXÁC THỰC SEB — fail closed, thiếu bằng chứng thì từ chối");

check(
  "SEB đúng bản, đúng cấu hình → cho qua",
  verifySebAttestation({ attestation: goodAttestation, allowlist: ALLOWLIST, expectedUrl: URL_THI }),
  { ok: true, failures: [] }
);

check(
  "mở bằng Chrome (không có đối tượng SafeExamBrowser) → từ chối",
  verifySebAttestation({ attestation: null, allowlist: ALLOWLIST, expectedUrl: URL_THI }),
  { ok: false, failures: ["SEB_REQUIRED"] }
);

check(
  "khai version nhưng thiếu khóa → vẫn coi như không phải SEB",
  verifySebAttestation({
    attestation: { version: "SEB_Win_3.9.0", pageUrl: URL_THI },
    allowlist: ALLOWLIST,
    expectedUrl: URL_THI,
  }),
  { ok: false, failures: ["SEB_REQUIRED"] }
);

check(
  "bản SEB ngoài danh sách đã kiểm thử → từ chối",
  verifySebAttestation({
    attestation: { ...goodAttestation, version: "SEB_Win_2.1.0" },
    allowlist: ALLOWLIST,
    expectedUrl: URL_THI,
  }).failures,
  ["UNAPPROVED_VERSION"]
);

check(
  "sửa file .seb làm đổi khóa → từ chối",
  verifySebAttestation({
    attestation: { ...goodAttestation, configKeyHash: sebKeyHash(URL_THI, "khoa-tu-che") },
    allowlist: ALLOWLIST,
    expectedUrl: URL_THI,
  }).failures,
  ["INVALID_CONFIG_KEY"]
);

check(
  "dùng cấu hình của kỳ thi khác → từ chối",
  verifySebAttestation({
    attestation: {
      ...goodAttestation,
      browserExamKeyHash: sebKeyHash(URL_THI, "bek-thang-8"),
    },
    allowlist: ALLOWLIST,
    expectedUrl: URL_THI,
  }).failures,
  ["INVALID_BROWSER_EXAM_KEY"]
);

check(
  "dùng lại hash của trang khác (replay) → từ chối",
  verifySebAttestation({
    attestation: {
      version: "SEB_Win_3.9.0",
      configKeyHash: sebKeyHash("https://stoic-ielts.online/lam-bai/KHAC", CONFIG_SECRET),
      browserExamKeyHash: sebKeyHash("https://stoic-ielts.online/lam-bai/KHAC", BEK_SECRET),
      pageUrl: URL_THI,
    },
    allowlist: ALLOWLIST,
    expectedUrl: URL_THI,
  }).ok,
  false
);

check(
  "SEB báo URL khác với URL máy chủ mong đợi → từ chối",
  verifySebAttestation({
    attestation: { ...goodAttestation, pageUrl: "https://ke-gia-mao.com/lam-bai/abc123" },
    allowlist: ALLOWLIST,
    expectedUrl: URL_THI,
  }).failures.includes("URL_MISMATCH"),
  true
);

check(
  "trả về ĐỦ mọi lý do sai, không dừng ở lý do đầu tiên",
  verifySebAttestation({
    attestation: {
      version: "SEB_Win_1.0.0",
      configKeyHash: "sai",
      browserExamKeyHash: "sai",
      pageUrl: URL_THI,
    },
    allowlist: ALLOWLIST,
    expectedUrl: URL_THI,
  }).failures.length,
  3
);

check("bỏ fragment khỏi URL", normalizeExamUrl(`${URL_THI}#phan-2`), URL_THI);
check("bỏ query khỏi URL", normalizeExamUrl(`${URL_THI}?t=1`), URL_THI);
check(
  "hash phụ thuộc cả URL lẫn khóa",
  sebKeyHash(URL_THI, CONFIG_SECRET) === sebKeyHash(URL_THI, BEK_SECRET),
  false
);

/* ================================================================== */
console.log("\nCỔNG VÀO PHÒNG THI — hai mốc xác minh đều bắt buộc");

const T0 = Date.UTC(2026, 8, 5, 2, 0, 0); // giờ bắt đầu
const OK_INPUT: CheckInInput = {
  nowMs: T0 - 10 * 60_000,
  checkInOpenAtMs: T0 - 30 * 60_000,
  startsAtMs: T0,
  endsAtMs: T0 + 60 * 60_000,
  verifiedCheckpoints: ["PRE_EXAM_DAY", "CHECKIN_T5"],
  grantedConsents: ["TERMS", "PROCTORING"],
  requiredConsents: ["TERMS", "PROCTORING"],
  attestation: { ok: true, failures: [] },
  hasActiveSessionElsewhere: false,
  preflightPassed: true,
};

check("đủ mọi điều kiện → được vào", evaluateCheckIn(OK_INPUT), { allowed: true, blockers: [] });

check(
  "thiếu xác minh trước ngày thi → chặn",
  evaluateCheckIn({ ...OK_INPUT, verifiedCheckpoints: ["CHECKIN_T5"] }).blockers,
  [{ code: "MISSING_IDENTITY_CHECK", checkpoint: "PRE_EXAM_DAY" }]
);

check(
  "thiếu xác minh T-5 phút → chặn, dù hôm trước đã xác minh",
  evaluateCheckIn({ ...OK_INPUT, verifiedCheckpoints: ["PRE_EXAM_DAY"] }).blockers,
  [{ code: "MISSING_IDENTITY_CHECK", checkpoint: "CHECKIN_T5" }]
);

check(
  "chưa xác minh lần nào → liệt kê cả hai",
  evaluateCheckIn({ ...OK_INPUT, verifiedCheckpoints: [] }).blockers.length,
  2
);

check(
  "vào sớm hơn giờ mở phòng chờ → chặn",
  evaluateCheckIn({ ...OK_INPUT, nowMs: T0 - 60 * 60_000 }).blockers[0].code,
  "TOO_EARLY"
);

check(
  "hết giờ đề → không mở phiên mới",
  evaluateCheckIn({ ...OK_INPUT, nowMs: T0 + 61 * 60_000 }).blockers.some((b) => b.code === "TOO_LATE"),
  true
);

check(
  "chưa thi thử bắt buộc → chặn",
  evaluateCheckIn({ ...OK_INPUT, preflightPassed: false }).blockers.some(
    (b) => b.code === "PREFLIGHT_NOT_PASSED"
  ),
  true
);

check(
  "thiếu một loại đồng ý → chặn và nói rõ thiếu loại nào",
  evaluateCheckIn({ ...OK_INPUT, grantedConsents: ["TERMS"] }).blockers,
  [{ code: "MISSING_CONSENT", purpose: "PROCTORING" }]
);

check(
  "SEB không hợp lệ → chặn kèm nguyên nhân cụ thể",
  evaluateCheckIn({
    ...OK_INPUT,
    attestation: { ok: false, failures: ["INVALID_CONFIG_KEY"] },
  }).blockers,
  [{ code: "SEB_ATTESTATION_FAILED", failures: ["INVALID_CONFIG_KEY"] }]
);

check(
  "đã có phiên mở ở máy khác → chặn máy thứ hai",
  evaluateCheckIn({ ...OK_INPUT, hasActiveSessionElsewhere: true }).blockers.some(
    (b) => b.code === "DUPLICATE_SESSION"
  ),
  true
);

check(
  "nhiều thứ thiếu cùng lúc thì liệt kê hết, không bắt thí sinh dò từng cái",
  evaluateCheckIn({
    ...OK_INPUT,
    verifiedCheckpoints: [],
    grantedConsents: [],
    preflightPassed: false,
    attestation: { ok: false, failures: ["SEB_REQUIRED"] },
  }).blockers.length,
  6
);

/* ================================================================== */
console.log("\nPHÁT ĐỀ — không sớm hơn giờ bắt đầu một giây nào");

check(
  "đã check-in nhưng chưa tới giờ → KHÔNG phát nội dung",
  canReleaseContent({ nowMs: T0 - 1, startsAtMs: T0, endsAtMs: T0 + 3_600_000, sessionStatus: "ACTIVE" }),
  { allowed: false, reason: "NOT_STARTED" }
);
check(
  "đúng giờ bắt đầu → phát",
  canReleaseContent({ nowMs: T0, startsAtMs: T0, endsAtMs: T0 + 3_600_000, sessionStatus: "ACTIVE" }),
  { allowed: true }
);
check(
  "hết giờ → không phát nữa",
  canReleaseContent({ nowMs: T0 + 3_600_000, startsAtMs: T0, endsAtMs: T0 + 3_600_000, sessionStatus: "ACTIVE" }),
  { allowed: false, reason: "ENDED" }
);
check(
  "phiên chưa ACTIVE thì dù đúng giờ cũng không phát",
  canReleaseContent({ nowMs: T0, startsAtMs: T0, endsAtMs: T0 + 3_600_000, sessionStatus: "CHECKIN" }),
  { allowed: false, reason: "SESSION_NOT_ACTIVE" }
);

check(
  "vào muộn KHÔNG được cộng thêm giờ — hạn nộp là giờ kết thúc chung",
  examDeadlineMs({ startsAtMs: T0, endsAtMs: T0 + 3_600_000 }),
  T0 + 3_600_000
);

/* ================================================================== */
console.log("\nTHÔNG ĐIỆP CHO NGƯỜI DÙNG");
check("mọi lý do bị chặn đều có câu tiếng Việt", Object.keys(BLOCKER_MESSAGES).length, 7);
check("mọi lỗi SEB đều có câu tiếng Việt", Object.keys(ATTESTATION_MESSAGES).length, 5);
check("đúng hai mốc xác minh danh tính", IDENTITY_CHECKPOINTS.length, 2);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
