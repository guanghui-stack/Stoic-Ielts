/**
 * Chuyển sách bài tập .docx thành JSON nạp được vào kho Thí Bút.
 *
 * Chạy: node scripts/convert-thibut-docx.mjs <file.docx> [file2.docx ...] > ra.json
 *
 * Đọc thẳng `word/document.xml` trong file .docx, không cần thư viện ngoài.
 *
 * KHUÔN TÀI LIỆU mà script này hiểu:
 *
 *   Part 1 – Recognising Paraphrase        -> PARAPHRASE
 *   Part 2 – Vocabulary in Context         -> VOCAB_IN_CONTEXT
 *   Part 3 – Collocations                  -> COLLOCATION
 *   Part 4 – Grammar for Paraphrase        -> SENTENCE_GRAMMAR
 *
 *   Vùng câu hỏi:  "12. <đề bài>" rồi bốn dòng "A. ..." "B. ..." "C. ..." "D. ..."
 *   Vùng đáp án:   "12. B — <giải thích>"
 *
 * Script KHÔNG đoán. Câu nào không khớp khuôn thì bị bỏ và báo ra stderr, chứ
 * không được đưa vào với dữ liệu nửa vời: một câu sai đáp án sẽ lấy mất quân
 * công của người ngay thẳng.
 *
 * CHUẨN HOÁ CHỮ theo `DAC-TA-DAU-TRUONG.md` mục 13: bỏ dấu gạch ngang dài,
 * lặng lẽ, không báo lỗi. Người viết không cần biết luật này tồn tại.
 */
import fs from "node:fs";
import zlib from "node:zlib";

/* ---------- đọc .docx bằng tay, không cần thư viện ---------- */

/**
 * Rút `word/document.xml` khỏi file zip.
 *
 * Tự giải nén thay vì thêm phụ thuộc: .docx chỉ là zip, và mục cần lấy luôn
 * nén bằng deflate hoặc để nguyên. Thêm một thư viện cho việc này là thêm một
 * thứ phải cập nhật mãi mãi.
 */
function readDocumentXml(path) {
  const buf = fs.readFileSync(path);
  // Quét local file header (PK\x03\x04) tìm mục có tên word/document.xml.
  for (let i = 0; i < buf.length - 4; i++) {
    if (buf.readUInt32LE(i) !== 0x04034b50) continue;
    const method = buf.readUInt16LE(i + 8);
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const name = buf.toString("utf8", i + 30, i + 30 + nameLen);
    if (name !== "word/document.xml") continue;
    const start = i + 30 + nameLen + extraLen;
    const raw = buf.subarray(start, start + compSize);
    return method === 0
      ? raw.toString("utf8")
      : zlib.inflateRawSync(raw).toString("utf8");
  }
  throw new Error(`Không tìm thấy word/document.xml trong ${path}`);
}

function paragraphs(xml) {
  const parts = xml.match(/<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g) ?? [];
  return parts.map((p) =>
    (p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? [])
      .map((t) => t.replace(/<[^>]+>/g, ""))
      .join("")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim(),
  );
}

/* ---------- chuẩn hoá chữ ---------- */

/**
 * Bỏ dấu gạch ngang dài, lặng lẽ.
 *
 * Em dash và en dash dùng làm dấu ngắt ý được thay bằng dấu phẩy hoặc dấu hai
 * chấm tuỳ chỗ. En dash nằm giữa hai con số là dấu chỉ khoảng, đổi thành dấu
 * gạch nối chứ không bỏ.
 */
