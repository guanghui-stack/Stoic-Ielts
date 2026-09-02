/**
 * Chuyển file .md (đề Reading + đáp án + giải thích tiếng Việt) sang JSON đề
 * của website Wobridges.
 *
 * Nguyên tắc: mỗi file phải TỰ KIỂM CHỨNG được mới xuất ra. Cụ thể, số câu bóc
 * được phải khớp đúng dải câu ghi ở tiêu đề nhóm, và mọi câu phải có đáp án.
 * Không khớp thì loại cả file và ghi rõ lý do — đề Reading sai đáp án còn tai
 * hại hơn không có đề.
 *
 *   node convert.mjs <thư-mục-md> <thư-mục-ra>
 */
import fs from "node:fs";
import path from "node:path";

const stripEsc = (s) => s.split("\\").join("");
/**
 * Bỏ dấu nhấn markdown và các ký hiệu đầu dòng để so khớp, giữ nguyên chữ.
 * Đầu dòng có thể là gạch đầu dòng "-", chấm tròn, hoặc ô tích "☐" (do bản
 * gốc là câu trắc nghiệm trên máy) — tất cả đều phải bỏ, nếu không thì số câu
 * và nhãn A/B/C đứng ngay sau chúng sẽ không khớp được.
 */
const plain = (s) =>
  s.replace(/\*+/g, "")
    .replace(/^[\s\-•·☐□○▢]+/, "")
    .replace(/\s+/g, " ")
    .trim();

const ANSWER_MARKERS = [
  /PHẦN GIẢI CHI TIẾT/i, /ĐÁP ÁN\s*(&|VÀ)\s*GIẢI THÍCH/i,
  /Đáp án và giải thích/i, /Đáp án kèm phân tích/i, /Giải thích đáp án/i,
  /BẢNG ĐÁP ÁN/i, /ANSWER\s*KEY/i,
  /^#{1,4}\s*\**\s*(Đáp án|ĐÁP ÁN)\b/im,
  /^#{1,4}\s*\**\s*ANSWERS?\b/im,
  /^\s*\**\s*ANSWERS?\s*\**\s*$/im,
];

function splitSections(raw) {
  const text = stripEsc(raw);
  let cut = -1;
  for (const re of ANSWER_MARKERS) {
    const m = text.match(re);
    if (!m) continue;
    const i = text.indexOf(m[0]);
    if (i >= 0 && (cut < 0 || i < cut)) cut = i;
  }
  if (cut < 0) return null;
  return { body: text.slice(0, cut), answers: text.slice(cut) };
}

/**
 * Tiêu đề nhóm câu hỏi. Dùng [^\S\n] (khoảng trắng KHÔNG xuống dòng) chứ không
 * dùng \s: \s nuốt cả dấu xuống dòng, khiến phần khớp ăn luôn dòng hướng dẫn
 * ngay dưới tiêu đề — mà đó lại là dòng duy nhất cho biết nhóm thuộc dạng nào.
 */
const G_HEAD = /^#{1,4}[^\S\n]*\**[^\S\n]*Questions?[^\S\n]*(\d+)[^\S\n]*[–—-][^\S\n]*(\d+)[^\n]*$/gim;

function detectType(chunk) {
  const t = chunk.toLowerCase();
  if (/correct heading|list of headings/.test(t)) return "MATCH_HEADINGS";
  if (/which paragraph contains|which section contains/.test(t)) return "MATCH_INFO";
  if (/correct ending|complete each sentence with/.test(t)) return "MATCH_ENDINGS";
  if (/list of people|list of researchers|match each|following statements[\s\S]*list of|which person|classify the following|match the following/.test(t))
    return "MATCH_FEATURES";
  const ng = /not given/.test(t);
  if (ng && /\btrue\b/.test(t) && /\bfalse\b/.test(t)) return "TFNG";
  if (ng && /\byes\b/.test(t) && /\bno\b/.test(t)) return "TFNG";
  if (/choose (two|three|2|3)\b|which two|which three/.test(t)) return "MC_MULTI";
  if (/complete the (summary|notes|table|sentences|flow|diagram)|one word|no more than/.test(t)) return "GAP";
  if (/choose the correct letter|choose the correct answer|choose appropriate option/.test(t)) return "MC";
  return null;
}

