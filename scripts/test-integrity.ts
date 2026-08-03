/**
 * Kiểm thử lớp quyết định liêm chính Nguyệt Thí.
 * Chạy: node --experimental-strip-types scripts/test-integrity.ts
 *
 * Phủ các tình huống bắt buộc ở §19.1 của đặc tả, cộng thêm phần xử lý mâu thuẫn
 * giữa §0.1 điều 7 (mất mạng không phải gian lận) và §5.2 điều 3 (mất media 10
 * giây thì nộp bài) — hai điều này va nhau vì rớt Wi-Fi giết media ngay lập tức.
 *
 * Đây là những phép thử đắt giá nhất trong dự án: sai một ngưỡng ở đây nghĩa là
 * loại nhầm một thí sinh thật trong kỳ thi có tiền thưởng.
 */
import {
  INTEGRITY_POLICY,
  applyEvents,
  coalesceEvents,
  canTransitionSession,
  canTransitionReview,
  authorizeReviewTransition,
  computeResumeDeadline,
  decideReconnect,
  computeRiskScore,
  buildDedupeKey,
  type SessionCounters,
  type ReportedEvent,
} from "../src/lib/integrity/policy.ts";
import {
  buildVariantFromSeed,
  toCanonicalAnswers,
  countQuestions,
  mulberry32,
  shuffled,
  type VaultPart,
} from "../src/lib/competition/variant-rules.ts";
import {
  wrongAnswerSimilarity,
  isSuspiciousPair,
  analyzeCompetition,
  flagFastHighScorers,
  mandatoryReviewSessions,
  type CanonicalResult,
} from "../src/lib/integrity/similarity.ts";
import {
  ageAt,
  checkIdentityEligibility,
  requiredConsents,
  MIN_COMPETITION_AGE,
} from "../src/lib/identity/eligibility.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const FRESH: SessionCounters = {
  strikeCount: 0,
  protectedLossMs: 0,
  continuousMediaLossMs: 0,
  networkOffline: false,
};

/** Sự kiện tại giây thứ n, cách nhau đủ xa để không bị gom nhóm. */
const ev = (
  type: ReportedEvent["type"],
  seconds: number,
  durationMs?: number
): ReportedEvent => ({ type, occurredAtMs: seconds * 1000, durationMs });

/* ================================================================== */
console.log("\nGOM SỰ KIỆN — một thao tác không được thành ba strike");

check(
  "Alt+Tab sinh 3 sự kiện trong 50ms chỉ thành MỘT incident",
  coalesceEvents([
    { type: "WINDOW_BLUR", occurredAtMs: 1000, durationMs: 4000 },
    { type: "VISIBILITY_LOSS", occurredAtMs: 1020, durationMs: 4000 },
    { type: "FULLSCREEN_EXIT", occurredAtMs: 1050, durationMs: 4000 },
  ]).filter((e) => e.isIncident).length,
  1
);
check(
  "ba lần Alt+Tab cách nhau 10 giây thì thành ba incident",
  coalesceEvents([
    ev("WINDOW_BLUR", 10, 1000),
    ev("WINDOW_BLUR", 20, 1000),
    ev("WINDOW_BLUR", 30, 1000),
  ]).filter((e) => e.isIncident).length,
  3
);
check(
  "copy và context menu là hai nhóm khác nhau, không gom lẫn",
  coalesceEvents([
    { type: "COPY_ATTEMPT", occurredAtMs: 1000 },
    { type: "CONTEXT_MENU", occurredAtMs: 1100 },
  ]).filter((e) => e.isIncident).length,
  2
);

/* ================================================================== */
console.log("\nBA STRIKE → TỰ NỘP BÀI");

