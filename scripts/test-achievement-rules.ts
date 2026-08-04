/**
 * Kiểm thử catalog và quy tắc xét danh hiệu.
 * Chạy: node --experimental-strip-types scripts/test-achievement-rules.ts
 *
 * Phủ các tình huống T1–T6, T8, T9 trong Mục 13.3 của đặc tả.
 */
import {
  TITLE_SEEDS,
  PILLAR_CODES,
  ENTRY_TITLE_CODE,
  quoteAttribution,
} from "../src/lib/achievements/catalog.ts";
import {
  evalActiveTimeWindow,
  evalCollectionAttemptCount,
  evalCollectionFeynmanComplete,
  evalCollectionMinFirstBand,
  evalCompositeTitles,
  evalFeynmanTotals,
  evalNearComposite,
  evalRecoveryChain,
  evalRollingAttempts,
  evalUniqueFirstAttempts,
  firstValidAttempts,
  type AttemptFact,
} from "../src/lib/achievements/rules.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const D = (days: number) => new Date(Date.UTC(2026, 0, 1) + days * 86400_000);
const a = (o: Partial<AttemptFact> & { id: string }): AttemptFact => ({
  exerciseId: "ex-" + o.id,
  band: 7,
  submittedAt: D(0),
  attemptNumber: 1,
  isFullTest: false,
  valid: true,
  ...o,
});

/* ---------------------------------------------------------------- */
console.log("\nCATALOG — nguồn câu chữ phải trung thực");
check("có đủ 18 danh hiệu thường", TITLE_SEEDS.length, 18);
check("mọi mã danh hiệu là duy nhất", new Set(TITLE_SEEDS.map((t) => t.code)).size, 18);
check("mọi slug là duy nhất", new Set(TITLE_SEEDS.map((t) => t.slug)).size, 18);
check(
  "danh hiệu trích dẫn đều phải ghi nguồn",
  TITLE_SEEDS.filter((t) => t.quoteKind !== "ORIGINAL").every((t) => Boolean(t.quoteSource)),
  true
);
check(
  "câu HỔ PHÙ · IELTS tự viết KHÔNG được gán cho danh nhân lịch sử",
  TITLE_SEEDS.filter((t) => t.quoteKind === "ORIGINAL").every((t) =>
    (t.quoteSource ?? "").includes("HỔ PHÙ")
  ),
  true
);
check(
  "danh hiệu cảnh tỉnh phải riêng tư (T8)",
  TITLE_SEEDS.find((t) => t.code === "TRANSFORM_01_LOW_WARNING")?.visibility,
  "PRIVATE_ONLY"
);
check(
  "chỉ đúng hai danh hiệu có phần thưởng mở bài",
  TITLE_SEEDS.filter((t) => t.rewardCode).map((t) => t.code),
  ["PRACTICE_04_EARLY_YOUTH", "PRACTICE_05_RARE_TALENT"]
);
check(
  "danh hiệu có thưởng phải nhận lại được theo từng bộ đề",
  TITLE_SEEDS.filter((t) => t.rewardCode).every((t) => t.repeatPolicy === "PER_COLLECTION"),
  true
);
check(
  "ba trụ đều tồn tại trong catalog",
  PILLAR_CODES.every((c) => TITLE_SEEDS.some((t) => t.code === c)),
  true
);
check(
  "danh hiệu vé vào Nguyệt Thí tồn tại",
  TITLE_SEEDS.some((t) => t.code === ENTRY_TITLE_CODE),
  true
);
check(
  "ghi nguồn đúng cách cho câu phỏng theo",
  quoteAttribution({ quoteKind: "ADAPTED", quoteSource: "Marcus Aurelius" }),
  "Phỏng theo Marcus Aurelius"
);
check(
  "ghi nguồn đúng cách cho câu trích nguyên văn",
  quoteAttribution({ quoteKind: "EXACT", quoteSource: "Mạnh Giao · Khuyến học" }),
  "Nguồn: Mạnh Giao · Khuyến học"
);

/* ---------------------------------------------------------------- */
console.log("\nLẦN LÀM HỢP LỆ ĐẦU TIÊN (T2, T5)");
check(
  "làm lại cùng một đề ba lần vẫn chỉ tính một đề",
  firstValidAttempts([
    a({ id: "1", exerciseId: "X", attemptNumber: 1, band: 4 }),
    a({ id: "2", exerciseId: "X", attemptNumber: 2, band: 9 }),
    a({ id: "3", exerciseId: "X", attemptNumber: 3, band: 9 }),
  ]).length,
  1
);
check(
  "lấy lần ĐẦU chứ không lấy lần điểm cao nhất",
  firstValidAttempts([
    a({ id: "1", exerciseId: "X", attemptNumber: 1, band: 4 }),
    a({ id: "2", exerciseId: "X", attemptNumber: 2, band: 9 }),
  ])[0].band,
  4
);
check(
  "lượt không hợp lệ bị bỏ qua, lấy lượt hợp lệ kế tiếp",
  firstValidAttempts([
    a({ id: "1", exerciseId: "X", attemptNumber: 1, band: 9, valid: false }),
    a({ id: "2", exerciseId: "X", attemptNumber: 2, band: 5 }),
  ])[0].band,
  5
);