/** Dòng thuộc phần hướng dẫn, không phải câu hỏi. */
const INSTRUCTION_LINE =
  /^(do the following|in boxes|write |choose |complete |look at |match |classify |reading passage|which paragraph|which section|using no more|answer the questions|true\b|false\b|not given|yes\b|no\b|nb\b|list of)/i;

const WORD_LIMITS = [
  [/no more than three words and\/?or a number/i, "THREE_WORDS_NUMBER"],
  [/no more than two words and\/?or a number/i, "TWO_WORDS_NUMBER"],
  [/one word and\/?or a number/i, "ONE_WORD_NUMBER"],
  [/no more than three words/i, "THREE_WORDS"],
  [/no more than two words/i, "TWO_WORDS"],
  [/one word only|one word\b/i, "ONE_WORD"],
];
const detectWordLimit = (t) => (WORD_LIMITS.find(([re]) => re.test(t)) ?? [, null])[1];

/** Nhãn lựa chọn trong kho đáp án: "**A** 1888", "A. 1888", "i. …" */
const OPTION_LINE = /^\**\s*([A-Ja-j]|[ivx]{1,4})\s*[.)]?\s*\**\s+(.+)$/;

/** Dòng lựa chọn của một câu MC: "A. …" / "**B)** …" */
const MC_CHOICE = /^([A-J])\s*[.)]\s*(.+)$/;
/** Ô trống GAP: "**7.** ____", "8. ________", "**9**……" */
const GAP_MARK = /(?:^|\s|\()(\d{1,2})\s*[.)]?\s*(_{2,}|…{1,}|\.{4,})/;

