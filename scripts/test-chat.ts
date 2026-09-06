import {
  MESSAGE_MAX,
  STRANGER_MESSAGE_LIMIT,
  conversationPermissions,
  conversationSendGate,
  orderedParticipants,
  validateMessageBody,
} from "../src/lib/chat/rules.ts";

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

const conversation = { participantAId: "a-user", participantBId: "z-user" };
for (const viewerId of ["a-user", "z-user"]) {
  check(`${viewerId} đọc được lịch sử`, conversationPermissions(conversation, viewerId).canRead, true);
}
check("người ngoài không đọc được lịch sử", conversationPermissions(conversation, "outsider").canRead, false);

console.log("— Hạn mức nhắn cho người chưa kết bạn —");
const gate = (over: Partial<Parameters<typeof conversationSendGate>[0]> = {}) =>
  conversationSendGate({
    isParticipant: true,
    friendshipStatus: null,
    sentByViewer: 0,
    otherHasReplied: false,
    ...over,
  });

check("người ngoài cuộc trò chuyện không gửi được", gate({ isParticipant: false }).canSend, false);
check("người lạ vẫn gửi được tin đầu tiên", gate().canSend, true);
check(`người lạ được đúng ${STRANGER_MESSAGE_LIMIT} lượt`, gate().remaining, STRANGER_MESSAGE_LIMIT);
check("gửi một tin thì còn hai lượt", gate({ sentByViewer: 1 }).remaining, 2);
check("gửi đủ ba tin thì hết lượt", gate({ sentByViewer: STRANGER_MESSAGE_LIMIT }).canSend, false);
check("hết lượt thì nói rõ vì sao", gate({ sentByViewer: 5 }).reason, "STRANGER_LIMIT");
check("gửi lố vẫn không cho số âm", gate({ sentByViewer: 99 }).remaining, 0);

// Người kia trả lời là đã đồng ý nói chuyện — hạn mức phải được gỡ ngay, không
// bắt họ bấm thêm nút kết bạn mới được nói tiếp.
check("người kia trả lời thì gỡ hạn mức", gate({ sentByViewer: 99, otherHasReplied: true }).canSend, true);
check("gỡ hạn mức thì không còn bị đếm", gate({ otherHasReplied: true }).limited, false);

for (const status of [null, "PENDING", "DECLINED", "UNKNOWN"]) {
  check(`trạng thái ${status} vẫn bị đếm hạn mức`, gate({ friendshipStatus: status }).limited, true);
}
check("đã kết bạn thì không giới hạn", gate({ friendshipStatus: "ACCEPTED", sentByViewer: 999 }).canSend, true);
check("đã kết bạn thì không bị đếm", gate({ friendshipStatus: "ACCEPTED" }).limited, false);

if (failures > 0) {
  console.error(`Có ${failures} kiểm thử chat thất bại.`);
  process.exit(1);
}
console.log("✅ LUẬT CHAT ĐỀU ĐẠT");
