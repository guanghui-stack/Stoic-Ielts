/**
 * Kiểm thử phần diễn giải điều kiện danh hiệu (Điện Danh Vọng).
 * Chạy: node --experimental-strip-types scripts/test-explain.ts
 *
 * Rủi ro lớn nhất của file explain.ts là nói SAI so với engine: học viên bỏ ra
 * hàng tuần theo một tiêu chí không tồn tại. Nên phép thử quan trọng nhất ở đây
 * là quét TOÀN BỘ catalog thật và bắt buộc mọi con số trong ruleConfig đều phải
 * xuất hiện trong lời giải thích — không được im lặng bỏ sót điều kiện nào.
 */
import { TITLE_SEEDS, CATEGORY_LABELS } from "../src/lib/achievements/catalog.ts";
import {
  explainTitleRule,
  groupByCategory,
  byDifficulty,
  rarityRank,
  humanMinutes,
  CATEGORY_BLURBS,
  CATEGORY_ORDER,
  CATEGORY_ANCHORS,
  categoryAnchor,
} from "../src/lib/achievements/explain.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const explainSeed = (seed: (typeof TITLE_SEEDS)[number]) =>
  explainTitleRule({
    ruleKey: seed.ruleKey,
    ruleConfig: seed.ruleConfig,
    repeatPolicy: seed.repeatPolicy,
    rewardCode: seed.rewardCode,
    titleNameOf: (code) => TITLE_SEEDS.find((t) => t.code === code)?.name,
  });

/* ---------------------------------------------------------------- */
console.log("\nPHỦ TOÀN BỘ CATALOG — không danh hiệu nào bị bỏ trống");

check(
  "mọi danh hiệu đều có câu tóm tắt",
  TITLE_SEEDS.every((s) => explainSeed(s).summary.length > 10),
  true
);
check(
  "mọi danh hiệu đều liệt kê được ít nhất một điều kiện",
  TITLE_SEEDS.every((s) => explainSeed(s).steps.length > 0),
  true
);
check(
  "KHÔNG danh hiệu nào rơi vào nhánh mặc định 'chưa được mô tả'",
  TITLE_SEEDS.filter((s) => explainSeed(s).summary.includes("chưa được mô tả")).map(
    (s) => s.code
  ),
  []
);

/* ---------------------------------------------------------------- */
console.log("\nTRUNG THỰC — mọi ngưỡng trong ruleConfig phải hiện ra cho học viên");

// Các khóa không phải ngưỡng số mà học viên cần thấy: chúng là cấu hình nội bộ
const NON_NUMERIC_KEYS = new Set(["collectionKind", "phase", "pillars"]);

const missing: string[] = [];
for (const seed of TITLE_SEEDS) {
  const guide = explainSeed(seed);
  const text = [guide.summary, ...guide.steps, ...guide.notes].join(" ");
  for (const [key, value] of Object.entries(seed.ruleConfig)) {
    if (NON_NUMERIC_KEYS.has(key)) continue;
    if (typeof value === "boolean") continue; // cờ bật/tắt được diễn giải bằng lời
    if (typeof value !== "number") continue;

    // Số nhỏ hơn 1 có hai nghĩa tùy ngữ cảnh: tỷ lệ 0.7 hiện thành "70%", còn
    // chênh lệch band 0.5 vẫn hiện là "0.5 band". Chấp nhận cả hai cách.
    const candidates = [String(value), value.toFixed(1), String(Math.floor(value))];
    if (value > 0 && value < 1) candidates.push(String(Math.round(value * 100)));

    // Số phút được đổi sang giờ nên chấp nhận cả dạng đã quy đổi
    if (key === "minMinutes" && value >= 60) {
      candidates.push(humanMinutes(value));
    }

    if (!candidates.some((c) => text.includes(c))) {
      missing.push(`${seed.code}.${key}=${value}`);
    }
  }
}
check("không ngưỡng nào bị giấu khỏi học viên", missing, []);

/* ---------------------------------------------------------------- */
console.log("\nNỘI DUNG — nói đúng thứ engine thật sự xét");

const fireFromStone = explainSeed(TITLE_SEEDS.find((s) => s.code === "PRACTICE_01_FIRE_FROM_STONE")!);
check(
  "danh hiệu theo lần đầu phải nói rõ 'LẦN LÀM ĐẦU TIÊN'",
  fireFromStone.steps.some((s) => s.includes("ĐẦU TIÊN")),
  true
);
check(
  "và cảnh báo làm lại không cộng thêm",
  fireFromStone.notes.some((n) => n.includes("Làm lại")),
  true
);

const hardRoad = explainSeed(TITLE_SEEDS.find((s) => s.code === "PRACTICE_03_HARD_ROAD")!);
check(
  "danh hiệu cuốn chiếu phải cảnh báo bài cũ rơi khỏi cách tính",
  hardRoad.notes.some((n) => n.includes("rơi ra khỏi cách tính")),
  true
);
check(
  "và nhắc chỉ đề hệ thống ghép mới tính",
  hardRoad.notes.some((n) => n.includes("hệ thống tự ghép")),
  true
);

const earlyYouth = explainSeed(TITLE_SEEDS.find((s) => s.code === "PRACTICE_04_EARLY_YOUTH")!);
check(
  "danh hiệu theo bộ đề phải nói được đạt lại ở bộ mới",
  earlyYouth.notes.some((n) => n.includes("bộ đề mới")),
  true
);
check(
  "và nêu phần thưởng đi kèm",
  earlyYouth.notes.some((n) => n.includes("Feynman chuyên sâu")),
  true
);