function parseGroup(chunk, from, to, paragraphs, answerMap) {
  const type = detectType(chunk);
  if (!type) return { error: `không đoán được dạng (Q${from}-${to})` };
  const want = to - from + 1;
  const lines = chunk.split("\n").map((l) => plain(l)).filter(Boolean);

  /* --- kho đáp án dùng chung: có thể nằm TRƯỚC hoặc SAU danh sách câu --- */
  const listIdx = lines.findIndex((l) => /^(list of|danh sách)/i.test(l));
  const options = [];
  if (listIdx >= 0) {
    for (let k = listIdx + 1; k < lines.length; k++) {
      const l = lines[k];
      // dừng khi gặp câu hỏi đánh số
      if (/^\d{1,2}\s*[.)]/.test(l)) break;
      const m = l.match(OPTION_LINE);
      if (m) options.push(m[2].trim());
      else if (options.length) break;
    }
  }

  const instrLines = lines.filter((l) => INSTRUCTION_LINE.test(l) && !/^\d/.test(l));
  const instruction = instrLines.slice(0, 4).join(" ") || `Questions ${from}–${to}`;

  /* --- GAP: mỗi ô trống là một câu, prompt là chính dòng chứa ô đó --- */
  if (type === "GAP") {
    const items = [];
    lines.forEach((line, k) => {
      // Hai cách viết đều gặp:
      //  (a) số dính liền ô trống  — "**8.** ________"
      //  (b) số đầu dòng, ô trống nằm giữa câu — "**8.** The King adopted ___ psychology."
      let m = line.match(GAP_MARK);
      let n = m ? Number(m[1]) : null;
      if (!m) {
        const lead = line.match(/^(\d{1,2})\s*[.)]\s+(.*)$/);
        if (!lead || !/(_{2,}|…{2,}|\.{4,})/.test(lead[2])) return;
        n = Number(lead[1]);
      }
      if (n < from || n > to || items.some((it) => it.n === n)) return;
      let text = m
        ? line.replace(new RegExp(`(^|\\s)${n}\\s*[.)]?\\s*(_{2,}|…+|\\.{4,})`), "$1 ______")
        : line.replace(/^\d{1,2}\s*[.)]\s+/, "").replace(/(_{2,}|…{2,}|\.{4,})/g, "______");
      text = text.replace(/^[-•]\s*/, "").trim();
      // Dòng chỉ có mỗi ô trống thì mượn dòng phía trên làm ngữ cảnh.
      if (text.replace(/_+/g, "").trim().length < 12) {
        const ctx = lines.slice(0, k).reverse().find((p) => p.length > 12 && !GAP_MARK.test(p) && !INSTRUCTION_LINE.test(p));
        if (ctx) text = `${ctx}: ${text}`;
      }
      items.push({ n, text });
    });
    if (items.length !== want) return { error: `Q${from}-${to} GAP: bóc được ${items.length}/${want} ô trống` };
    return { type, instruction, options: [], items, from, to };
  }

  /* --- các dạng còn lại: câu hỏi là dòng đánh số trong dải --- */
  const items = [];
  for (const line of lines) {
    const m = line.match(/^(\d{1,2})\s*[.)]?\s+(.*)$/);
    if (m) {
      const n = Number(m[1]);
      if (n >= from && n <= to && !items.some((it) => it.n === n)) {
        items.push({ n, text: m[2].trim(), choices: [] });
        continue;
      }
    }
    // lựa chọn A./B./C. gắn vào câu vừa gặp
    const c = line.match(MC_CHOICE);
    if (c && items.length && (type === "MC" || type === "MC_MULTI")) {
      items[items.length - 1].choices.push(`${c[1]}. ${c[2].trim()}`);
    }
  }

  if (items.length !== want) {
    // Nhiều đề không liệt kê câu cho Matching Headings: số câu ứng với đoạn
    // theo đúng thứ tự (câu đầu = đoạn A). Dựng lại từ dải câu.
    if (type === "MATCH_HEADINGS" && items.length === 0) {
      return {
        type, instruction, options,
        items: Array.from({ length: want }, (_, k) => ({
          n: from + k, text: `Paragraph ${String.fromCharCode(65 + k)}`, choices: [],
        })),
        from, to,
      };
    }
    // Có file chỉ ghi mệnh đề câu hỏi trong phần chữa ("Câu hỏi: …"), phần đề
    // chỉ còn dòng hướng dẫn. Dựng lại đề bài từ đó — vẫn là chữ của bản gốc.
    if (items.length === 0 && answerMap) {
      const recovered = [];
      for (let n = from; n <= to; n++) {
        const p = answerMap[n]?.prompt;
        if (!p) break;
        recovered.push({ n, text: p, choices: [] });
      }
      if (recovered.length === want) {
        return { type, instruction, options, items: recovered, from, to, recovered: true };
      }
    }
    // TFNG hay viết mệnh đề KHÔNG đánh số — lấy theo thứ tự xuất hiện.
    if (type === "TFNG") {
      const bare = lines.filter(
        (l) => !INSTRUCTION_LINE.test(l) && !/^\d/.test(l) && !/^(list of|danh sách)/i.test(l) && l.length > 20
      );
      if (bare.length === want) {
        return {
          type, instruction, options: [],
          items: bare.map((text, k) => ({ n: from + k, text, choices: [] })),
          from, to,
        };
      }
      return { error: `Q${from}-${to} TFNG: bóc được ${items.length || bare.length}/${want} câu` };
    }
    return { error: `Q${from}-${to} ${type}: bóc được ${items.length}/${want} câu` };
  }

  return { type, instruction, options, items, from, to };
}

/* ===== phần đáp án ===== */

const ANS_TOKEN = /^(TRUE|FALSE|NOT\s*GIVEN|YES|NO|[A-J]|[ivx]{1,4})\b/i;

/**
 * Cắt phần đáp án thành từng khối theo số câu, rồi lấy đáp án + lời giải.
 * Chấp nhận mọi kiểu đã gặp: "1. TRUE", "**1.** Answer: TRUE", "27 B:",
 * "**1. K (half-yawns)**", "Câu 1 …".
 */
