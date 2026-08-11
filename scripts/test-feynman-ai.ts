/**
 * Kiểm thử luật của Feynman AI Tutor.
 * Chạy: node --experimental-strip-types scripts/test-feynman-ai.ts
 *
 * Bốn thứ ở đây sai là hỏng thật, nên mỗi thứ đều có phép thử riêng:
 *   1. lộ đáp án của đề Nguyệt Thí đang diễn ra
 *   2. gửi dữ liệu cá nhân của học viên sang OpenAI
 *   3. tính nhầm ví/nhịp chấm → học viên mất suất đã trả tiền
 *   4. gỡ nhầm quyền của người đã mua gói cũ
 */
import {
  OFFERS,
  PRICE_VERSION,
  isOfferOnSale,
  listOffersForSale,
} from "../src/lib/payments/catalog.ts";
import {
  STALE_PENDING_MS,
  planReservation,
} from "../src/lib/feynman-ai/rules.ts";
import {
  classifyBodyReadError,
  shouldRefundQuota,
} from "../src/lib/feynman-ai/errors.ts";
import {
  VND_PER_USD,
  estimateCostMicroUsd,
  hasPricing,
  microUsdToVnd,
} from "../src/lib/feynman-ai/cost.ts";
import {
  FORBIDDEN_PAYLOAD_KEYS,
  INSUFFICIENT_WEAKNESS_DATA_NOTE,
  MAX_QUESTIONS_PER_RUN,
  PASS_THRESHOLD_PERCENT,
  chatLimitForOffer,
  competitionLock,
  creditsForOffer,
  decideAiAccess,
  decideCanAsk,
  decideCanGrade,
  decideQuestionPick,
  feynmanAchievementEventKey,
  findForbiddenKeys,
  hasEnoughWeaknessData,
  isSameVietnamDay,
  resolveSourceBasis,
  shouldEmitFeynmanAchievement,
  verdictFor,
  vietnamDayKey,
  walletRemaining,
  weaknessRowsForAi,
  type AiGrantLike,
} from "../src/lib/feynman-ai/rules.ts";
import {
  decideGrantAccess,
  type GrantLike,
} from "../src/lib/payments/payment-rules.ts";
import {
  parseChatOutput,
  parseEvaluationOutput,
} from "../src/lib/feynman-ai/prompts.ts";
import {
  assertPayloadClean,
  buildEvaluationPayload,
} from "../src/lib/feynman-ai/context.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(
      `      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`
    );
    failures++;
  }
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-08-09T10:00:00.000Z");
const at = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY);

const grant = (o: Partial<AiGrantLike>): AiGrantLike => ({
  feature: "FEYNMAN",
  scope: "ATTEMPT",
  exerciseId: null,
  attemptId: "att-1",
  status: "ACTIVE",
  startsAt: at(-1),
  expiresAt: null,
  ...o,
});

const access = (
  grants: AiGrantLike[],
  o: { exerciseId?: string | null; attemptId?: string | null; at?: Date } = {}
) =>
  decideAiAccess({
    grants,
    feature: "FEYNMAN",
    exerciseId: o.exerciseId === undefined ? "ex-A" : o.exerciseId,
    attemptId: o.attemptId === undefined ? "att-1" : o.attemptId,
    at: o.at ?? NOW,
  });

/* ---------------------------------------------------------------- */
console.log("\nBẢNG GIÁ — ba gói đang bán, ba gói đã dừng nhưng còn tra cứu được");
check("Full Test = 39.000đ", OFFERS.FEYNMAN_ATTEMPT_FULL.amount, 39_000);
check("Đề đơn = 19.000đ", OFFERS.FEYNMAN_ATTEMPT_SINGLE.amount, 19_000);
check("Nạp lượt AI = 29.000đ", OFFERS.FEYNMAN_AI_TOPUP.amount, 29_000);
check("Bản giá đã tăng khi đổi mô hình", PRICE_VERSION, "2026-08-09-v2");

check(
  "Đúng ba gói còn bán",
  listOffersForSale().sort(),
  ["FEYNMAN_AI_TOPUP", "FEYNMAN_ATTEMPT_FULL", "FEYNMAN_ATTEMPT_SINGLE"]
);
check("FEYNMAN_ALL_30D đã dừng bán", isOfferOnSale("FEYNMAN_ALL_30D"), false);
check("READING_SINGLE đã dừng bán", isOfferOnSale("READING_SINGLE"), false);
check(
  "Gói 299K vẫn còn trong bảng giá để đơn cũ tra được",
  OFFERS.FEYNMAN_ALL_30D.amount,
  299_000
);

console.log("\nSỐ LƯỢT VÀ SỐ CÂU HỎI THEO GÓI");
check("Full Test cộng 10 lượt", creditsForOffer("FEYNMAN_ATTEMPT_FULL"), 10);
check("Đề đơn cộng 10 lượt", creditsForOffer("FEYNMAN_ATTEMPT_SINGLE"), 10);
check("Gói nạp cộng 10 lượt", creditsForOffer("FEYNMAN_AI_TOPUP"), 10);
check("Gói Reading cũ không cộng lượt AI", creditsForOffer("READING_SINGLE"), 0);
check("Full Test hỏi 10 câu", chatLimitForOffer("FEYNMAN_ATTEMPT_FULL"), 10);
check("Đề đơn hỏi 5 câu — quyết định Q4", chatLimitForOffer("FEYNMAN_ATTEMPT_SINGLE"), 5);

