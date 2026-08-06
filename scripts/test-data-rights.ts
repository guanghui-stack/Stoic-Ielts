/**
 * Kiểm thử quyền dữ liệu của thí sinh — hàm thuần.
 * Chạy: node --experimental-strip-types scripts/test-data-rights.ts
 *
 * Bảng kê ở `data-rights.ts` phải khớp `DU-THAO-PHAP-LY-NGUYET-THI.md` mục 2.
 * Lệch nhau nghĩa là thông báo xử lý dữ liệu nói một đằng, hệ thống làm một
 * nẻo — và đó là loại sai không phát hiện được bằng cách nhìn giao diện.
 *
 * Phủ bốn quyết định của chủ dự án ngày 06/08/2026, mỗi quyết định một phép
 * thử, để lần sau ai đổi mã mà quên hỏi lại thì kiểm thử sẽ chặn.
 */
import {
  DATA_CATEGORIES,
  NOT_COLLECTED,
  RETENTION_IDENTITY_KEY_MONTHS,
  identityKeyExpiresAt,
  isIdentityKeyExpired,
  planWithdrawal,
} from "../src/lib/identity/data-rights.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

console.log("\n— Quyết định của chủ dự án 06/08/2026 —");

check(
  "identityKey giữ đúng 24 tháng, không vô thời hạn",
  RETENTION_IDENTITY_KEY_MONTHS,
  24,
);

{
  const verified = new Date("2026-08-06T00:00:00Z");
  const expires = identityKeyExpiresAt(verified);
  check("hết hạn đúng tháng 8 năm 2028", expires.toISOString().slice(0, 7), "2028-08");
  check(
    "chưa tới hạn thì chưa hết hạn",
    isIdentityKeyExpired(verified, new Date("2028-07-01T00:00:00Z")),
    false,
  );
  check(
    "quá hạn thì báo hết hạn",
    isIdentityKeyExpired(verified, new Date("2028-09-01T00:00:00Z")),
    true,
  );
}

console.log("\n— Rút đồng ý khi KHÔNG bị rà soát —");

{
  const plan = planWithdrawal(false);
  check("có nhóm được xoá", plan.erasable.length > 0, true);
  check(
    "identityKey KHÔNG bị xoá — nếu xoá thì mở đúng lỗ hổng nó sinh ra để bịt",
    plan.erasable.some((c) => c.code === "IDENTITY_KEY"),
    false,
  );
  check(
    "nhật ký phòng thi KHÔNG bị xoá",
    plan.erasable.some((c) => c.code === "EXAM_EVENTS"),
    false,
  );
  check(
    "họ tên và ngày sinh thì xoá được",
    ["FULL_NAME", "BIRTH_DATE"].every((code) =>
      plan.erasable.some((c) => c.code === code),
    ),
    true,
  );
  check(
    "mọi nhóm bị giữ lại đều có lý do nói rõ cho thí sinh",
    plan.retained.every((r) => r.reason.length > 30),
    true,
  );
}

console.log("\n— Rút đồng ý KHI đang bị rà soát —");

{
  // Quyết định của chủ dự án: KHÔNG buộc xóa. Nếu ngược lại thì ai sắp bị loại
  // cũng chỉ cần rút đồng ý là xóa sạch bằng chứng chống lại mình.
  const plan = planWithdrawal(true);
  check("đang rà soát thì KHÔNG xoá nhóm nào", plan.erasable.length, 0);
  check("mọi nhóm đều được giữ", plan.retained.length, DATA_CATEGORIES.length);
  check("có đánh dấu đang rà soát", plan.underReview, true);
  check(
    "lý do giữ có nhắc tới việc rà soát",
    plan.retained.some((r) => r.reason.includes("rà soát")),
    true,
  );
}

console.log("\n— Toàn vẹn bảng kê —");

check(
  "mọi nhóm có mã duy nhất",
  new Set(DATA_CATEGORIES.map((c) => c.code)).size,
  DATA_CATEGORIES.length,
);
check(
  "mọi nhóm đều khai thời hạn lưu",
  DATA_CATEGORIES.every((c) => c.retention.trim().length > 0),
  true,
);
check(
  "mọi nhóm đều khai mục đích",
  DATA_CATEGORIES.every((c) => c.purpose.trim().length > 0),
  true,
);
check(
  "số giấy tờ lưu dạng KHÔNG hoàn nguyên được",
  DATA_CATEGORIES.find((c) => c.code === "IDENTITY_KEY")?.storage,
  "IRREVERSIBLE",
);
check(
  "vân tay thiết bị và IP đều được băm",
  DATA_CATEGORIES.find((c) => c.code === "DEVICE_FINGERPRINT")?.storage,
  "HASHED",
);

console.log("\n— Danh sách KHÔNG thu thập —");

{
  // Bản chính sách cũ từng mô tả webcam và ảnh màn hình. Chủ dự án đã bỏ hạ
  // tầng giám sát, nên danh sách này phải nói thẳng để người đọc bản mới biết.
  const joined = NOT_COLLECTED.join(" ").toLowerCase();
  check("nói rõ không có webcam", joined.includes("webcam"), true);
  check("nói rõ không ghi màn hình", joined.includes("màn hình"), true);
  check("nói rõ không lưu ảnh giấy tờ", joined.includes("giấy tờ"), true);
  check("nói rõ không có dữ liệu sinh trắc", joined.includes("sinh trắc"), true);
}

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ QUYỀN DỮ LIỆU ĐỀU ĐẠT\n"
    : `\n❌ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
