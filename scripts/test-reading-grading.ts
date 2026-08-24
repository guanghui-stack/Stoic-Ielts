/**
 * Kiểm thử chấm điểm Reading ở biên tin cậy phía máy chủ.
 * Chạy: node --experimental-strip-types scripts/test-reading-grading.ts
 */
import {
  gradeReading,
  type ReadingAnswers,
  type ReadingContent,
} from "../src/lib/exercise-content.ts";

let failures = 0;

function check(label: string, condition: boolean, extra = "") {
  console.log(
    `  ${condition ? "✓" : "✗ THẤT BẠI:"} ${label}${extra ? ` — ${extra}` : ""}`
  );
  if (!condition) failures++;
}

const content: ReadingContent = {
  passage: { title: "Bài kiểm thử", paragraphs: ["Nội dung mẫu."] },
  questionGroups: [
    {
      type: "MC_MULTI",
      instruction: "Chọn đúng hai đáp án.",
      questions: [
        {
          id: "q1",
          prompt: "Hai đáp án nào đúng?",
          options: ["A. Một", "B. Hai", "C. Ba", "D. Bốn"],
          selectCount: 2,
          answer: ["A", "B"],
        },
      ],
    },
  ],
};

function grade(answers: ReadingAnswers) {
  return gradeReading(content, answers);
}

console.log("\nMC_MULTI — không được tin payload từ trình duyệt");

{
  const result = grade({ q1: ["A", "B"] });
  check("hai lựa chọn đúng nhận đủ 2 điểm", result.scoreRaw === 2);
  check("đáp án hợp lệ được đánh dấu đúng", result.detail[0]?.correct === true);
}

{
  const result = grade({ q1: ["A"] });
  check("chọn thiếu vẫn chỉ nhận điểm phần đúng", result.scoreRaw === 1);
  check("chọn thiếu không được coi là đúng trọn mục", result.detail[0]?.correct === false);
}

{
  const result = grade({ q1: ["A", "C"] });
  check("một đúng một sai chỉ nhận 1 điểm", result.scoreRaw === 1);
}

{
  const result = grade({ q1: ["A", "B", "C", "D"] });
  check(
    "gửi toàn bộ lựa chọn là payload bất hợp lệ và nhận 0 điểm",
    result.scoreRaw === 0,
    `${result.scoreRaw}/2`
  );
  check("payload chọn quá số lượng không được đánh dấu đúng", result.detail[0]?.correct === false);
}

{
  const result = grade({ q1: ["A", "A"] });
  check(
    "lặp một đáp án đúng không được nhân đôi điểm",
    result.scoreRaw === 0,
    `${result.scoreRaw}/2`
  );
}

{
  const result = grade({ q1: ["A", "Z"] });
  check("lựa chọn không tồn tại làm payload không hợp lệ", result.scoreRaw === 0);
}

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ CHẤM ĐIỂM READING ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ CHẤM ĐIỂM THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
