import {
  FORUM_COMMENT_CREATED_EVENT,
  FORUM_POST_CREATED_EVENT,
  FORUM_REALTIME_MAX_LEVEL,
  FORUM_REALTIME_REFRESH_DEBOUNCE_MS,
  buildForumCommentCreatedPayload,
  buildForumPostCreatedPayload,
  forumChannelsForViewerLevel,
  forumLevelChannel,
  forumSubscribeCapabilityForLevel,
  isForumRealtimePayload,
  rememberForumRealtimeEvent,
  settlesForumPublishWithin,
} from "../src/lib/forum/realtime-rules.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    failures += 1;
    console.error(`✗ ${label}: mong đợi ${String(expected)}, nhận ${String(actual)}`);
  } else {
    console.log(`✓ ${label}`);
  }
}

console.log("— Luật realtime Diễn đàn Ably —");

check("channel bậc 4 ổn định", forumLevelChannel(4), "forum:level:4");
check(
  "học viên bậc 4 chỉ nhận bậc 1–4",
  JSON.stringify(forumChannelsForViewerLevel(4)),
  JSON.stringify([
    "forum:level:1",
    "forum:level:2",
    "forum:level:3",
    "forum:level:4",
  ]),
);
check(
  "bậc vượt trần không mở channel thứ mười",
  forumChannelsForViewerLevel(99).length,
  FORUM_REALTIME_MAX_LEVEL,
);
check("bậc không hợp lệ không có quyền", forumChannelsForViewerLevel(0).length, 0);
check(
  "capability chỉ subscribe",
  JSON.stringify(forumSubscribeCapabilityForLevel(2)),
  JSON.stringify({
    "forum:level:1": ["subscribe"],
    "forum:level:2": ["subscribe"],
  }),
);

let badLevelBlocked = false;
try {
  forumLevelChannel(4.5);
} catch {
  badLevelBlocked = true;
}
check("channel không nhận bậc thập phân", badLevelBlocked, true);

const postPayload = buildForumPostCreatedPayload("post_1");
const commentPayload = buildForumCommentCreatedPayload("post_1", "comment_1");
check("tên sự kiện bài mới ổn định", FORUM_POST_CREATED_EVENT, "post.created");
check("tên sự kiện bình luận ổn định", FORUM_COMMENT_CREATED_EVENT, "comment.created");
check("payload bài mới hợp lệ", isForumRealtimePayload(FORUM_POST_CREATED_EVENT, postPayload), true);
check("payload bình luận hợp lệ", isForumRealtimePayload(FORUM_COMMENT_CREATED_EVENT, commentPayload), true);
check("payload không mang nội dung", "body" in commentPayload, false);
check(
  "payload có thêm nội dung bị chặn",
  isForumRealtimePayload(FORUM_POST_CREATED_EVENT, { postId: "post_1", body: "không được gửi" }),
  false,
);
check(
  "sự kiện lạ bị chặn",
  isForumRealtimePayload("post.deleted", postPayload),
  false,
);
check(
  "mã không an toàn bị chặn",
  isForumRealtimePayload(FORUM_POST_CREATED_EVENT, { postId: "../post" }),
  false,
);

const seen = new Set<string>();
check("sự kiện đầu tiên được xử lý", rememberForumRealtimeEvent(seen, FORUM_POST_CREATED_EVENT, postPayload, 2), true);
check("sự kiện phát lại bị bỏ qua", rememberForumRealtimeEvent(seen, FORUM_POST_CREATED_EVENT, postPayload, 2), false);
rememberForumRealtimeEvent(seen, FORUM_COMMENT_CREATED_EVENT, commentPayload, 2);
rememberForumRealtimeEvent(seen, FORUM_COMMENT_CREATED_EVENT, buildForumCommentCreatedPayload("post_1", "comment_2"), 2);
check("cửa sổ chống lặp có giới hạn", seen.size, 2);
check("sự kiện cũ nhất được nhả", [...seen].some((key) => key.endsWith(":post_1")), false);
check("debounce không refresh từng event", FORUM_REALTIME_REFRESH_DEBOUNCE_MS, 250);

check("publish xong trong hạn", await settlesForumPublishWithin(Promise.resolve(), 50), true);
check("publish bị từ chối không throw", await settlesForumPublishWithin(Promise.reject(new Error("test")), 50), false);
check("lỗi đồng bộ không throw", await settlesForumPublishWithin(() => { throw new Error("test"); }, 50), false);
check("publish treo bị cắt theo hạn", await settlesForumPublishWithin(new Promise(() => {}), 5), false);

let unsafeIdBlocked = false;
try {
  buildForumPostCreatedPayload("post:*");
} catch {
  unsafeIdBlocked = true;
}
check("wildcard không lọt vào payload", unsafeIdBlocked, true);

if (failures > 0) {
  console.error(`Có ${failures} kiểm thử realtime Diễn đàn thất bại.`);
  process.exit(1);
}
console.log("✅ LUẬT REALTIME DIỄN ĐÀN ĐỀU ĐẠT");
