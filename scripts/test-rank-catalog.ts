/**
 * Kiểm thử catalog cấp bậc, thí luyện, Lục tướng và seed.
 * Chạy: node --experimental-strip-types scripts/test-rank-catalog.ts
 *
 * Phủ những bất biến ở Mục 13.1 của đặc tả mà một catalog tĩnh có thể tự
 * kiểm được — tính toàn vẹn của dữ liệu và tính idempotent của seed. Phần
 * gate/success evaluator sẽ có bộ kiểm thử riêng khi engine được viết.
 */
import {
  RANK_SEEDS,
  TRIAL_SEEDS,
  CARDINAL_TITLES,
  GRACE_TOKEN,
  MAX_RANK_LEVEL,
  rankByLevel,
  trialByCode,
  trialFromLevel,
} from "../src/lib/ranks/catalog.ts";
import {
  STORY_GENERALS,
  GENERAL_ORDER,
  featuredGeneralForSeason,
} from "../src/lib/story/generals.ts";
import { seedRankCatalog, backfillUserRanks } from "../src/lib/ranks/seeds.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

console.log("\n— Chín cấp bậc —");

check("có đúng 9 cấp bậc", RANK_SEEDS.length, 9);
check(
  "cấp bậc đánh số liên tục từ 1 tới 9",
  RANK_SEEDS.map((r) => r.level),
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
);
check(
  "mã cấp bậc không trùng nhau",
  new Set(RANK_SEEDS.map((r) => r.code)).size,
  9,
);
check(
  "slug cấp bậc không trùng nhau",
  new Set(RANK_SEEDS.map((r) => r.slug)).size,
  9,
);
check("cấp cao nhất là 9", MAX_RANK_LEVEL, 9);
check("tra cứu theo cấp trả về đúng tên", rankByLevel(1)?.name, "Bạch thân");
check("cấp không tồn tại trả về undefined", rankByLevel(10), undefined);

// Thời đại phải đi theo đúng khối cấp bậc, không nhảy cóc qua lại.
check(
  "ba thời đại chia đúng khối 1-3, 4-6, 7-9",
  RANK_SEEDS.map((r) => r.era),
  [
    "LOAN_THE",
    "LOAN_THE",
    "LOAN_THE",
    "QUAN_HUNG",
    "QUAN_HUNG",
    "QUAN_HUNG",
    "TAM_PHAN",
    "TAM_PHAN",
    "TAM_PHAN",
  ],
);

console.log("\n— Tám thí luyện —");

check("có đúng 8 thí luyện", TRIAL_SEEDS.length, 8);
check(
  "mã thí luyện không trùng nhau",
  new Set(TRIAL_SEEDS.map((t) => t.code)).size,
  8,
);

/*
 * Chuỗi thăng cấp phải liền mạch: cửa thứ n đi từ cấp n tới cấp n+1. Một lỗ
 * hổng ở đây nghĩa là có cấp bậc không có đường nào đi ra — người học sẽ kẹt
 * vĩnh viễn mà giao diện vẫn hiển thị bình thường.
 */
check(
  "mỗi cửa đi từ cấp n tới cấp n+1, phủ kín 1 tới 9",
  TRIAL_SEEDS.map((t) => `${t.fromLevel}->${t.toLevel}`),
  ["1->2", "2->3", "3->4", "4->5", "5->6", "6->7", "7->8", "8->9"],
);
check(
  "mọi cấp trừ cấp cuối đều có đúng một cửa đi ra",
  [1, 2, 3, 4, 5, 6, 7, 8].map((level) => trialFromLevel(level) !== undefined),
  [true, true, true, true, true, true, true, true],
);
check("cấp 9 không còn cửa nào để đi tiếp", trialFromLevel(9), undefined);

check(
  "mọi thí luyện đều quy chiếu về một trong sáu nhân vật",
  TRIAL_SEEDS.every((t) => t.featuredGeneralCode in STORY_GENERALS),
  true,
);
check(
  "Lữ Bố chỉ giữ cửa cuối cùng",
  TRIAL_SEEDS.filter((t) => t.featuredGeneralCode === "LU_BO").map((t) => t.code),
  ["TRIAL_08_HO_LAO"],
);

/*
 * Không cửa ải nào được nhắc tới Feynman trong cấu hình vượt cửa. Đây là
 * hàng rào chống trả tiền để mạnh hơn: mọi điều kiện phục bàn phải nói bằng
 * "qualifiedReviews" hoặc "deepReviews" — những khái niệm mà TrialReflection
 * miễn phí thỏa mãn được — chứ không được khóa cứng vào sản phẩm trả phí.
 */
check(
  "không cửa ải nào bắt buộc mua Feynman",
  TRIAL_SEEDS.every(
    (t) => !JSON.stringify(t.successConfig).toLowerCase().includes("feynman"),
  ),
  true,
);
check(
  "mọi cửa ải đều cho làm lại",
  TRIAL_SEEDS.every((t) => t.retryUnlimited),
  true,
);
check(
  "mọi cửa ải đều giải thích được nó rèn hành vi học nào",
  TRIAL_SEEDS.every((t) => t.rationale.length > 40 && t.skill.length > 0),
  true,
);
check(
  "tra cứu theo mã trả về đúng cửa",
  trialByCode("TRIAL_05_TRUONG_BAN")?.fromLevel,
  5,
);

