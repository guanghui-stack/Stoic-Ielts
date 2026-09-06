/**
 * Kiểm thử xếp hạng và điều kiện dự Nguyệt Thí.
 * Chạy: node --experimental-strip-types scripts/test-competition.ts
 *
 * Đây là phần quyết định ai nhận giải của kỳ. Phủ T12, T13 của đặc tả.
 */
import {
  checkEligibility,
  explainOrder,
  rankEntries,
  selectPrizeWinners,
  type RankedInput,
} from "../src/lib/competition/ranking.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const T = (min: number) => new Date(Date.UTC(2026, 7, 1, 0, min));
const e = (o: Partial<RankedInput> & { entryId: string }): RankedInput => ({
  bands: [8.0, 8.0, 8.0],
  rawTotal: 100,
  elapsedSeconds: 3000,
  completedAt: T(0),
  ...o,
});

const ids = (rows: Array<{ entryId: string }>) => rows.map((r) => r.entryId);

/* ---------------------------------------------------------------- */
console.log("\nLỌC THÍ SINH LÊN BẢNG VÀNG");
check(
  "đủ ba đề từ 7.5 thì được xét",
  ids(rankEntries([e({ entryId: "a", bands: [7.5, 7.5, 7.5] })])),
  ["a"]
);
check(
  "một đề dưới 7.5 thì KHÔNG lên bảng dù hai đề kia rất cao",
  ids(rankEntries([e({ entryId: "a", bands: [9.0, 9.0, 7.0] })])),
  []
);
check(
  "mới làm hai đề thì chưa được xét",
  ids(rankEntries([e({ entryId: "a", bands: [9.0, 9.0] })])),
  []
);
check(
  "thí sinh bị loại thì không xét dù điểm tuyệt đối",
  ids(rankEntries([e({ entryId: "a", bands: [9, 9, 9], disqualified: true })])),
  []
);

/* ---------------------------------------------------------------- */
console.log("\nNĂM TẦNG PHÂN ĐỊNH (T13)");
check(
  "tầng 1 — band trung bình cao hơn thắng",
  ids(
    rankEntries([
      e({ entryId: "thap", bands: [8.0, 8.0, 8.0] }),
      e({ entryId: "cao", bands: [9.0, 8.0, 8.0] }),
    ])
  ),
  ["cao", "thap"]
);
check(
  "tầng 2 — cùng trung bình thì người ĐỀU TAY hơn thắng",
  ids(
    rankEntries([
      e({ entryId: "lech", bands: [9.0, 8.5, 7.5] }),
      e({ entryId: "deu", bands: [8.5, 8.5, 8.0] }),
    ])
  ),
  ["deu", "lech"]
);
check(
  "tầng 3 — cùng band thì nhiều câu đúng hơn thắng",
  ids(
    rankEntries([
      e({ entryId: "it", rawTotal: 100 }),
      e({ entryId: "nhieu", rawTotal: 110 }),
    ])
  ),
  ["nhieu", "it"]
);
check(
  "tầng 4 — cùng mọi thứ thì nhanh hơn thắng",
  ids(
    rankEntries([
      e({ entryId: "cham", elapsedSeconds: 4000 }),
      e({ entryId: "nhanh", elapsedSeconds: 2000 }),
    ])
  ),
  ["nhanh", "cham"]
);
check(
  "tầng 5 — cùng mọi thứ thì nộp sớm hơn thắng",
  ids(
    rankEntries([
      e({ entryId: "muon", completedAt: T(60) }),
      e({ entryId: "som", completedAt: T(10) }),
    ])
  ),
  ["som", "muon"]
);
check(
  "hoàn toàn giống nhau vẫn cho thứ tự ỔN ĐỊNH, không đổi giữa hai lần chạy",
  ids(rankEntries([e({ entryId: "b" }), e({ entryId: "a" })])),
  ids(rankEntries([e({ entryId: "a" }), e({ entryId: "b" })]))
);
check(
  "thứ tự bản ghi đầu vào KHÔNG ảnh hưởng kết quả",
  ids(
    rankEntries([
      e({ entryId: "x", bands: [8, 8, 8] }),
      e({ entryId: "y", bands: [9, 9, 9] }),
    ])
  ),
  ids(
    rankEntries([
      e({ entryId: "y", bands: [9, 9, 9] }),
      e({ entryId: "x", bands: [8, 8, 8] }),
    ])
  )
);
check(
  "giải thích được vì sao xếp trên",
  explainOrder(
    { ...e({ entryId: "a" }), averageBand: 8.5, lowestBand: 8 },
    { ...e({ entryId: "b" }), averageBand: 8.0, lowestBand: 8 }
  ),
  "band trung bình cao hơn"
);