/* ---------------------------------------------------------------- */
console.log("\nQUYỀN TRUY CẬP — ba phạm vi sống chung, không chuyển đổi dữ liệu cũ");
check("ATTEMPT mở đúng lượt làm bài của nó", access([grant({})]), true);
check(
  "ATTEMPT không mở lượt làm bài khác",
  access([grant({})], { attemptId: "att-2" }),
  false
);
check(
  "ALL cũ vẫn mở mọi lượt làm bài",
  access([grant({ scope: "ALL", attemptId: null })], { attemptId: "att-9" }),
  true
);
check(
  "EXERCISE cũ vẫn mở mọi lượt của bài đó",
  access([grant({ scope: "EXERCISE", exerciseId: "ex-A", attemptId: null })], {
    attemptId: "att-9",
  }),
  true
);
check(
  "EXERCISE không mở bài khác",
  access([grant({ scope: "EXERCISE", exerciseId: "ex-A", attemptId: null })], {
    exerciseId: "ex-B",
    attemptId: "att-9",
  }),
  false
);
check(
  "Gói nạp lượt (scope NONE) không mở gì cả",
  access([grant({ scope: "NONE", attemptId: null })]),
  false
);
check(
  "Grant ATTEMPT thiếu attemptId là dữ liệu hỏng → chặn",
  access([grant({ attemptId: null })]),
  false
);
check("Grant hết hạn không mở", access([grant({ expiresAt: at(-1) })]), false);
check("Grant chưa tới hạn không mở", access([grant({ startsAt: at(1) })]), false);
check("Grant bị thu hồi không mở", access([grant({ status: "REVOKED" })]), false);
check("Scope lạ không mở", access([grant({ scope: "WHATEVER" })]), false);
check(
  "Quyền READING không mở được FEYNMAN",
  access([grant({ feature: "READING" })]),
  false
);

/* ---------------------------------------------------------------- */
console.log("\nNGUYỆT THÍ — khóa kín cho tới khi kỳ thi kết thúc");
check(
  "Đang trong kỳ thi → khóa",
  competitionLock({
    isCompetitionAttempt: true,
    competitionEndsAt: at(1),
    at: NOW,
  }),
  { locked: true, reason: "COMPETITION_IN_PROGRESS" }
);
check(
  "Đã qua endsAt → mở",
  competitionLock({
    isCompetitionAttempt: true,
    competitionEndsAt: at(-1),
    at: NOW,
  }),
  { locked: false, reason: null }
);
check(
  "Thiếu endsAt → vẫn khóa, không đoán theo hướng mở",
  competitionLock({
    isCompetitionAttempt: true,
    competitionEndsAt: null,
    at: NOW,
  }),
  { locked: true, reason: "COMPETITION_ENDS_AT_MISSING" }
);
check(
  "Bài luyện tập thường không bị khóa",
  competitionLock({
    isCompetitionAttempt: false,
    competitionEndsAt: null,
    at: NOW,
  }),
  { locked: false, reason: null }
);

/* ---------------------------------------------------------------- */
console.log("\nMÚI GIỜ — mốc sang ngày theo giờ Việt Nam, không phải UTC");
check(
  "23h50 giờ VN ngày 09 là ngày 09",
  vietnamDayKey(new Date("2026-08-09T16:50:00.000Z")),
  "2026-08-09"
);
check(
  "00h10 giờ VN ngày 10 là ngày 10",
  vietnamDayKey(new Date("2026-08-09T17:10:00.000Z")),
  "2026-08-10"
);
check(
  "06h sáng giờ VN vẫn là ngày mới, không dính ngày hôm trước",
  isSameVietnamDay(
    new Date("2026-08-08T18:00:00.000Z"), // 01h ngày 09 giờ VN
    new Date("2026-08-08T23:00:00.000Z")  // 06h ngày 09 giờ VN
  ),
  true
);
check(
  "Nếu tính theo UTC thì hai mốc trên khác ngày — đây là cái bẫy đã tránh",
  new Date("2026-08-08T18:00:00.000Z").toISOString().slice(0, 10) ===
    new Date("2026-08-08T23:00:00.000Z").toISOString().slice(0, 10),
  true
);

/* ---------------------------------------------------------------- */
console.log("\nVÍ LƯỢT AI — theo tài khoản, dùng chung mọi lượt làm bài");
check("Ví mới mua một gói còn 10", walletRemaining({ grantedTotal: 10, usedTotal: 0 }), 10);
check("Dùng 3 còn 7", walletRemaining({ grantedTotal: 10, usedTotal: 3 }), 7);
check("Dùng hết còn 0", walletRemaining({ grantedTotal: 10, usedTotal: 10 }), 0);
check(
  "Dữ liệu lệch (dùng quá cấp) vẫn trả 0, không trả số âm",
  walletRemaining({ grantedTotal: 10, usedTotal: 13 }),
  0
);
check(
  "Mua hai gói thì ví cộng dồn",
  walletRemaining({ grantedTotal: 10 + 10, usedTotal: 4 }),
  16
);