const threeStrikes = applyEvents(FRESH, [
  ev("COPY_ATTEMPT", 10),
  ev("CONTEXT_MENU", 30),
  ev("PROHIBITED_SHORTCUT", 60),
]);
check("đủ ba incident độc lập", threeStrikes.counters.strikeCount, 3);
check("lệnh gửi về client là FORCE_SUBMIT", threeStrikes.command, "FORCE_SUBMIT");
check("lý do là STRIKES", threeStrikes.forceSubmitReason, "STRIKES");
check("hồ sơ chuyển sang REVIEW, KHÔNG phải bị loại", threeStrikes.integrityStatus, "REVIEW");

const twoStrikes = applyEvents(FRESH, [ev("COPY_ATTEMPT", 10), ev("CONTEXT_MENU", 30)]);
check("hai strike thì chỉ cảnh báo", twoStrikes.command, "WARN");
check("nhưng vẫn vào hàng chờ rà soát", twoStrikes.integrityStatus, "REVIEW");

check(
  "ba sự kiện trong CÙNG cửa sổ gom chỉ tính MỘT strike",
  applyEvents(FRESH, [
    { type: "WINDOW_BLUR", occurredAtMs: 1000, durationMs: 500 },
    { type: "VISIBILITY_LOSS", occurredAtMs: 1020, durationMs: 500 },
    { type: "FULLSCREEN_EXIT", occurredAtMs: 1040, durationMs: 500 },
  ]).counters.strikeCount,
  1
);

/* ================================================================== */
console.log("\nRỜI TRẠNG THÁI BẢO VỆ 10 GIÂY → TỰ NỘP DÙ CHƯA ĐỦ BA STRIKE");

const protectedLoss = applyEvents(FRESH, [
  ev("WINDOW_BLUR", 10, 6_000),
  ev("WINDOW_BLUR", 40, 5_000),
]);
check("cộng dồn đúng 11 giây", protectedLoss.counters.protectedLossMs, 11_000);
check("mới có 2 strike", protectedLoss.counters.strikeCount, 2);
check("vẫn bị nộp bài", protectedLoss.command, "FORCE_SUBMIT");
check("lý do là PROTECTED_LOSS", protectedLoss.forceSubmitReason, "PROTECTED_LOSS");

/* ================================================================== */
console.log("\nMẤT MẠNG KHÔNG BAO GIỜ LÀ GIAN LẬN (§0.1 điều 7)");

const offline = applyEvents(FRESH, [
  ev("NETWORK_OFFLINE", 10),
  ev("WEBCAM_ENDED", 12, 30_000),
  ev("SCREEN_PROCTOR_LOST", 14, 30_000),
]);
check("rớt mạng không cộng strike nào", offline.counters.strikeCount, 0);
check("webcam chết vì mạng KHÔNG bị tính", offline.command, "NONE");
check("hồ sơ vẫn sạch", offline.integrityStatus, "CLEAR");
check(
  "lý do ghi rõ là bị treo vì mạng, để giám thị giải thích được",
  offline.outcomes.filter((o) => o.reason === "NETWORK_SUSPENDED").length,
  2
);

const offlineThenOnline = applyEvents(FRESH, [
  ev("NETWORK_OFFLINE", 10),
  ev("WEBCAM_ENDED", 12, 30_000),
  ev("NETWORK_ONLINE", 60),
  ev("WEBCAM_ENDED", 70, 30_000),
]);
check(
  "mạng có lại rồi mà webcam vẫn tắt thì MỚI bị tính",
  offlineThenOnline.counters.strikeCount,
  1
);
check("và bị nộp bài vì mất media", offlineThenOnline.forceSubmitReason, "MEDIA_LOSS");

check(
  "tắt webcam 11 giây khi mạng vẫn tốt → nộp bài ngay",
  applyEvents(FRESH, [ev("WEBCAM_ENDED", 10, 11_000)]).forceSubmitReason,
  "MEDIA_LOSS"
);
check(
  "webcam chớp 1 giây thì bỏ qua, chưa đủ thời gian ân hạn",
  applyEvents(FRESH, [ev("WEBCAM_ENDED", 10, 1_000)]).counters.strikeCount,
  0
);

