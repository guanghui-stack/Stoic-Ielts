/**
 * Kiểm thử quy tắc Feynman Review.
 * Chạy: node --experimental-strip-types scripts/test-feynman.ts
 */
import {
  chooseFeynmanMode,
  selectPriorityMistakes,
  type FeynmanQuestionResult,
} from "../src/lib/feynman-rules.ts";
import {
  FEYNMAN_ERROR_TYPES,
  FEYNMAN_ERROR_LABELS,
  FEYNMAN_LIMITS,
  isFeynmanErrorType,
} from "../src/lib/feynman-constants.ts";

let failures = 0;
function check(label: string, cond: boolean, extra = "") {
  console.log(`  ${cond ? "✓" : "✗ THẤT BẠI:"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!cond) failures++;
}

const q = (
  o: Partial<FeynmanQuestionResult> & { id: string }
): FeynmanQuestionResult => ({
  type: "TFNG",
  part: 1,
  numberLabel: o.id.replace("q", ""),
  score: 0,
  maxScore: 1,
  correct: false,
  ...o,
});

/* ===== Chọn chế độ ===== */
console.log("\nChọn chế độ QUICK / DEEP");
check(
  "đề full test luôn DEEP dù điểm cao",
  chooseFeynmanMode({ scoreRaw: 13, scoreTotal: 14, taskType: "READING_FULL", imperfectCount: 1 }) === "DEEP"
);
check(
  "độ chính xác dưới 65% → DEEP",
  chooseFeynmanMode({ scoreRaw: 6, scoreTotal: 14, taskType: "READING_PASSAGE", imperfectCount: 4 }) === "DEEP"
);
check(
  "sai hơn 5 mục → DEEP",
  chooseFeynmanMode({ scoreRaw: 20, scoreTotal: 26, taskType: "READING_PASSAGE", imperfectCount: 6 }) === "DEEP"
);
check(
  "điểm khá, sai ít, không phải full test → QUICK",
  chooseFeynmanMode({ scoreRaw: 11, scoreTotal: 14, taskType: "READING_PASSAGE", imperfectCount: 3 }) === "QUICK"
);
check(
  "đúng ranh giới 65% → QUICK (không nhỏ hơn 65)",
  chooseFeynmanMode({ scoreRaw: 13, scoreTotal: 20, taskType: "READING_PASSAGE", imperfectCount: 5 }) === "QUICK",
  "13/20 = 65%"
);
check(
  "bài trống (scoreTotal = 0) không chia cho 0 → DEEP",
  chooseFeynmanMode({ scoreRaw: 0, scoreTotal: 0, taskType: "READING_PASSAGE", imperfectCount: 0 }) === "DEEP"
);

/* ===== Chọn câu ưu tiên ===== */
console.log("\nChọn câu chữa sâu");
{
  const detail = [
    q({ id: "q1", correct: true, score: 1 }),
    q({ id: "q2", type: "TFNG", score: 0 }),
    q({ id: "q3", type: "MC", score: 0 }),
    q({ id: "q4", type: "GAP", score: 0 }),
    q({ id: "q5", type: "TFNG", score: 0 }),
    q({ id: "q6", type: "MC", score: 0 }),
    q({ id: "q7", type: "MATCH_HEADINGS", score: 0 }),
  ];
  const quick = selectPriorityMistakes(detail, "QUICK");
  const deep = selectPriorityMistakes(detail, "DEEP");
  check("QUICK lấy tối đa 3 mục", quick.length === 3, `${quick.length}`);
  check("DEEP lấy tối đa 6 mục", deep.length === 6, `${deep.length}`);
  check("không bao giờ chọn câu đã đúng", ![...quick, ...deep].some((x) => x.correct));
  check(
    "QUICK ưu tiên 3 dạng câu hỏi KHÁC NHAU",
    new Set(quick.map((x) => x.type)).size === 3,
    quick.map((x) => x.type).join(", ")
  );
}
{
  const detail = [
    q({ id: "q10", type: "MC_MULTI", score: 1, maxScore: 2, numberLabel: "10-11" }),
    q({ id: "q12", type: "TFNG", score: 0, maxScore: 1 }),
  ];
  const sel = selectPriorityMistakes(detail, "QUICK");
  check(
    "câu sai hoàn toàn (0/1) được ưu tiên trước câu đúng một phần (1/2)",
    sel[0].id === "q12",
    `đầu tiên là ${sel[0].id}`
  );
  check("MC_MULTI đúng một phần vẫn được đưa vào danh sách chữa", sel.some((x) => x.id === "q10"));
  check("MC_MULTI chiếm 2 số câu nhưng chỉ tính là MỘT mục", sel.length === 2, `${sel.length} mục`);
}
{
  const detail = [q({ id: "q1", correct: true, score: 1 }), q({ id: "q2", correct: true, score: 1 })];
  check("bài đúng tuyệt đối → không có mục chữa nào", selectPriorityMistakes(detail, "DEEP").length === 0);
}
{
  const many = Array.from({ length: 20 }, (_, i) =>
    q({ id: `q${i + 1}`, type: "TFNG", numberLabel: String(i + 1) })
  );
  const deep = selectPriorityMistakes(many, "DEEP");
  check("sai rất nhiều vẫn giới hạn 6 mục để không quá tải", deep.length === 6);
  check("không trùng lặp câu nào", new Set(deep.map((x) => x.id)).size === deep.length);
}
{
  // numberLabel so sánh theo số, không theo chuỗi: "9" phải đứng trước "10"
  const detail = [
    q({ id: "qb", numberLabel: "10", type: "TFNG" }),
    q({ id: "qa", numberLabel: "9", type: "TFNG" }),
  ];
  const sel = selectPriorityMistakes(detail, "QUICK");
  check("sắp xếp số câu theo GIÁ TRỊ SỐ (9 trước 10)", sel[0].numberLabel === "9", sel.map((s) => s.numberLabel).join(" → "));
}

/* ===== Hằng số ===== */
console.log("\nHằng số và giới hạn");
check("có đủ 10 mã nguyên nhân sai", FEYNMAN_ERROR_TYPES.length === 10, `${FEYNMAN_ERROR_TYPES.length}`);
check("mã nào cũng có nhãn tiếng Việt", FEYNMAN_ERROR_TYPES.every((t) => Boolean(FEYNMAN_ERROR_LABELS[t])));
check("mã hợp lệ được chấp nhận", isFeynmanErrorType("OVER_INFERENCE"));
check("mã bịa bị từ chối", !isFeynmanErrorType("SOMETHING_ELSE"));
check(
  "mọi giới hạn đều có min <= max và max > 0",
  Object.values(FEYNMAN_LIMITS).every((l) => l.min <= l.max && l.max > 0)
);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