/* ---------------------------------------------------------------- */
console.log("\nCHO PHÉP AI CHẤM — thứ tự hàng rào");
const okGrade = {
  featureEnabled: true,
  hasAccess: true,
  competitionLocked: false,
  reviewStatus: "COMPLETED",
  alreadyGraded: false,
  wallet: { grantedTotal: 10, usedTotal: 0 },
  lastGradedAt: null as Date | null,
  at: NOW,
};

check("Đủ điều kiện thì cho chấm", decideCanGrade(okGrade), { allowed: true });
check(
  "Tắt tính năng thì chặn trước tiên",
  decideCanGrade({ ...okGrade, featureEnabled: false, hasAccess: false }),
  { allowed: false, reason: "FEATURE_DISABLED" }
);
check(
  "Chưa mua thì chặn",
  decideCanGrade({ ...okGrade, hasAccess: false }),
  { allowed: false, reason: "NO_ACCESS" }
);
check(
  "Nguyệt Thí chặn kể cả khi đã mua",
  decideCanGrade({ ...okGrade, competitionLocked: true }),
  { allowed: false, reason: "COMPETITION_LOCKED" }
);
check(
  "Chưa hoàn thành Feynman thì chưa chấm",
  decideCanGrade({ ...okGrade, reviewStatus: "REVEALED" }),
  { allowed: false, reason: "REVIEW_NOT_COMPLETED" }
);
check(
  "Một phiên luyện chỉ chấm một lần",
  decideCanGrade({ ...okGrade, alreadyGraded: true }),
  { allowed: false, reason: "ALREADY_GRADED" }
);
check(
  "Chấm lần hai trong cùng ngày trên cùng lượt làm bài bị chặn",
  decideCanGrade({ ...okGrade, lastGradedAt: new Date(NOW.getTime() - 3600_000) }),
  { allowed: false, reason: "DAILY_LIMIT_REACHED" }
);
check(
  "Hôm qua đã chấm thì hôm nay chấm được",
  decideCanGrade({ ...okGrade, lastGradedAt: at(-1) }),
  { allowed: true }
);
check(
  "Hết ví thì chặn",
  decideCanGrade({ ...okGrade, wallet: { grantedTotal: 10, usedTotal: 10 } }),
  { allowed: false, reason: "QUOTA_EXHAUSTED" }
);
check(
  "Nhịp ngày kiểm TRƯỚC ví — hết ví mà hôm nay đã chấm thì báo lỗi ngày",
  decideCanGrade({
    ...okGrade,
    wallet: { grantedTotal: 10, usedTotal: 10 },
    lastGradedAt: new Date(NOW.getTime() - 3600_000),
  }),
  { allowed: false, reason: "DAILY_LIMIT_REACHED" }
);

console.log("\n  Hai lượt làm bài khác nhau trong cùng một ngày — Q1 gặp Q2");
check(
  "Lượt làm bài A đã chấm hôm nay, lượt B vẫn chấm được (nhịp theo lượt làm bài)",
  decideCanGrade({
    ...okGrade,
    lastGradedAt: null, // lượt B chưa từng chấm
    wallet: { grantedTotal: 20, usedTotal: 1 }, // ví chung đã bị lượt A trừ 1
  }),
  { allowed: true }
);

/* ---------------------------------------------------------------- */
console.log("\nHỎI AI — giới hạn khác nhau giữa hai gói");
const okAsk = {
  featureEnabled: true,
  hasAccess: true,
  competitionLocked: false,
  evaluationStatus: "COMPLETED",
  questionUsed: 0,
  questionLimit: 10,
  question: "Vì sao đáp án là NOT GIVEN mà không phải FALSE?",
};

check("Câu hỏi hợp lệ được trả lời", decideCanAsk(okAsk), { allowed: true });
check(
  "Full Test câu thứ 11 bị chặn",
  decideCanAsk({ ...okAsk, questionUsed: 10, questionLimit: 10 }),
  { allowed: false, reason: "CHAT_LIMIT_REACHED" }
);
check(
  "Đề đơn câu thứ 6 bị chặn",
  decideCanAsk({ ...okAsk, questionUsed: 5, questionLimit: 5 }),
  { allowed: false, reason: "CHAT_LIMIT_REACHED" }
);
check(
  "Đề đơn câu thứ 5 vẫn được trả lời",
  decideCanAsk({ ...okAsk, questionUsed: 4, questionLimit: 5 }),
  { allowed: true }
);
check(
  "Câu trống không gọi API",
  decideCanAsk({ ...okAsk, question: "   " }),
  { allowed: false, reason: "QUESTION_TOO_SHORT" }
);
check(
  "Câu quá dài bị chặn",
  decideCanAsk({ ...okAsk, question: "a".repeat(1001) }),
  { allowed: false, reason: "QUESTION_TOO_LONG" }
);
check(
  "Chưa chấm xong thì chưa hỏi được",
  decideCanAsk({ ...okAsk, evaluationStatus: "FAILED" }),
  { allowed: false, reason: "EVALUATION_NOT_READY" }
);
check(
  "Nguyệt Thí chặn cả phần hỏi đáp",
  decideCanAsk({ ...okAsk, competitionLocked: true }),
  { allowed: false, reason: "COMPETITION_LOCKED" }
);