/* ================================================================== */
console.log("\nTÍN HIỆU THỊ GIÁC — nhiễu phải bị lọc, và không tín hiệu nào tự loại ai");

check(
  "hai khuôn mặt trong 2 giây (người nhà đi ngang) → bỏ qua",
  applyEvents(FRESH, [ev("MULTIPLE_FACE", 10, 2_000)]).counters.strikeCount,
  0
);
check(
  "hai khuôn mặt liên tục 6 giây → tính một incident",
  applyEvents(FRESH, [ev("MULTIPLE_FACE", 10, 6_000)]).counters.strikeCount,
  1
);
check(
  "mất mặt 4 giây (cúi nhặt bút) → bỏ qua",
  applyEvents(FRESH, [ev("FACE_ABSENT", 10, 4_000)]).counters.strikeCount,
  0
);
check(
  "điện thoại xuất hiện 6 giây → tính, nhưng chỉ đưa vào REVIEW",
  applyEvents(FRESH, [ev("PHONE_DETECTED", 10, 6_000)]).integrityStatus,
  "REVIEW"
);
check(
  "nghi sai người thi là CRITICAL nhưng KHÔNG tự cộng strike",
  applyEvents(FRESH, [ev("FACE_MISMATCH", 10, 30_000)]).counters.strikeCount,
  0
);
check(
  "quay mặt khỏi màn hình không bao giờ thành strike",
  applyEvents(FRESH, [ev("GAZE_AWAY", 10, 60_000)]).counters.strikeCount,
  0
);

/* ================================================================== */
console.log("\nTHIẾT BỊ THỨ HAI VÀ XÁC THỰC SEB");

check(
  "đăng nhập máy thứ hai là CRITICAL và tính strike",
  applyEvents(FRESH, [ev("DUPLICATE_SESSION", 10)]).counters.strikeCount,
  1
);
check(
  "sai SEB key bị chặn từ trước khi thi nên không cộng strike",
  applyEvents(FRESH, [ev("INVALID_SEB_KEY", 10)]).counters.strikeCount,
  0
);

/* ================================================================== */
console.log("\nGỬI LẠI SỰ KIỆN CŨ KHÔNG ĐƯỢC CỘNG THÊM STRIKE");

const batch = [ev("COPY_ATTEMPT", 10)];
check("gửi lần đầu", applyEvents(FRESH, batch).counters.strikeCount, 1);
check(
  "cùng sự kiện gửi lại trong cửa sổ gom thì không cộng thêm",
  applyEvents(FRESH, [ev("COPY_ATTEMPT", 10), ev("COPY_ATTEMPT", 10)]).counters.strikeCount,
  1
);

/* ================================================================== */
console.log("\nMÁY TRẠNG THÁI");

check("CREATED → CHECKIN được", canTransitionSession("CREATED", "CHECKIN"), true);
check("CREATED → ACTIVE bị chặn", canTransitionSession("CREATED", "ACTIVE"), false);
check("ACTIVE → DISCONNECTED → ACTIVE được", canTransitionSession("DISCONNECTED", "ACTIVE"), true);
check("CLOSED là trạng thái cuối", canTransitionSession("CLOSED", "ACTIVE"), false);
check("REVIEW → DISQUALIFIED KHÔNG được đi tắt", canTransitionReview("REVIEW", "DISQUALIFIED"), false);
check("phải qua bước đề xuất", canTransitionReview("REVIEW", "DISQUALIFICATION_PROPOSED"), true);