const threePillars = explainSeed(TITLE_SEEDS.find((s) => s.code === "COMPOSITE_02_THREE_PILLARS")!);
check(
  "danh hiệu ba trụ hiện TÊN danh hiệu trụ, không hiện mã",
  threePillars.steps.some((s) => s.includes("Nhân học thủy tri đạo")),
  true
);
check(
  "và không để lọt mã kỹ thuật ra giao diện",
  threePillars.steps.some((s) => s.includes("PRACTICE_02")),
  false
);

const lowWarning = explainSeed(TITLE_SEEDS.find((s) => s.code === "TRANSFORM_01_LOW_WARNING")!);
check(
  "danh hiệu cảnh tỉnh phải khẳng định không bao giờ công khai",
  lowWarning.notes.some((n) => n.includes("KHÔNG BAO GIỜ hiển thị công khai")),
  true
);

/* ---------------------------------------------------------------- */
console.log("\nĐỔI PHÚT SANG GIỜ — không bắt học viên tự nhẩm");
check("180 phút", humanMinutes(180), "3 giờ");
check("1200 phút", humanMinutes(1200), "20 giờ");
check("2700 phút", humanMinutes(2700), "45 giờ");
check("90 phút", humanMinutes(90), "1 giờ 30 phút");
check("45 phút giữ nguyên", humanMinutes(45), "45 phút");

/* ---------------------------------------------------------------- */
console.log("\nGOM NHÓM & SẮP XẾP — dễ trước, khó sau");

const groups = groupByCategory(
  TITLE_SEEDS.map((s) => ({
    category: s.category,
    rarity: s.rarity,
    sortOrder: s.sortOrder,
    code: s.code,
  }))
);

check("gom đúng 5 nhóm", groups.length, 5);
check(
  "thứ tự nhóm theo hành trình học viên",
  groups.map((g) => g.category),
  [...CATEGORY_ORDER]
);
check("mọi nhóm đều có nhãn tiếng Việt", groups.every((g) => Boolean(CATEGORY_LABELS[g.category as keyof typeof CATEGORY_LABELS])), true);
check("mọi nhóm đều có câu dẫn", groups.every((g) => Boolean(CATEGORY_BLURBS[g.category])), true);
check(
  "không danh hiệu nào bị rơi mất khi gom nhóm",
  groups.reduce((sum, g) => sum + g.items.length, 0),
  TITLE_SEEDS.length
);
check(
  "trong mỗi nhóm, độ khó KHÔNG BAO GIỜ giảm dần",
  groups.every((g) =>
    g.items.every(
      (item, i) => i === 0 || rarityRank(g.items[i - 1].rarity) <= rarityRank(item.rarity)
    )
  ),
  true
);
check(
  "nhóm Giải đề đi từ Phổ thông lên Huyền thoại",
  groups.find((g) => g.category === "PRACTICE")!.items.map((i) => i.rarity),
  ["COMMON", "UNCOMMON", "RARE", "RARE", "EPIC", "LEGENDARY"]
);
check(
  "cùng độ hiếm thì giữ thứ tự catalog",
  byDifficulty(
    { rarity: "RARE", sortOrder: 30 },
    { rarity: "RARE", sortOrder: 40 }
  ) < 0,
  true
);
check(
  "nhóm lạ chưa khai báo vẫn hiện ra, xếp cuối",
  groupByCategory([
    { category: "TUONG_LAI", rarity: "COMMON", sortOrder: 1 },
    { category: "PRACTICE", rarity: "COMMON", sortOrder: 2 },
  ]).map((g) => g.category),
  ["PRACTICE", "TUONG_LAI"]
);

/* ---------------------------------------------------------------- */
console.log("\nMỤC LỤC — mã neo phải đúng và không trùng");

const allCategories = [...new Set(TITLE_SEEDS.map((s) => s.category))];
check(
  "mọi nhóm trong catalog đều có mã neo khai báo sẵn",
  allCategories.filter((c) => !CATEGORY_ANCHORS[c]),
  []
);
check(
  "không hai nhóm nào trùng mã neo",
  new Set(allCategories.map(categoryAnchor)).size,
  allCategories.length
);
check(
  "mã neo chỉ gồm chữ thường, số và gạch nối (hợp lệ trong URL)",
  allCategories.every((c) => /^[a-z0-9-]+$/.test(categoryAnchor(c))),
  true
);
check(
  "nhóm lạ vẫn sinh được mã neo hợp lệ",
  categoryAnchor("MOT_NHOM_MOI"),
  "nhom-mot-nhom-moi"
);

/* ---------------------------------------------------------------- */
console.log("\nBỀN VỚI DỮ LIỆU HỎNG — trang công khai không được sập");
const broken = explainTitleRule({ ruleKey: "KHONG_TON_TAI", ruleConfig: {} });
check("quy tắc lạ vẫn trả về câu đọc được", broken.summary.length > 0, true);
check("và hướng dẫn học viên liên hệ", broken.notes.length > 0, true);
const emptyConfig = explainTitleRule({ ruleKey: "ACTIVE_TIME_WINDOW", ruleConfig: {} });
check("thiếu cấu hình cũng không ném lỗi", emptyConfig.steps.length > 0, true);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
