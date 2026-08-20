/**
 * Kiểm thử thang kinh nghiệm.
 * Chạy: node --experimental-strip-types scripts/test-experience.ts
 *
 * Hai điều file này gác, và cả hai đều là thứ sáu tháng nữa sẽ có người muốn
 * "đơn giản hoá":
 *
 *   1. Kinh nghiệm CHỈ TĂNG. Không đường nào làm nó giảm.
 *   2. Kinh nghiệm KHÔNG được chắn giữa người đủ năng lực và cấp bậc kế tiếp.
 */
import {
  EXPERIENCE_POINTS,
  EXPERIENCE_RULE_VERSION,
  GATE_EXPERIENCE_BY_LEVEL,
  OPPONENT_DECAY,
  experienceGate,
  experienceOf,
  gateExperienceFor,
  opponentDecayFactor,
} from "../src/lib/experience/experience.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const EMPTY = {
  validAttempts: 0,
  qualifiedReviews: 0,
  deepReviews: 0,
  qualifiedStudyDays: 0,
};

console.log("\n— Kinh nghiệm chỉ tăng —");

check("người chưa làm gì có 0 kinh nghiệm", experienceOf(EMPTY).total, 0);
check("mọi mức điểm đều dương", Object.values(EXPERIENCE_POINTS).every((v) => v > 0), true);
check(
  "THUA một trận vẫn cộng, vì vẫn là một lần đọc đề thật",
  EXPERIENCE_POINTS.DUEL_LOSS > 0,
  true
);
check(
  "giảm dần theo đối thủ không bao giờ kéo tổng xuống dưới phần kiếm từ học",
  experienceOf({
    ...EMPTY,
    validAttempts: 3,
    duelWins: 1,
    duelDecayDeduction: 999_999,
  }).total,
  3 * EXPERIENCE_POINTS.VALID_ATTEMPT
);
check(
  "thêm bất cứ việc gì cũng chỉ làm tổng tăng",
  experienceOf({ ...EMPTY, validAttempts: 5 }).total >
    experienceOf({ ...EMPTY, validAttempts: 4 }).total,
  true
);

console.log("\n— Cộng đúng các số hạng —");

check(
  "một bài, một phục bàn thường, một ngày học",
  experienceOf({ ...EMPTY, validAttempts: 1, qualifiedReviews: 1, qualifiedStudyDays: 1 }).total,
  EXPERIENCE_POINTS.VALID_ATTEMPT +
    EXPERIENCE_POINTS.QUALIFIED_REVIEW +
    EXPERIENCE_POINTS.QUALIFIED_STUDY_DAY
);
check(
  "phục bàn sâu được thưởng thêm",
  experienceOf({ ...EMPTY, qualifiedReviews: 1, deepReviews: 1 }).total,
  EXPERIENCE_POINTS.QUALIFIED_REVIEW + EXPERIENCE_POINTS.DEEP_REVIEW_BONUS
);
check(
  "sâu nhiều hơn tổng thì bị kẹp, không cộng khống",
  experienceOf({ ...EMPTY, qualifiedReviews: 1, deepReviews: 9 }).total,
  EXPERIENCE_POINTS.QUALIFIED_REVIEW + EXPERIENCE_POINTS.DEEP_REVIEW_BONUS
);
check(
  "chỉ liệt kê số hạng khác 0, để màn hình không hiện dòng rỗng",
  experienceOf({ ...EMPTY, validAttempts: 2 }).parts.map((p) => p.label),
  ["Bài đã nộp"]
);

console.log("\n— Nhịp giữa các hoạt động: không được nghiêng về đấu trường —");

// Ước lượng thời gian: bài 20 phút, phục bàn 10 phút, trận 15 phút.
const perMinuteAttempt = EXPERIENCE_POINTS.VALID_ATTEMPT / 20;
const perMinuteReview = EXPERIENCE_POINTS.QUALIFIED_REVIEW / 10;
const perMinuteDuel = EXPERIENCE_POINTS.DUEL_WIN / 15;
check(
  "kinh nghiệm mỗi phút của trận KHÔNG vượt vòng học",
  perMinuteDuel <= Math.max(perMinuteAttempt, perMinuteReview),
  true
);

console.log("\n— Giảm dần theo đối thủ, áp cho tất cả mọi người —");

check("bốn mức", OPPONENT_DECAY.length, 4);
check("lần 1 đủ 100%", opponentDecayFactor(1), 1);
check("lần 2 còn 60%", opponentDecayFactor(2), 0.6);
check("lần 3 còn 30%", opponentDecayFactor(3), 0.3);
check("lần 4 còn 10%", opponentDecayFactor(4), 0.1);
check("từ lần 5 trở đi vẫn 10%, không âm", opponentDecayFactor(9), 0.1);
check("đầu vào vô lý trả 0 chứ không ném lỗi", opponentDecayFactor(0), 0);

console.log("\n— Ngưỡng Vũ Môn: định nhịp, KHÔNG chắn đường —");

check("bậc 1 không đòi kinh nghiệm", gateExperienceFor(1), 0);
check("bậc lạ trả 0 chứ không ném lỗi", gateExperienceFor(99), 0);
const levels = Object.keys(GATE_EXPERIENCE_BY_LEVEL).map(Number).sort((a, b) => a - b);
check("đủ chín bậc", levels, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
check(
  "ngưỡng tăng đều theo bậc",
  levels.every((l, i) => i === 0 || GATE_EXPERIENCE_BY_LEVEL[l] > GATE_EXPERIENCE_BY_LEVEL[levels[i - 1]]),
  true
);

// Một ngày học thật có nộp một bài = 15 + 20 = 35 điểm.
const PER_REAL_DAY = EXPERIENCE_POINTS.QUALIFIED_STUDY_DAY + EXPERIENCE_POINTS.VALID_ATTEMPT;
check("một ngày học thật đáng 35 điểm", PER_REAL_DAY, 35);
check(
  "bậc 2 mở sau không quá 5 ngày học thật",
  Math.ceil(gateExperienceFor(2) / PER_REAL_DAY) <= 5,
  true
);
check(
  "bậc 9 mở sau không quá 120 ngày học thật, thấp hơn hẳn điều kiện năng lực của nó",
  Math.ceil(gateExperienceFor(9) / PER_REAL_DAY) <= 120,
  true
);

console.log("\n— Cổng kinh nghiệm trả cả tiến độ —");

check("chưa đủ", experienceGate(3, 100), { complete: false, current: 100, target: 260 });
check("vừa đủ là mở", experienceGate(3, 260), { complete: true, current: 260, target: 260 });
check("dư thì vẫn mở", experienceGate(3, 5_000).complete, true);
check("bậc 1 luôn mở", experienceGate(1, 0).complete, true);

check("có bản luật để tra ngược", typeof EXPERIENCE_RULE_VERSION === "string" && EXPERIENCE_RULE_VERSION.length > 0, true);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ KINH NGHIỆM ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
