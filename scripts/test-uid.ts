/**
 * Kiểm thử mã UID công khai.
 * Chạy: node --experimental-strip-types scripts/test-uid.ts
 *
 * Hai điều đáng kiểm nhất: bảng chữ cái KHÔNG chứa cặp ký tự nhìn giống nhau
 * (mã được đọc qua điện thoại và chép tay), và chuẩn hoá không bao giờ biến
 * một chuỗi rác thành một mã hợp lệ — tra ra nhầm người để nhắn tin còn tệ hơn
 * là không tra ra ai.
 */
import {
  UID_ALPHABET,
  UID_LENGTH,
  formatUid,
  generateUid,
  isUidLike,
  normalizeUid,
} from "../src/lib/students/uid.ts";

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

console.log("\nBẢNG CHỮ CÁI");
for (const banned of ["0", "1", "I", "L", "O", "U"]) {
  check(`không chứa ký tự dễ nhầm: ${banned}`, UID_ALPHABET.includes(banned), false);
}
check("không có ký tự nào lặp lại", new Set(UID_ALPHABET).size, UID_ALPHABET.length);
check("đủ lớn để mã không đoán được", UID_ALPHABET.length ** UID_LENGTH > 1e11, true);

console.log("\nCHUẨN HOÁ");
check("viết thường vẫn nhận", normalizeUid("k3m97qx2"), "K3M97QX2");
check("gạch nối được bỏ", normalizeUid("K3M9-7QX2"), "K3M97QX2");
check("khoảng trắng được bỏ", normalizeUid(" K3M9 7QX2 "), "K3M97QX2");
check("dấu chấm và gạch dưới cũng được bỏ", normalizeUid("K3M9_7QX2"), "K3M97QX2");
check("thiếu ký tự thì trượt", normalizeUid("K3M97QX"), "");
check("thừa ký tự thì trượt", normalizeUid("K3M97QX22"), "");
check("chứa ký tự ngoài bảng thì trượt", normalizeUid("K3M97QI2"), "");
check("chuỗi rỗng thì trượt", normalizeUid(""), "");
check("tên người không bị nhận nhầm là mã", normalizeUid("Nguyen Van A"), "");
check("email không bị nhận nhầm là mã", normalizeUid("ban@email.com"), "");
check("nhận diện đúng hình dạng mã", [isUidLike("K3M9-7QX2"), isUidLike("xin chao")], [true, false]);

console.log("\nHIỂN THỊ");
check("chèn gạch nối giữa hai nhóm bốn", formatUid("K3M97QX2"), "K3M9-7QX2");
check("nhận cả mã đã có gạch nối", formatUid("k3m9-7qx2"), "K3M9-7QX2");
check("mã rỗng hiển thị rỗng", formatUid(null), "");
check("mã hỏng hiển thị rỗng chứ không hiện rác", formatUid("KHONG-PHAI-MA"), "");

console.log("\nSINH MÃ");
// Nguồn ngẫu nhiên giả: luôn trả 0 → mã toàn ký tự đầu bảng. Đủ để kiểm hình
// dạng mà không phụ thuộc vào số ngẫu nhiên thật.
check("mã dài đúng quy định", generateUid(() => 0).length, UID_LENGTH);
check("mã sinh ra luôn hợp lệ", isUidLike(generateUid(() => 0)), true);
let calls = 0;
const cycling = generateUid(() => calls++ % UID_ALPHABET.length);
check("mỗi vị trí lấy một lần ngẫu nhiên", calls, UID_LENGTH);
check("mã sinh theo dãy vẫn hợp lệ", isUidLike(cycling), true);
check("mã sinh ra chuẩn hoá về chính nó", normalizeUid(cycling), cycling);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ UID ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