function parseAnswers(section, lo, hi) {
  const lines = section.split("\n");
  const marks = [];
  lines.forEach((line, idx) => {
    const p = plain(line);
    let m = p.match(/^(?:Câu|Question)?\s*(\d{1,2})\s*[.):\s-]\s*(.*)$/);
    if (!m) return;
    const n = Number(m[1]);
    if (n < lo || n > hi) return;
    marks.push({ n, idx, tail: m[2].trim() });
  });

  const out = {};
  for (let k = 0; k < marks.length; k++) {
    const { n, idx, tail } = marks[k];
    const end = k + 1 < marks.length ? marks[k + 1].idx : lines.length;
    const block = lines.slice(idx, end).map(plain).filter(Boolean);
    if (out[n]) continue; // giữ lần xuất hiện đầu tiên

    // đáp án: ngay sau số, hoặc sau "Answer:" / "Đáp án:" ở bất kỳ dòng nào
    let ansText = tail.replace(/^(Answer|Đáp án)\s*:?\s*/i, "").trim();
    if (!ansText || !ANS_TOKEN.test(ansText)) {
      const alt = block.map((b) => b.match(/^(?:.*?)(?:Answer|Đáp án)\s*:\s*(.+)$/i)).find(Boolean);
      if (alt) ansText = alt[1].trim();
    }
    if (!ansText) continue;

    // cắt phần chú thích trong ngoặc và mọi thứ sau dấu chấm câu đầu tiên
    // Nhiều file viết "white: In Paragraph 1, the text states…" — vế sau dấu
    // hai chấm là lời giải, không phải đáp án. Cắt ngay tại đó.
    let answer = ansText.replace(/\s*\(.*$/, "").split(/\s{2,}|—|–\s|:\s/)[0].trim();
    answer = answer.replace(/[.:;,]+$/, "").trim();

    // Một số file KHÔNG chép mệnh đề câu hỏi ở phần đề, chỉ ghi lại trong phần
    // chữa dưới dạng "Câu hỏi: …". Nhặt luôn để dựng lại đề bài.
    const promptLine = block
      .map((b) => b.match(/^(?:Câu hỏi|Question)\s*:\s*(.+)$/i))
      .find(Boolean);
    const prompt = promptLine ? promptLine[1].trim() : null;

    const explanation = block.slice(1).join(" ").slice(0, 900);
    out[n] = { answer, explanation, prompt };
  }
  return out;
}

/* ===== chuẩn hóa đáp án theo dạng ===== */

function normalizeAnswer(type, rawAns) {
  const a = rawAns.trim();
  if (type === "TFNG") {
    const u = a.toUpperCase().replace(/\s+/g, " ");
    if (/^TRUE/.test(u)) return "TRUE";
    if (/^FALSE/.test(u)) return "FALSE";
    if (/^NOT ?GIVEN/.test(u)) return "NOT GIVEN";
    if (/^YES/.test(u)) return "YES";
    if (/^NO\b/.test(u)) return "NO";
    return null;
  }
  if (type === "MATCH_HEADINGS") {
    const m = a.toLowerCase().match(/^([ivx]{1,4})\b/);
    return m ? m[1] : null;
  }
  if (type === "MC" || type === "MATCH_INFO" || type === "MATCH_FEATURES" || type === "MATCH_ENDINGS") {
    const m = a.toUpperCase().match(/^([A-J])\b/);
    return m ? m[1] : null;
  }
  if (type === "MC_MULTI") {
    const ls = [...a.toUpperCase().matchAll(/\b([A-J])\b/g)].map((m) => m[1]);
    return ls.length >= 2 ? [...new Set(ls)] : null;
  }
  if (type === "GAP") {
    // "4 hundred, four hundred, 400" là ba cách viết của cùng một đáp án, không
    // phải một đáp án năm từ. Tách ra: cái đầu là đáp án, còn lại là biến thể.
    const variants = a.split(/\s*[,/]\s*|\s+hoặc\s+/).map((v) => v.trim()).filter(Boolean);
    if (!variants.length || variants[0].length > 60) return null;
    return variants.length > 1 ? { answer: variants[0], altAnswers: variants.slice(1) } : variants[0];
  }
  return null;
}

