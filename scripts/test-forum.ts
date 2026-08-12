/**
 * Kiểm thử luật Nghị Sự Đường.
 * Chạy: node --experimental-strip-types scripts/test-forum.ts
 *
 * Hai chỗ sai ở đây không có thông báo lỗi nào: quyền vào phòng (học viên đọc
 * được thứ không được phép đọc) và phép cộng phiếu (uy vọng trôi khỏi sự thật).
 */
import {
  MAX_DEPTH,
  buildCommentTree,
  checkText,
  decideForumAccess,
  depthForReply,
  nextVoteValue,
  visibleChannelLevels,
  voteDelta,
  type CommentRow,
} from "../src/lib/forum/rules.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const base = {
  competitionLive: false,
  channelLocked: false,
  banned: false,
  isAdmin: false,
};
const A = (o: Partial<Parameters<typeof decideForumAccess>[0]>) =>
  decideForumAccess({ userLevel: 3, channelLevel: 3, ...base, ...o });

console.log("\n— Ai vào được phòng nào —");

check("đúng bậc của mình: đọc và viết được", A({}), {
  canRead: true,
  canWrite: true,
  blockedBy: null,
});

// Đây là điều chủ dự án chốt 12/08: bậc cao quay về phòng dưới ĐĂNG BÀI được,
// không chỉ bình luận. Chính nó khiến phòng bậc thấp không thành phòng chết.
check("bậc 9 vào phòng bậc 1: viết được", A({ userLevel: 9, channelLevel: 1 }), {
  canRead: true,
  canWrite: true,
  blockedBy: null,
});

check("bậc 1 vào phòng bậc 3: KHÔNG đọc được", A({ userLevel: 1, channelLevel: 3 }), {
  canRead: false,
  canWrite: false,
  blockedBy: "RANK",
});

check("thiếu đúng một bậc vẫn bị chặn", A({ userLevel: 2, channelLevel: 3 }), {
  canRead: false,
  canWrite: false,
  blockedBy: "RANK",
});

console.log("\n— Bốn lý do bị chặn viết, đúng thứ tự ưu tiên —");

check("Nguyệt Thí: đọc được, không viết được", A({ competitionLive: true }), {
  canRead: true,
  canWrite: false,
  blockedBy: "COMPETITION",
});

check("phòng bị khóa: đọc được, không viết được", A({ channelLocked: true }), {
  canRead: true,
  canWrite: false,
  blockedBy: "CHANNEL_LOCKED",
});

check("bị cấm đăng: vẫn đọc được", A({ banned: true }), {
  canRead: true,
  canWrite: false,
  blockedBy: "BANNED",
});

// Thứ tự này là cố ý. Chưa đủ bậc thì phải nhận đúng lý do "chưa đủ bậc" — báo
// nhầm thành "đang kỳ thi" là dẫn người ta đi chờ một thứ không bao giờ tới.
check(
  "chưa đủ bậc + đang kỳ thi → lý do phải là RANK, không phải COMPETITION",
  A({ userLevel: 1, channelLevel: 5, competitionLive: true }),
  { canRead: false, canWrite: false, blockedBy: "RANK" }
);

check(
  "bị cấm đăng xét TRƯỚC kỳ thi — lệnh cấm không hết hạn theo kỳ thi",
  A({ banned: true, competitionLive: true }).blockedBy,
  "BANNED"
);

console.log("\n— Quản trị viên —");

check("quản trị viên vào được phòng bậc 9 dù bậc 1", A({ userLevel: 1, channelLevel: 9, isAdmin: true }), {
  canRead: true,
  canWrite: true,
  blockedBy: null,
});
// Có sự cố thì người đi dọn phải vào được, kể cả phòng vừa bị khóa vì sự cố đó.
check(
  "quản trị viên viết được cả trong phòng đã khóa và trong kỳ thi",
  A({ isAdmin: true, channelLocked: true, competitionLive: true, banned: true }),
  { canRead: true, canWrite: true, blockedBy: null }
);

console.log("\n— Danh sách phòng nhìn thấy —");