check(
  "người đề xuất KHÔNG được tự phê duyệt việc loại thí sinh",
  authorizeReviewTransition({
    from: "DISQUALIFICATION_PROPOSED",
    to: "DISQUALIFIED",
    actorAdminId: "admin-1",
    proposedByAdminId: "admin-1",
  }),
  { allowed: false, reason: "SAME_ADMIN_CANNOT_CONFIRM" }
);
check(
  "quản trị viên thứ hai thì được",
  authorizeReviewTransition({
    from: "DISQUALIFICATION_PROPOSED",
    to: "DISQUALIFIED",
    actorAdminId: "admin-2",
    proposedByAdminId: "admin-1",
  }),
  { allowed: true }
);
check(
  "không có đề xuất thì không ai loại được ai",
  authorizeReviewTransition({
    from: "DISQUALIFICATION_PROPOSED",
    to: "DISQUALIFIED",
    actorAdminId: "admin-2",
    proposedByAdminId: null,
  }),
  { allowed: false, reason: "NO_PROPOSAL" }
);

/* ================================================================== */
console.log("\nNỐI LẠI SAU KHI RỚT MẠNG");

const T0 = Date.UTC(2026, 8, 1, 9, 0, 0);
check(
  "được 15 phút để quay lại",
  computeResumeDeadline({ disconnectStartedAtMs: T0, examEndsAtMs: T0 + 60 * 60_000 }),
  T0 + 15 * 60_000
);
check(
  "nhưng KHÔNG BAO GIỜ vượt quá giờ kết thúc đề — rớt mạng không được tặng thêm giờ",
  computeResumeDeadline({ disconnectStartedAtMs: T0, examEndsAtMs: T0 + 5 * 60_000 }),
  T0 + 5 * 60_000
);
check(
  "quay lại sau 8 phút, đúng máy, SEB hợp lệ → cho vào",
  decideReconnect({
    nowMs: T0 + 8 * 60_000,
    resumeUntilMs: T0 + 15 * 60_000,
    sameDevice: true,
    sebAttestationValid: true,
  }),
  { allowed: true }
);
check(
  "quay lại sau 16 phút → hết hạn",
  decideReconnect({
    nowMs: T0 + 16 * 60_000,
    resumeUntilMs: T0 + 15 * 60_000,
    sameDevice: true,
    sebAttestationValid: true,
  }),
  { allowed: false, reason: "EXPIRED" }
);
check(
  "máy khác → từ chối, kể cả khi còn hạn",
  decideReconnect({
    nowMs: T0 + 60_000,
    resumeUntilMs: T0 + 15 * 60_000,
    sameDevice: false,
    sebAttestationValid: true,
  }),
  { allowed: false, reason: "DIFFERENT_DEVICE" }
);

/* ================================================================== */
console.log("\nĐIỂM RỦI RO CHỈ ĐỂ XẾP THỨ TỰ, KHÔNG ĐỂ KẾT LUẬN");

check(
  "hồ sơ sạch có điểm 0",
  computeRiskScore({
    strikeCount: 0,
    protectedLossMs: 0,
    criticalEvents: 0,
    highEvents: 0,
    analyticsSignals: 0,
  }),
  0
);
check(
  "điểm luôn nằm trong 0..100",
  computeRiskScore({
    strikeCount: 99,
    protectedLossMs: 999_999,
    criticalEvents: 99,
    highEvents: 99,
    analyticsSignals: 99,
  }),
  100
);

/* ================================================================== */
console.log("\nBIẾN THỂ ĐỀ — tất định và công bằng");

const part = (id: string, questionCount: number): VaultPart => ({
  canonicalId: id,
  title: `Passage ${id}`,
  passageHtml: `<p>${id}</p>`,
  groups: [
    {
      canonicalId: `${id}-g1`,
      shufflePolicy: "INDEPENDENT",
      shuffleOptions: true,
      instructions: "Questions",
      questions: Array.from({ length: questionCount }, (_, i) => ({
        canonicalId: `${id}-q${i + 1}`,
        type: "MULTIPLE_CHOICE",
        prompt: `Câu ${i + 1}`,
        options: [
          { canonicalId: `${id}-q${i + 1}-o1`, text: "A" },
          { canonicalId: `${id}-q${i + 1}-o2`, text: "B" },
          { canonicalId: `${id}-q${i + 1}-o3`, text: "C" },
        ],
      })),
    },
  ],
});