/* ---------------------------------------------------------------- */
console.log("\nNHÓM GIẢI ĐỀ (T1)");
const p01 = { distinctExercises: 3, minBandEach: 4.0 };
check(
  "ba bài 4.0/4.5/5.0 thì đạt",
  evalUniqueFirstAttempts(
    [a({ id: "1", band: 4 }), a({ id: "2", band: 4.5 }), a({ id: "3", band: 5 })],
    p01
  ).earned,
  true
);
check(
  "một bài dưới 4.0 thì chưa đạt",
  evalUniqueFirstAttempts(
    [a({ id: "1", band: 3.5 }), a({ id: "2", band: 4.5 }), a({ id: "3", band: 5 })],
    p01
  ).earned,
  false
);
check(
  "có tiến độ phần trăm chứ không chỉ đạt hay chưa",
  evalUniqueFirstAttempts([a({ id: "1", band: 5 }), a({ id: "2", band: 5 })], p01).percent,
  66
);
check(
  "học viên luôn được nói còn thiếu gì",
  evalUniqueFirstAttempts([a({ id: "1", band: 5 })], p01).hint.length > 10,
  true
);
check(
  "trung bình chưa đủ thì chưa đạt dù đủ số đề",
  evalUniqueFirstAttempts(
    [a({ id: "1", band: 4 }), a({ id: "2", band: 4 }), a({ id: "3", band: 4 })],
    { distinctExercises: 3, minBandEach: 4.0, minAverageBand: 5.5 }
  ).earned,
  false
);
check(
  "chỉ tính bài trong cửa sổ 90 ngày gần nhất",
  evalRollingAttempts(
    [
      a({ id: "cu", submittedAt: D(0) }),
      a({ id: "moi1", submittedAt: D(100) }),
      a({ id: "moi2", submittedAt: D(101) }),
    ],
    { windowDays: 90, distinctExercises: 3 },
    D(105)
  ).currentValue,
  2
);
check(
  "thiếu số đề Full Test thì chưa đạt",
  evalRollingAttempts(
    [a({ id: "1" }), a({ id: "2" }), a({ id: "3" })],
    { windowDays: 90, distinctExercises: 3, minFullTests: 2 },
    D(1)
  ).earned,
  false
);

/* ---------------------------------------------------------------- */
console.log("\nNHÓM SỬA ĐỀ (T6)");
const fFacts = {
  completedReviews: 5,
  completedMistakes: 15,
  fullFieldMistakes: 15,
  teachBackLongCount: 5,
  confidenceImprovedCount: 4,
};
check(
  "đủ năm phiên và mười lăm câu thì đạt",
  evalFeynmanTotals(fFacts, { completedReviews: 5, completedMistakes: 15 }).earned,
  true
);
check(
  "thiếu câu đã sửa thì chưa đạt",
  evalFeynmanTotals({ ...fFacts, completedMistakes: 10 }, { completedReviews: 5, completedMistakes: 15 })
    .earned,
  false
);
check(
  "còn câu thiếu bằng chứng hoặc quy tắc thì chưa đạt",
  evalFeynmanTotals(
    { ...fFacts, fullFieldMistakes: 12 },
    { completedReviews: 5, completedMistakes: 15, requireFullFields: true }
  ).earned,
  false
);
check(
  "mức tự tin không cải thiện đủ tỷ lệ thì chưa đạt",
  evalFeynmanTotals(
    { ...fFacts, completedReviews: 20, confidenceImprovedCount: 5 },
    { completedReviews: 20, confidenceImprovedRatio: 0.7 }
  ).earned,
  false
);