/* ---------------------------------------------------------------- */
console.log("\nCHỌN CÂU LUYỆN — tối đa 10, tick câu đúng vẫn hợp lệ");
const ids = Array.from({ length: 40 }, (_, i) => `p${Math.floor(i / 14) + 1}:q${i + 1}`);

check(
  "Chọn 10 câu hợp lệ",
  decideQuestionPick({ picked: ids.slice(0, 10), availableIds: ids }).allowed,
  true
);
check(
  "Chọn 11 câu bị chặn",
  decideQuestionPick({ picked: ids.slice(0, 11), availableIds: ids }),
  { allowed: false, reason: "TOO_MANY_QUESTIONS" }
);
check(
  "Không chọn câu nào bị chặn",
  decideQuestionPick({ picked: [], availableIds: ids }),
  { allowed: false, reason: "EMPTY_SELECTION" }
);
check(
  "Chọn trùng câu bị chặn",
  decideQuestionPick({ picked: [ids[0], ids[0]], availableIds: ids }),
  { allowed: false, reason: "DUPLICATE_QUESTION" }
);
check(
  "Câu không có thật trong đề bị chặn",
  decideQuestionPick({ picked: ["p9:q99"], availableIds: ids }),
  { allowed: false, reason: "UNKNOWN_QUESTION" }
);
check("Trần chọn câu đúng bằng 10", MAX_QUESTIONS_PER_RUN, 10);

/* ---------------------------------------------------------------- */
console.log("\nNGƯỠNG ĐẠT — 70% theo ý nghĩa");
check("Ngưỡng là 70", PASS_THRESHOLD_PERCENT, 70);
check("69% là KHÔNG ĐẠT", verdictFor(69), "KHONG_DAT");
check("70% là ĐẠT", verdictFor(70), "DAT");
check("100% là ĐẠT", verdictFor(100), "DAT");
check("Số âm là dữ liệu hỏng → KHÔNG ĐẠT", verdictFor(-1), "KHONG_DAT");
check("Trên 100 là dữ liệu hỏng → KHÔNG ĐẠT", verdictFor(101), "KHONG_DAT");
check("NaN là dữ liệu hỏng → KHÔNG ĐẠT", verdictFor(Number.NaN), "KHONG_DAT");

/* ---------------------------------------------------------------- */
console.log("\nDANH HIỆU — chỉ lần hoàn thành đầu tiên của một lượt làm bài");
check(
  "Khóa sự kiện theo lượt làm bài, không theo phiên luyện",
  feynmanAchievementEventKey("att-1"),
  "FEYNMAN_COMPLETED:att-1"
);
check(
  "Lần hoàn thành đầu tiên tính danh hiệu",
  shouldEmitFeynmanAchievement({ attemptId: "att-1", completedRunsBefore: 0 }),
  true
);
check(
  "Lần thứ hai trở đi là luyện tập, không tính danh hiệu",
  shouldEmitFeynmanAchievement({ attemptId: "att-1", completedRunsBefore: 1 }),
  false
);
check(
  "Làm lại lần thứ mười vẫn không cày được danh hiệu",
  shouldEmitFeynmanAchievement({ attemptId: "att-1", completedRunsBefore: 9 }),
  false
);

/* ---------------------------------------------------------------- */
console.log("\nRIÊNG TƯ — payload gửi OpenAI không được chứa dữ liệu cá nhân");
const cleanPayload = {
  passage: "Bees navigate using polarised light...",
  questions: [
    {
      code: "p2:q14",
      type: "TRUE_FALSE_NOT_GIVEN",
      prompt: "Bees can see ultraviolet light.",
      correctAnswer: "TRUE",
      studentAnswer: "NOT GIVEN",
      teacherExplanation: "Đoạn 3 nói rõ ong nhìn được tia cực tím.",
    },
  ],
  currentBand: 6.5,
  targetBand: 7.5,
  attemptNumber: 3,
};

check("Payload sạch không có khóa cấm", findForbiddenKeys(cleanPayload), []);
check(
  "Mã câu p2:q14 KHÔNG bị coi là dữ liệu cá nhân",
  findForbiddenKeys({ code: "p2:q14" }),
  []
);
check(
  "Lỡ thêm email vào thì bị bắt",
  findForbiddenKeys({ student: { email: "a@b.com" } }),
  ["$.student.email"]
);
check(
  "Lỡ thêm userId lồng sâu vẫn bị bắt",
  findForbiddenKeys({ a: { b: [{ c: { userId: "u1" } }] } }),
  ["$.a.b[0].c.userId"]
);
check(
  "attemptId không được gửi dù nó không phải bí mật lớn",
  findForbiddenKeys({ attemptId: "att-1" }),
  ["$.attemptId"]
);
check(
  "Nhiều khóa cấm cùng lúc đều bị liệt kê",
  findForbiddenKeys({ email: "a@b.com", candidateCode: "TS001" }).sort(),
  ["$.candidateCode", "$.email"]
);
check("Danh sách khóa cấm có đủ 17 mục", FORBIDDEN_PAYLOAD_KEYS.length, 17);