const PARTS = [part("p1", 13), part("p2", 13), part("p3", 14)];

const v1 = buildVariantFromSeed({ seed: 12345, parts: PARTS });
const v1again = buildVariantFromSeed({ seed: 12345, parts: PARTS });
const v2 = buildVariantFromSeed({ seed: 98765, parts: PARTS });

check(
  "cùng seed cho ra đúng cùng một biến thể (tải lại trang không đổi đề)",
  JSON.stringify(v1.mapping) === JSON.stringify(v1again.mapping),
  true
);
check(
  "seed khác cho biến thể khác",
  JSON.stringify(v1.mapping) !== JSON.stringify(v2.mapping),
  true
);
check("không mất câu nào sau khi đảo", countQuestions(v1.parts), 40);
check(
  "số câu được đánh lại liên tục 1..40",
  Object.keys(v1.mapping.questionByDisplay).map(Number).sort((a, b) => a - b),
  Array.from({ length: 40 }, (_, i) => i + 1)
);
check(
  "mọi câu gốc đều xuất hiện đúng một lần",
  new Set(Object.values(v1.mapping.questionByDisplay)).size,
  40
);

const fixedOrder: VaultPart = {
  canonicalId: "p9",
  title: "TFNG",
  passageHtml: "<p>x</p>",
  groups: [
    {
      canonicalId: "p9-g1",
      shufflePolicy: "SEQUENTIAL",
      shuffleOptions: true,
      instructions: "TFNG",
      questions: [
        {
          canonicalId: "p9-q1",
          type: "TRUE_FALSE_NOT_GIVEN",
          prompt: "x",
          options: [
            { canonicalId: "t", text: "TRUE" },
            { canonicalId: "f", text: "FALSE" },
            { canonicalId: "ng", text: "NOT GIVEN" },
          ],
        },
      ],
    },
  ],
};
check(
  "TRUE/FALSE/NOT GIVEN giữ nguyên thứ tự dù bật đảo phương án",
  buildVariantFromSeed({ seed: 7, parts: [fixedOrder] }).parts[0].groups[0].questions[0].options?.map(
    (o) => o.canonicalId
  ),
  ["t", "f", "ng"]
);
check(
  "câu phụ thuộc trình tự đọc không bị đảo",
  buildVariantFromSeed({
    seed: 7,
    parts: [{ ...fixedOrder, groups: [{ ...fixedOrder.groups[0], questions: [
      { canonicalId: "a", type: "GAP_FILL", prompt: "1" },
      { canonicalId: "b", type: "GAP_FILL", prompt: "2" },
      { canonicalId: "c", type: "GAP_FILL", prompt: "3" },
    ] }] }],
  }).parts[0].groups[0].questions.map((q) => q.canonicalId),
  ["a", "b", "c"]
);

/* ================================================================== */
console.log("\nQUY ĐÁP ÁN VỀ CHUẨN — chấm đúng sau khi đã đảo");

const firstQuestionId = v1.mapping.questionByDisplay["1"];
const firstLabels = v1.mapping.optionByDisplay[firstQuestionId];
const labelB = Object.keys(firstLabels)[1];

check(
  "chọn nhãn hiển thị được quy về đúng phương án gốc",
  toCanonicalAnswers({ mapping: v1.mapping, submitted: { "1": labelB } })[firstQuestionId],
  firstLabels[labelB]
);
check(
  "câu không thuộc biến thể bị bỏ qua thay vì đoán bừa",
  Object.keys(toCanonicalAnswers({ mapping: v1.mapping, submitted: { "999": "A" } })).length,
  0
);
check(
  "chữ thường vẫn khớp nhãn",
  toCanonicalAnswers({ mapping: v1.mapping, submitted: { "1": labelB.toLowerCase() } })[
    firstQuestionId
  ],
  firstLabels[labelB]
);

