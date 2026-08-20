/**
 * Kiểm thử luật mở và vượt cửa ải.
 * Chạy: node --experimental-strip-types scripts/test-rank-rules.ts
 *
 * Phủ các bất biến ở Mục 13.1 của đặc tả mà hàm thuần kiểm được. Bất biến
 * quan trọng nhất và được kiểm kỹ nhất: sự kiện xảy ra TRƯỚC `startedAt`
 * không bao giờ được tính cho việc vượt cửa ải. Nếu ranh giới đó vỡ, học viên
 * thăng cấp ngay lúc bấm nút và cả hệ mất ý nghĩa.
 */
import {
  evaluateGate,
  evaluateSuccess,
  evaluateTrialGate,
  weakestQuestionType,
  type RankAttemptFact,
  type QualifiedReviewFact,
  type RankFacts,
} from "../src/lib/ranks/rules.ts";
import { TRIAL_SEEDS } from "../src/lib/ranks/catalog.ts";
import { gateExperienceFor } from "../src/lib/experience/experience.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const NOW = new Date("2026-08-04T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function attempt(over: Partial<RankAttemptFact> = {}): RankAttemptFact {
  return {
    id: `a-${Math.random().toString(36).slice(2, 8)}`,
    exerciseId: "ex-1",
    band: 5.0,
    elapsedSeconds: 600,
    submittedAt: daysAgo(1),
    questionTypeStats: { TRUE_FALSE_NOT_GIVEN: { correct: 10, total: 14 } },
    partStats: [{ part: 1, correct: 10, total: 14 }],
    isFullTest: false,
    valid: true,
    ...over,
  };
}

function review(over: Partial<QualifiedReviewFact> = {}): QualifiedReviewFact {
  return {
    id: `r-${Math.random().toString(36).slice(2, 8)}`,
    source: "TRIAL_REFLECTION",
    questionType: "TRUE_FALSE_NOT_GIVEN",
    completedAt: daysAgo(1),
    deep: true,
    ...over,
  };
}

function facts(over: Partial<RankFacts> = {}): RankFacts {
  return {
    now: NOW,
    attempts: [],
    qualifiedReviews: [],
    studyDays: [],
    earnedTitleCodes: new Set<string>(),
    pillars: [],
    graceAvailable: 0,
    // Đặt rất cao theo mặc định để các bài kiểm thử ở file này vẫn đo ĐÚNG THỨ
    // chúng sinh ra để đo: điều kiện NĂNG LỰC của từng cửa ải. Bài nào muốn đo
    // riêng ngưỡng kinh nghiệm thì tự truyền `experience` vào.
    experience: 1_000_000,
    ...over,
  };
}

console.log("\n— Ranh giới startedAt —");

{
  // Bất biến số một của cả hệ.
  const before = facts({
    attempts: [attempt({ submittedAt: daysAgo(10) })],
    qualifiedReviews: [review({ completedAt: daysAgo(10) })],
  });
  const started = daysAgo(5);
  const r = evaluateSuccess(
    "GRADED_PLUS_REVIEW",
    { attempts: 1, qualifiedReviews: 1 },
    before,
    started,
  );
  check("dữ liệu có TRƯỚC khi khởi thí luyện không được tính", r.complete, false);
}

{
  const after = facts({
    attempts: [attempt({ submittedAt: daysAgo(2) })],
    qualifiedReviews: [review({ completedAt: daysAgo(2) })],
  });
  const r = evaluateSuccess(
    "GRADED_PLUS_REVIEW",
    { attempts: 1, qualifiedReviews: 1 },
    after,
    daysAgo(5),
  );
  check("dữ liệu có SAU khi khởi thí luyện thì được tính", r.complete, true);
}

{
  // Gate ngược lại VẪN đọc lịch sử cũ — đó là điều đúng đắn.
  const r = evaluateGate(
    "DISTINCT_ATTEMPTS",
    { distinctExercises: 2 },
    facts({
      attempts: [
        attempt({ exerciseId: "ex-1", submittedAt: daysAgo(30) }),
        attempt({ exerciseId: "ex-2", submittedAt: daysAgo(20) }),
      ],
    }),
  );
  check("gate vẫn dùng dữ liệu cũ để mở cửa ải", r.complete, true);
}

console.log("\n— Hàng rào liêm chính —");