check("bậc 1 chỉ thấy một phòng", visibleChannelLevels(1), [1]);
check("bậc 4 thấy bốn phòng", visibleChannelLevels(4), [1, 2, 3, 4]);
check("bậc 9 thấy cả chín phòng", visibleChannelLevels(9), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
check("bậc 0 (dữ liệu hỏng) không thấy phòng nào", visibleChannelLevels(0), []);

console.log("\n— Phép cộng phiếu —");

check("chưa bầu → cắm cờ: +1", voteDelta(0, 1), 1);
check("chưa bầu → hạ cờ: -1", voteDelta(0, -1), -1);
// Đổi phiếu phải là 2 điểm, không phải 1. Tính 1 là uy vọng trôi dần khỏi sự
// thật sau mỗi lần ai đó đổi ý, và không ai phát hiện ra vì số vẫn "hợp lý".
check("cắm cờ → hạ cờ: -2, không phải -1", voteDelta(1, -1), -2);
check("hạ cờ → cắm cờ: +2", voteDelta(-1, 1), 2);
check("rút phiếu cắm cờ: -1", voteDelta(1, 0), -1);
check("rút phiếu hạ cờ: +1", voteDelta(-1, 0), 1);
check("bầu lại đúng thứ đang bầu: 0", voteDelta(1, 1), 0);

check("bấm lại nút đang sáng thì rút phiếu", nextVoteValue(1, 1), 0);
check("bấm nút kia thì đổi phiếu", nextVoteValue(1, -1), -1);
check("chưa bầu thì bấm là bầu", nextVoteValue(0, -1), -1);

console.log("\n— Độ sâu cây —");

check("bình luận gốc ở tầng 0", depthForReply(null), 0);
check("trả lời tầng 0 ra tầng 1", depthForReply(0), 1);
check("trả lời tầng 4 ra tầng 5", depthForReply(4), 5);
// Trả lời ở tầng cuối gắn vào chính tầng đó thay vì thụt thêm — sâu hơn nữa
// thì trên điện thoại chỉ còn một cột chữ rộng vài ký tự.
check("trả lời ở tầng cuối KHÔNG thụt thêm", depthForReply(MAX_DEPTH), MAX_DEPTH);
check("tầng vượt trần vẫn bị kẹp lại", depthForReply(99), MAX_DEPTH);

console.log("\n— Dựng cây bình luận —");

const t = (n: number) => new Date(2026, 0, 1, 0, 0, n);
const rows: CommentRow[] = [
  { id: "c1", parentId: null, createdAt: t(1), score: 2 },
  { id: "c2", parentId: null, createdAt: t(2), score: 9 },
  { id: "c3", parentId: "c1", createdAt: t(3), score: 0 },
  { id: "c4", parentId: "c1", createdAt: t(4), score: 5 },
  { id: "c5", parentId: "c4", createdAt: t(5), score: 0 },
];
const tree = buildCommentTree(rows);

check("hai bình luận gốc", tree.map((n) => n.id), ["c2", "c1"]);
check("uy vọng cao lên trước", tree[0].id, "c2");
check("con của c1 xếp theo uy vọng", tree[1].children.map((n) => n.id), ["c4", "c3"]);
check("cháu nằm đúng chỗ", tree[1].children[0].children.map((n) => n.id), ["c5"]);
check("độ sâu tính từ gốc", [tree[1].depth, tree[1].children[0].depth, tree[1].children[0].children[0].depth], [0, 1, 2]);

// Danh sách trả về từ database không đảm bảo cha đứng trước con. Tính độ sâu
// lúc nối sẽ ra số sai cho những hàng tới sớm.
const reversed = buildCommentTree([...rows].reverse());
check("đảo thứ tự đầu vào vẫn ra cùng một cây", JSON.stringify(reversed.map((n) => n.id)), JSON.stringify(["c2", "c1"]));

// Cha bị xóa cứng thì con phải nổi lên gốc chứ không biến mất — mất cả một
// nhánh thảo luận vì một hàng lỗi là quá đắt.
const orphan = buildCommentTree([{ id: "x", parentId: "khong-ton-tai", createdAt: t(1), score: 0 }]);
check("bình luận mồ côi được nâng lên gốc, không mất", orphan.map((n) => n.id), ["x"]);

check("bài chưa có bình luận nào ra cây rỗng", buildCommentTree([]), []);

console.log("\n— Kiểm chữ nhập vào —");

check("quá ngắn bị từ chối", checkText("ab", 6, 100, "Tiêu đề").ok, false);
check("quá dài bị từ chối", checkText("x".repeat(101), 6, 100, "Tiêu đề").ok, false);
check("cắt khoảng trắng hai đầu", checkText("  chào các bạn  ", 5, 100, "Nội dung"), {
  ok: true,
  value: "chào các bạn",
});
// Xuống dòng GIỮA bài là cấu trúc bài viết, không phải rác.
check(
  "giữ xuống dòng ở giữa",
  checkText("dòng một\r\ndòng hai", 5, 100, "Nội dung"),
  { ok: true, value: "dòng một\ndòng hai" }
);
// Chống chèn mã nằm ở chỗ HIỂN THỊ (kết xuất văn bản thuần), không ở chỗ nhập.
// Lọc lúc nhập luôn sót, và sót một lần là lưu vĩnh viễn thứ độc hại.
check(
  "KHÔNG đụng vào ký tự HTML — an toàn nằm ở chỗ hiển thị",
  checkText("<script>alert(1)</script>", 5, 100, "Nội dung"),
  { ok: true, value: "<script>alert(1)</script>" }
);
check("toàn khoảng trắng bị từ chối", checkText("      ", 2, 100, "Nội dung").ok, false);

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ NGHỊ SỰ ĐƯỜNG ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
