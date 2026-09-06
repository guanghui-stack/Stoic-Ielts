/**
 * Kiểm thử chế độ đối chiếu đề và đáp án.
 * Chạy: node --experimental-strip-types scripts/test-attempt-review.ts
 *
 * Bài quan trọng nhất ở đây KHÔNG phải bài "hiện đúng đáp án", mà là bài
 * **đáp án chưa mở thì không được rời máy chủ**. Ẩn bằng CSS vẫn để nguyên đáp
 * án trong payload gửi xuống trình duyệt, và ai mở tab mạng cũng đọc được — tức
 * là cả hàng rào "bấm một cái mới xem đáp án" trở thành trang trí.
 *
 * Bài quan trọng thứ hai: màn đối chiếu phải chạy với MỌI dạng câu hỏi, kể cả
 * dạng thêm sau này. Vì vậy có một phép thử cố tình dùng một dạng chưa tồn tại.
 */
import {
  gradeReading,
  type ReadingAnswers,
  type ReadingContent,
} from "../src/lib/exercise-content.ts";
import {
  buildReviewModel,
  hasInlineBlank,
  questionRangeLabel,
  reviewPromptOf,
  splitPromptAroundBlanks,
} from "../src/lib/attempts/review.ts";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "  ✓" : "  ✗"} ${label}`);
  if (!ok) {
    console.log(`    mong đợi ${JSON.stringify(expected)}`);
    console.log(`    nhận được ${JSON.stringify(actual)}`);
    failures++;
  }
}

/** Chuỗi mồi: nếu nó lọt xuống trình duyệt thì phép thử rò rỉ sẽ bắt được. */
const SECRET = "ZZ_DAP_AN_BI_MAT_ZZ";

const content: ReadingContent = {
  parts: [
    {
      passage: { title: "Bridges", paragraphs: ["A first line.", "A second line."] },
      questionGroups: [
        {
          type: "GAP",
          instruction: "Complete the notes.",
          wordLimit: "ONE_WORD",
          questions: [
            { id: "q1", prompt: "The bridge was made of ______ in 1820.", answer: SECRET },
            { id: "q2", prompt: "Cost was ______ pounds.", answer: "ten" },
          ],
        },
        {
          type: "MC_MULTI",
          instruction: "Choose TWO letters.",
          questions: [
            {
              id: "q3",
              prompt: "Which TWO are true?",
              options: ["alpha", "beta", "gamma", "delta"],
              answer: ["A", "C"],
              selectCount: 2,
            },
          ],
        },
      ],
    },
  ],
};

const answers: ReadingAnswers = {
  q1: "wrongword",
  q2: "ten",
  q3: ["A", "D"],
};

const { detail } = gradeReading(content, answers);

console.log("\nĐÁP ÁN CHƯA MỞ — không được rời máy chủ");
const locked = buildReviewModel(detail, false);
check("cờ revealed đi kèm dữ liệu", locked.revealed, false);
check("mọi đáp án đúng đều bị bỏ trống", Object.values(locked.slots).map((s) => s.correctAnswer), [null, null, null]);
check(
  "đáp án bí mật KHÔNG có mặt trong payload gửi xuống trình duyệt",
  JSON.stringify(locked).includes(SECRET),
  false,
);
check("vẫn giữ đáp án của chính học viên", locked.slots.q1.userAnswer, "wrongword");
check("vẫn nói được câu nào đúng câu nào sai", [locked.slots.q1.correct, locked.slots.q2.correct], [false, true]);

console.log("\nĐÁP ÁN ĐÃ MỞ");
const open = buildReviewModel(detail, true);
check("cờ revealed đi kèm dữ liệu", open.revealed, true);
check("đáp án đúng hiện ra", open.slots.q1.correctAnswer, SECRET);
check("câu đúng cũng có đáp án để đối chiếu", open.slots.q2.correctAnswer, "ten");

console.log("\nGẮN ĐÚNG CÂU VÀ ĐÚNG SỐ");
check("khoá theo mã câu, không theo thứ tự", Object.keys(open.slots), ["q1", "q2", "q3"]);
check("số câu lấy nguyên từ bảng chấm", [open.slots.q1.numberLabel, open.slots.q2.numberLabel], ["1", "2"]);
check("MC_MULTI chiếm nhiều số câu", open.slots.q3.numberLabel, "3-4");
check("MC_MULTI ăn điểm lẻ, không phải đúng/sai", [open.slots.q3.score, open.slots.q3.maxScore], [1, 2]);
check("đúng một nửa thì vẫn tính là sai", open.slots.q3.correct, false);

console.log("\nÔ ĐIỀN NẰM ĐÚNG CHỖ TRONG CÂU");
check("câu có ô điền giữa dòng tách làm hai đoạn", splitPromptAroundBlanks("made of ______ in 1820."), ["made of ", " in 1820."]);
check("câu không có ô điền chỉ có một đoạn", splitPromptAroundBlanks("Which TWO are true?"), ["Which TWO are true?"]);
check("hai ô điền tách làm ba đoạn", splitPromptAroundBlanks("a ___ b _____ c").length, 3);
check("nhận biết ô điền giữa dòng", [hasInlineBlank("made of ______ now"), hasInlineBlank("no blank here")], [true, false]);
check("câu rỗng không làm vỡ hàm", splitPromptAroundBlanks(""), [""]);

console.log("\nDẠNG CÂU HỎI THÊM SAU NÀY VẪN ĐỐI CHIẾU ĐƯỢC");
// Màn đối chiếu không có nhánh `if` nào theo dạng câu hỏi: nó chỉ hỏi bảng chấm
// "bạn trả lời gì, đáp án là gì". Phép thử này dựng một dạng chưa tồn tại để
// chốt lời hứa đó — dạng thứ chín ra đời thì không phải sửa gì ở tầng này.
const futureContent = {
  parts: [
    {
      passage: { title: "Future", paragraphs: ["Only line."] },
      questionGroups: [
        {
          type: "DANG_CAU_HOI_CHUA_TON_TAI",
          instruction: "Một dạng câu hỏi của tương lai.",
          questions: [{ id: "qX", prompt: "Điền gì đó ______ vào đây.", answer: "future" }],
        },
      ],
    },
  ],
} as unknown as ReadingContent;

const futureModel = buildReviewModel(
  gradeReading(futureContent, { qX: "future" }).detail,
  true,
);
check("dạng lạ vẫn sinh ra một ô đối chiếu", Object.keys(futureModel.slots), ["qX"]);
check("dạng lạ vẫn chấm và đối chiếu được", [futureModel.slots.qX.correct, futureModel.slots.qX.correctAnswer], [true, "future"]);

console.log("\nBỎ TRỐNG VÀ ĐỀ ĐÃ SỬA SAU KHI NỘP");
const blankModel = buildReviewModel(gradeReading(content, {}).detail, true);
check("bỏ trống là chuỗi rỗng, không phải null", blankModel.slots.q1.userAnswer, "");
check("bỏ trống thì tính sai", blankModel.slots.q1.correct, false);
check("câu không còn trong đề thì không có ô nào", blankModel.slots.khong_ton_tai, undefined);

console.log("\nNHÃN DẢI SỐ CÂU");
check("nhóm một câu dùng số ít", questionRangeLabel(["3"]), "Question 3");
check("nhóm nhiều câu ghép hai đầu", questionRangeLabel(["1", "2"]), "Questions 1–2");
check("một câu MC_MULTI đã là một dải", questionRangeLabel(["4-5"]), "Questions 4–5");
check("dải trộn nhãn đơn và nhãn kép", questionRangeLabel(["1", "2", "4-5"]), "Questions 1–5");
check("nhóm rỗng không sinh nhãn rác", questionRangeLabel([]), "");

console.log("\nCÂU HỎI KHÔNG CÓ PHẦN CHỮ");
check("nối heading lấy tên đoạn làm phần chữ", reviewPromptOf({ paragraph: "C" }), "Paragraph C");
check("có phần chữ thì giữ nguyên", reviewPromptOf({ prompt: "Điền ______ vào" }), "Điền ______ vào");
check("không có gì thì trả chuỗi rỗng", reviewPromptOf({}), "");
check(
  "trùng khớp với cách bảng chấm gọi tên câu đó",
  reviewPromptOf({ paragraph: "A" }),
  gradeReading(
    {
      parts: [
        {
          passage: { title: "t", paragraphs: ["x"] },
          questionGroups: [
            {
              type: "MATCH_HEADINGS",
              instruction: "i",
              options: ["one"],
              questions: [{ id: "h", paragraph: "A", answer: "i" }],
            },
          ],
        },
      ],
    },
    {},
  ).detail[0].prompt,
);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỐI CHIẾU ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
