/**
 * Kiểm đề đã chuyển bằng ĐÚNG bộ luật của website (chép từ parseExerciseForm
 * trong src/lib/actions/admin.ts), cộng thêm vài phép thử riêng cho đáp án.
 * Đề nào không qua thì loại — không đẩy lên website.
 */
import fs from "node:fs";

const TYPES = ["TFNG", "MC", "MC_MULTI", "GAP", "MATCH_HEADINGS", "MATCH_INFO", "MATCH_FEATURES", "MATCH_ENDINGS"];
const WORD_LIMITS = ["ONE_WORD", "TWO_WORDS", "THREE_WORDS", "ONE_WORD_NUMBER", "TWO_WORDS_NUMBER", "THREE_WORDS_NUMBER"];
const MATCH_TYPES = ["MATCH_HEADINGS", "MATCH_INFO", "MATCH_FEATURES", "MATCH_ENDINGS"];
const ROMANS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];

const WL_RULES = {
  ONE_WORD: 1, TWO_WORDS: 2, THREE_WORDS: 3,
  ONE_WORD_NUMBER: 1, TWO_WORDS_NUMBER: 2, THREE_WORDS_NUMBER: 3,
};

function check(ex) {
  const errs = [];
  const parts = ex.content?.parts;
  if (!Array.isArray(parts) || !parts.length) return ["thiếu parts"];
  if (parts.length > 3) errs.push("quá 3 part");
  if (ex.title.length < 5) errs.push("tiêu đề dưới 5 ký tự");

  const seen = new Set();
  for (const part of parts) {
    if (!part.passage?.title || !Array.isArray(part.passage?.paragraphs)) errs.push("thiếu passage");
    const nPara = part.passage.paragraphs.length;
    if (!Array.isArray(part.questionGroups) || !part.questionGroups.length) errs.push("thiếu questionGroups");

    for (const g of part.questionGroups ?? []) {
      if (!TYPES.includes(g.type)) errs.push(`dạng lạ: ${g.type}`);
      if (!Array.isArray(g.questions) || !g.questions.length) errs.push(`${g.type}: nhóm rỗng`);
      if (g.type === "GAP" && g.wordLimit && !WORD_LIMITS.includes(g.wordLimit)) errs.push("wordLimit lạ");
      if (MATCH_TYPES.includes(g.type) && (!Array.isArray(g.options) || g.options.length < 2)) {
        errs.push(`${g.type}: thiếu options`);
      }
      for (const q of g.questions ?? []) {
        if (!q.id) errs.push("câu thiếu id");
        if (seen.has(q.id)) errs.push(`trùng id ${q.id}`);
        seen.add(q.id);

        if (g.type === "MATCH_HEADINGS") {
          if (!q.paragraph) errs.push(`${q.id}: MATCH_HEADINGS thiếu paragraph`);
          if (q.paragraph && q.paragraph.charCodeAt(0) - 65 >= nPara) {
            errs.push(`${q.id}: trỏ tới đoạn ${q.paragraph} nhưng bài chỉ có ${nPara} đoạn`);
          }
          if (!ROMANS.includes(q.answer)) errs.push(`${q.id}: đáp án "${q.answer}" không phải số La Mã`);
          else if (ROMANS.indexOf(q.answer) >= g.options.length) errs.push(`${q.id}: đáp án ngoài kho heading`);
        } else if (!q.prompt) {
          errs.push(`${q.id} (${g.type}): thiếu prompt`);
        }

        if (g.type === "MC_MULTI") {
          if (!Array.isArray(q.options) || q.options.length < 3) errs.push(`${q.id}: MC_MULTI dưới 3 lựa chọn`);
          if (!Array.isArray(q.answer) || q.answer.length < 2) errs.push(`${q.id}: MC_MULTI đáp án không phải mảng ≥2`);
        } else if (g.type === "MC") {
          if (!Array.isArray(q.options) || q.options.length < 2) errs.push(`${q.id}: MC dưới 2 lựa chọn`);
          if (!/^[A-J]$/.test(String(q.answer))) errs.push(`${q.id}: đáp án MC "${q.answer}" không phải chữ cái`);
          else if (q.answer.charCodeAt(0) - 65 >= q.options.length) errs.push(`${q.id}: đáp án MC ngoài số lựa chọn`);
        } else if (!q.answer) {
          errs.push(`${q.id}: thiếu answer`);
        }

        if (g.type === "TFNG") {
          if (!q.options?.includes(q.answer)) errs.push(`${q.id}: đáp án TFNG "${q.answer}" không nằm trong options`);
        }
        if (g.type === "GAP") {
          if (!String(q.prompt).includes("______")) errs.push(`${q.id}: GAP không có ô điền`);
          const max = WL_RULES[g.wordLimit] ?? 3;
          const words = String(q.answer).trim().split(/\s+/).length;
          if (words > max) errs.push(`${q.id}: đáp án "${q.answer}" dài ${words} từ, vượt giới hạn ${max}`);
        }
        if (["MATCH_INFO", "MATCH_FEATURES", "MATCH_ENDINGS"].includes(g.type)) {
          if (!/^[A-J]$/.test(String(q.answer))) errs.push(`${q.id}: đáp án "${q.answer}" không phải chữ cái`);
          else if (q.answer.charCodeAt(0) - 65 >= g.options.length) {
            errs.push(`${q.id}: đáp án ${q.answer} ngoài kho ${g.options.length} mục`);
          }
        }
        if (g.type === "MATCH_INFO" && /^[A-J]$/.test(String(q.answer))) {
          if (q.answer.charCodeAt(0) - 65 >= nPara) errs.push(`${q.id}: trỏ tới đoạn ${q.answer} nhưng bài chỉ có ${nPara} đoạn`);
        }
      }
    }
  }
  return errs;
}

const list = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const good = [];
const bad = [];
for (const ex of list) {
  const errs = check(ex);
  if (errs.length) bad.push({ title: ex.title, errs: [...new Set(errs)] });
  else good.push(ex);
}

console.log(`Qua kiểm: ${good.length}/${list.length} đề`);
console.log(`\n=== ${bad.length} đề KHÔNG qua ===`);
bad.forEach((b) => console.log(`  ${b.title}\n      ${b.errs.slice(0, 4).join("\n      ")}`));
fs.writeFileSync(process.argv[3], JSON.stringify(good, null, 1));