{
  const r = evaluateGate(
    "DISTINCT_ATTEMPTS",
    { distinctExercises: 2 },
    facts({
      attempts: [
        attempt({ exerciseId: "ex-1", valid: false }),
        attempt({ exerciseId: "ex-2", valid: false }),
      ],
    }),
  );
  check("lượt không hợp lệ không được tính cho gate", r.complete, false);
}

{
  const r = evaluateSuccess(
    "GRADED_PLUS_REVIEW",
    { attempts: 1, qualifiedReviews: 0 },
    facts({ attempts: [attempt({ valid: false })] }),
    daysAgo(5),
  );
  check("lượt không hợp lệ không được tính cho success", r.complete, false);
}

console.log("\n— Không trả tiền để mạnh hơn —");

{
  // Đường miễn phí phải đủ để vượt mọi cửa ải có yêu cầu phục bàn.
  const onlyFree = facts({
    attempts: [attempt({ submittedAt: daysAgo(1) })],
    qualifiedReviews: [review({ source: "TRIAL_REFLECTION", completedAt: daysAgo(1) })],
  });
  const r = evaluateSuccess(
    "GRADED_PLUS_REVIEW",
    { attempts: 1, qualifiedReviews: 1 },
    onlyFree,
    daysAgo(3),
  );
  check("TrialReflection miễn phí vượt được cửa ải", r.complete, true);
}

console.log("\n— Cửa 3: tốc độ đi cùng độ chính xác —");

const timedConfig = { minQuestions: 13, maxMinutes: 15, minMinutes: 4, minAccuracy: 0.7 };

{
  const r = evaluateSuccess(
    "TIMED_ACCURACY_RUN",
    timedConfig,
    facts({
      attempts: [
        attempt({
          submittedAt: daysAgo(1),
          elapsedSeconds: 600,
          questionTypeStats: { A: { correct: 10, total: 14 } },
        }),
      ],
    }),
    daysAgo(3),
  );
  check("10/14 câu trong 10 phút là đạt", r.complete, true);
}

{
  const r = evaluateSuccess(
    "TIMED_ACCURACY_RUN",
    timedConfig,
    facts({
      attempts: [
        attempt({
          submittedAt: daysAgo(1),
          elapsedSeconds: 120,
          questionTypeStats: { A: { correct: 14, total: 14 } },
        }),
      ],
    }),
    daysAgo(3),
  );
  check("làm đúng hết nhưng chỉ 2 phút là ĐOÁN BỪA, không đạt", r.complete, false);
}

{
  const r = evaluateSuccess(
    "TIMED_ACCURACY_RUN",
    timedConfig,
    facts({
      attempts: [
        attempt({
          submittedAt: daysAgo(1),
          elapsedSeconds: 1200,
          questionTypeStats: { A: { correct: 14, total: 14 } },
        }),
      ],
    }),
    daysAgo(3),
  );
  check("quá 15 phút thì không đạt dù đúng hết", r.complete, false);
}

console.log("\n— Cửa 4: chuỗi phong độ và Hoa Dung đạo —");

const streakConfig = { consecutive: 3, minBand: 5.5, windowDays: 14 };

function streakAttempts(bands: number[]): RankAttemptFact[] {
  return bands.map((band, i) =>
    attempt({ band, submittedAt: daysAgo(bands.length - i), exerciseId: `ex-${i}` }),
  );
}

{
  const r = evaluateSuccess(
    "CONSECUTIVE_BAND_STREAK",
    streakConfig,
    facts({ attempts: streakAttempts([6, 6, 6]) }),
    daysAgo(10),
  );
  check("ba lượt liên tiếp đạt ngưỡng là vượt", r.complete, true);
}

{
  const r = evaluateSuccess(
    "CONSECUTIVE_BAND_STREAK",
    streakConfig,
    facts({ attempts: streakAttempts([6, 4, 6, 6]) }),
    daysAgo(10),
  );
  check("đứt chuỗi mà không có token thì chuỗi đặt lại", r.complete, false);
}

{
  const r = evaluateSuccess(
    "CONSECUTIVE_BAND_STREAK",
    streakConfig,
    facts({ attempts: streakAttempts([6, 4, 6, 6]), graceAvailable: 1 }),
    daysAgo(10),
  );
  check("Hoa Dung đạo cứu được một lần đứt chuỗi", r.complete, true);
}

