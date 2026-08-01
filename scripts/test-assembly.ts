/**
 * Kiểm thử quy tắc ghép passage thành đề Full Test.
 * Chạy: node --experimental-strip-types scripts/test-assembly.ts
 *
 * Trọng tâm: chế độ TỰ CHỌN không được phép tính danh hiệu, và chế độ TỰ ĐỘNG
 * không được ghép lại bài học viên đã làm.
 */
import {
  accessGapOf,
  planAutoAssembly,
  planManualAssembly,
  type PassageCandidate,
} from "../src/lib/reading-assembly.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const p = (o: Partial<PassageCandidate> & { exerciseId: string }): PassageCandidate => ({
  title: o.exerciseId,
  questionCount: 13,
  tier: "MEDIUM",
  accessLevel: "PUBLIC",
  owned: false,
  attemptCount: 0,
  achievementEligible: true,
  competitionOnly: false,
  published: true,
  sortKey: o.exerciseId,
  ...o,
});

const ids = (r: ReturnType<typeof planAutoAssembly>) =>
  r.ok ? r.parts.map((x) => x.exerciseId) : r.reason;

/* ---------------------------------------------------------------- */
console.log("\nCHẾ ĐỘ TỰ CHỌN — luyện tập, KHÔNG tính danh hiệu");
const pool3 = [p({ exerciseId: "a" }), p({ exerciseId: "b" }), p({ exerciseId: "c" })];
const manual = planManualAssembly(pool3, ["a", "b", "c"]);
check("ghép được ba bài đã chọn", manual.ok, true);
check(
  "ĐIỀU QUAN TRỌNG NHẤT: tự chọn thì KHÔNG tính danh hiệu",
  manual.ok && manual.countsForAchievements,
  false
);
check("thời lượng cố định 60 phút như thi thật", manual.ok && manual.durationMinutes, 60);
check("tổng số câu được cộng đúng", manual.ok && manual.totalQuestions, 39);
check("chọn 2 bài → từ chối", planManualAssembly(pool3, ["a", "b"]).ok, false);
check("chọn 4 bài → từ chối", planManualAssembly(pool3, ["a", "b", "c", "a"]).ok, false);
check(
  "chọn trùng một bài ba lần → từ chối",
  planManualAssembly(pool3, ["a", "a", "a"]).ok,
  false
);
check(
  "chọn bài không có thật → từ chối",
  planManualAssembly(pool3, ["a", "b", "khong-ton-tai"]).ok,
  false
);
check(
  "tự chọn ĐƯỢC phép lấy bài đã làm rồi (là luyện tập)",
  planManualAssembly(
    [p({ exerciseId: "a", attemptCount: 5 }), p({ exerciseId: "b" }), p({ exerciseId: "c" })],
    ["a", "b", "c"]
  ).ok,
  true
);
check(
  "tự chọn vẫn KHÔNG được lấy đề Nguyệt Thí",
  planManualAssembly(
    [p({ exerciseId: "a", competitionOnly: true }), p({ exerciseId: "b" }), p({ exerciseId: "c" })],
    ["a", "b", "c"]
  ).ok,
  false
);
check(
  "tự chọn được lấy cả bài chưa bật cờ danh hiệu",
  planManualAssembly(
    [p({ exerciseId: "a", achievementEligible: false }), p({ exerciseId: "b" }), p({ exerciseId: "c" })],
    ["a", "b", "c"]
  ).ok,
  true
);

/* ---------------------------------------------------------------- */
console.log("\nCHẾ ĐỘ TỰ ĐỘNG — hệ thống chọn, CÓ tính danh hiệu");
const auto3 = planAutoAssembly(pool3);
check("ghép được khi kho vừa đủ ba bài", auto3.ok, true);
check("tự động thì CÓ tính danh hiệu", auto3.ok && auto3.countsForAchievements, true);
check("kho chỉ có hai bài → báo thiếu", planAutoAssembly(pool3.slice(0, 2)).ok, false);
check(
  "bài chưa bật cờ danh hiệu KHÔNG vào được đề tự động",
  planAutoAssembly([
    p({ exerciseId: "a", achievementEligible: false }),
    p({ exerciseId: "b" }),
    p({ exerciseId: "c" }),
  ]).ok,
  false
);
check(
  "đề Nguyệt Thí bị loại khỏi kho ghép",
  planAutoAssembly([
    p({ exerciseId: "thi", competitionOnly: true }),
    p({ exerciseId: "b" }),
    p({ exerciseId: "c" }),
    p({ exerciseId: "d" }),
  ]).ok &&
    (planAutoAssembly([
      p({ exerciseId: "thi", competitionOnly: true }),
      p({ exerciseId: "b" }),
      p({ exerciseId: "c" }),
      p({ exerciseId: "d" }),
    ]) as { parts: PassageCandidate[] }).parts.some((x) => x.exerciseId === "thi"),
  false
);
check(
  "bài đang ẩn bị loại",
  planAutoAssembly([
    p({ exerciseId: "an", published: false }),
    p({ exerciseId: "b" }),
    p({ exerciseId: "c" }),
  ]).ok,
  false
);

