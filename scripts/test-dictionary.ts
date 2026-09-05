/**
 * Kiểm thử luật tra từ điển. Chạy: npm run test:dictionary
 *
 * Trọng tâm là hai chỗ dễ mất tiền nhất:
 *   - gõ sai chính tả KHÔNG được rơi xuống nhà trả phí
 *   - hạn mức ngày phải chặn thật, kể cả khi đếm vừa chạm trần
 */
import assert from "node:assert/strict";
import {
  ALL_PROVIDERS,
  DEFINITION_PROVIDERS,
  SYNONYM_PROVIDERS,
  LOOKUP_BUDGET_MS,
  MAX_TERM_LENGTH,
  PROVIDER_ATTRIBUTION,
  PROVIDER_TIMEOUT_MS,
  classifyHttpStatus,
  mayCachePermanently,
  normalizeTerm,
  quotaKey,
  shouldFallThrough,
  usableProviders,
  withinDailyCap,
  type Provider,
  type ProviderId,
} from "../src/lib/dictionary/lookup-rules.ts";

let passed = 0;
function it(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log("\n— Chuẩn hoá từ khoá —");

it("bỏ dấu câu hai đầu, giữ nguyên chữ", () => {
  assert.equal(normalizeTerm("  “Resilience,”  "), "resilience");
  assert.equal(normalizeTerm("mitigate."), "mitigate");
});

it("giữ gạch nối và nháy đơn giữa từ", () => {
  assert.equal(normalizeTerm("well-known"), "well-known");
  assert.equal(normalizeTerm("don't"), "don't");
});

it("hoa thường quy về một khoá cache duy nhất", () => {
  assert.equal(normalizeTerm("RESILIENCE"), normalizeTerm("resilience"));
});

it("từ chối chuỗi rỗng, quá dài, hoặc không có chữ cái", () => {
  assert.equal(normalizeTerm(""), null);
  assert.equal(normalizeTerm("   "), null);
  assert.equal(normalizeTerm(null), null);
  assert.equal(normalizeTerm("123 456"), null);
  assert.equal(normalizeTerm("a".repeat(MAX_TERM_LENGTH + 1)), null);
});

it("bôi nhầm cả câu thì không đem đi tra", () => {
  assert.equal(normalizeTerm("the mental ability to recover quickly"), null);
  // nhưng cụm ngắn (idiom) vẫn cho qua
  assert.equal(normalizeTerm("in spite of"), "in spite of");
});

console.log("\n— Phân loại kết quả: chỗ dễ đốt quota nhất —");

it("404 là câu trả lời hợp lệ, KHÔNG rơi nhà kế tiếp", () => {
  assert.equal(classifyHttpStatus(404), "NOT_FOUND");
  assert.equal(shouldFallThrough("NOT_FOUND"), false);
});

it("5xx, 429 và 522 đều coi là nhà hỏng, được rơi nhà", () => {
  for (const status of [500, 502, 503, 522, 429]) {
    assert.equal(classifyHttpStatus(status), "PROVIDER_DOWN", `status ${status}`);
    assert.equal(shouldFallThrough(classifyHttpStatus(status)), true);
  }
});

it("2xx là tìm thấy, dừng chuỗi", () => {
  assert.equal(classifyHttpStatus(200), "FOUND");
  assert.equal(shouldFallThrough("FOUND"), false);
});

console.log("\n— Hạn mức ngày —");

const oxford = DEFINITION_PROVIDERS.find((p) => p.id === "OXFORD")!;
const stands4 = SYNONYM_PROVIDERS.find((p) => p.id === "STANDS4")!;

it("mọi nhà trả phí đều CÓ hạn mức cứng", () => {
  for (const p of ALL_PROVIDERS) {
    if (!p.needsApiKey) continue;
    assert.equal(typeof p.dailyCap, "number", `${p.id} thiếu hạn mức`);
    assert.ok(p.dailyCap! > 0, `${p.id} hạn mức không hợp lệ`);
  }
});

it("hạn mức Oxford thấp hơn trần 500 mà nhà công bố", () => {
  assert.ok(oxford.dailyCap! < 500, "phải chừa biên an toàn dưới 500");
});

it("hạn mức synonyms.com có đặt và đủ thấp", () => {
  assert.equal(typeof stands4.dailyCap, "number");
  assert.ok(stands4.dailyCap! <= 100);
});

it("chặn đúng ngay tại mốc chạm trần", () => {
  assert.equal(withinDailyCap(oxford, oxford.dailyCap! - 1), true);
  assert.equal(withinDailyCap(oxford, oxford.dailyCap!), false);
  assert.equal(withinDailyCap(oxford, oxford.dailyCap! + 5), false);
});

it("nhà không quota thì không bị chặn", () => {
  const wik = DEFINITION_PROVIDERS.find((p) => p.id === "WIKTIONARY")!;
  assert.equal(withinDailyCap(wik, 10_000), true);
});

it("khoá đếm tách theo ngày để tự reset", () => {
  const d1 = new Date("2026-09-05T23:59:00Z");
  const d2 = new Date("2026-09-06T00:01:00Z");
  assert.notEqual(quotaKey("OXFORD", d1), quotaKey("OXFORD", d2));
  assert.match(quotaKey("OXFORD", d1), /^DICT_QUOTA:OXFORD:2026-09-05$/);
});

console.log("\n— Chọn nhà gọi được —");

const hasAllKeys = () => true;
const hasNoKeys = () => false;

it("thiếu khoá API thì lặng lẽ bỏ nhà đó", () => {
  const list = usableProviders(DEFINITION_PROVIDERS, {}, hasNoKeys);
  assert.deepEqual(
    list.map((p) => p.id),
    ["WIKTIONARY", "DICTIONARYAPI"],
  );
});

it("hết quota thì nhà đó rời khỏi chuỗi", () => {
  const usage = { OXFORD: oxford.dailyCap! } as Record<string, number>;
  const list = usableProviders(DEFINITION_PROVIDERS, usage, hasAllKeys);
  assert.ok(!list.some((p) => p.id === "OXFORD"));
});

it("Wiktionary đứng đầu chuỗi, Oxford đứng cuối", () => {
  const ids = DEFINITION_PROVIDERS.map((p) => p.id);
  assert.equal(ids[0], "WIKTIONARY");
  assert.equal(ids[ids.length - 1], "OXFORD");
});

it("synonyms.com KHÔNG nằm trong chuỗi định nghĩa", () => {
  assert.ok(!DEFINITION_PROVIDERS.some((p) => p.id === "STANDS4"));
});

console.log("\n— Ngân sách thời gian —");

it("một nhà không được ăn hết ngân sách của cả lượt", () => {
  assert.ok(PROVIDER_TIMEOUT_MS * 2 <= LOOKUP_BUDGET_MS);
});

console.log("\n— Giấy phép —");

it("mọi nhà đều có dòng ghi công", () => {
  for (const p of ALL_PROVIDERS) {
    const text = PROVIDER_ATTRIBUTION[p.id as ProviderId];
    assert.ok(text && text.length > 3, `${p.id} thiếu ghi công`);
  }
});

it("chỉ nguồn CC BY-SA mới được lưu lâu dài", () => {
  assert.equal(mayCachePermanently("WIKTIONARY"), true);
  assert.equal(mayCachePermanently("DICTIONARYAPI"), true);
  assert.equal(mayCachePermanently("OXFORD"), false);
  assert.equal(mayCachePermanently("STANDS4"), false);
});

it("dòng ghi công của nguồn CC nêu đúng giấy phép", () => {
  const providers: Provider[] = DEFINITION_PROVIDERS.filter((p) =>
    mayCachePermanently(p.id),
  );
  for (const p of providers) {
    assert.match(PROVIDER_ATTRIBUTION[p.id], /CC BY-SA/);
  }
});

console.log(`\n✅ ${passed} kiểm thử luật tra từ điển đều đạt\n`);
