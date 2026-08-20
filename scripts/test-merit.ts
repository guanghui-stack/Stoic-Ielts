/**
 * Kiểm thử Quân Công.
 * Chạy: node --experimental-strip-types scripts/test-merit.ts
 *
 * Quân Công không phải tiền thật, nhưng nó là thứ ngăn cách "mua được" và
 * "phải đoạt lấy". Sai ở đây thì rào chắn giữa hai đồng tiền sụp mà không có
 * thông báo lỗi nào.
 */
import {
  MERIT_EARN,
  MERIT_KINDS,
  MERIT_RULE_VERSION,
  QUALIFIED_DAY_MIN_SECONDS,
  decideThiButPurchase,
  formatMerit,
  isMeritKind,
  meritBalance,
  meritKindDirection,
  qualifiedStudyDayKeys,
  rankUpLedgerKey,
  reviewLedgerKey,
  studyDayLedgerKey,
  titleLedgerKey,
  todayProgress,
} from "../src/lib/merit/merit.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

console.log("\n— Ví và số dư —");

check("số dư là hiệu hai tổng", meritBalance({ earnedTotal: 300, burnedTotal: 120 }), 180);
check("ví mới số dư 0", meritBalance({ earnedTotal: 0, burnedTotal: 0 }), 0);
check(
  "số dư âm vẫn tính ra được, để phát hiện sổ lệch chứ không im lặng kẹp về 0",
  meritBalance({ earnedTotal: 10, burnedTotal: 40 }),
  -30
);

console.log("\n— Sáu chiều của sổ cái, số tiền luôn dương —");

check("đúng sáu chiều", MERIT_KINDS.length, 6);
check("EARN cộng vào", meritKindDirection("EARN"), "credit");
check("MINT cộng vào", meritKindDirection("MINT"), "credit");
check("REFUND cộng vào", meritKindDirection("REFUND"), "credit");
check("STAKE trừ ra", meritKindDirection("STAKE"), "debit");
check("BURN trừ ra", meritKindDirection("BURN"), "debit");
check("REVOKE trừ ra", meritKindDirection("REVOKE"), "debit");
check("chiều lạ bị từ chối", isMeritKind("TRANSFER"), false);
check(
  "không có chiều CHUYỂN GIỮA HAI NGƯỜI: huỷ và phát mới là cặp đúng",
  MERIT_KINDS.filter((k) => k.includes("TRANSFER")).length,
  0
);

console.log("\n— Ngày học đạt chuẩn: phải đủ CẢ HAI vế —");

const days = [
  { dateKey: "2026-08-01", activeSeconds: 1_800 }, // 30 phút
  { dateKey: "2026-08-02", activeSeconds: 1_800 }, // 30 phút
  { dateKey: "2026-08-03", activeSeconds: 600 }, // 10 phút
  { dateKey: "2026-08-04", activeSeconds: 3_600 }, // 60 phút
];
const work = [{ dateKey: "2026-08-01" }, { dateKey: "2026-08-03" }];

check("ngưỡng thời gian là 25 phút", QUALIFIED_DAY_MIN_SECONDS, 1_500);
check(
  "chỉ ngày đủ giờ VÀ có nộp mới tính",
  qualifiedStudyDayKeys(days, work),
  ["2026-08-01"]
);
check(
  "đủ giờ mà không nộp gì thì KHÔNG tính, nếu không thì mở tab để đó là đủ",
  qualifiedStudyDayKeys([days[1]], []),
  []
);
check(
  "có nộp mà thiếu giờ thì cũng không tính",
  qualifiedStudyDayKeys([days[2]], [{ dateKey: "2026-08-03" }]),
  []
);
check(
  "nộp hai bài trong một ngày vẫn chỉ tính một ngày",
  qualifiedStudyDayKeys([days[3]], [{ dateKey: "2026-08-04" }, { dateKey: "2026-08-04" }]),
  ["2026-08-04"]
);
check("đúng 25 phút là đạt, không phải hơn 25", qualifiedStudyDayKeys(
  [{ dateKey: "2026-08-05", activeSeconds: 1_500 }],
  [{ dateKey: "2026-08-05" }]
), ["2026-08-05"]);

console.log("\n— Câu hiện trong lúc học, không phải cuối ngày —");

check("17 phút, chưa nộp", todayProgress({ activeSeconds: 1_020, hasCompletedWork: false }), {
  minutesDone: 17,
  minutesNeeded: 25,
  timeMet: false,
  workMet: false,
  qualified: false,
});
check("đủ giờ nhưng chưa nộp thì chưa ghi công", todayProgress({ activeSeconds: 1_800, hasCompletedWork: false }).qualified, false);
check("đủ cả hai thì ghi công", todayProgress({ activeSeconds: 1_800, hasCompletedWork: true }).qualified, true);

console.log("\n— Khoá chống ghi hai lần, đặt ở tầng database —");

check("khoá ngày học gồm cả userId và ngày", studyDayLedgerKey("u1", "2026-08-01"), "MERIT:STUDY:u1:2026-08-01");
check("cùng người cùng ngày ra cùng khoá", studyDayLedgerKey("u1", "2026-08-01"), studyDayLedgerKey("u1", "2026-08-01"));
check("khác ngày thì khác khoá", studyDayLedgerKey("u1", "2026-08-02") !== studyDayLedgerKey("u1", "2026-08-01"), true);
check("khoá phục bàn", reviewLedgerKey("r9"), "MERIT:REVIEW:r9");
check("khoá danh hiệu", titleLedgerKey("u1", "PRACTICE_02"), "MERIT:TITLE:u1:PRACTICE_02");
check("khoá thăng cấp", rankUpLedgerKey("u1", 3), "MERIT:RANKUP:u1:3");

console.log("\n— Tiêu Quân Công: CHỈ mua được một lượt Thí Bút —");

check("đủ thì qua", decideThiButPurchase({ wallet: { earnedTotal: 200, burnedTotal: 0 }, cost: 120 }), {
  ok: true,
  cost: 120,
  balanceAfter: 80,
});
check("thiếu thì bị chặn, kèm số còn thiếu", decideThiButPurchase({ wallet: { earnedTotal: 50, burnedTotal: 0 }, cost: 120 }), {
  ok: false,
  reason: "INSUFFICIENT",
  cost: 120,
  missing: 70,
});
check("vừa đủ thì qua, số dư về 0", decideThiButPurchase({ wallet: { earnedTotal: 120, burnedTotal: 0 }, cost: 120 }).ok, true);

// Đây là bài quan trọng nhất trong cả file: chữ ký hàm KHÔNG được nhận món hàng.
const spendArgs = decideThiButPurchase.length;
check(
  "decideThiButPurchase nhận đúng MỘT tham số, không có chỗ nhét mã món hàng vào",
  spendArgs,
  1
);

console.log("\n— Số khởi điểm —");

check("ngày học đạt chuẩn", MERIT_EARN.STUDY_DAY, 5);
check("phục bàn", MERIT_EARN.FEYNMAN_REVIEW, 10);
check("thăng cấp là tiền thưởng, không phải thu nhập chính", MERIT_EARN.RANK_UP, 200);
check("mọi mức thưởng đều dương", Object.values(MERIT_EARN).every((v) => v > 0), true);

check("có bản luật để tra ngược", typeof MERIT_RULE_VERSION === "string" && MERIT_RULE_VERSION.length > 0, true);
check("định dạng Quân Công", formatMerit(1_250), "1.250 quân công");

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ QUÂN CÔNG ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