function normalize(s) {
  return s
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1-$2")
    .replace(/\s*[–—]\s*/g, ", ")
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

// Dải chữ Hán viết bằng mã thoát chứ không bằng ký tự thật: `npm run
// test:no-han` quét cả file này, và một dải viết thẳng sẽ làm chính bài
// kiểm tra đó hỏng. Bài học nhỏ nhưng đúng tinh thần của luật.
const HAN = /[\u2E80-\u9FFF\uF900-\uFAFF\u3040-\u30FF]/;

/* ---------- phân tích ---------- */

const PART_TYPE = [
  [/Recognising Paraphrase/i, "PARAPHRASE"],
  [/Vocabulary in Context/i, "VOCAB_IN_CONTEXT"],
  [/Collocations/i, "COLLOCATION"],
  [/Grammar for Paraphrase/i, "SENTENCE_GRAMMAR"],
];

function typeOfHeading(line) {
  for (const [re, type] of PART_TYPE) if (re.test(line)) return type;
  return null;
}

const warnings = [];

function parseFile(path) {
  const lines = paragraphs(readDocumentXml(path));

  // Lấy lần xuất hiện CUỐI CÙNG, không phải lần đầu: mục lục ở đầu tài liệu
  // cũng có dòng bắt đầu bằng "Answer Key", và cắt ở đó thì mất sạch câu hỏi.
  let keyStart = -1;
  lines.forEach((l, i) => {
    if (/^Answer Key/i.test(l)) keyStart = i;
  });
  if (keyStart < 0) throw new Error(`${path}: không tìm thấy phần Answer Key`);

  const questionLines = lines.slice(0, keyStart);
  const keyLines = lines.slice(keyStart);

  // --- đáp án ---
  const answers = new Map(); // số câu -> { letter, explanation }
  for (const line of keyLines) {
    const m = line.match(/^(\d+)\.\s*([A-D])\s*[–—-]\s*(.+)$/);
    if (!m) continue;
    answers.set(Number(m[1]), {
      letter: m[2],
      explanation: normalize(m[3]),
    });
  }

  // --- câu hỏi ---
  const items = [];
  let type = null;
  let current = null;

  const flush = () => {
    if (!current) return;
    const key = answers.get(current.number);
    const label = `${path.split(/[\\/]/).pop()} câu ${current.number}`;

    if (current.options.length !== 4) {
      warnings.push(`${label}: có ${current.options.length} phương án, cần 4`);
    } else if (!key) {
      warnings.push(`${label}: không có đáp án trong Answer Key`);
    } else if (new Set(current.options).size !== 4) {
      warnings.push(`${label}: có hai phương án trùng nhau`);
    } else if (key.explanation.length < 10) {
      warnings.push(`${label}: lời giải quá ngắn`);
    } else {
      items.push({
        type: current.type,
        // Cả 600 câu đều được tác giả xếp Band 2.0-4.0, tức nền tảng. Khai
        // đúng như vậy thay vì bịa ra ba mức khó không có căn cứ.
        difficulty: "EASY",
        prompt: current.prompt,
        options: current.options,
        answerIndex: "ABCD".indexOf(key.letter),
        explanation: key.explanation,
      });
    }
    current = null;
  };

  for (const line of questionLines) {
    const heading = typeOfHeading(line);
    if (heading && /^Part\s*\d/i.test(line)) {
      flush();
      type = heading;
      continue;
    }
    if (!type) continue;

    const q = line.match(/^(\d+)\.\s*(.+)$/);
    if (q && !/^[A-D]\.\s/.test(line)) {
      flush();
      current = {
        number: Number(q[1]),
        type,
        prompt: normalize(q[2]),
        options: [],
      };
      continue;
    }

    const opt = line.match(/^([A-D])\.\s*(.+)$/);
    if (opt && current) {
      current.options.push(normalize(opt[2]));
    }
  }
  flush();

  return items;
}

/* ---------- chạy ---------- */

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Chưa truyền file .docx nào.");
  process.exit(1);
}

let all = [];
for (const f of files) all = all.concat(parseFile(f));

// Loại câu trùng nhau giữa hai tập, so bằng đề bài đã chuẩn hoá.
const seen = new Set();
const unique = [];
let dupes = 0;
for (const item of all) {
  // Vân tay phải gồm CẢ phương án. Phần Grammar có 25 câu dùng chung đúng một
  // đề bài "Choose the correct sentence." và chỉ khác nhau ở bốn phương án;
  // khử trùng theo riêng đề bài sẽ ném đi 24 câu hoàn toàn hợp lệ.
  const fingerprint = `${item.type}|${item.prompt.toLowerCase()}|${item.options
    .join("|")
    .toLowerCase()}`;
  if (seen.has(fingerprint)) {
    dupes++;
    continue;
  }
  seen.add(fingerprint);
  unique.push(item);
}

// Chốt chặn cuối: không ký tự chữ Hán, không gạch ngang dài.
const dirty = unique.filter(
  (i) =>
    HAN.test(i.prompt + i.explanation + i.options.join("")) ||
    /[–—]/.test(i.prompt + i.explanation + i.options.join("")),
);

for (const w of warnings) console.error("  bỏ qua: " + w);
console.error(
  `\nĐọc ${files.length} file, ra ${all.length} câu hợp lệ, bỏ ${warnings.length} câu không khớp khuôn, ${dupes} câu trùng.`,
);
console.error(`Còn lại ${unique.length} câu.`);
if (dirty.length > 0) {
  console.error(`LỖI: còn ${dirty.length} câu chứa chữ Hán hoặc gạch ngang dài.`);
  process.exit(1);
}

const byType = {};
for (const i of unique) byType[i.type] = (byType[i.type] ?? 0) + 1;
console.error("Theo dạng câu:");
for (const [t, n] of Object.entries(byType)) console.error(`  ${t.padEnd(18)} ${n}`);

process.stdout.write(JSON.stringify(unique, null, 2));