/* ================================================================== */
console.log("\nPHÂN TÍCH SAU THI — chỉ để ưu tiên rà soát");

const mk = (id: string, answers: Array<[string, string, boolean]>): CanonicalResult => ({
  sessionId: id,
  userId: `u-${id}`,
  items: answers.map(([questionId, answer, correct]) => ({ questionId, answer, correct })),
});

const perfectA = mk("s1", Array.from({ length: 40 }, (_, i) => [`q${i}`, "A", true]));
const perfectB = mk("s2", Array.from({ length: 40 }, (_, i) => [`q${i}`, "A", true]));
check(
  "hai người cùng đúng hết KHÔNG bị coi là đáng ngờ",
  isSuspiciousPair(wrongAnswerSimilarity(perfectA, perfectB)),
  false
);

const twins = Array.from({ length: 40 }, (_, i): [string, string, boolean] =>
  i < 8 ? [`q${i}`, "WRONG_SAME", false] : [`q${i}`, "A", true]
);
check(
  "cùng sai 8 câu với cùng phương án sai → đáng ngờ",
  isSuspiciousPair(wrongAnswerSimilarity(mk("s3", twins), mk("s4", twins))),
  true
);

const wrongDifferent = Array.from({ length: 40 }, (_, i): [string, string, boolean] =>
  i < 8 ? [`q${i}`, "WRONG_OTHER", false] : [`q${i}`, "A", true]
);
check(
  "cùng sai 8 câu nhưng KHÁC phương án → không đáng ngờ",
  isSuspiciousPair(wrongAnswerSimilarity(mk("s5", twins), mk("s6", wrongDifferent))),
  false
);

const twoWrong = Array.from({ length: 40 }, (_, i): [string, string, boolean] =>
  i < 2 ? [`q${i}`, "WRONG_SAME", false] : [`q${i}`, "A", true]
);
check(
  "trùng chỉ 2 câu sai (tỷ lệ 100%) vẫn KHÔNG đủ để nghi ngờ",
  isSuspiciousPair(wrongAnswerSimilarity(mk("s7", twoWrong), mk("s8", twoWrong))),
  false
);

check(
  "quét cả kỳ thi 4 người ra đúng 6 cặp",
  analyzeCompetition([perfectA, perfectB, mk("s3", twins), mk("s4", twins)]).pairs.length,
  6
);

check(
  "làm nhanh gấp đôi mà điểm gần tuyệt đối thì bị đánh dấu",
  flagFastHighScorers({
    entries: [
      { sessionId: "fast", durationMs: 10 * 60_000, scorePercent: 0.95 },
      { sessionId: "n1", durationMs: 50 * 60_000, scorePercent: 0.7 },
      { sessionId: "n2", durationMs: 52 * 60_000, scorePercent: 0.6 },
      { sessionId: "n3", durationMs: 55 * 60_000, scorePercent: 0.8 },
      { sessionId: "n4", durationMs: 58 * 60_000, scorePercent: 0.75 },
    ],
  }),
  ["fast"]
);

check(
  "top 10 BẮT BUỘC rà soát kể cả khi hệ thống báo sạch",
  mandatoryReviewSessions({
    ranked: Array.from({ length: 15 }, (_, i) => ({
      sessionId: `r${i + 1}`,
      integrityStatus: "CLEAR",
    })),
  }).length,
  10
);
check(
  "hồ sơ ngoài top 10 nhưng có cờ vẫn phải rà",
  mandatoryReviewSessions({
    ranked: [
      ...Array.from({ length: 10 }, (_, i) => ({ sessionId: `r${i + 1}`, integrityStatus: "CLEAR" })),
      { sessionId: "r11", integrityStatus: "REVIEW" },
    ],
  }).includes("r11"),
  true
);

/* ================================================================== */
console.log("\nĐIỀU KIỆN DANH TÍNH — Nguyệt Thí chỉ nhận từ 16 tuổi");

