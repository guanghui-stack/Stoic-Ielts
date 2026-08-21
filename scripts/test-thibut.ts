/**
 * Kiểm thử luật Thí Bút.
 * Chạy: node --experimental-strip-types scripts/test-thibut.ts
 *
 * Bài quan trọng nhất trong file này không phải bài chấm điểm, mà là bài
 * khẳng định `publicItem()` KHÔNG mang đáp án theo. Một lượt Thí Bút lấy Quân
 * Công thật của học viên; nếu đáp án rò xuống máy khách thì cả cơ chế "phải
 * đoạt lấy" thành trò hề, và không có thông báo lỗi nào để ai kịp nhận ra.
 */
import {
  BASE_COST,
  ITEMS_PER_ATTEMPT,
  MIN_COST,
  PASS_THRESHOLD,
  RETRY_COOLDOWN_MINUTES,
  THI_BUT_RULE_VERSION,
  THI_BUT_TYPES,
  TIME_LIMIT_SECONDS,
  costOfAttempt,
  gradeAttempt,
  poolHealth,
  publicItem,
  retryGate,
  selectItems,
  type ItemPoolEntry,
  type StoredItem,
  type ThiButType,
} from "../src/lib/thibut/thibut.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

function item(id: string, over: Partial<StoredItem> = {}): StoredItem {
  return {
    id,
    type: "PARAPHRASE",
    difficulty: "MEDIUM",
    prompt: `Câu ${id}`,
    options: ["A", "B", "C", "D"],
    answerIndex: 1,
    explanation: `Giải thích ${id}`,
    ...over,
  };
}

console.log("\n— Đáp án KHÔNG BAO GIỜ rời máy chủ —");

{
  const stored = item("i1", { answerIndex: 2, explanation: "vì B là paraphrase" });
  const pub = publicItem(stored);
  const keys = Object.keys(pub).sort();

  check("bản công khai không có answerIndex", "answerIndex" in pub, false);
  check("bản công khai không có explanation", "explanation" in pub, false);
  check(
    "bản công khai chỉ có đúng năm trường đã duyệt",
    keys,
    ["id", "options", "prompt", "type", "typeLabel"],
  );
  // Chốt chặn cuối: soi cả chuỗi JSON, phòng trường hợp đáp án lọt vào một
  // trường lồng nhau nào đó mà phép kiểm `in` không thấy.
  check(
    "chuỗi JSON gửi đi không chứa lời giải",
    JSON.stringify(pub).includes("paraphrase"),
    false,
  );
  check("nhưng vẫn có đủ phương án để người ta chọn", pub.options.length, 4);
}

console.log("\n— Số câu và ngưỡng qua: tính ra, không đoán —");

check("bốn câu mỗi lượt", ITEMS_PER_ATTEMPT, 4);
check("cần đúng ba", PASS_THRESHOLD, 3);
check("ba phút", TIME_LIMIT_SECONDS, 180);
check(
  "ngưỡng phải nhỏ hơn tổng, nếu bằng thì sai một câu là trượt và người vững chỉ qua 52%",
  PASS_THRESHOLD < ITEMS_PER_ATTEMPT,
  true,
);
check(
  "ngưỡng phải trên một nửa, nếu không thì đoán bừa qua quá dễ",
  PASS_THRESHOLD > ITEMS_PER_ATTEMPT / 2,
  true,
);

console.log("\n— Chấm bài —");

const four = [item("a"), item("b"), item("c"), item("d")];

{
  const r = gradeAttempt(four, { a: 1, b: 1, c: 1, d: 1 });
  check("đúng cả bốn thì qua", [r.passed, r.correctCount], [true, 4]);
}
{
  const r = gradeAttempt(four, { a: 1, b: 1, c: 1, d: 0 });
  check("đúng ba thì qua", [r.passed, r.correctCount], [true, 3]);
}
{
  const r = gradeAttempt(four, { a: 1, b: 1, c: 0, d: 0 });
  check("đúng hai thì trượt", [r.passed, r.correctCount], [false, 2]);
}
{
  // Bỏ trống phải tính là SAI, không được loại khỏi mẫu số.
  const r = gradeAttempt(four, { a: 1 });
  check("bỏ trống ba câu, đúng một câu thì trượt", [r.passed, r.correctCount], [false, 1]);
  check("tổng vẫn là bốn chứ không co lại còn một", r.total, 4);
  check("câu bỏ trống ghi chosenIndex là null", r.items[1].chosenIndex, null);
}
{
  const r = gradeAttempt(four, { a: 1, b: 0, c: 0, d: 0 });
  check("kết quả chấm có kèm lời giải cho TỪNG câu", r.items.every((g) => g.explanation.length > 0), true);
  check("và chỉ rõ đáp án đúng của từng câu", r.items.every((g) => g.answerIndex === 1), true);
}