{
  // Ranh giới đã chốt: token ngăn chuỗi đặt lại, KHÔNG biến lượt hỏng thành đạt.
  const r = evaluateSuccess(
    "CONSECUTIVE_BAND_STREAK",
    streakConfig,
    facts({ attempts: streakAttempts([4, 4, 4]), graceAvailable: 1 }),
    daysAgo(10),
  );
  check("token KHÔNG biến lượt dưới ngưỡng thành lượt đạt", r.complete, false);
}

{
  const r = evaluateSuccess(
    "CONSECUTIVE_BAND_STREAK",
    streakConfig,
    facts({ attempts: streakAttempts([6, 4, 6, 4, 6]), graceAvailable: 1 }),
    daysAgo(10),
  );
  check("token chỉ cứu được đúng MỘT lần", r.complete, false);
}

console.log("\n— Cửa 5: Full Test có sàn cho phần yếu nhất —");

{
  const r = evaluateSuccess(
    "FULL_TEST_WITH_FLOOR",
    { minBand: 6.0, minWeakestPartAccuracy: 0.5 },
    facts({
      attempts: [
        attempt({
          submittedAt: daysAgo(1),
          band: 6.5,
          isFullTest: true,
          partStats: [
            { part: 1, correct: 12, total: 13 },
            { part: 2, correct: 11, total: 13 },
            { part: 3, correct: 8, total: 14 },
          ],
        }),
      ],
    }),
    daysAgo(3),
  );
  check("Full Test band 6.5, phần yếu nhất 57% là đạt", r.complete, true);
}

{
  const r = evaluateSuccess(
    "FULL_TEST_WITH_FLOOR",
    { minBand: 6.0, minWeakestPartAccuracy: 0.5 },
    facts({
      attempts: [
        attempt({
          submittedAt: daysAgo(1),
          band: 6.5,
          isFullTest: true,
          partStats: [
            { part: 1, correct: 13, total: 13 },
            { part: 2, correct: 13, total: 13 },
            { part: 3, correct: 2, total: 14 },
          ],
        }),
      ],
    }),
    daysAgo(3),
  );
  check("bỏ rơi hẳn một phần thì KHÔNG đạt dù band cao", r.complete, false);
}

console.log("\n— Cửa 6: phục bàn phải cách ngày —");

{
  const sameDay = [0, 0, 0].map((_, i) =>
    review({
      completedAt: new Date(daysAgo(2).getTime() + i * 60 * 60 * 1000),
      questionType: `T${i}`,
    }),
  );
  const r = evaluateSuccess(
    "SPACED_DEEP_REVIEWS",
    { deepReviews: 3, distinctQuestionTypes: 3, minDaysApart: 1 },
    facts({ qualifiedReviews: sameDay }),
    daysAgo(5),
  );
  check("ba lượt chữa dồn trong một buổi chỉ tính một", r.complete, false);
}

{
  const spaced = [4, 3, 2].map((d, i) =>
    review({ completedAt: daysAgo(d), questionType: `T${i}` }),
  );
  const r = evaluateSuccess(
    "SPACED_DEEP_REVIEWS",
    { deepReviews: 3, distinctQuestionTypes: 3, minDaysApart: 1 },
    facts({ qualifiedReviews: spaced }),
    daysAgo(6),
  );
  check("ba lượt chữa cách ngày, ba dạng câu là đạt", r.complete, true);
}

console.log("\n— Cửa 8: dạng câu yếu nhất —");

{
  const stats = [
    attempt({ questionTypeStats: { MATCHING: { correct: 5, total: 20 }, TFNG: { correct: 18, total: 20 } } }),
  ];
  check(
    "chọn đúng dạng có độ chính xác thấp nhất",
    weakestQuestionType(stats, 20)?.type,
    "MATCHING",
  );
}

{
  const stats = [attempt({ questionTypeStats: { MATCHING: { correct: 0, total: 5 } } })];
  check("mẫu quá nhỏ thì không kết luận điểm yếu", weakestQuestionType(stats, 20), null);
}

{
  const r = evaluateSuccess(
    "WEAKEST_TYPE_STREAK",
    { correctStreak: 4, minDistinctExercises: 2, questionType: "MATCHING" },
    facts({
      attempts: [
        attempt({
          exerciseId: "ex-1",
          submittedAt: daysAgo(3),
          questionTypeStats: { MATCHING: { correct: 2, total: 2 } },
        }),
        attempt({
          exerciseId: "ex-2",
          submittedAt: daysAgo(2),
          questionTypeStats: { MATCHING: { correct: 2, total: 2 } },
        }),
      ],
    }),
    daysAgo(5),
  );
  check("4 câu đúng liên tiếp trên 2 đề là vượt", r.complete, true);
}

