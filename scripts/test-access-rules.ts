/**
 * Kiểm thử quy tắc quyền làm bài tập.
 * Chạy: node --experimental-strip-types scripts/test-access-rules.ts
 */
import { decideExerciseAccess } from "../src/lib/access-rules.ts";

let failures = 0;
function check(label: string, actual: boolean, expected: boolean) {
  const ok = actual === expected;
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) failures++;
}

const A = (o: Partial<Parameters<typeof decideExerciseAccess>[0]>) =>
  decideExerciseAccess({
    isAdmin: false,
    published: true,
    accessLevel: "PUBLIC",
    hasGrant: false,
    ...o,
  });

console.log("\nBài CÔNG KHAI (PUBLIC)");
check("học viên thường làm được", A({}), true);
check("bài đang ẩn thì học viên không làm được", A({ published: false }), false);

console.log("\nBài CẦN MỞ KHÓA (RESTRICTED) — phần bảo mật quan trọng nhất");
check(
  "CHƯA được cấp quyền → BỊ CHẶN",
  A({ accessLevel: "RESTRICTED", hasGrant: false }),
  false
);
check(
  "đã được cấp quyền → làm được",
  A({ accessLevel: "RESTRICTED", hasGrant: true }),
  true
);
check(
  "đã cấp quyền nhưng bài bị ẩn → vẫn chặn",
  A({ accessLevel: "RESTRICTED", hasGrant: true, published: false }),
  false
);

console.log("\nQuản trị viên");
check("làm được bài cần mở khóa dù chưa cấp quyền", A({ isAdmin: true, accessLevel: "RESTRICTED" }), true);
check("xem được cả bài đang ẩn", A({ isAdmin: true, published: false }), true);

console.log("\nGiá trị lạ / dữ liệu cũ");
check(
  "accessLevel không xác định được coi như công khai (tương thích dữ liệu cũ)",
  A({ accessLevel: "" }),
  true
);
check(
  "chữ thường 'restricted' KHÔNG khớp nên không chặn — quy ước luôn viết HOA",
  A({ accessLevel: "restricted" }),
  true
);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