/* ---------------------------------------------------------------- */
console.log("\nƯU TIÊN LỜI GIẢI GIÁO VIÊN");
check(
  "Có snapshot thì dùng snapshot — cố định lịch sử",
  resolveSourceBasis({
    snapshotExplanation: "Lời giải lúc học viên tick",
    liveExplanation: "Lời giải giáo viên vừa sửa",
  }),
  { basis: "TEACHER_APPROVED", explanation: "Lời giải lúc học viên tick" }
);
check(
  "Không có snapshot thì dùng lời giải hiện tại",
  resolveSourceBasis({
    snapshotExplanation: null,
    liveExplanation: "Lời giải trong đề",
  }),
  { basis: "TEACHER_APPROVED", explanation: "Lời giải trong đề" }
);
check(
  "Không có lời giải nào thì AI phải tự dẫn chứng từ passage",
  resolveSourceBasis({ snapshotExplanation: null, liveExplanation: null }),
  { basis: "PASSAGE_DERIVED", explanation: null }
);
check(
  "Lời giải rỗng coi như không có",
  resolveSourceBasis({ snapshotExplanation: "   ", liveExplanation: "  " }),
  { basis: "PASSAGE_DERIVED", explanation: null }
);

/* ---------------------------------------------------------------- */
console.log("\nSỔ SƠ HỞ — chưa đủ mẫu thì không kết luận");
const rows = [
  { questionType: "MATCHING_HEADINGS", samples: 34, accuracyPercent: 41 },
  { questionType: "TRUE_FALSE_NOT_GIVEN", samples: 19, accuracyPercent: 22 },
  { questionType: "SUMMARY_COMPLETION", samples: 20, accuracyPercent: 60 },
];

check(
  "Chỉ giữ dòng đủ 20 mẫu",
  weaknessRowsForAi(rows).map((r) => r.questionType),
  ["MATCHING_HEADINGS", "SUMMARY_COMPLETION"]
);
check(
  "Dòng 19 mẫu bị loại dù tỷ lệ đúng rất thấp",
  weaknessRowsForAi(rows).some((r) => r.questionType === "TRUE_FALSE_NOT_GIVEN"),
  false
);
check("Có dòng đủ mẫu thì được kết luận", hasEnoughWeaknessData(rows), true);
check(
  "Học viên mới chưa đủ mẫu thì không kết luận gì",
  hasEnoughWeaknessData([
    { questionType: "MATCHING_HEADINGS", samples: 3, accuracyPercent: 0 },
  ]),
  false
);
check("Không có dữ liệu thì không kết luận", hasEnoughWeaknessData([]), false);
check(
  "Có sẵn câu để nói khi thiếu dữ liệu",
  INSUFFICIENT_WEAKNESS_DATA_NOTE.includes("Chưa đủ dữ liệu"),
  true
);

/* ---------------------------------------------------------------- */
console.log("\nQUYỀN THẬT — decideGrantAccess phải hiểu cả ba phạm vi");

const realGrant = (o: Partial<GrantLike>): GrantLike => ({
  feature: "FEYNMAN",
  scope: "ATTEMPT",
  exerciseId: null,
  attemptId: "att-1",
  status: "ACTIVE",
  startsAt: at(-1),
  expiresAt: null,
  ...o,
});

check(
  "Gói theo lượt mở đúng lượt đã mua",
  decideGrantAccess({
    grants: [realGrant({})],
    feature: "FEYNMAN",
    attemptId: "att-1",
    at: NOW,
  }),
  true
);
check(
  "Gói theo lượt KHÔNG mở lượt khác",
  decideGrantAccess({
    grants: [realGrant({})],
    feature: "FEYNMAN",
    attemptId: "att-2",
    at: NOW,
  }),
  false
);
check(
  "Không truyền attemptId thì gói theo lượt không khớp",
  decideGrantAccess({ grants: [realGrant({})], feature: "FEYNMAN", at: NOW }),
  false
);
check(
  "Grant ATTEMPT thiếu attemptId là dữ liệu hỏng → chặn",
  decideGrantAccess({
    grants: [realGrant({ attemptId: null })],
    feature: "FEYNMAN",
    attemptId: "att-1",
    at: NOW,
  }),
  false
);
check(
  "Gói EXERCISE cũ vẫn mở mọi lượt của bài đó",
  decideGrantAccess({
    grants: [
      realGrant({ scope: "EXERCISE", exerciseId: "ex-1", attemptId: null }),
    ],
    feature: "FEYNMAN",
    exerciseId: "ex-1",
    attemptId: "att-99",
    at: NOW,
  }),
  true
);
check(
  "Gói ALL phủ mọi thứ",
  decideGrantAccess({
    grants: [realGrant({ scope: "ALL", attemptId: null })],
    feature: "FEYNMAN",
    attemptId: "att-7",
    at: NOW,
  }),
  true
);
check(
  "Gói nạp lượt (scope NONE) KHÔNG mở gì cả",
  decideGrantAccess({
    grants: [realGrant({ scope: "NONE", attemptId: null })],
    feature: "FEYNMAN",
    attemptId: "att-1",
    at: NOW,
  }),
  false
);
check(
  "Quyền Reading không rò sang Feynman",
  decideGrantAccess({
    grants: [realGrant({ feature: "READING", scope: "ALL" })],
    feature: "FEYNMAN",
    attemptId: "att-1",
    at: NOW,
  }),
  false
);

