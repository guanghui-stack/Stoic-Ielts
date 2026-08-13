/**
 * Luật của Nghị Sự Đường — HÀM THUẦN, không chạm database, không giữ bí mật.
 *
 * Kiểm thử bằng node thuần (`scripts/test-forum.ts`). Mọi câu hỏi "ai đọc
 * được, ai đăng được, phiếu này cộng mấy điểm" phải trả lời ở đây, để nơi
 * hiển thị và nơi chặn ở máy chủ dùng chung một luật.
 *
 * BỐN ĐIỀU ĐÃ CHỐT VỚI CHỦ DỰ ÁN (12/08/2026), đừng tự đổi:
 * 1. **Chín phòng, mỗi bậc một phòng.** Phòng bậc N mở đầy đủ cho mọi người
 *    từ bậc N trở lên — bậc cao quay về phòng dưới ĐĂNG BÀI được, không chỉ
 *    bình luận. Đây chính là thứ khiến phòng bậc cao không thành phòng chết.
 * 2. **Khóa đăng và bình luận trong khung giờ Nguyệt Thí**, vẫn đọc được.
 *    Một câu "câu 12 chọn NOT GIVEN" là đủ hỏng cả kỳ thi.
 * 3. Hai chiều phiếu: **Cắm cờ** (+1) và **Hạ cờ** (−1).
 * 4. Chỉ chữ. Ảnh, tệp, video để bản sau.
 */

/** Tên hai nút. Đổi ở đây là đổi cả website. */
export const VOTE_LABELS = {
  UP: "Cắm cờ",
  DOWN: "Hạ cờ",
} as const;

/**
 * Điểm cộng dồn gọi là **uy vọng**.
 *
 * CỐ Ý không gọi là "quân công": `ranks/catalog.ts` đã dùng từ đó cho công
 * trạng làm bài ("Người áo vải chưa có quân công"). Ba thứ đếm được thì phải
 * ba tên khác nhau — xu là tiền, quân công là học tập, uy vọng là đóng góp
 * cho cộng đồng. Trùng tên là ngày nào đó có người cộng nhầm hai thứ.
 */
export const SCORE_LABEL = "uy vọng";

/**
 * Độ sâu tối đa của cây bình luận.
 *
 * Sâu hơn 5 tầng thì trên điện thoại chỉ còn một cột chữ rộng vài ký tự. Trả
 * lời ở tầng cuối sẽ gắn vào chính tầng đó và nhắc tên người được trả lời,
 * thay vì thụt thêm — Reddit cũng làm vậy sau khi thử cách kia và thất bại.
 */
export const MAX_DEPTH = 5;

/** Giới hạn tần suất. Diễn đàn mới mở là mồi ngon cho spam. */
export const RATE_LIMITS = {
  postsPerDay: 5,
  commentsPerHour: 30,
} as const;

export const TITLE_MIN = 6;
export const TITLE_MAX = 160;
export const BODY_MIN = 10;
export const BODY_MAX = 8_000;
export const COMMENT_MIN = 2;
export const COMMENT_MAX = 4_000;

export type ForumAccess = {
  canRead: boolean;
  canWrite: boolean;
  /** Vì sao không viết được — để giao diện nói đúng câu, không nói chung chung. */
  blockedBy: "RANK" | "COMPETITION" | "CHANNEL_LOCKED" | "BANNED" | null;
};

/**
 * Ai vào được phòng nào.
 *
 * Thứ tự xét là cố ý: **quyền đọc xét trước mọi lý do khóa**. Người chưa đủ
 * bậc thì không đọc được, chấm hết; còn người đủ bậc mà đang kỳ thi thì vẫn
 * đọc được, chỉ không viết. Đảo thứ tự sẽ báo "đang kỳ thi" cho người lẽ ra
 * phải nhận câu "chưa đủ bậc" — sai lý do là dẫn người ta đi chờ một thứ
 * không bao giờ tới.
 */
export function decideForumAccess(input: {
  userLevel: number;
  channelLevel: number;
  /** Nguyệt Thí đang trong khung giờ thi. */
  competitionLive: boolean;
  /** Quản trị viên đã khóa phòng này. */
  channelLocked: boolean;
  /** Tài khoản bị cấm đăng trên diễn đàn. */
  banned: boolean;
  isAdmin: boolean;
}): ForumAccess {
  // Quản trị viên đọc và viết được mọi phòng, kể cả phòng đã khóa — họ là
  // người phải vào dọn khi có sự cố.
  if (input.isAdmin) return { canRead: true, canWrite: true, blockedBy: null };

  if (input.userLevel < input.channelLevel) {
    return { canRead: false, canWrite: false, blockedBy: "RANK" };
  }

  if (input.banned) {
    return { canRead: true, canWrite: false, blockedBy: "BANNED" };
  }

  // Nguyệt Thí xét TRƯỚC khóa phòng: nó là lý do toàn hệ thống và có thời hạn
  // rõ ràng, nên câu thông báo của nó hữu ích hơn ("mở lại sau kỳ thi").
  if (input.competitionLive) {
    return { canRead: true, canWrite: false, blockedBy: "COMPETITION" };
  }

  if (input.channelLocked) {
    return { canRead: true, canWrite: false, blockedBy: "CHANNEL_LOCKED" };
  }

  return { canRead: true, canWrite: true, blockedBy: null };
}

