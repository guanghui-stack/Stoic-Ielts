import {
  CHAT_REALTIME_EVENT,
  CHAT_REALTIME_TOKEN_TTL_MS,
  STUDENT_PRESENCE_CHANNEL,
  buildChatMessageCreatedPayload,
  canUseChatRealtime,
  chatRefreshInterval,
  chatTokenParams,
  chatUserChannel,
  isChatMessageCreatedPayload,
  rememberRealtimeMessage,
  settlesWithin,
  studentRealtimeTokenParams,
} from "../src/lib/chat/realtime-rules.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    failures += 1;
    console.error(`✗ ${label}: mong đợi ${String(expected)}, nhận ${String(actual)}`);
  } else {
    console.log(`✓ ${label}`);
  }
}

console.log("— Luật chat realtime Ably —");

const userId = "student_123";
const channel = chatUserChannel(userId);
const token = chatTokenParams(userId);
check("channel chỉ thuộc đúng học viên", channel, "chat:user:student_123");
check("token gắn clientId từ server", token.clientId, userId);
check("token chỉ sống mười phút", token.ttl, CHAT_REALTIME_TOKEN_TTL_MS);
check(
  "capability chỉ có quyền subscribe channel cá nhân",
  JSON.stringify(token.capability),
  JSON.stringify({ [channel]: ["subscribe"] }),
);
const sitewideToken = studentRealtimeTokenParams(userId, 2);
check(
  "token sitewide chỉ mở đúng presence, chat cá nhân và các bậc đã đạt",
  JSON.stringify(sitewideToken.capability),
  JSON.stringify({
    [channel]: ["subscribe"],
    [STUDENT_PRESENCE_CHANNEL]: ["presence", "subscribe"],
    "forum:level:1": ["subscribe"],
    "forum:level:2": ["subscribe"],
  }),
);
check(
  "token sitewide không cho trình duyệt publish",
  JSON.stringify(sitewideToken.capability).includes("publish"),
  false,
);
check("học viên hoạt động được kết nối", canUseChatRealtime({ role: "STUDENT", active: true, isBot: false }), true);
check("admin không được kết nối", canUseChatRealtime({ role: "ADMIN", active: true, isBot: false }), false);
check("bot không được kết nối", canUseChatRealtime({ role: "STUDENT", active: true, isBot: true }), false);
check("tài khoản khóa không được kết nối", canUseChatRealtime({ role: "STUDENT", active: false, isBot: false }), false);
check("chưa nối Ably vẫn polling nhanh", chatRefreshInterval(true, false), 8_000);
check("nối Ably rồi giảm polling dự phòng", chatRefreshInterval(true, true), 60_000);
check("tắt Ably giữ polling hiện hữu", chatRefreshInterval(false, false), 8_000);

const payload = buildChatMessageCreatedPayload("conversation_1", "message_1");
check("tên sự kiện ổn định", CHAT_REALTIME_EVENT, "message.created");
check("payload hợp lệ được nhận", isChatMessageCreatedPayload(payload), true);
check("payload không mang nội dung chat", "body" in payload, false);
check("payload thiếu messageId bị chặn", isChatMessageCreatedPayload({ conversationId: "conversation_1" }), false);
check("payload có id lạ bị chặn", isChatMessageCreatedPayload({ conversationId: "../x", messageId: "message_1" }), false);

const seen = new Set<string>();
check("sự kiện đầu tiên được xử lý", rememberRealtimeMessage(seen, "m1", 2), true);
check("sự kiện phát lại bị bỏ qua", rememberRealtimeMessage(seen, "m1", 2), false);
rememberRealtimeMessage(seen, "m2", 2);
rememberRealtimeMessage(seen, "m3", 2);
check("cửa sổ chống lặp có giới hạn", seen.size, 2);
check("mã cũ nhất được nhả khỏi bộ nhớ", seen.has("m1"), false);

check("publish thành công trong hạn", await settlesWithin(Promise.resolve(), 50), true);
check("publish bị từ chối không làm throw", await settlesWithin(Promise.reject(new Error("test")), 50), false);
check("lỗi đồng bộ của SDK không làm throw", await settlesWithin(() => { throw new Error("test"); }, 50), false);
check("publish treo bị cắt theo hạn", await settlesWithin(new Promise(() => {}), 5), false);

let unsafeIdBlocked = false;
try {
  chatUserChannel("student:*");
} catch {
  unsafeIdBlocked = true;
}
check("wildcard không lọt vào channel", unsafeIdBlocked, true);

if (failures > 0) {
  console.error(`Có ${failures} kiểm thử chat realtime thất bại.`);
  process.exit(1);
}
console.log("✅ LUẬT CHAT REALTIME ĐỀU ĐẠT");