/* ---------------------------------------------------------------- */
console.log("\nKẾT QUẢ MODEL TRẢ VỀ — sai cấu trúc thì từ chối, không đoán");

const goodEval = {
  diemTuongDong: 82,
  doTinCay: 90,
  tungCau: [
    { maCau: "p1:q1", diem: 80, datY: "a", thieuY: "b", trichDan: "c" },
  ],
  nhanXetChung: { diemManh: "x", canSua: "y", buocTiepTheo: "z" },
};

check(
  "Kết quả đúng cấu trúc thì nhận",
  parseEvaluationOutput(goodEval)?.diemTuongDong,
  82
);
check(
  "Điểm ngoài dải 0-100 bị từ chối, KHÔNG quy về biên",
  parseEvaluationOutput({ ...goodEval, diemTuongDong: 130 }),
  null
);
check(
  "Điểm âm bị từ chối",
  parseEvaluationOutput({ ...goodEval, diemTuongDong: -5 }),
  null
);
check(
  "Điểm dạng chuỗi bị từ chối",
  parseEvaluationOutput({ ...goodEval, diemTuongDong: "82" }),
  null
);
check("Thiếu nhanXetChung bị từ chối", parseEvaluationOutput({
  ...goodEval,
  nhanXetChung: undefined,
}), null);
check(
  "Câu thiếu mã bị từ chối",
  parseEvaluationOutput({
    ...goodEval,
    tungCau: [{ maCau: "  ", diem: 50, datY: "", thieuY: "", trichDan: "" }],
  }),
  null
);
check("Không phải object thì từ chối", parseEvaluationOutput("82"), null);
check("null thì từ chối", parseEvaluationOutput(null), null);

check(
  "Câu trả lời trong phạm vi thì nhận",
  parseChatOutput({ trongPhamVi: true, traLoi: "Vì...", lyDoTuChoi: "" })?.traLoi,
  "Vì..."
);
check(
  "Nói trong phạm vi mà trả lời rỗng là hỏng — học viên sẽ mất lượt cho ô trống",
  parseChatOutput({ trongPhamVi: true, traLoi: "   ", lyDoTuChoi: "" }),
  null
);
check(
  "Ngoài phạm vi thì không cần câu trả lời",
  parseChatOutput({ trongPhamVi: false, traLoi: "", lyDoTuChoi: "Hỏi bài khác" })
    ?.trongPhamVi,
  false
);
check(
  "trongPhamVi không phải boolean thì từ chối",
  parseChatOutput({ trongPhamVi: "true", traLoi: "a", lyDoTuChoi: "" }),
  null
);

/* ---------------------------------------------------------------- */
console.log("\nPAYLOAD GỬI ĐI — dựng từ danh sách trắng, không lọt dữ liệu cá nhân");

const payload = buildEvaluationPayload({
  exerciseTitle: "Cambridge 19 Test 1",
  passages: [{ partNumber: 1, title: "Bees", paragraphs: ["A. Bees are..."] }],
  mistakes: [
    {
      questionId: "p1:q3",
      numberLabel: "3",
      questionType: "TFNG",
      partNumber: 1,
      prompt: "Bees can see red.",
      userAnswer: "TRUE",
      correctAnswer: "FALSE",
      modelExplanation: "Loi giai giao vien",
      liveExplanation: null,
      evidenceParagraph: "B",
      revisedExplanation: "Em nghi la...",
      lessonRule: null,
    },
  ],
  finalTeachBack: "Tong ket",
  finalRule: null,
  confusingPoint: null,
  currentBand: 6.5,
  targetBand: 7.5,
  weaknessRows: [
    { questionType: "TFNG", samples: 40, accuracyPercent: 55 },
    { questionType: "MATCHING", samples: 3, accuracyPercent: 10 },
  ],
});

