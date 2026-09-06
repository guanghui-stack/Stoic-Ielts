/**
 * Kiểm thử uy vọng của học viên và việc quy đổi sang Đức Hạnh.
 * Chạy: node --experimental-strip-types scripts/test-reputation.ts
 *
 * Đây là một đường SINH RA Đức Hạnh, mà Đức Hạnh mua được đề và đặt cược được
 * ở đấu trường. Hai điều không được sai:
 *
 *   1. Uy vọng ÂM không quy đổi được. Cho phép thì người bị dislike nhiều sẽ
 *      tạo ra Đức Hạnh âm rồi xoá bài để kéo ví về 0.
 *   2. Quy đổi hai lần không được nhận đôi. Khoá sổ cái phải giống hệt nhau
 *      giữa hai cú bấm liên tiếp, để ràng buộc unique chặn được cái thứ hai.
 */
import {
  REPUTATION_TO_MERIT_RATE,
  convertibleReputation,
  meritForReputation,
  reputationBalance,
  reputationLedgerKey,
} from "../src/lib/forum/reputation.ts";

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

console.log("\nSỐ UY VỌNG ĐANG CÓ");
check("chưa quy đổi thì đang có đúng bằng kiếm được", reputationBalance(40, 0), 40);
check("đã quy đổi thì bị trừ đúng bấy nhiêu", reputationBalance(40, 25), 15);
check("kiếm thêm sau khi quy đổi vẫn cộng tiếp", reputationBalance(60, 25), 35);
check("bị dislike nhiều thì âm, và nói thật là âm", reputationBalance(-8, 0), -8);
check("quy đổi rồi mới bị dislike thì cũng âm", reputationBalance(10, 25), -15);

console.log("\nQUY ĐỔI ĐƯỢC BAO NHIÊU");
check("số dương thì đổi được hết", convertibleReputation(40, 0), 40);
check("đổi rồi thì chỉ còn phần mới", convertibleReputation(60, 25), 35);
check("đổi hết rồi thì không còn gì", convertibleReputation(40, 40), 0);
check("SỐ ÂM KHÔNG ĐỔI ĐƯỢC", convertibleReputation(-8, 0), 0);
check("âm do đã đổi trước đó cũng không đổi được", convertibleReputation(10, 25), 0);
check("bằng không thì không đổi được", convertibleReputation(0, 0), 0);

console.log("\nTỈ LỆ 1:1");
check("tỉ lệ đúng bằng 1", REPUTATION_TO_MERIT_RATE, 1);
check("40 uy vọng thành 40 Đức Hạnh", meritForReputation(40), 40);
check("1 uy vọng thành 1 Đức Hạnh", meritForReputation(1), 1);
check("không sinh Đức Hạnh từ số âm", meritForReputation(-5), 0);
check("không sinh Đức Hạnh từ số không", meritForReputation(0), 0);

console.log("\nKHOÁ SỔ CÁI CHỐNG NHẬN ĐÔI");
check(
  "cùng một lần quy đổi cho cùng một khoá",
  reputationLedgerKey("u1", 40),
  reputationLedgerKey("u1", 40),
);
check(
  "hai người khác nhau thì khác khoá",
  reputationLedgerKey("u1", 40) === reputationLedgerKey("u2", 40),
  false,
);
check(
  "lần quy đổi sau có khoá khác",
  reputationLedgerKey("u1", 40) === reputationLedgerKey("u1", 75),
  false,
);
check("khoá mang tiền tố nhận ra được trong sổ", reputationLedgerKey("u1", 40).startsWith("MERIT:REPUTATION:"), true);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ UY VỌNG ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
