/**
 * Kiểm thử luật vá đề Reading. Chạy: npm run test:reading-repair
 *
 * Trọng tâm: bản vá KHÔNG BAO GIỜ được đụng vào đề quản trị viên đã sửa tay.
 */
import assert from "node:assert/strict";
import {
  contentFingerprint,
  shouldOverwrite,
  type RepairEntry,
} from "../src/lib/reading/pack-repair-rules.ts";
import repairs from "../prisma/reading-pack-repairs.json" with { type: "json" };
import pack from "../prisma/reading-pack-actual-test.json" with { type: "json" };

let passed = 0;
function it(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

const BROKEN = JSON.stringify({ parts: [{ passage: { title: "x" } }] });
const entry: RepairEntry = { title: "Bài thử", brokenSha256: contentFingerprint(BROKEN) };

console.log("\n— Luật vá đề Reading —");

it("nội dung còn nguyên như bản hỏng thì được vá", () => {
  assert.equal(shouldOverwrite(BROKEN, entry), true);
});

it("quản trị viên sửa dù chỉ một ký tự thì KHÔNG vá", () => {
  assert.equal(shouldOverwrite(BROKEN + " ", entry), false);
});

it("nội dung rỗng hoặc thiếu thì không vá", () => {
  assert.equal(shouldOverwrite("", entry), false);
  assert.equal(shouldOverwrite(null, entry), false);
  assert.equal(shouldOverwrite(undefined, entry), false);
});

it("thiếu mã băm trong khai báo thì không vá", () => {
  assert.equal(shouldOverwrite(BROKEN, { title: "x", brokenSha256: "" }), false);
});

console.log("\n— Dữ liệu vá đi kèm —");

it("mọi mục cần vá đều có bản thay thế trong bộ đề", () => {
  const titles = new Set(pack.map((e) => e.title));
  for (const r of repairs.repair) {
    assert.ok(titles.has(r.title), `thiếu bản thay thế cho: ${r.title}`);
  }
});

it("mọi mục cần ẩn đều KHÔNG còn trong bộ đề", () => {
  const titles = new Set(pack.map((e) => e.title));
  for (const r of repairs.unpublish) {
    assert.ok(!titles.has(r.title), `đề cần ẩn lại vẫn nằm trong bộ: ${r.title}`);
  }
});

it("mã băm đều đúng định dạng sha256 và không trùng nhau", () => {
  const all = [...repairs.repair, ...repairs.unpublish];
  const seen = new Set<string>();
  for (const r of all) {
    assert.match(r.brokenSha256, /^[0-9a-f]{64}$/, `mã băm hỏng: ${r.title}`);
    assert.ok(!seen.has(r.title), `khai báo trùng tiêu đề: ${r.title}`);
    seen.add(r.title);
  }
});

it("bản vá thật sự khác bản hỏng", () => {
  const byTitle = new Map(pack.map((e) => [e.title, JSON.stringify(e.content)]));
  for (const r of repairs.repair) {
    const fixed = byTitle.get(r.title)!;
    assert.notEqual(
      contentFingerprint(fixed),
      r.brokenSha256,
      `bản "vá" trùng y bản hỏng: ${r.title}`,
    );
  }
});

console.log("\n— Mức truy cập —");

it("bộ đề mặc định là hàng trả phí, không phải miễn phí", () => {
  const restricted = pack.filter((e) => e.accessLevel === "RESTRICTED").length;
  const free = pack.filter((e) => e.accessLevel !== "RESTRICTED").length;
  assert.ok(
    restricted > free,
    `chỉ ${restricted}/${pack.length} đề bị khoá — kho Reading là hàng trả phí, ` +
      `mặc định PUBLIC từng khiến 60 đề lọt lưới thu phí`,
  );
});

it("số đề mẫu miễn phí nằm trong mức đã chốt", () => {
  const free = pack.filter((e) => e.accessLevel !== "RESTRICTED");
  assert.ok(free.length <= 5, `có ${free.length} đề miễn phí, chủ dự án chốt tối đa 5`);
  for (const e of free) {
    assert.equal(e.difficultyTier, "EASY", `đề mẫu phải ở mức Dễ: ${e.title}`);
  }
});

it("mọi đề đều khai mức truy cập hợp lệ", () => {
  for (const e of pack) {
    assert.ok(
      e.accessLevel === "PUBLIC" || e.accessLevel === "RESTRICTED",
      `mức truy cập lạ ở: ${e.title}`,
    );
  }
});

console.log(`\n✅ ${passed} kiểm thử luật vá đề Reading đều đạt\n`);