check("Payload sạch, không có khóa cấm", findForbiddenKeys(payload), []);
check("Mã câu vẫn đi kèm để ghép kết quả", payload.cacCau[0].maCau, "p1:q3");
check(
  "Có lời giải giáo viên thì đánh dấu đúng nguồn",
  payload.cacCau[0].nguonLoiGiai,
  "TEACHER_APPROVED"
);
check(
  "Dòng Sổ Sơ Hở chưa đủ mẫu bị BỎ HẲN khỏi payload",
  payload.hocLuc.soHo.length,
  1
);
check(
  "Còn dòng đủ mẫu thì không kèm ghi chú thiếu dữ liệu",
  payload.hocLuc.ghiChu,
  null
);
check(
  "Phần tự giảng của học viên có mặt — đó là thứ chính cần chấm",
  payload.cacCau[0].hocVienTuGiang,
  "Em nghi la..."
);

let threw = false;
try {
  assertPayloadClean({ cacCau: [{ maCau: "p1:q3", email: "a@b.com" }] });
} catch {
  threw = true;
}
check("Lỡ để email lọt vào payload thì NÉM LỖI, không lặng lẽ lọc bỏ", threw, true);

/* ---------------------------------------------------------------- */
/* Giữ chỗ lại sau khi hỏng — chấm lại được, và ví không lệch          */
/* ---------------------------------------------------------------- */

const RES_NOW = new Date("2026-08-10T14:00:00.000Z");
const resRefunded = (code: string | null) =>
  code === null || shouldRefundQuota(code as never);
const resPlan = (existing: Parameters<typeof planReservation>[0]["existing"]) =>
  planReservation({ existing, wasRefunded: resRefunded, at: RES_NOW });

const resRow = (over: Record<string, unknown>) =>
  ({
    id: "eval1",
    status: "FAILED",
    errorCode: "UPSTREAM_ERROR",
    updatedAt: new Date(RES_NOW.getTime() - 60_000),
    ...over,
  }) as NonNullable<Parameters<typeof planReservation>[0]["existing"]>;

check("Chưa từng chấm thì tạo mới và trừ ví", resPlan(null), {
  action: "CREATE",
  chargeWallet: true,
});

check(
  "Đã chấm xong thì chặn — đây mới đúng nghĩa đã chấm rồi",
  (resPlan(resRow({ status: "COMPLETED" })) as { reason?: string }).reason,
  "ALREADY_GRADED"
);

// Đây là lỗi khiến một lần OpenAI trục trặc là khóa vĩnh viễn phiên đó.
check(
  "Hỏng do hệ thống (đã hoàn lượt) thì CHẤM LẠI ĐƯỢC và trừ ví lần nữa",
  resPlan(resRow({ status: "FAILED", errorCode: "UPSTREAM_ERROR" })),
  { action: "REUSE", evaluationId: "eval1", chargeWallet: true }
);

check(
  "Hỏng mà KHÔNG được hoàn lượt thì chấm lại nhưng KHÔNG trừ ví lần hai",
  resPlan(resRow({ status: "FAILED", errorCode: "NO_ACCESS" })),
  { action: "REUSE", evaluationId: "eval1", chargeWallet: false }
);

check(
  "Đang chấm thật (PENDING còn mới) thì chặn, không trừ ví chồng",
  (resPlan(resRow({ status: "PENDING" })) as { reason?: string }).reason,
  "EVALUATION_IN_PROGRESS"
);

// Tiến trình bị giết giữa chừng: nhánh hoàn lượt không bao giờ chạy, nên lượt
// đã trừ vẫn đang bị giữ. Chấm lại mà trừ tiếp là thu tiền hai lần.
check(
  "PENDING mồ côi quá hạn thì chấm lại được và KHÔNG trừ ví lần nữa",
  resPlan(
    resRow({
      status: "PENDING",
      updatedAt: new Date(RES_NOW.getTime() - STALE_PENDING_MS - 1000),
    })
  ),
  { action: "REUSE", evaluationId: "eval1", chargeWallet: false }
);

check(
  "Trạng thái lạ cũng cho chấm lại, không để học viên kẹt cứng",
  resPlan(resRow({ status: "???", errorCode: null })).action,
  "REUSE"
);

// Ví đã bị trừ bởi bản ghi mồ côi nên còn 0 lượt. Xét ví lúc lấy lại là chặn
// nhầm chính lần chấm mà học viên đã trả tiền.
const canGrade = (over: Record<string, unknown>) =>
  decideCanGrade({
    featureEnabled: true,
    hasAccess: true,
    competitionLocked: false,
    reviewStatus: "COMPLETED",
    alreadyGraded: false,
    wallet: { grantedTotal: 1, usedTotal: 1 },
    lastGradedAt: null,
    at: RES_NOW,
    ...over,
  } as Parameters<typeof decideCanGrade>[0]);

check(
  "Ví cạn thì chặn khi lần chấm này CÓ trừ lượt",
  canGrade({ requiresCredit: true }),
  { allowed: false, reason: "QUOTA_EXHAUSTED" }
);
check(
  "Ví cạn nhưng KHÔNG trừ lượt (lấy lại bản mồ côi) thì vẫn cho chấm",
  canGrade({ requiresCredit: false }),
  { allowed: true }
);
check(
  "Không khai requiresCredit thì mặc định vẫn xét ví — không nới lỏng ngầm",
  canGrade({}),
  { allowed: false, reason: "QUOTA_EXHAUSTED" }
);