/* ===== dựng một đề ===== */

function convert(file, raw) {
  const sec = splitSections(raw);
  if (!sec) return { error: "không tìm thấy phần đáp án" };
  const { body, answers } = sec;

  const titleMatch = body.match(/^#\s*\**\s*(.+?)\s*\**\s*$/m);
  const title = titleMatch ? plain(titleMatch[1]) : path.basename(file, ".md").replace(/^\d+\.\s*/, "");

  const marks = [...body.matchAll(G_HEAD)];
  if (!marks.length) return { error: "không có nhóm câu hỏi" };

  // Passage = từ sau tiêu đề tới nhóm câu hỏi đầu tiên
  const passageRaw = body.slice(titleMatch ? titleMatch.index + titleMatch[0].length : 0, marks[0].index);
  const paragraphs = passageRaw.split(/\n\s*\n/).map((p) => plain(p)).filter((p) => p.length > 60);
  if (paragraphs.length < 4) return { error: `bài đọc chỉ tách được ${paragraphs.length} đoạn` };

  const lo = Math.min(...marks.map((m) => Number(m[1])));
  const hi = Math.max(...marks.map((m) => Number(m[2])));
  const answerMap = parseAnswers(answers, lo, hi);

  const groups = [];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index + marks[i][0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : body.length;
    const g = parseGroup(body.slice(start, end), Number(marks[i][1]), Number(marks[i][2]), paragraphs, answerMap);
    if (g.error) return { error: g.error };
    groups.push(g);
  }

  // Ghép đáp án + lời giải vào từng câu
  const questionGroups = [];
  let qid = 0;
  for (const g of groups) {
    const questions = [];
    for (const item of g.items) {
      qid++;
      const found = answerMap[item.n];
      if (!found) return { error: `câu ${item.n} không có đáp án trong phần chữa` };
      const answer = normalizeAnswer(g.type, found.answer);
      if (answer === null) {
        return { error: `câu ${item.n} (${g.type}): không đọc được đáp án "${found.answer}"` };
      }
      const q = { id: `q${qid}`, answer };
      if (answer && typeof answer === "object" && !Array.isArray(answer)) {
        q.answer = answer.answer;
        q.altAnswers = answer.altAnswers;
      }
      if (g.type === "MATCH_HEADINGS") {
        q.paragraph = String.fromCharCode(64 + (item.n - g.from + 1));
      } else {
        q.prompt = g.type === "GAP" ? item.text.replace(/_{2,}|\.{3,}|…+/g, "______") : item.text;
        if (g.type === "GAP" && !q.prompt.includes("______")) q.prompt += " ______";
      }
      if (g.type === "TFNG") {
        q.options = /YES/i.test(String(answer)) || /^NO$/i.test(String(answer))
          ? ["YES", "NO", "NOT GIVEN"] : ["TRUE", "FALSE", "NOT GIVEN"];
      }
      if ((g.type === "MC" || g.type === "MC_MULTI") && item.extra) {
        q.options = item.extra.filter((e) => /^[A-J]\s*[.)]/.test(e));
      }
      if (g.type === "MC_MULTI") q.selectCount = Array.isArray(answer) ? answer.length : 2;
      if (found.explanation) {
        q.learning = { explanation: found.explanation, skillTag: `${g.type}_MD_IMPORT` };
      }
      questions.push(q);
    }

    // Nhóm TFNG phải thống nhất bộ nhãn YES/NO hay TRUE/FALSE
    if (g.type === "TFNG") {
      const useYes = questions.some((q) => ["YES", "NO"].includes(q.answer));
      const opts = useYes ? ["YES", "NO", "NOT GIVEN"] : ["TRUE", "FALSE", "NOT GIVEN"];
      questions.forEach((q) => { q.options = opts; });
      const bad = questions.find((q) => !opts.includes(q.answer));
      if (bad) return { error: `nhóm TFNG lẫn cả YES/NO và TRUE/FALSE (câu ${bad.id})` };
    }

    const group = { type: g.type, instruction: g.instruction, questions };
    if (["MATCH_HEADINGS", "MATCH_INFO", "MATCH_FEATURES", "MATCH_ENDINGS"].includes(g.type)) {
      let opts = g.options;
      if (g.type === "MATCH_INFO" && opts.length < 2) {
        // MATCH_INFO: kho đáp án chính là danh sách chữ cái đoạn văn
        opts = paragraphs.map((_, k) => String.fromCharCode(65 + k));
      }
      if (opts.length < 2) return { error: `${g.type}: thiếu kho đáp án (chỉ ${opts.length} mục)` };
      group.options = opts;
      if (g.type === "MATCH_INFO" || g.type === "MATCH_FEATURES") group.reuseOptions = true;
    }
    if (g.type === "GAP") {
      const wl = detectWordLimit(g.instruction);
      if (wl) group.wordLimit = wl;
    }
    if (g.type === "MC" || g.type === "MC_MULTI") {
      const bad = group.questions.find((q) => !Array.isArray(q.options) || q.options.length < 2);
      if (bad) return { error: `${g.type}: câu ${bad.id} không bóc được lựa chọn A/B/C` };
    }
    questionGroups.push(group);
  }

  // Đáp án dạng chữ cái không được vượt quá kho đáp án
  for (const g of questionGroups) {
    if (!g.options) continue;
    const max = g.type === "MATCH_HEADINGS" ? g.options.length : g.options.length;
    for (const q of g.questions) {
      const idx = g.type === "MATCH_HEADINGS"
        ? ["i","ii","iii","iv","v","vi","vii","viii","ix","x","xi","xii"].indexOf(q.answer)
        : String(q.answer).charCodeAt(0) - 65;
      if (idx < 0 || idx >= max) {
        return { error: `${g.type}: đáp án "${q.answer}" nằm ngoài kho ${max} mục` };
      }
    }
  }

  const total = questionGroups.reduce(
    (n, g) => n + g.questions.reduce((m, q) => m + (g.type === "MC_MULTI" ? (q.selectCount ?? 2) : 1), 0), 0);

  const tier = lo >= 27 ? "HARD" : lo >= 14 ? "MEDIUM" : "EASY";
  const typeNames = [...new Set(questionGroups.map((g) => g.type))].join(" + ");

  return {
    exercise: {
      skill: "READING",
      taskType: "READING_PASSAGE",
      title,
      description: `1 passage · ${total} câu · ${typeNames} · 20 phút`,
      durationMinutes: 20,
      accessLevel: "PUBLIC",
      achievementEligible: true,
      difficultyTier: tier,
      content: { parts: [{ passage: { title, paragraphs, labelParagraphs: true }, questionGroups }] },
    },
    total,
  };
}