{
  const r = evaluateSuccess(
    "WEAKEST_TYPE_STREAK",
    { correctStreak: 4, minDistinctExercises: 2, questionType: "MATCHING" },
    facts({
      attempts: [
        attempt({
          exerciseId: "ex-1",
          submittedAt: daysAgo(3),
          questionTypeStats: { MATCHING: { correct: 2, total: 2 } },
        }),
        attempt({
          exerciseId: "ex-2",
          submittedAt: daysAgo(2),
          questionTypeStats: { MATCHING: { correct: 1, total: 2 } },
        }),
        attempt({
          exerciseId: "ex-3",
          submittedAt: daysAgo(1),
          questionTypeStats: { MATCHING: { correct: 2, total: 2 } },
        }),
      ],
    }),
    daysAgo(5),
  );
  check("sai một câu là chuỗi đặt lại về 0", r.complete, false);
}

console.log("\n— Bất biến chung của tám cửa ải —");

{
  // Mọi luật trong catalog phải có nhánh xử lý thật, không rơi vào default.
  const missing = TRIAL_SEEDS.filter((trial) => {
    const gate = evaluateGate(trial.gateRuleKey, trial.gateConfig, facts());
    const success = evaluateSuccess(
      trial.successRuleKey,
      { ...trial.successConfig, questionType: "MATCHING" },
      facts(),
      daysAgo(1),
    );
    return (
      gate.explanation.includes("chưa được cài đặt") ||
      success.explanation.includes("chưa được cài đặt")
    );
  }).map((t) => t.code);
  check("mọi luật gate/success trong catalog đều đã cài đặt", missing, []);
}

{
  // Không cửa ải nào được vượt khi học viên chưa làm gì sau khi khởi thí luyện.
  const passing = TRIAL_SEEDS.filter(
    (trial) =>
      evaluateSuccess(
        trial.successRuleKey,
        { ...trial.successConfig, questionType: "MATCHING" },
        facts(),
        daysAgo(1),
      ).complete,
  ).map((t) => t.code);
  check("không cửa ải nào tự vượt khi chưa có dữ liệu mới", passing, []);
}

console.log("\n— Cổng kinh nghiệm: điều kiện CỘNG THÊM, không thay thế —");

{
  // Lấy một cửa ải THẬT thay vì bịa, để bài này hỏng nếu ai đó đổi cửa ải mà
  // quên nghĩ tới kinh nghiệm.
  const trial = TRIAL_SEEDS.find((s) => s.toLevel >= 3);
  if (!trial) {
    console.log("  ✗ THẤT BẠI: không tìm thấy cửa ải nào có toLevel >= 3");
    failures++;
  } else {
    const target = gateExperienceFor(trial.toLevel);

    // Thiếu kinh nghiệm thì cửa VẪN ĐÓNG, dù luật năng lực ra sao.
    const thin = evaluateTrialGate(trial, facts({ experience: 0 }));
    check("thiếu kinh nghiệm thì cửa không mở", thin.complete, false);
    check(
      "tiến độ có nhắc kinh nghiệm, để người học biết còn thiếu gì",
      thin.progress.some((p) => p.label === "Kinh nghiệm" && p.target === target),
      true,
    );

    // Thừa kinh nghiệm KHÔNG tự mở cửa: luật năng lực vẫn phải đạt.
    const rich = evaluateTrialGate(trial, facts({ experience: 10_000_000 }));
    const baseOnly = evaluateGate(trial.gateRuleKey, trial.gateConfig, facts());
    check(
      "thừa kinh nghiệm không thay thế được điều kiện năng lực",
      rich.complete,
      baseOnly.complete,
    );

    // Ngưỡng phải thấp hơn hẳn công sức mà điều kiện năng lực đòi hỏi, nếu
    // không thì cấp bậc thoái hoá thành huy hiệu thâm niên.
    check(
      "ngưỡng kinh nghiệm dưới 150 ngày học thật, tức chỉ định nhịp",
      Math.ceil(target / 35) <= 150,
      true,
    );
  }
}

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ LUẬT CẤP BẬC ĐỀU ĐẠT\n"
    : `\n❌ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