console.log("\n  Ưu tiên bài CHƯA TỪNG LÀM — chống ghép lại bài đã thuộc đáp án");
check(
  "bỏ qua bài đã làm khi còn đủ bài mới",
  ids(
    planAutoAssembly([
      p({ exerciseId: "cu", attemptCount: 4 }),
      p({ exerciseId: "moi1" }),
      p({ exerciseId: "moi2" }),
      p({ exerciseId: "moi3" }),
    ])
  ),
  ["moi1", "moi2", "moi3"]
);
check(
  "hết bài mới thì đành lấy bài làm ÍT lần nhất",
  ids(
    planAutoAssembly([
      p({ exerciseId: "lam-nhieu", attemptCount: 9 }),
      p({ exerciseId: "lam-it", attemptCount: 1 }),
      p({ exerciseId: "moi" }),
    ])
  ).includes("lam-it"),
  true
);

console.log("\n  Cân bằng độ khó và tổng số câu");
const tiered = planAutoAssembly([
  p({ exerciseId: "de", tier: "EASY", questionCount: 13 }),
  p({ exerciseId: "vua", tier: "MEDIUM", questionCount: 13 }),
  p({ exerciseId: "kho", tier: "HARD", questionCount: 14 }),
  p({ exerciseId: "de2", tier: "EASY", questionCount: 13 }),
  p({ exerciseId: "de3", tier: "EASY", questionCount: 13 }),
]);
check("chọn đủ ba tầng độ khó thay vì ba bài dễ", ids(tiered), ["de", "vua", "kho"]);
check("tổng đúng 40 câu", tiered.ok && tiered.totalQuestions, 40);

const nearest = planAutoAssembly([
  p({ exerciseId: "x1", tier: "EASY", questionCount: 13 }),
  p({ exerciseId: "x2", tier: "MEDIUM", questionCount: 13 }),
  p({ exerciseId: "x3", tier: "HARD", questionCount: 14 }),
  p({ exerciseId: "y3", tier: "HARD", questionCount: 20 }),
]);
check("giữa hai bài cùng tầng, chọn bài cho tổng gần 40 nhất", ids(nearest), ["x1", "x2", "x3"]);

check(
  "kết quả ổn định: chạy hai lần cho cùng một đề",
  JSON.stringify(ids(planAutoAssembly(pool3))) === JSON.stringify(ids(planAutoAssembly(pool3))),
  true
);

/* ---------------------------------------------------------------- */
console.log("\nTHANH TOÁN — phải sở hữu đủ ba passage thành phần");
const paid = planAutoAssembly([
  p({ exerciseId: "free1" }),
  p({ exerciseId: "khoa", accessLevel: "RESTRICTED", owned: false }),
  p({ exerciseId: "free2" }),
]);
check("phát hiện đúng bài còn thiếu quyền", paid.ok && accessGapOf(paid).missingIds, ["khoa"]);
check("chưa mua đủ thì chưa bắt đầu được", paid.ok && accessGapOf(paid).ready, false);

const bought = planAutoAssembly([
  p({ exerciseId: "free1" }),
  p({ exerciseId: "khoa", accessLevel: "RESTRICTED", owned: true }),
  p({ exerciseId: "free2" }),
]);
check("mua đủ rồi thì vào làm được", bought.ok && accessGapOf(bought).ready, true);
check(
  "bài công khai không bao giờ bị tính tiền",
  planAutoAssembly([p({ exerciseId: "a" }), p({ exerciseId: "b" }), p({ exerciseId: "c" })]).ok &&
    accessGapOf(
      planAutoAssembly([p({ exerciseId: "a" }), p({ exerciseId: "b" }), p({ exerciseId: "c" })]) as never
    ).missingIds,
  []
);
check(
  "ba bài đều khóa và chưa mua → thiếu cả ba",
  (() => {
    const r = planAutoAssembly([
      p({ exerciseId: "k1", accessLevel: "RESTRICTED" }),
      p({ exerciseId: "k2", accessLevel: "RESTRICTED" }),
      p({ exerciseId: "k3", accessLevel: "RESTRICTED" }),
    ]);
    return r.ok ? accessGapOf(r).missingIds.length : -1;
  })(),
  3
);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