/* ---------------------------------------------------------------- */
console.log("\nNHÓM KỶ LUẬT — ngày học thật");
const days = Array.from({ length: 8 }, (_, i) => ({
  dateKey: `2026-01-0${i + 1}`,
  activeSeconds: 1800,
}));
const disciplineCfg = { windowDays: 14, activeDays: 7, minMinutes: 180, minOutputs: 2 };
const extras = { distinctExercises: 5, feynmanReviews: 2, outputs: 5 };
check(
  "bảy ngày học thật trong hai tuần thì đạt",
  evalActiveTimeWindow(days, extras, disciplineCfg, new Date("2026-01-08T12:00:00Z")).earned,
  true
);
check(
  "ngày dưới mười phút KHÔNG được tính là ngày học thật",
  evalActiveTimeWindow(
    days.map((d) => ({ ...d, activeSeconds: 300 })),
    extras,
    disciplineCfg,
    new Date("2026-01-08T12:00:00Z")
  ).earned,
  false
);
check(
  "đủ ngày nhưng thiếu đầu ra học tập thì chưa đạt",
  evalActiveTimeWindow(
    days,
    { ...extras, outputs: 0 },
    disciplineCfg,
    new Date("2026-01-08T12:00:00Z")
  ).earned,
  false
);

/* ---------------------------------------------------------------- */
console.log("\nNHÓM TỔNG HỢP — ba trụ");
check(
  "đủ ba trụ thì mở vé Nguyệt Thí",
  evalCompositeTitles(new Set(PILLAR_CODES), { pillars: [...PILLAR_CODES] }).earned,
  true
);
check(
  "thiếu một trụ thì chưa đạt",
  evalCompositeTitles(new Set([PILLAR_CODES[0], PILLAR_CODES[1]]), {
    pillars: [...PILLAR_CODES],
  }).earned,
  false
);
check(
  "hai trụ và trụ còn lại 85 phần trăm thì đạt mốc Đông phong",
  evalNearComposite(
    new Set([PILLAR_CODES[0], PILLAR_CODES[1]]),
    new Map([[PILLAR_CODES[2], 85]]),
    { pillars: [...PILLAR_CODES], earnedPillars: 2, remainingPercent: 80 }
  ).earned,
  true
);
check(
  "hai trụ và trụ còn lại 70 phần trăm thì chưa đạt",
  evalNearComposite(
    new Set([PILLAR_CODES[0], PILLAR_CODES[1]]),
    new Map([[PILLAR_CODES[2], 70]]),
    { pillars: [...PILLAR_CODES], earnedPillars: 2, remainingPercent: 80 }
  ).earned,
  false
);
check(
  "đã đủ cả ba trụ thì mốc gần đích không còn ý nghĩa",
  evalNearComposite(new Set(PILLAR_CODES), new Map(), {
    pillars: [...PILLAR_CODES],
    earnedPillars: 2,
    remainingPercent: 80,
  }).earned,
  false
);

/* ---------------------------------------------------------------- */
console.log("\nCHUỖI SA SÚT rồi PHỤC HỒI (T9)");
const lows = [
  a({ id: "l1", exerciseId: "A", band: 2.5, isFullTest: true, submittedAt: D(1) }),
  a({ id: "l2", exerciseId: "B", band: 2.0, isFullTest: true, submittedAt: D(3) }),
  a({ id: "l3", exerciseId: "C", band: 2.5, isFullTest: true, submittedAt: D(5) }),
];
const lowCfg = { phase: "LOW" as const, fullTests: 3, belowBand: 3.0, windowDays: 30 };
check("ba Full Test dưới 3.0 trong 30 ngày thì ghi nhận", evalRecoveryChain(lows, lowCfg).earned, true);
check(
  "ba lượt nhưng CÙNG một đề thì không tính",
  evalRecoveryChain(
    [
      a({ id: "l1", exerciseId: "A", band: 2.5, isFullTest: true, attemptNumber: 1 }),
      a({ id: "l2", exerciseId: "A", band: 2.0, isFullTest: true, attemptNumber: 2 }),
      a({ id: "l3", exerciseId: "A", band: 2.5, isFullTest: true, attemptNumber: 3 }),
    ],
    lowCfg
  ).earned,
  false
);
const riseCfg = {
  phase: "RISE" as const,
  fullTests: 2,
  minBand: 7.0,
  noBandBelow: 6.0,
  windowDays: 60,
};
check(
  "hai Full Test từ 7.0 SAU giai đoạn sa sút thì phục hồi",
  evalRecoveryChain(
    [
      ...lows,
      a({ id: "r1", exerciseId: "D", band: 7.5, isFullTest: true, submittedAt: D(10) }),
      a({ id: "r2", exerciseId: "E", band: 7.0, isFullTest: true, submittedAt: D(12) }),
    ],
    riseCfg
  ).earned,
  true
);
check(
  "bài giỏi TRƯỚC giai đoạn sa sút không được tính là phục hồi",
  evalRecoveryChain(
    [a({ id: "truoc", exerciseId: "Z", band: 8.0, isFullTest: true, submittedAt: D(-5) }), ...lows],
    riseCfg
  ).earned,
  false
);
check(
  "chưa từng sa sút thì không có gì để phục hồi",
  evalRecoveryChain([a({ id: "x", band: 8, isFullTest: true })], riseCfg).earned,
  false
);
check(
  "hai lượt phục hồi trên CÙNG một đề thì không tính",
  evalRecoveryChain(
    [
      ...lows,
      a({ id: "r1", exerciseId: "D", band: 7.5, isFullTest: true, attemptNumber: 1, submittedAt: D(10) }),
      a({ id: "r2", exerciseId: "D", band: 8.0, isFullTest: true, attemptNumber: 2, submittedAt: D(12) }),
    ],
    riseCfg
  ).earned,
  false
);

