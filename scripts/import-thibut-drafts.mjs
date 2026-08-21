/**
 * Nạp câu Thí Bút vào kho, ở trạng thái CHỜ DUYỆT.
 *
 * Chạy: node scripts/import-thibut-drafts.mjs <duong-dan-file.json> [ten-me]
 *
 * Đây là chỗ nối giữa nhánh nội dung và nhánh mã. Nội dung sinh ra ở ngoài,
 * script này đưa vào, rồi người duyệt xử lý ở /quan-tri/thi-but.
 *
 * BA ĐIỀU SCRIPT NÀY CỐ Ý KHÔNG LÀM:
 *
 *   1. Không tự phát hành. Mọi câu vào ở trạng thái DRAFT, không có cờ nào bỏ
 *      qua được. Một câu sai đáp án sẽ lấy mất quân công của người ngay thẳng.
 *   2. Không gọi AI. Nội dung sinh ở ngoài, ngoại tuyến, có người xem.
 *   3. Không xoá gì. Chạy lại chỉ thêm, không đè.
 *
 * Định dạng file JSON: một mảng, mỗi phần tử là
 *
 *   {
 *     "type": "PARAPHRASE" | "VOCAB_IN_CONTEXT" | "COLLOCATION" | "SENTENCE_GRAMMAR",
 *     "difficulty": "EASY" | "MEDIUM" | "HARD",
 *     "prompt": "Câu hỏi",
 *     "options": ["A", "B", "C", "D"],
 *     "answerIndex": 1,
 *     "explanation": "Vì sao đáp án đó đúng, và vì sao các phương án kia sai"
 *   }
 */
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const TYPES = ["PARAPHRASE", "VOCAB_IN_CONTEXT", "COLLOCATION", "SENTENCE_GRAMMAR"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

const file = process.argv[2];
const batch = process.argv[3] ?? `me-${new Date().toISOString().slice(0, 10)}`;

if (!file) {
  console.error("Thiếu đường dẫn file. Ví dụ:");
  console.error("  node scripts/import-thibut-drafts.mjs data/thibut-me-1.json me-1");
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`Không tìm thấy file: ${file}`);
  process.exit(1);
}

let raw;
try {
  raw = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (error) {
  console.error("File không phải JSON hợp lệ:", error.message);
  process.exit(1);
}
if (!Array.isArray(raw)) {
  console.error("File phải chứa một MẢNG câu hỏi.");
  process.exit(1);
}

/**
 * Kiểm từng câu trước khi ghi.
 *
 * Kiểm ở đây chứ không tin người gửi: một câu có `answerIndex` trỏ ra ngoài
 * mảng phương án sẽ không bao giờ chấm đúng được, và lỗi đó chỉ lộ ra khi có
 * học viên đã trả quân công để gặp nó.
 */
const errors = [];
const valid = [];

raw.forEach((item, i) => {
  const at = `câu thứ ${i + 1}`;
  if (!TYPES.includes(item?.type)) {
    errors.push(`${at}: type phải là một trong ${TYPES.join(", ")}`);
    return;
  }
  if (!DIFFICULTIES.includes(item?.difficulty)) {
    errors.push(`${at}: difficulty phải là một trong ${DIFFICULTIES.join(", ")}`);
    return;
  }
  if (typeof item.prompt !== "string" || item.prompt.trim().length < 5) {
    errors.push(`${at}: prompt quá ngắn hoặc không phải chuỗi`);
    return;
  }
  if (!Array.isArray(item.options) || item.options.length !== 4) {
    errors.push(`${at}: phải có đúng 4 phương án`);
    return;
  }
  if (new Set(item.options.map(String)).size !== 4) {
    errors.push(`${at}: bốn phương án phải khác nhau`);
    return;
  }
  if (
    !Number.isInteger(item.answerIndex) ||
    item.answerIndex < 0 ||
    item.answerIndex > 3
  ) {
    errors.push(`${at}: answerIndex phải là số nguyên từ 0 tới 3`);
    return;
  }
  if (typeof item.explanation !== "string" || item.explanation.trim().length < 10) {
    errors.push(
      `${at}: thiếu lời giải. Trượt phải thành buổi học, nên lời giải là bắt buộc`,
    );
    return;
  }
  valid.push({
    type: item.type,
    difficulty: item.difficulty,
    prompt: item.prompt.trim(),
    options: JSON.stringify(item.options.map(String)),
    answerIndex: item.answerIndex,
    explanation: item.explanation.trim(),
    status: "DRAFT",
    sourceBatch: batch,
  });
});

if (errors.length > 0) {
  console.error(`\nCó ${errors.length} câu không hợp lệ. KHÔNG nạp gì cả:\n`);
  for (const e of errors.slice(0, 20)) console.error("  - " + e);
  if (errors.length > 20) console.error(`  ... và ${errors.length - 20} lỗi nữa`);
  console.error("\nSửa file rồi chạy lại. Nạp một nửa còn tệ hơn không nạp gì.");
  process.exit(1);
}

const db = new PrismaClient();
try {
  const created = await db.thiButItem.createMany({ data: valid });
  const totals = await db.thiButItem.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const count = (s) => totals.find((t) => t.status === s)?._count._all ?? 0;

  console.log(`\nĐã nạp ${created.count} câu vào mẻ "${batch}", trạng thái CHỜ DUYỆT.`);
  console.log(`\nKho hiện tại:`);
  console.log(`  chờ duyệt   ${count("DRAFT")}`);
  console.log(`  đã phát hành ${count("PUBLISHED")}`);
  console.log(`  đã loại      ${count("RETIRED")}`);
  console.log(`\nVào /quan-tri/thi-but để duyệt. Chưa duyệt thì học viên chưa gặp câu nào.`);
} finally {
  await db.$disconnect();
}
