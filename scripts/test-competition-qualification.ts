/**
 * Kiểm thử tuyển chọn Nguyệt → Dương → Thiên.
 * Chạy: node --experimental-strip-types scripts/test-competition-qualification.ts
 *
 * Phủ các bất biến ở Mục 13.1 và 9.3.2 của đặc tả. Sai ở tầng này nghĩa là
 * mời nhầm người vào một kỳ thi có tiền thưởng, nên mọi quy tắc đều có kiểm
 * thử canh chứ không dựa vào việc đọc lại mã nguồn cho kỹ.
 */
import {
  TIER_POLICIES,
  seasonKey,
  sourceBelongsToSeason,
} from "../src/lib/competition/tiers.ts";
import {
  buildQualificationOffers,
  canBuildOffers,
  isEligible,
  type SourceCompetition,
  type SourceEntry,
} from "../src/lib/competition/qualification.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const QUARTERLY = TIER_POLICIES.QUARTERLY;
const ANNUAL = TIER_POLICIES.ANNUAL;

function entry(over: Partial<SourceEntry> & { userId: string; rank: number }): SourceEntry {
  return {
    entryId: `e-${over.userId}-${over.rank}`,
    lowestBand: 8.0,
    completedAll: true,
    integrityClear: true,
    hasOpenAppeal: false,
    ...over,
  };
}

function source(
  id: string,
  orderIndex: number,
  entries: SourceEntry[],
  finalized = true,
): SourceCompetition {
  return { competitionId: id, seasonKey: `2026-0${orderIndex + 7}`, orderIndex, finalized, entries };
}

console.log("\n— Khóa mùa giải —");

{
  const d = new Date("2026-08-05T00:00:00Z");
  check("khóa tháng", seasonKey("MONTHLY", d), "2026-08");
  check("khóa quý", seasonKey("QUARTERLY", d), "2026-Q3");
  check("khóa năm", seasonKey("ANNUAL", d), "2026");
}

{
  check("tháng 8 thuộc quý 3", sourceBelongsToSeason("QUARTERLY", "2026-Q3", "2026-08"), true);
  check("tháng 10 KHÔNG thuộc quý 3", sourceBelongsToSeason("QUARTERLY", "2026-Q3", "2026-10"), false);
  check("quý 3 năm 2026 thuộc năm 2026", sourceBelongsToSeason("ANNUAL", "2026", "2026-Q3"), true);
  check("quý 3 năm 2025 KHÔNG thuộc năm 2026", sourceBelongsToSeason("ANNUAL", "2026", "2025-Q3"), false);
}

console.log("\n— Điều kiện dự thi —");

{
  check("band 7.5 đủ cho Dương Thí", isEligible(entry({ userId: "u", rank: 1, lowestBand: 7.5 }), QUARTERLY).ok, true);
  check("band 7.0 KHÔNG đủ cho Dương Thí", isEligible(entry({ userId: "u", rank: 1, lowestBand: 7.0 }), QUARTERLY).ok, false);
  check("band 7.5 KHÔNG đủ cho Thiên Thí", isEligible(entry({ userId: "u", rank: 1, lowestBand: 7.5 }), ANNUAL).ok, false);
  check("chưa làm đủ ba đề thì loại", isEligible(entry({ userId: "u", rank: 1, completedAll: false }), QUARTERLY).ok, false);
  check("đang rà soát liêm chính thì loại", isEligible(entry({ userId: "u", rank: 1, integrityClear: false }), QUARTERLY).ok, false);
  check("còn khiếu nại mở thì loại", isEligible(entry({ userId: "u", rank: 1, hasOpenAppeal: true }), QUARTERLY).ok, false);
}

console.log("\n— Điều kiện sinh vé —");

{
  const two = [source("a", 0, []), source("b", 1, [])];
  check("thiếu kỳ nguồn thì không sinh vé", canBuildOffers(two, QUARTERLY).ok, false);
}

{
  const three = [source("a", 0, []), source("b", 1, []), source("c", 2, [], false)];
  check("còn kỳ nguồn chưa chốt thì không sinh vé", canBuildOffers(three, QUARTERLY).ok, false);
}

{
  const three = [source("a", 0, []), source("b", 1, []), source("c", 2, [])];
  check("đủ ba kỳ đã chốt thì sinh vé được", canBuildOffers(three, QUARTERLY).ok, true);
  check("Nguyệt Thí không sinh vé tuyển chọn", canBuildOffers([], TIER_POLICIES.MONTHLY).ok, false);
}

console.log("\n— Chia ghế cơ bản —");

{
  const sources = [0, 1, 2].map((i) =>
    source(
      `m${i}`,
      i,
      [1, 2, 3, 4, 5, 6].map((rank) => entry({ userId: `u${i}-${rank}`, rank })),
    ),
  );
  const result = buildQualificationOffers(sources, QUARTERLY);
  check("ba kỳ nguồn × top 5 = 15 vé", result.offers.length, 15);
  check("không còn ghế trống", result.unfilledSeats, 0);
  check("không ai lấy quá top 5 của một kỳ", result.offers.filter((o) => o.sourceCompetitionId === "m0").length, 5);
}

