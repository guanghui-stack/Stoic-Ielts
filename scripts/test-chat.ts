import { MESSAGE_MAX, orderedParticipants, validateMessageBody } from "../src/lib/chat/rules.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    failures += 1;
    console.error(`✗ ${label}: mong đợi ${String(expected)}, nhận ${String(actual)}`);
  } else {
    console.log(`✓ ${label}`);
  }
}

console.log("— Luật chat học viên —");
check("cặp participant được sắp xếp ổn định", orderedParticipants("z-user", "a-user").join(","), "a-user,z-user");
check("đổi thứ tự vẫn cho cùng một cặp", orderedParticipants("a-user", "z-user").join(","), "a-user,z-user");
check("tin trống bị chặn", validateMessageBody("   ").ok, false);
const normalized = validateMessageBody("  Xin chào  ");
check("tin có khoảng trắng đầu/cuối được chuẩn hóa", normalized.ok ? normalized.value : null, "Xin chào");
check("tin đúng giới hạn được nhận", validateMessageBody("x".repeat(MESSAGE_MAX)).ok, true);
check("tin vượt giới hạn bị chặn", validateMessageBody("x".repeat(MESSAGE_MAX + 1)).ok, false);

if (failures > 0) {
  console.error(`Có ${failures} kiểm thử chat thất bại.`);
  process.exit(1);
}
console.log("✅ LUẬT CHAT ĐỀU ĐẠT");