// Tiến trình chết giữa chừng để lại lastGradedOn của hôm nay. Nếu vẫn tính vào
// nhịp ngày thì học viên bị khóa tới hôm sau, mà lượt đã mất rồi.
check(
  "Lần chấm hỏng không được tính vào nhịp một lần mỗi ngày",
  canGrade({ requiresCredit: false, lastGradedAt: null }),
  { allowed: true }
);
// Hạn giờ vẫn hiệu lực khi đang đọc thân phản hồi. Gộp hết vào MALFORMED_OUTPUT
// thì trang quản trị chỉ sang model, trong khi việc cần làm là nới hạn giờ.
const timeoutErr = Object.assign(new Error("The operation was aborted"), {
  name: "TimeoutError",
});
check(
  "Đứt vì hết giờ lúc đọc thân phản hồi là HẾT GIỜ, không phải JSON hỏng",
  classifyBodyReadError(timeoutErr),
  "UPSTREAM_TIMEOUT"
);
check(
  "Hủy giữa chừng cũng xếp vào hết giờ",
  classifyBodyReadError(
    Object.assign(new Error("aborted"), { name: "AbortError" })
  ),
  "UPSTREAM_TIMEOUT"
);
check(
  "JSON hỏng thật thì vẫn là MALFORMED_OUTPUT",
  classifyBodyReadError(new SyntaxError("Unexpected token < in JSON")),
  "MALFORMED_OUTPUT"
);
check(
  "Cả hai nhóm đều hoàn lượt cho học viên",
  [
    shouldRefundQuota(classifyBodyReadError(timeoutErr)),
    shouldRefundQuota(classifyBodyReadError(new SyntaxError("x"))),
  ],
  [true, true]
);

/* ---------------------------------------------------------------- */
/* Bảng giá token — sai ở đây thì im lặng tuyệt đối                    */
/* ---------------------------------------------------------------- */

// Chủ dự án dựa vào đúng con số này để quyết có mở AI cho học viên không.
// Không có gì báo khi nó sai: trang quản trị vẫn hiện một con số trông hợp lý.
const M = 1_000_000;

check(
  "Một triệu token đầu vào = 250.000 micro-USD (0,25 USD)",
  estimateCostMicroUsd("gpt-5-mini", { inputTokens: M, outputTokens: 0 }),
  250_000
);
check(
  "Một triệu token đầu ra = 2.000.000 micro-USD (2 USD)",
  estimateCostMicroUsd("gpt-5-mini", { inputTokens: 0, outputTokens: M }),
  2_000_000
);
check(
  "Một triệu token đã cache = 25.000 micro-USD, rẻ hơn 10 lần",
  estimateCostMicroUsd("gpt-5-mini", {
    inputTokens: M,
    outputTokens: 0,
    cachedInputTokens: M,
  }),
  25_000
);

// OpenAI trả input_tokens là TỔNG, cached_tokens là tập con. Không trừ ra thì
// phần đã cache bị tính cả giá thường lẫn giá cache.
check(
  "Token đã cache được TRỪ khỏi input thường, không tính tiền hai lần",
  estimateCostMicroUsd("gpt-5-mini", {
    inputTokens: M,
    outputTokens: 0,
    cachedInputTokens: M / 2,
  }),
  125_000 + 12_500
);
check(
  "Dữ liệu lệch (cache nhiều hơn input) không cho ra số âm",
  estimateCostMicroUsd("gpt-5-mini", {
    inputTokens: 100,
    outputTokens: 0,
    cachedInputTokens: 5_000,
  }) >= 0,
  true
);

// Một lượt chấm thật: khoảng 3000 token vào, 1500 token ra.
check(
  "Một lượt chấm điển hình tốn 3.750 micro-USD (~0,004 USD)",
  estimateCostMicroUsd("gpt-5-mini", {
    inputTokens: 3_000,
    outputTokens: 1_500,
  }),
  3_750
);

check(
  "Model lạ trả 0 chứ không bịa số",
  estimateCostMicroUsd("model-khong-co-that", {
    inputTokens: M,
    outputTokens: M,
  }),
  0
);
check("hasPricing khớp với bảng giá", [hasPricing("gpt-5-mini"), hasPricing("x")], [true, false]);
check(
  "Quy đổi VND chỉ để hiển thị: 1 USD = 26.000đ",
  microUsdToVnd(M),
  VND_PER_USD
);

check(
  "Còn lần chấm THÀNH CÔNG hôm nay thì vẫn chặn đúng",
  canGrade({
    requiresCredit: false,
    lastGradedAt: new Date(RES_NOW.getTime() - 60_000),
  }),
  { allowed: false, reason: "DAILY_LIMIT_REACHED" }
);

/* ---------------------------------------------------------------- */
console.log(
  failures === 0
    ? "\ntest:feynman-ai — tất cả phép thử đều đạt.\n"
    : `\ntest:feynman-ai — ${failures} phép thử THẤT BẠI.\n`
);
process.exit(failures === 0 ? 0 : 1);
