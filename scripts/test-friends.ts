import {
  FRIENDSHIP_ACCEPTED,
  FRIENDSHIP_DECLINED,
  FRIENDSHIP_PENDING,
  FRIEND_REQUEST_RETRY_MS,
  friendRequestRetryBlocked,
  friendshipStateFor,
  orderedFriendPair,
  legacyFriendshipForConversation,
  type LegacyConversationActivity,
} from "../src/lib/friends/rules.ts";
import {
  backfillLegacyFriendships,
  type LegacyFriendshipMigrationDb,
} from "../src/lib/friends/legacy-migration.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    failures += 1;
    console.error(`✗ ${label}: mong đợi ${String(expected)}, nhận ${String(actual)}`);
  } else {
    console.log(`✓ ${label}`);
  }
}

const base = { userAId: "a-user", userBId: "z-user" };

console.log("— Luật kết bạn học viên —");
check("cặp bạn bè được sắp xếp ổn định", orderedFriendPair("z-user", "a-user").join(","), "a-user,z-user");
check("không có bản ghi là chưa kết nối", friendshipStateFor(null, "a-user"), "NONE");
check(
  "người gửi thấy trạng thái đang chờ",
  friendshipStateFor({ ...base, requestedById: "a-user", status: FRIENDSHIP_PENDING }, "a-user"),
  "OUTGOING_PENDING",
);
check(
  "người nhận thấy lời mời đến",
  friendshipStateFor({ ...base, requestedById: "a-user", status: FRIENDSHIP_PENDING }, "z-user"),
  "INCOMING_PENDING",
);
check(
  "quan hệ đã nhận cho phép đối thoại",
  friendshipStateFor({ ...base, requestedById: "a-user", status: FRIENDSHIP_ACCEPTED }, "z-user"),
  "FRIENDS",
);
check(
  "lời mời bị từ chối trở về chưa kết nối",
  friendshipStateFor({ ...base, requestedById: "a-user", status: FRIENDSHIP_DECLINED }, "z-user"),
  "NONE",
);
check(
  "bản ghi không liên quan không làm lộ trạng thái",
  friendshipStateFor(
    { ...base, requestedById: "a-user", status: FRIENDSHIP_ACCEPTED },
    "x-user",
  ),
  "NONE",
);

const now = new Date("2026-09-04T00:00:00.000Z").getTime();
const recentDecline = {
  ...base,
  requestedById: "a-user",
  status: FRIENDSHIP_DECLINED,
  respondedAt: new Date(now - FRIEND_REQUEST_RETRY_MS + 1),
};
check(
  "người vừa bị từ chối chưa được gửi lại ngay",
  friendRequestRetryBlocked(recentDecline, "a-user", now),
  true,
);
check(
  "người đã từ chối được chủ động đổi ý",
  friendRequestRetryBlocked(recentDecline, "z-user", now),
  false,
);
check(
  "hết bảy ngày thì được gửi lại",
  friendRequestRetryBlocked(
    { ...recentDecline, respondedAt: new Date(now - FRIEND_REQUEST_RETRY_MS) },
    "a-user",
    now,
  ),
  false,
);

