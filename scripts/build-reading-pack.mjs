/**
 * Dựng file bộ đề, GIỮ NGUYÊN tiêu đề của những đề đã lên máy chủ.
 *
 * init-db đối chiếu theo tiêu đề, nên đánh số lại một đề đã seed sẽ tạo ra
 * bản thứ hai chứ không cập nhật bản cũ. Vì vậy: đề nào đã có thì giữ đúng
 * tiêu đề cũ, đề mới mới được lấy số tiếp theo.
 *
 *   node build-pack.mjs <valid.json> <pack-cu.json|-> <pack-moi.json>
 */
import fs from "node:fs";

const SMALL = ["of", "the", "a", "an", "and", "in", "on", "for", "to", "at", "from", "its", "we", "us"];
const titleCase = (s) =>
  s.trim().split(/\s+/)
    .map((w, i) => {
      const lo = w.toLowerCase();
      if (i > 0 && SMALL.includes(lo)) return lo;
      if (/[a-z]/.test(w) && w !== w.toUpperCase()) return w; // đã có chữ thường: giữ nguyên
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());

const PREFIX = /^Reading Practice (\d+)\s*—\s*/;

const valid = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const oldPack = process.argv[3] === "-" ? [] : JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

/** hậu tố tiêu đề (phần sau "Reading Practice NN — ") → tiêu đề đầy đủ đã dùng */
const taken = new Map();
let maxNum = 7; // bộ đề sẵn có trong repo dùng tới 07
for (const ex of oldPack) {
  const m = ex.title.match(PREFIX);
  if (!m) continue;
  maxNum = Math.max(maxNum, Number(m[1]));
  taken.set(ex.title.replace(PREFIX, "").trim().toLowerCase(), ex.title);
}

let reused = 0;
let added = 0;
const pack = valid.map((ex) => {
  const suffix = titleCase(ex.title);
  const key = suffix.toLowerCase();
  const existing = taken.get(key);
  if (existing) {
    reused++;
    return { ...ex, title: existing };
  }
  added++;
  maxNum++;
  const title = `Reading Practice ${String(maxNum).padStart(2, "0")} — ${suffix}`;
  taken.set(key, title);
  return { ...ex, title };
});

// Đề cũ mà lần chuyển này KHÔNG sinh ra nữa nghĩa là nó đã bị bộ kiểm loại —
// tức bản đang nằm trên máy chủ có lỗi. Không giữ nó lại trong file: nếu quản
// trị viên xoá bản hỏng đi mà file vẫn còn, lần deploy sau sẽ dựng lại y hệt.
const producedTitles = new Set(pack.map((e) => e.title));
const orphans = oldPack.filter((e) => !producedTitles.has(e.title));
const final = [...pack].sort((a, b) => {
  const na = Number(a.title.match(PREFIX)?.[1] ?? 0);
  const nb = Number(b.title.match(PREFIX)?.[1] ?? 0);
  return na - nb;
});

fs.writeFileSync(process.argv[4], JSON.stringify(final, null, 1));

const q = final.reduce((n, e) => n + e.content.parts[0].questionGroups.reduce((m, g) => m + g.questions.length, 0), 0);
const lr = final.reduce((n, e) => n + e.content.parts[0].questionGroups.flatMap((g) => g.questions).filter((x) => x.learning).length, 0);
console.log(`Tổng bộ đề: ${final.length} đề · ${q} câu · ${lr} câu có lời giải`);
console.log(`  giữ nguyên tiêu đề cũ: ${reused}`);
console.log(`  đề mới thêm         : ${added}`);
console.log(`  đề hỏng CẦN XOÁ trên máy chủ: ${orphans.length}`);
if (orphans.length) orphans.forEach((e) => console.log(`      ${e.title}`));
console.log(`  độ khó: ${JSON.stringify(final.reduce((a, e) => ((a[e.difficultyTier] = (a[e.difficultyTier] || 0) + 1), a), {}))}`);