console.log("\n— Giá và thử lại: trượt thành buổi học, không thành xu mất trắng —");

check("lượt đầu 12", costOfAttempt(0), BASE_COST);
check("lượt hai rẻ hơn", costOfAttempt(1) < costOfAttempt(0), true);
check("chuỗi giá", [0, 1, 2, 3, 4].map(costOfAttempt), [12, 7, 4, 4, 4]);
check("không bao giờ xuống dưới sàn", costOfAttempt(50), MIN_COST);
check(
  "sàn phải dương: giá 0 thì cố tình trượt vài lần là đường rẻ nhất",
  MIN_COST > 0,
  true,
);

const NOW = new Date("2026-08-20T10:00:00Z");
{
  const g = retryGate({ now: NOW, lastFailedAt: null, previousAttempts: 0 });
  check("chưa trượt lần nào thì không phải chờ", g, { canRetry: true, cost: 12 });
}
{
  const justFailed = new Date(NOW.getTime() - 5 * 60 * 1000);
  const g = retryGate({ now: NOW, lastFailedAt: justFailed, previousAttempts: 1 });
  check("vừa trượt 5 phút trước thì phải chờ", g.canRetry, false);
  if (!g.canRetry) {
    check("còn đúng 25 phút", g.secondsLeft, 25 * 60);
    check("nhưng vẫn cho biết trước lượt tới tốn bao nhiêu", g.cost, 7);
  }
}
{
  const longAgo = new Date(NOW.getTime() - (RETRY_COOLDOWN_MINUTES + 1) * 60 * 1000);
  const g = retryGate({ now: NOW, lastFailedAt: longAgo, previousAttempts: 1 });
  check("hết thời gian chờ thì vào được", g, { canRetry: true, cost: 7 });
}
{
  const exactly = new Date(NOW.getTime() - RETRY_COOLDOWN_MINUTES * 60 * 1000);
  const g = retryGate({ now: NOW, lastFailedAt: exactly, previousAttempts: 1 });
  check("đúng mốc là vào được, không phải chờ thêm giây nào", g.canRetry, true);
}

console.log("\n— Chọn câu: tránh câu đã gặp, trải đều dạng —");

function pool(n: number): ItemPoolEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    type: THI_BUT_TYPES[i % THI_BUT_TYPES.length] as ThiButType,
    difficulty: "MEDIUM" as const,
  }));
}
const firstPick = (_max: number) => 0; // tất định, để kiểm thử lặp lại được

{
  const picked = selectItems(pool(40), new Set(), firstPick);
  check("lấy đúng bốn câu", picked.length, ITEMS_PER_ATTEMPT);
  check(
    "bốn câu thuộc bốn dạng khác nhau",
    new Set(picked.map((p) => p.type)).size,
    4,
  );
}
{
  const seen = new Set(["p0", "p1", "p2", "p3"]);
  const picked = selectItems(pool(40), seen, firstPick);
  check("không lấy lại câu đã gặp", picked.some((p) => seen.has(p.id)), false);
}
{
  // Kho cạn: thà lặp còn hơn trả về ít hơn bốn câu, vì ngưỡng qua dựa vào
  // đúng con số bốn.
  const small = pool(4);
  const picked = selectItems(small, new Set(small.map((s) => s.id)), firstPick);
  check("hết câu mới thì vẫn trả đủ bốn câu chứ không trả thiếu", picked.length, 4);
}
{
  // Kho chỉ có một dạng: vẫn phải đủ bốn câu.
  const oneType: ItemPoolEntry[] = Array.from({ length: 10 }, (_, i) => ({
    id: `q${i}`,
    type: "COLLOCATION",
    difficulty: "EASY",
  }));
  const picked = selectItems(oneType, new Set(), firstPick);
  check("kho một dạng vẫn ra đủ bốn câu", picked.length, 4);
  check("và không lấy trùng một câu hai lần", new Set(picked.map((p) => p.id)).size, 4);
}

console.log("\n— Sức khoẻ kho câu —");

check("kho rỗng thì chưa chạy được", poolHealth(0).ready, false);
check("đủ bốn câu là chạy được", poolHealth(4).ready, true);
check("nhưng 4 trên 400 thì mới 1 phần trăm", poolHealth(4).percent, 1);
check("đủ chỉ tiêu là 100 phần trăm", poolHealth(400).percent, 100);
check("vượt chỉ tiêu không quá 100", poolHealth(900).percent, 100);

check("có bản luật để tra ngược", typeof THI_BUT_RULE_VERSION === "string" && THI_BUT_RULE_VERSION.length > 0, true);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ THÍ BÚT ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