console.log("— Chuyển lịch sử chat sang quan hệ kết bạn —");
const firstMessageAt = new Date("2026-08-01T10:00:00.000Z");
const replyAt = new Date("2026-08-02T10:00:00.000Z");
const legacy: LegacyConversationActivity = {
  id: "conversation-001",
  participantAId: "a-user",
  participantBId: "z-user",
  createdAt: new Date("2026-08-01T09:00:00.000Z"),
  lastMessageAt: replyAt,
  firstMessageByAAt: firstMessageAt,
  firstMessageByBAt: replyAt,
};
const mutual = legacyFriendshipForConversation(legacy)!;
check("chat hai chiều trở thành bạn bè", mutual.status, FRIENDSHIP_ACCEPTED);
check("mốc chấp nhận là lúc phía thứ hai trả lời", mutual.respondedAt?.getTime(), replyAt.getTime());
check("không tính lời mời cũ thành lời mời vừa gửi hôm nay", mutual.requestedAt.getTime(), firstMessageAt.getTime());
const fromA = legacyFriendshipForConversation({ ...legacy, firstMessageByBAt: null })!;
check("chat một chiều từ A cần chấp nhận", fromA.status, FRIENDSHIP_PENDING);
check("chat một chiều từ A không có mốc chấp nhận", fromA.respondedAt, null);
check("A là người gửi, B là người nhận", friendshipStateFor(fromA, "z-user"), "INCOMING_PENDING");
const fromB = legacyFriendshipForConversation({ ...legacy, firstMessageByAAt: null })!;
check("chat một chiều từ B không tự kết bạn", fromB.status, FRIENDSHIP_PENDING);
check("B là người gửi thực sự, không mặc định A", fromB.requestedById, "z-user");
check("A có quyền phản hồi lời mời do B gửi", friendshipStateFor(fromB, "a-user"), "INCOMING_PENDING");
const bFirst = legacyFriendshipForConversation({
  ...legacy, firstMessageByAAt: replyAt, firstMessageByBAt: firstMessageAt,
})!;
check("chat hai chiều B nói trước vẫn được kết bạn", bFirst.status, FRIENDSHIP_ACCEPTED);
check("giữ đúng người khởi đầu cuộc trò chuyện", bFirst.requestedById, "z-user");
check("hai tin đồng thời từ hai phía vẫn là hai chiều", legacyFriendshipForConversation({
  ...legacy, firstMessageByBAt: firstMessageAt,
})?.status, FRIENDSHIP_ACCEPTED);
check("phòng trống không sinh lời mời hoặc bạn bè", legacyFriendshipForConversation({
  ...legacy, firstMessageByAAt: null, firstMessageByBAt: null,
}), null);
check("không tạo quan hệ với chính mình từ dữ liệu lỗi", legacyFriendshipForConversation({
  ...legacy, participantBId: "a-user",
}), null);

// Kiểm tra điều phối migration bằng dữ liệu giả: phân trang, chạy lại và không
// ghi đè trạng thái. Câu SQL vẫn cần kiểm chứng thêm trên MySQL khi triển khai.
const candidates: LegacyConversationActivity[] = Array.from({ length: 102 }, (_, index) => ({
  ...legacy,
  id: `conversation-${String(index + 1).padStart(3, "0")}`,
  participantAId: `a-${index}`,
  participantBId: `z-${index}`,
}));
candidates[0] = { ...candidates[0], firstMessageByAAt: null, firstMessageByBAt: null };
type MigratedRow = NonNullable<ReturnType<typeof legacyFriendshipForConversation>>;
const stored = new Map<string, MigratedRow>();
const pairKey = (row: { userAId: string; userBId: string }) => `${row.userAId}:${row.userBId}`;
const declined = { ...legacyFriendshipForConversation(candidates[1])!, status: FRIENDSHIP_DECLINED };
stored.set(pairKey(declined), declined);
let reads = 0;
const fakeDb: LegacyFriendshipMigrationDb = {
  async $queryRaw<T>(_query: TemplateStringsArray, ...values: unknown[]): Promise<T> {
    reads += 1;
    const cursor = String(values[0]);
    return candidates.filter((row) => row.id > cursor && !stored.has(pairKey({
      userAId: row.participantAId, userBId: row.participantBId,
    }))).slice(0, 100) as T;
  },
  friendship: {
    async createMany({ data, skipDuplicates }) {
      check("migration luôn bỏ qua cặp đã tồn tại", skipDuplicates, true);
      let count = 0;
      for (const row of data) {
        const key = pairKey(row);
        if (stored.has(key)) continue;
        stored.set(key, row);
        count += 1;
      }
      return { count };
    },
  },
};
check("phân trang chuyển đủ cặp có tin, trừ phòng trống và quan hệ có sẵn", await backfillLegacyFriendships(fakeDb), 100);
check("dữ liệu lớn hơn một trang được đọc đủ", reads, 3);
check("quan hệ đã từ chối không bị tự chấp nhận lại", stored.get(pairKey(declined))?.status, FRIENDSHIP_DECLINED);
check("chạy migration lại không tạo thêm quan hệ", await backfillLegacyFriendships(fakeDb), 0);
candidates.push({
  ...legacy, id: "conversation-999", participantAId: "a-new", participantBId: "z-new", firstMessageByAAt: null,
});
check("chat phát sinh sau rollback vẫn được chuyển ở lần khởi động sau", await backfillLegacyFriendships(fakeDb), 1);
check("chat một chiều phát sinh sau vẫn chờ xác nhận", stored.get("a-new:z-new")?.status, FRIENDSHIP_PENDING);

if (failures > 0) {
  console.error(`Có ${failures} kiểm thử kết bạn thất bại.`);
  process.exit(1);
}
console.log("✅ LUẬT KẾT BẠN ĐỀU ĐẠT");