/* ---------------------------------------------------------------- */
console.log("\nBỘ ĐỀ ĐÓNG BĂNG (T3, T4)");
const item = (id: string, bands: Array<[number, number]>, feynman = false) => ({
  exerciseId: id,
  feynmanCompleted: feynman,
  attempts: bands.map(([band, day], i) =>
    a({ id: `${id}-${i}`, exerciseId: id, band, attemptNumber: i + 1, submittedAt: D(day) })
  ),
});
const repeatCfg = {
  minCollectionItems: 8,
  attemptsPerExercise: 2,
  minimumGapHours: 48,
  maxBandDrop: 0.5,
};
check(
  "làm lại cách 48 giờ, không tụt quá 0.5 band thì đạt",
  evalCollectionAttemptCount(
    Array.from({ length: 8 }, (_, i) => item(`e${i}`, [[7, 0], [6.5, 3]])),
    repeatCfg
  ).earned,
  true
);
check(
  "hai lượt cách nhau hai giờ thì KHÔNG đạt (T4)",
  evalCollectionAttemptCount(
    Array.from({ length: 8 }, (_, i) => ({
      exerciseId: `e${i}`,
      feynmanCompleted: false,
      attempts: [
        a({ id: `${i}a`, exerciseId: `e${i}`, band: 7, attemptNumber: 1, submittedAt: D(0) }),
        a({
          id: `${i}b`,
          exerciseId: `e${i}`,
          band: 7,
          attemptNumber: 2,
          submittedAt: new Date(D(0).getTime() + 2 * 3600_000),
        }),
      ],
    })),
    repeatCfg
  ).earned,
  false
);
check(
  "làm lại mà tụt hơn 0.5 band thì chưa đạt",
  evalCollectionAttemptCount(
    Array.from({ length: 8 }, (_, i) => item(`e${i}`, [[7, 0], [6.0, 3]])),
    repeatCfg
  ).earned,
  false
);
check(
  "bộ đề chưa đủ tám bài thì mốc chưa mở, không báo lỗi (T3)",
  evalCollectionAttemptCount([item("e1", [[7, 0], [7, 3]])], repeatCfg).earned,
  false
);
check(
  "mọi bài đạt 8.0 ngay lần đầu thì đạt",
  evalCollectionMinFirstBand(
    Array.from({ length: 8 }, (_, i) => item(`e${i}`, [[8.0, 0]])),
    { minCollectionItems: 8, minBandEach: 8.0 },
    { activeDays: 0 }
  ).earned,
  true
);
check(
  "một bài 7.5 ở LẦN ĐẦU thì chưa đạt dù lần sau 9.0 (T5)",
  evalCollectionMinFirstBand(
    [
      item("e0", [[7.5, 0], [9, 3]]),
      ...Array.from({ length: 7 }, (_, i) => item(`e${i + 1}`, [[8.5, 0]])),
    ],
    { minCollectionItems: 8, minBandEach: 8.0 },
    { activeDays: 0 }
  ).earned,
  false
);
check(
  "danh hiệu huyền thoại còn đòi hỏi chữa bài trọn vẹn",
  evalCollectionMinFirstBand(
    Array.from({ length: 8 }, (_, i) => item(`e${i}`, [[8.5, 0]], false)),
    { minCollectionItems: 8, minBandEach: 8.5, requireFeynmanComplete: true },
    { activeDays: 30 }
  ).earned,
  false
);
check(
  "chữa bài trọn vẹn mọi đề trong bộ thì đạt",
  evalCollectionFeynmanComplete(
    Array.from({ length: 8 }, (_, i) => item(`e${i}`, [[7, 0]], true)),
    { minCollectionItems: 8 }
  ).earned,
  true
);
check(
  "còn một bài chưa chữa xong thì chưa đạt",
  evalCollectionFeynmanComplete(
    [item("e0", [[7, 0]], false), ...Array.from({ length: 7 }, (_, i) => item(`e${i + 1}`, [[7, 0]], true))],
    { minCollectionItems: 8 }
  ).earned,
  false
);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