console.log("\n— Một người một ghế —");

{
  // u-sao lọt top ở CẢ ba kỳ, hạng tốt nhất là 1 ở kỳ giữa.
  const sources = [
    source("m0", 0, [entry({ userId: "u-sao", rank: 3 }), ...[1, 2, 4, 5, 6].map((r) => entry({ userId: `a${r}`, rank: r }))]),
    source("m1", 1, [entry({ userId: "u-sao", rank: 1 }), ...[2, 3, 4, 5, 6].map((r) => entry({ userId: `b${r}`, rank: r }))]),
    source("m2", 2, [entry({ userId: "u-sao", rank: 5 }), ...[1, 2, 3, 4, 6].map((r) => entry({ userId: `c${r}`, rank: r }))]),
  ];
  const result = buildQualificationOffers(sources, QUARTERLY);
  const mine = result.offers.filter((o) => o.userId === "u-sao");
  check("người lọt top ở ba kỳ chỉ nhận MỘT vé", mine.length, 1);
  check("giữ suất ở kỳ xếp hạng tốt nhất", mine[0].sourceRank, 1);
  check("tổng số vé vẫn không vượt trần", result.offers.length <= QUARTERLY.maxSeats, true);
}

console.log("\n— Ghế trùng nhường xuống đúng kỳ nguồn —");

{
  const sources = [
    source("m0", 0, [1, 2, 3, 4, 5, 6].map((r) => entry({ userId: `x${r}`, rank: r }))),
    // x1 lọt top ở cả m1, nhưng đã có ghế từ m0 với hạng tốt hơn.
    source("m1", 1, [entry({ userId: "x1", rank: 4 }), ...[1, 2, 3, 5, 6].map((r) => entry({ userId: `y${r}`, rank: r }))]),
    source("m2", 2, [1, 2, 3, 4, 5, 6].map((r) => entry({ userId: `z${r}`, rank: r }))),
  ];
  const result = buildQualificationOffers(sources, QUARTERLY);
  const fromM1 = result.offers.filter((o) => o.sourceCompetitionId === "m1").map((o) => o.userId);
  check("ghế trùng ở m1 nhường cho người kế tiếp CỦA m1", fromM1.includes("y5"), true);
  check("người trùng không xuất hiện hai lần", result.offers.filter((o) => o.userId === "x1").length, 1);
}

console.log("\n— Không hạ ngưỡng để lấp ghế —");

{
  // Cả ba kỳ chỉ có hai người đạt band; số ghế thực tế phải THẤP hơn trần.
  const sources = [0, 1, 2].map((i) =>
    source(`m${i}`, i, [
      entry({ userId: `ok${i}a`, rank: 1, lowestBand: 8.0 }),
      entry({ userId: `ok${i}b`, rank: 2, lowestBand: 7.5 }),
      entry({ userId: `no${i}a`, rank: 3, lowestBand: 7.0 }),
      entry({ userId: `no${i}b`, rank: 4, lowestBand: 6.5 }),
      entry({ userId: `no${i}c`, rank: 5, lowestBand: 6.0 }),
    ]),
  );
  const result = buildQualificationOffers(sources, QUARTERLY);
  check("chỉ 6 người đạt ngưỡng nên chỉ 6 vé", result.offers.length, 6);
  check("ghế trống được báo rõ chứ không lấp bừa", result.unfilledSeats, 9);
  check("không ai dưới ngưỡng lọt vào", result.offers.every((o) => !o.userId.startsWith("no")), true);
  check("có ghi lý do loại cho trang quản trị", result.rejected.length, 9);
}

console.log("\n— Thiên Thí —");

{
  const sources = [0, 1, 2, 3].map((i) =>
    source(`q${i}`, i, [1, 2, 3, 4].map((rank) => entry({ userId: `t${i}-${rank}`, rank, lowestBand: 8.5 }))),
  );
  const result = buildQualificationOffers(sources, ANNUAL);
  check("bốn kỳ nguồn × top 3 = 12 vé", result.offers.length, 12);
  check("đúng bằng trần ghế Thiên Thí", result.offers.length, ANNUAL.maxSeats);
}

{
  // Ngưỡng Thiên Thí là 8.0, người 7.5 phải bị loại dù đứng nhất.
  const sources = [0, 1, 2, 3].map((i) =>
    source(`q${i}`, i, [entry({ userId: `low${i}`, rank: 1, lowestBand: 7.5 })]),
  );
  const result = buildQualificationOffers(sources, ANNUAL);
  check("band 7.5 không vào được Thiên Thí dù đứng nhất", result.offers.length, 0);
}

console.log("\n— Kỳ nguồn chưa chốt —");

{
  const sources = [
    source("m0", 0, [entry({ userId: "a", rank: 1 })]),
    source("m1", 1, [entry({ userId: "b", rank: 1 })], false),
  ];
  const result = buildQualificationOffers(sources, QUARTERLY);
  check("kỳ chưa chốt không sinh vé nào", result.offers.map((o) => o.userId), ["a"]);
}

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ TUYỂN CHỌN ĐỀU ĐẠT\n"
    : `\n❌ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
