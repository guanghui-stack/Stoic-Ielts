/**
 * Kiểm thử metadata an toàn cho danh mục Reading.
 * Chạy: node --experimental-strip-types scripts/test-reading-catalog.ts
 */
import assert from "node:assert/strict";
import { buildReadingCatalogMetadata } from "../src/lib/reading/catalog.ts";

function metadata(
  title: string,
  content: unknown,
  difficultyTier: string | null = "UNKNOWN",
) {
  return buildReadingCatalogMetadata({
    title,
    content: typeof content === "string" ? content : JSON.stringify(content),
    difficultyTier,
  });
}

console.log("\nDANH MỤC READING — tiêu đề học viên nhìn thấy");
assert.equal(
  metadata("Reading Practice 01 — The Story of Bridges", {}, "EASY")
    .displayTitle,
  "The Story of Bridges",
);
assert.equal(
  metadata("Reading Full Test 12 - Three Academic Passages", {}, "HARD")
    .displayTitle,
  "Three Academic Passages",
);
assert.equal(
  metadata("A Brief History of Tea", {}, "MEDIUM").displayTitle,
  "A Brief History of Tea",
);

console.log("  ✓ bỏ tiền tố đánh số nội bộ, giữ nguyên tiêu đề thông thường");

console.log("\nDANH MỤC READING — độ khó và Passage phù hợp");
assert.deepEqual(metadata("A", {}, "EASY"), {
  displayTitle: "A",
  questionCount: 0,
  questionTypeLabels: [],
  difficultyLabel: "Dễ",
  passageFitLabel: "Phù hợp Passage 1",
});
assert.deepEqual(
  ["MEDIUM", "HARD", "UNKNOWN", "du-lieu-la"].map((tier) => {
    const result = metadata("A", {}, tier);
    return [result.difficultyLabel, result.passageFitLabel];
  }),
  [
    ["Vừa", "Phù hợp Passage 2"],
    ["Khó", "Phù hợp Passage 3"],
    ["Chưa phân tầng", "Chưa xác định Passage"],
    ["Chưa phân tầng", "Chưa xác định Passage"],
  ],
);

console.log("  ✓ bốn mức đều có nhãn học viên hiểu được");

console.log("\nDANH MỤC READING — số câu và dạng câu");
const richMetadata = metadata(
  "Reading Practice 07 — Water",
  {
    passage: { title: "KHÔNG ĐƯỢC RÒ RỈ", paragraphs: ["PASSAGE BÍ MẬT"] },
    questionGroups: [
      {
        type: "TFNG",
        instruction: "",
        questions: [
          { id: "q1", answer: "TRUE" },
          { id: "q2", answer: "FALSE" },
        ],
      },
      {
        type: "MC_MULTI",
        instruction: "",
        questions: [
          // selectCount là nguồn sự thật khi có mặt.
          { id: "q3", selectCount: 3, answer: ["A", "C"] },
          // Đề cũ chưa có selectCount thì dùng độ dài đáp án.
          { id: "q4", answer: ["B", "D"] },
          // Bản đã sanitize không có đáp án vẫn giữ mặc định hai ô câu.
          { id: "q5" },
        ],
      },
      {
        type: "TFNG",
        instruction: "",
        questions: [{ id: "q6", answer: "NOT GIVEN" }],
      },
      {
        type: "GAP",
        instruction: "",
        questions: [{ id: "q7", answer: "SECRET ANSWER" }],
      },
    ],
  },
  "HARD",
);

assert.equal(richMetadata.questionCount, 11);
assert.deepEqual(richMetadata.questionTypeLabels, [
  "True / False / Not Given",
  "Multiple Choice (nhiều đáp án)",
  "Gap Filling",
]);
assert.deepEqual(Object.keys(richMetadata).sort(), [
  "difficultyLabel",
  "displayTitle",
  "passageFitLabel",
  "questionCount",
  "questionTypeLabels",
]);
const publicJson = JSON.stringify(richMetadata);
assert.equal(publicJson.includes("PASSAGE BÍ MẬT"), false);
assert.equal(publicJson.includes("SECRET ANSWER"), false);
assert.equal(publicJson.includes('"answer"'), false);

console.log("  ✓ MC_MULTI đếm đúng số ô, nhãn không lặp và DTO không rò nội dung");

console.log("\nDANH MỤC READING — cấu trúc parts[] và JSON lỗi");
const partsMetadata = metadata("Reading Full Test 01: Bộ ba", {
  parts: [
    {
      passage: { title: "P1", paragraphs: [] },
      questionGroups: [
        {
          type: "MC",
          instruction: "",
          questions: [{ id: "p1q1", answer: "A" }],
        },
      ],
    },
    {
      passage: { title: "P2", paragraphs: [] },
      questionGroups: [
        {
          type: "MATCH_HEADINGS",
          instruction: "",
          questions: [
            { id: "p2q1", answer: "i" },
            { id: "p2q2", answer: "ii" },
          ],
        },
      ],
    },
  ],
});
assert.equal(partsMetadata.displayTitle, "Bộ ba");
assert.equal(partsMetadata.questionCount, 3);
assert.deepEqual(partsMetadata.questionTypeLabels, [
  "Multiple Choice",
  "Matching Headings",
]);
assert.equal(metadata("JSON hỏng", "{not-json").questionCount, 0);
assert.deepEqual(metadata("JSON hỏng", "{not-json").questionTypeLabels, []);

console.log("  ✓ đọc được cả đề nhiều part và không ném lỗi với JSON hỏng");
console.log("\n✅ TẤT CẢ KIỂM THỬ DANH MỤC READING ĐỀU ĐẠT\n");