/* ===== chạy ===== */

const dir = process.argv[2];
const outDir = process.argv[3];
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && !/ Flagged\.md$/i.test(f)).sort();

const ok = [];
const failed = [];
for (const f of files) {
  let res;
  try {
    res = convert(f, fs.readFileSync(path.join(dir, f), "utf8"));
  } catch (e) {
    res = { error: `lỗi bất ngờ: ${e.message}` };
  }
  if (res.error) failed.push({ file: f, error: res.error });
  else ok.push({ file: f, ...res });
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "converted.json"), JSON.stringify(ok.map((o) => o.exercise), null, 1));
fs.writeFileSync(path.join(outDir, "failed.json"), JSON.stringify(failed, null, 1));

console.log(`Chuyển được ${ok.length}/${files.length} file · ${ok.reduce((n, o) => n + o.total, 0)} câu hỏi\n`);
const byReason = {};
for (const f of failed) {
  const key = f.error.replace(/\d+/g, "N").replace(/".*?"/g, '"…"');
  (byReason[key] ??= []).push(f.file);
}
console.log(`=== ${failed.length} file chưa chuyển được, gom theo lý do ===`);
for (const [reason, list] of Object.entries(byReason).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(list.length).padStart(3)} × ${reason}`);
  list.slice(0, 3).forEach((f) => console.log(`         ${f}`));
}
