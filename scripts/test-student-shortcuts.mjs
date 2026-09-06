import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { db } from "../src/lib/db.ts";
import { hasUnreadMessages } from "../src/lib/chat/unread.ts";
import { activeStudentShortcut, showStudentQuickAccess } from "../src/lib/student/quick-access.ts";
import { NAV_NAME_MAX_CHARS, navDisplayName } from "../src/lib/student/display-name.ts";

// Chạy nguyên truy vấn SQL với dữ liệu giả trong bộ nhớ, không kết nối MySQL thật.
const fixture = new DatabaseSync(":memory:");
fixture.exec(`
  CREATE TABLE User (id TEXT PRIMARY KEY, role TEXT, active BOOLEAN, isBot BOOLEAN);
  CREATE TABLE DirectConversation (id TEXT PRIMARY KEY, participantAId TEXT, participantBId TEXT,
    participantAReadAt TEXT, participantBReadAt TEXT);
  CREATE TABLE DirectMessage (id TEXT PRIMARY KEY, conversationId TEXT, senderId TEXT, createdAt TEXT);
  INSERT INTO User VALUES ('alice', 'STUDENT', 1, 0), ('bob', 'STUDENT', 1, 0), ('outsider', 'STUDENT', 1, 0);
  INSERT INTO DirectConversation VALUES ('pair', 'alice', 'bob', NULL, NULL);
`);
const originalQuery = db.$queryRaw;
db.$queryRaw = async (strings, ...values) => {
  return fixture.prepare(strings.join("?")).all(...values);
};

try {
  assert.equal(await hasUnreadMessages("alice"), false, "hộp trống không báo tin mới");
  fixture.exec("INSERT INTO DirectMessage VALUES ('one', 'pair', 'alice', '2026-09-05 10:00:00')");
  assert.equal(await hasUnreadMessages("alice"), false, "không tính tin chính mình gửi");
  assert.equal(await hasUnreadMessages("bob"), true, "người tham gia B nhận tín hiệu");
  assert.equal(await hasUnreadMessages("outsider"), false, "không lộ trạng thái cho người ngoài cuộc");
  assert.equal(await hasUnreadMessages("bob' OR 1=1 --"), false, "ID được truyền qua tham số SQL");
  fixture.exec("UPDATE DirectConversation SET participantBReadAt = '2026-09-05 10:00:00'");
  assert.equal(await hasUnreadMessages("bob"), false, "đúng mốc đã đọc thì xóa tín hiệu");
  fixture.exec("INSERT INTO DirectMessage VALUES ('two', 'pair', 'bob', '2026-09-05 10:01:00')");
  assert.equal(await hasUnreadMessages("alice"), true, "người tham gia A nhận tín hiệu");
  assert.equal(await hasUnreadMessages("bob"), false, "gửi trả lời không tự tạo unread");
  fixture.exec("UPDATE DirectConversation SET participantAReadAt = '2026-09-05 10:02:00'");
  assert.equal(await hasUnreadMessages("alice"), false, "đọc xong xóa tín hiệu A");
  fixture.exec("INSERT INTO DirectMessage VALUES ('three', 'pair', 'bob', '2026-09-05 10:03:00')");
  assert.equal(await hasUnreadMessages("alice"), true, "tin mới sau mốc đã đọc bật lại tín hiệu");
  for (const update of ["active = 0", "role = 'ADMIN'", "isBot = 1"]) {
    fixture.exec(`UPDATE User SET active = 1, role = 'STUDENT', isBot = 0 WHERE id = 'bob'; UPDATE User SET ${update} WHERE id = 'bob'`);
    assert.equal(await hasUnreadMessages("alice"), false, `bỏ qua tài khoản không dùng hộp chat: ${update}`);
  }
} finally {
  db.$queryRaw = originalQuery;
  fixture.close();
}

assert.equal(activeStudentShortcut("/hoc-vien/tin-nhan?conversation=pair"), "/hoc-vien/tin-nhan");
assert.equal(activeStudentShortcut("/hoc-vien/dau-truong/"), "/hoc-vien/dau-truong");
assert.equal(activeStudentShortcut("/nghi-su-duong/chung/bai-viet"), "/nghi-su-duong");
assert.equal(activeStudentShortcut("/hoc-vien/nhat-khoa"), "/hoc-vien");
assert.equal(activeStudentShortcut("/"), undefined);
for (const pathname of ["/", "/hoc-vien", "/nghi-su-duong", "/luyen-tap/reading", "/hoc-vien/dau-truong"]) {
  assert.equal(showStudentQuickAccess(pathname), true);
}
// Trang xem lại bài PHẢI có thanh lối tắt: mục tra từ nằm trên đó, và đây là
// lúc học viên cần tra nhất. Đổi lại, phòng thi vẫn phải kín.
for (const pathname of ["/hoc-vien/bai-lam/one", "/hoc-vien/bai-lam/one/feynman"]) {
  assert.equal(showStudentQuickAccess(pathname), true, `xem lại bài phải hiện lối tắt: ${pathname}`);
}
for (const pathname of ["/lam-bai/one", "/hoc-vien/thi-but/READING/one", "/hoc-vien/thi-luyen/one", "/thanh-toan/one", "/quan-tri", "/dang-nhap"]) {
  assert.equal(showStudentQuickAccess(pathname), false);
}
// Tên trên nút tài khoản: tối đa ba chữ, tối đa NAV_NAME_MAX_CHARS ký tự, và
// giữ phần TÊN GỌI (đứng cuối trong tiếng Việt) chứ không giữ phần họ.
assert.equal(navDisplayName("Đặng Quang Huy"), "Đặng Quang Huy", "tên ba chữ giữ nguyên");
assert.equal(navDisplayName("Nguyễn Thị Thu Hà"), "Thị Thu Hà", "chỉ giữ ba chữ cuối");
assert.equal(navDisplayName("Huy"), "Huy", "tên một chữ giữ nguyên");
assert.equal(navDisplayName("  Trần   Văn   An  "), "Trần Văn An", "gộp khoảng trắng thừa");
assert.equal(navDisplayName(null), "Học viên", "thiếu tên thì dùng nhãn mặc định");
assert.equal(navDisplayName("   "), "Học viên", "tên toàn khoảng trắng cũng là thiếu tên");
assert.equal(navDisplayName("", "Khách"), "Khách", "nhãn mặc định thay được");
for (const name of ["Nguyễn Hoàng Phương Khanh", "Bartholomewmontgomery", "Nguyễn Thị Khánh Phương"]) {
  assert.ok(
    navDisplayName(name).length <= NAV_NAME_MAX_CHARS,
    `không vượt trần ký tự: ${name}`,
  );
  assert.ok(
    navDisplayName(name).split(" ").length <= 3,
    `không vượt trần số chữ: ${name}`,
  );
}
assert.ok(
  navDisplayName("Bartholomewmontgomery").endsWith("…"),
  "một chữ quá dài thì cắt và báo bằng dấu ba chấm",
);

console.log("✓ Tín hiệu tin chưa đọc: phân quyền, mốc đã đọc, tin của chính mình, trạng thái tài khoản và SQL tham số đều đạt.");
console.log("✓ Tên trên nút tài khoản: trần ba chữ, trần ký tự và phần tên gọi đều đạt.");
console.log("✓ Lối tắt: mục đang mở và ranh giới phòng thi/thanh toán đều đạt.");