check("đủ 16 tuổi đúng ngày sinh nhật", ageAt(new Date("2010-09-01"), new Date("2026-09-01")), 16);
check("trước sinh nhật một ngày vẫn là 15", ageAt(new Date("2010-09-02"), new Date("2026-09-01")), 15);

const fullConsent = {
  identityVerified: true,
  consentTerms: true,
  consentMonitoring: true,
};
check(
  "16 tuổi, đủ giấy tờ và đồng ý → được đăng ký",
  checkIdentityEligibility({
    birthDate: new Date("2010-01-01"),
    at: new Date("2026-09-01"),
    ...fullConsent,
  }).eligible,
  true
);
check(
  "15 tuổi bị từ chối",
  checkIdentityEligibility({
    birthDate: new Date("2011-06-01"),
    at: new Date("2026-09-01"),
    ...fullConsent,
  }).eligible,
  false
);
check(
  "thiếu đồng ý ghi nhật ký thì nói rõ thiếu gì, không từ chối suông",
  checkIdentityEligibility({
    birthDate: new Date("2000-01-01"),
    at: new Date("2026-09-01"),
    ...fullConsent,
    consentMonitoring: false,
  }).missing,
  ["Chưa đồng ý việc ghi nhật ký thao tác trong lúc thi"]
);
check(
  "đồng ý hiện tên trên Bảng Vàng KHÔNG phải điều kiện bắt buộc",
  requiredConsents().includes("PUBLICITY" as never),
  false
);
check("chỉ còn HAI loại đồng ý bắt buộc sau khi bỏ webcam", requiredConsents().length, 2);
check("tuổi tối thiểu là 16", MIN_COMPETITION_AGE, 16);

/* ================================================================== */
console.log("\nHẰNG SỐ CHÍNH SÁCH KHỚP ĐẶC TẢ");
check("ba strike", INTEGRITY_POLICY.maxStrikes, 3);
check("10 giây rời trạng thái bảo vệ", INTEGRITY_POLICY.maxProtectedLossMs, 10_000);
check("gom sự kiện trong 3 giây", INTEGRITY_POLICY.eventDebounceMs, 3_000);
check("nối lại trong 15 phút", INTEGRITY_POLICY.reconnectGraceMs, 900_000);
check("heartbeat 5 giây", INTEGRITY_POLICY.heartbeatMs, 5_000);
check("giải trình 24 giờ", INTEGRITY_POLICY.appealWindowMs, 86_400_000);

// Bộ sinh số ngẫu nhiên phải tất định, nếu không mọi thứ ở trên vô nghĩa
const r1 = mulberry32(42);
const r2 = mulberry32(42);
check(
  "mulberry32 tất định",
  [r1(), r1(), r1()],
  [r2(), r2(), r2()]
);
check(
  "shuffled không làm mất phần tử nào",
  shuffled([1, 2, 3, 4, 5], mulberry32(9)).sort((a, b) => a - b),
  [1, 2, 3, 4, 5]
);

/* ================================================================== */
console.log("\nKHÓA CHỐNG TRÙNG — gửi lại hàng đợi sau khi có mạng");

type DedupeArgs = {
  sessionId?: string;
  type?: string;
  occurredAtMs?: number;
  durationMs?: number;
};
const k = (o: DedupeArgs = {}) =>
  buildDedupeKey({ sessionId: "s1", type: "COPY_ATTEMPT", occurredAtMs: 1000, ...o });

check("cùng sự kiện gửi lại cho cùng một khóa", k(), k());
check("khác phiên thi thì khác khóa", k() === k({ sessionId: "s2" }), false);
check("khác loại sự kiện thì khác khóa", k() === k({ type: "CUT_ATTEMPT" }), false);
check("khác thời điểm thì khác khóa", k() === k({ occurredAtMs: 2000 }), false);
check("khác thời lượng thì khác khóa", k() === k({ durationMs: 5000 }), false);
check("khóa vừa cột VARCHAR(191) của database", k().length <= 191, true);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