console.log("\n— Hoa Dung đạo —");

check("token chỉ áp dụng cho cửa Quá ngũ quan", GRACE_TOKEN.appliesToTrialCode, "TRIAL_04_NGU_QUAN");
check("mỗi người giữ tối đa một token", GRACE_TOKEN.maxAvailable, 1);
check("thời gian chờ cấp lại là 30 ngày", GRACE_TOKEN.cooldownDays, 30);
check(
  "cửa Quá ngũ quan khai báo đúng token này",
  (TRIAL_SEEDS.find((t) => t.code === "TRIAL_04_NGU_QUAN")?.successConfig as {
    graceTokenCode?: string;
  }).graceTokenCode,
  GRACE_TOKEN.code,
);

console.log("\n— Bậc 8 và bốn hiệu —");

check("có đúng bốn hiệu", CARDINAL_TITLES.length, 4);
check(
  "bốn hiệu không tạo quyền lợi khác nhau",
  CARDINAL_TITLES.every((t) => Object.keys(t).sort().join(",") === "code,name"),
  true,
);

console.log("\n— Lục tướng —");

check("có đúng sáu nhân vật", GENERAL_ORDER.length, 6);
check(
  "không có nhân vật thứ bảy trong catalog",
  Object.keys(STORY_GENERALS).length,
  6,
);
check(
  "mỗi nhân vật giữ đúng một màu accent riêng",
  new Set(Object.values(STORY_GENERALS).map((g) => g.accent)).size,
  6,
);
check(
  "mỗi nhân vật đều kể cả năng lực lẫn điểm yếu",
  Object.values(STORY_GENERALS).every(
    (g) => g.strength.length > 10 && g.weakness.length > 10,
  ),
  true,
);
check(
  "vòng xoay mùa thi lặp đúng sau sáu kỳ",
  [0, 1, 5, 6, 7].map((i) => featuredGeneralForSeason(i).code),
  ["TRUONG_PHI", "QUAN_VU", "LU_BO", "TRUONG_PHI", "QUAN_VU"],
);
check(
  "kỳ có chỉ số âm vẫn rơi vào đúng vòng",
  featuredGeneralForSeason(-1).code,
  "LU_BO",
);

console.log("\n— Seed idempotent —");

/*
 * Bản giả lập ghi lại mọi lệnh upsert. Điều cần chứng minh là chạy seed hai
 * lần cho ra đúng cùng tập bản ghi — không nhân đôi, không đổi khóa — vì
 * initDatabase chạy lại mỗi lần máy chủ khởi động.
 */
function fakeSeedDb() {
  const ranks = new Map<string, unknown>();
  const trials = new Map<string, unknown>();
  return {
    ranks,
    trials,
    rankDefinition: {
      async upsert({ where, update }: { where: { code: string }; update: Record<string, unknown> }) {
        ranks.set(where.code, update);
      },
    },
    trialDefinition: {
      async upsert({ where, update }: { where: { code: string }; update: Record<string, unknown> }) {
        trials.set(where.code, update);
      },
    },
  };
}

const seedDb = fakeSeedDb();
const first = await seedRankCatalog(seedDb);
check("lần seed đầu ghi 9 cấp bậc", first.ranks, 9);
check("lần seed đầu ghi 8 thí luyện", first.trials, 8);
check("database giả có 9 cấp bậc", seedDb.ranks.size, 9);

await seedRankCatalog(seedDb);
check("seed lần hai không nhân đôi cấp bậc", seedDb.ranks.size, 9);
check("seed lần hai không nhân đôi thí luyện", seedDb.trials.size, 8);

// Cấu hình luật phải là JSON hợp lệ, nếu không engine sẽ vỡ lúc chạy thật.
check(
  "cấu hình gate và success đều tuần tự hóa được",
  TRIAL_SEEDS.every((t) => {
    try {
      JSON.parse(JSON.stringify(t.gateConfig));
      JSON.parse(JSON.stringify(t.successConfig));
      return true;
    } catch {
      return false;
    }
  }),
  true,
);

console.log("\n— Backfill cấp bậc —");

function fakeBackfillDb(studentIds: string[]) {
  const rows = new Map<string, Record<string, unknown>>();
  return {
    rows,
    user: {
      async findMany() {
        return studentIds.map((id) => ({ id }));
      },
    },
    userRank: {
      async createMany({
        data,
        skipDuplicates,
      }: {
        data: Array<Record<string, unknown>>;
        skipDuplicates: boolean;
      }) {
        let count = 0;
        for (const row of data) {
          const key = String(row.userId);
          if (skipDuplicates && rows.has(key)) continue;
          rows.set(key, row);
          count++;
        }
        return { count };
      },
    },
  };
}

const backfillDb = fakeBackfillDb(["u1", "u2", "u3"]);
check("backfill tạo hồ sơ cho cả ba học viên", await backfillUserRanks(backfillDb), 3);
check("chạy lại backfill không tạo thêm bản ghi nào", await backfillUserRanks(backfillDb), 0);
check(
  "mọi người bắt đầu ở cấp 1, không suy ra từ lịch sử",
  [...backfillDb.rows.values()].every(
    (r) => r.currentLevel === 1 && r.currentRankCode === "RANK_01_BACH_THAN",
  ),
  true,
);
check("không có học viên nào thì backfill trả về 0", await backfillUserRanks(fakeBackfillDb([])), 0);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