/** Các phòng một người nhìn thấy: mọi phòng từ bậc 1 tới bậc của họ. */
export function visibleChannelLevels(userLevel: number): number[] {
  const levels: number[] = [];
  for (let level = 1; level <= userLevel; level++) levels.push(level);
  return levels;
}

export type VoteValue = 1 | -1 | 0;

/**
 * Điểm uy vọng thay đổi bao nhiêu khi một người đổi phiếu.
 *
 * Bấm lại đúng nút đang chọn = rút phiếu (về 0). Đây là hành vi mọi người
 * quen từ Reddit, và quan trọng hơn: nó là đường DUY NHẤT để rút phiếu, nên
 * thiếu nó thì một cú bấm nhầm là vĩnh viễn.
 */
export function voteDelta(oldValue: VoteValue, newValue: VoteValue): number {
  return newValue - oldValue;
}

export type CountDelta = { up: number; down: number };

/**
 * Hai số đếm cờ thay đổi bao nhiêu.
 *
 * VÌ SAO CẦN, dù đã có `voteDelta`: giao diện hiện HAI số riêng chứ không hiện
 * một hiệu số. Đổi từ cắm sang hạ làm hiệu số nhảy 2 — đúng về toán học nhưng
 * người dùng đọc thành "vừa mất 2 cờ". Với hai số riêng thì cùng thao tác đó
 * đọc ra đúng thứ đã xảy ra: bớt một cờ cắm, thêm một cờ hạ.
 *
 * Mỗi số CHỈ đổi tối đa 1 đơn vị cho mỗi cú bấm. Đó là bất biến của hàm này.
 */
export function voteCountDelta(
  oldValue: VoteValue,
  newValue: VoteValue
): CountDelta {
  return {
    up: (newValue === 1 ? 1 : 0) - (oldValue === 1 ? 1 : 0),
    down: (newValue === -1 ? 1 : 0) - (oldValue === -1 ? 1 : 0),
  };
}

/** Bấm lại nút đang sáng thì rút phiếu; bấm nút kia thì đổi phiếu. */
export function nextVoteValue(
  current: VoteValue,
  clicked: 1 | -1
): VoteValue {
  return current === clicked ? 0 : clicked;
}

export type TextCheck = { ok: true; value: string } | { ok: false; error: string };

/**
 * Làm sạch và kiểm một đoạn chữ người dùng nhập.
 *
 * Chuẩn hóa xuống dòng và cắt khoảng trắng thừa hai đầu, nhưng GIỮ NGUYÊN
 * xuống dòng ở giữa — đó là cấu trúc bài viết. Không đụng gì tới ký tự khác:
 * việc chống chèn mã nằm ở chỗ HIỂN THỊ (kết xuất văn bản thuần, không dựng
 * HTML), không phải ở chỗ nhập. Lọc ở chỗ nhập luôn sót, và sót một lần là
 * lưu vĩnh viễn thứ độc hại vào database.
 */
export function checkText(
  raw: string,
  min: number,
  max: number,
  what: string
): TextCheck {
  const value = raw.replace(/\r\n/g, "\n").trim();
  if (value.length < min) {
    return { ok: false, error: `${what} cần tối thiểu ${min} ký tự.` };
  }
  if (value.length > max) {
    return { ok: false, error: `${what} tối đa ${max} ký tự.` };
  }
  return { ok: true, value };
}

/**
 * Cửa sổ gỡ lời bàn của chính mình: 10 phút.
 *
 * Có hạn chứ không mở vĩnh viễn là cố ý. Gỡ được bất cứ lúc nào thì một người
 * có thể xóa sạch vế của mình sau khi tranh luận đã kết thúc, để lại những câu
 * trả lời treo lơ lửng không còn ai hiểu đang đáp lại điều gì. Mười phút đủ để
 * sửa một cú bấm nhầm hay một câu viết vội, chưa đủ để viết lại lịch sử.
 */
export const COMMENT_DELETE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Ai được gỡ một lời bàn.
 *
 * Chỉ CHÍNH TÁC GIẢ, và chỉ trong cửa sổ trên. Quản trị viên không đi đường
 * này — họ có nút ẩn riêng, và việc đó phải để lại dấu vết khác hẳn với việc
 * người viết tự rút lời.
 */