/* ---------------------------------------------------------------- */
console.log("\nTRAO GIẢI — KHÔNG BAO GIỜ HẠ CHUẨN (T12)");
const full = selectPrizeWinners(
  rankEntries([
    e({ entryId: "nhat", bands: [9.0, 8.5, 8.5] }),
    e({ entryId: "nhi", bands: [8.5, 8.0, 8.0] }),
    e({ entryId: "ba", bands: [8.0, 7.5, 7.5] }),
  ])
);
check("đủ ba giải khi có đủ người đạt chuẩn", full.map((w) => w.entry.entryId), [
  "nhat",
  "nhi",
  "ba",
]);
check("giải Nhất đúng 199.000đ", full[0].amount, 199_000);
check("giải Nhì đúng 99.000đ", full[1].amount, 99_000);
check("giải Ba đúng 49.000đ", full[2].amount, 49_000);
check("giải Nhất kèm 150 xu", full[0].coins, 150);
check("giải Nhì kèm 100 xu", full[1].coins, 100);
check("giải Ba kèm 50 xu", full[2].coins, 50);
check("huy hiệu Nhất là vương miện", full[0].badge, "MONTHLY_CROWN");

const noFirst = selectPrizeWinners(
  rankEntries([
    e({ entryId: "gioi", bands: [8.2, 8.1, 8.0] }),
    e({ entryId: "kha", bands: [7.9, 7.6, 7.5] }),
  ])
);
check(
  "KHÔNG ai đạt 8.5 cả ba đề → giải Nhất ĐỂ TRỐNG",
  noFirst.map((w) => w.rank),
  [2, 3]
);
check(
  "người giỏi nhất nhận giải Nhì chứ không được đôn lên Nhất",
  noFirst.find((w) => w.rank === 2)?.entry.entryId,
  "gioi"
);
check(
  "không ai đủ chuẩn nào → không trao giải nào",
  selectPrizeWinners(rankEntries([e({ entryId: "a", bands: [7.0, 7.0, 7.0] })])).length,
  0
);
check(
  "một người chỉ nhận MỘT giải",
  selectPrizeWinners(rankEntries([e({ entryId: "solo", bands: [9, 9, 9] })])).map(
    (w) => w.rank
  ),
  [1]
);

/* ---------------------------------------------------------------- */
console.log("\nĐIỀU KIỆN DỰ THI — danh hiệu là vé vào cửa, không phải vé miễn kiểm tra");
const okFacts = {
  hasEntryTitle: true,
  activeDaysLast30: 12,
  feynmanCompletedLast30: 5,
  recentFirstAttemptBands: [7.5, 7.0, 7.5, 8.0, 7.0],
  openHighSeverityFlags: 0,
};
check("đủ mọi điều kiện thì được đăng ký", checkEligibility(okFacts).eligible, true);
check(
  "chưa có danh hiệu vé vào cửa → từ chối",
  checkEligibility({ ...okFacts, hasEntryTitle: false }).eligible,
  false
);
check(
  "có danh hiệu nhưng bỏ học 30 ngày qua → vẫn từ chối",
  checkEligibility({ ...okFacts, activeDaysLast30: 2 }).eligible,
  false
);
check(
  "thiếu phiên chữa bài → từ chối",
  checkEligibility({ ...okFacts, feynmanCompletedLast30: 1 }).eligible,
  false
);
check(
  "phong độ gần đây dưới 7.0 → từ chối",
  checkEligibility({
    ...okFacts,
    recentFirstAttemptBands: [6.0, 6.0, 6.5, 6.0, 6.5],
  }).eligible,
  false
);
check(
  "chưa đủ 5 bài gần nhất → từ chối",
  checkEligibility({ ...okFacts, recentFirstAttemptBands: [8, 8, 8] }).eligible,
  false
);
check(
  "đang có cờ nghi vấn liêm chính → từ chối",
  checkEligibility({ ...okFacts, openHighSeverityFlags: 1 }).eligible,
  false
);
check(
  "luôn nói rõ còn thiếu gì, không chỉ từ chối suông",
  checkEligibility({ ...okFacts, activeDaysLast30: 3 }).checks.find(
    (c) => !c.ok
  )?.detail,
  "3/10 ngày"
);
check("liệt kê đủ năm điều kiện", checkEligibility(okFacts).checks.length, 5);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