export function canDeleteComment(input: {
  authorId: string;
  viewerId: string;
  createdAt: Date;
  now?: Date;
}): boolean {
  if (input.authorId !== input.viewerId) return false;
  const now = input.now ?? new Date();
  const age = now.getTime() - input.createdAt.getTime();
  // Mốc tạo nằm ở tương lai nghĩa là đồng hồ lệch — từ chối thay vì mở toang.
  if (age < 0) return false;
  return age <= COMMENT_DELETE_WINDOW_MS;
}

/** Số phút còn lại để gỡ, làm tròn lên. 0 nghĩa là đã quá hạn. */
export function deleteMinutesLeft(createdAt: Date, now = new Date()): number {
  const left = COMMENT_DELETE_WINDOW_MS - (now.getTime() - createdAt.getTime());
  return left <= 0 ? 0 : Math.ceil(left / 60_000);
}

/**
 * Bỏ những lời bàn đã gỡ mà KHÔNG còn ai trả lời bên dưới.
 *
 * Lời bàn đã gỡ nhưng còn con thì phải giữ lại làm bia mộ: xóa nó đi là cắt
 * đứt mạch, và những câu trả lời bên dưới bỗng treo lơ lửng không rõ đang đáp
 * lại điều gì. Còn một lời bàn gỡ mà không ai trả lời thì giữ lại chỉ là rác.
 *
 * Cắt từ dưới lên: gỡ hết lá rồi mới xét cha, nên một nhánh toàn lời đã gỡ sẽ
 * biến mất trọn vẹn thay vì để lại một chuỗi bia mộ rỗng.
 */
export function pruneDeletedLeaves<T extends CommentRow & { deleted: boolean }>(
  nodes: CommentNode<T>[]
): CommentNode<T>[] {
  const kept: CommentNode<T>[] = [];
  for (const node of nodes) {
    node.children = pruneDeletedLeaves(node.children);
    if (node.deleted && node.children.length === 0) continue;
    kept.push(node);
  }
  return kept;
}

/** Trả lời ở tầng cuối thì gắn vào chính tầng đó, không thụt thêm. */
export function depthForReply(parentDepth: number | null): number {
  if (parentDepth === null) return 0;
  return Math.min(parentDepth + 1, MAX_DEPTH);
}

export type CommentRow = {
  id: string;
  parentId: string | null;
  createdAt: Date;
  score: number;
};

export type CommentNode<T extends CommentRow> = T & {
  depth: number;
  children: CommentNode<T>[];
};

/**
 * Dựng cây bình luận từ một danh sách phẳng.
 *
 * VÌ SAO DỰNG TRONG BỘ NHỚ chứ không lưu sẵn đường dẫn cụ thể hóa trong
 * database: đường dẫn phải sinh ra từ số thứ tự anh em, mà hai người trả lời
 * cùng lúc sẽ đọc cùng một số rồi ghi đè nhau — sửa được nhưng phải thêm khóa
 * và vòng thử lại. Một bài có vài trăm bình luận thì dựng cây trong bộ nhớ là
 * một vòng lặp O(n), không đáng đánh đổi lấy cả lớp lỗi đua tranh đó.
 *
 * Bình luận mồ côi (cha đã bị xóa cứng) được nâng lên gốc thay vì biến mất —
 * mất một nhánh thảo luận vì một hàng lỗi là quá đắt.
 */
export function buildCommentTree<T extends CommentRow>(
  rows: T[]
): CommentNode<T>[] {
  const nodes = new Map<string, CommentNode<T>>();
  for (const row of rows) {
    nodes.set(row.id, { ...row, depth: 0, children: [] });
  }

  const roots: CommentNode<T>[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parent = row.parentId ? nodes.get(row.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  // Độ sâu tính sau khi nối xong, đi từ gốc xuống: tính lúc nối sẽ sai khi con
  // xuất hiện trong danh sách trước cha.
  const setDepth = (list: CommentNode<T>[], depth: number) => {
    for (const node of list) {
      node.depth = Math.min(depth, MAX_DEPTH);
      setDepth(node.children, depth + 1);
    }
  };
  setDepth(roots, 0);

  sortTree(roots);
  return roots;
}

/**
 * Uy vọng cao lên trên; bằng điểm thì cũ lên trước.
 *
 * Xếp theo thời gian khi hòa là cố ý: nó giữ mạch hội thoại đọc được từ trên
 * xuống, và không để một bình luận mới vọt lên giữa một cuộc trao đổi cũ.
 */
function sortTree<T extends CommentRow>(list: CommentNode<T>[]): void {
  list.sort(
    (a, b) =>
      b.score - a.score || a.createdAt.getTime() - b.createdAt.getTime()
  );
  for (const node of list) sortTree(node.children);
}
