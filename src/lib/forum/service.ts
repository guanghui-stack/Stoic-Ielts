import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  BODY_MAX,
  BODY_MIN,
  COMMENT_MAX,
  COMMENT_MIN,
  RATE_LIMITS,
  TITLE_MAX,
  TITLE_MIN,
  COMMENT_DELETE_WINDOW_MS,
  canDeleteComment,
  checkText,
  decideForumAccess,
  depthForReply,
  nextVoteValue,
  voteCountDelta,
  voteDelta,
  type ForumAccess,
  type VoteValue,
} from "@/lib/forum/rules";

/**
 * Tầng chạm database của Nghị Sự Đường. Việc *quyết định* nằm ở `rules.ts`
 * (hàm thuần, có kiểm thử); file này chỉ lo đọc — ghi.
 *
 * NGUYÊN TẮC: phiếu bầu và điểm uy vọng phải đổi trong CÙNG một transaction.
 * Tách ra thì một lần treo mạng để lại hàng phiếu đã ghi mà điểm chưa cộng —
 * và không có cách nào dò ra, vì cả hai số đều "trông hợp lý". Đây đúng khuôn
 * đã dùng cho ví xu.
 */

export type Viewer = {
  id: string;
  level: number;
  isAdmin: boolean;
  banned: boolean;
};

/** Bậc hiện tại của học viên. Chưa có hồ sơ cấp bậc thì coi như bậc 1. */
export async function viewerOf(user: {
  id: string;
  role: string;
}): Promise<Viewer> {
  const [rank, account] = await Promise.all([
    db.userRank.findUnique({
      where: { userId: user.id },
      select: { currentLevel: true },
    }),
    db.user.findUnique({
      where: { id: user.id },
      select: { forumBannedAt: true },
    }),
  ]);

  return {
    id: user.id,
    level: rank?.currentLevel ?? 1,
    isAdmin: user.role === "ADMIN",
    banned: Boolean(account?.forumBannedAt),
  };
}

/**
 * Nguyệt Thí có đang trong khung giờ thi không.
 *
 * FAIL CLOSED: hỏi database hỏng thì coi như ĐANG thi, tức là khóa viết. Mở
 * nhầm trong lúc thi là lộ đề của một kỳ thi thật; khóa nhầm vài phút chỉ là
 * bất tiện. Cùng nguyên tắc đã ghi ở `feynman-ai/rules.ts:122`.
 */
export async function competitionLive(at = new Date()): Promise<boolean> {
  try {
    const running = await db.competition.findFirst({
      where: {
        status: "RUNNING",
        startAt: { lte: at },
        endAt: { gt: at },
      },
      select: { id: true },
    });
    return Boolean(running);
  } catch (error) {
    console.error("[wobridges] Khong hoi duoc lich Nguyet Thi:", error);
    return true;
  }
}

export type ChannelView = {
  id: string;
  key: string;
  level: number;
  name: string;
  blurb: string;
  locked: boolean;
  postCount: number;
  access: ForumAccess;
};

/** Danh sách phòng học viên nhìn thấy, kèm quyền của từng phòng. */
export async function channelsFor(
  viewer: Viewer,
  live: boolean
): Promise<ChannelView[]> {
  const channels = await db.forumChannel.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { posts: { where: { status: "VISIBLE" } } } },
    },
  });

  return channels
    .map((channel) => ({
      id: channel.id,
      key: channel.key,
      level: channel.level,
      name: channel.name,
      blurb: channel.blurb,
      locked: channel.locked,
      postCount: channel._count.posts,
      access: decideForumAccess({
        userLevel: viewer.level,
        channelLevel: channel.level,
        competitionLive: live,
        channelLocked: channel.locked,
        banned: viewer.banned,
        isAdmin: viewer.isAdmin,
      }),
    }))
    // Phòng không đọc được thì KHÔNG trả về. Trả về rồi để giao diện tự giấu
    // là sớm muộn có chỗ quên giấu — và lộ tiêu đề bài của phòng bậc trên.
    .filter((channel) => channel.access.canRead);
}

/** Một phòng theo mã đường dẫn, kèm quyền. `null` = không được vào. */
export async function channelFor(
  key: string,
  viewer: Viewer,
  live: boolean
): Promise<ChannelView | null> {
  const all = await channelsFor(viewer, live);
  return all.find((channel) => channel.key === key) ?? null;
}

export type ActionResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const BLOCK_MESSAGES: Record<string, string> = {
  RANK: "Phòng này dành cho bậc cao hơn bậc hiện tại của bạn.",
  COMPETITION:
    "Thử thách tháng đang diễn ra nên Diễn đàn tạm khóa phần viết. Bạn vẫn đọc được, và viết lại được ngay sau khi kỳ thi kết thúc.",
  CHANNEL_LOCKED: "Phòng này đang được quản trị viên khóa.",
  BANNED: "Tài khoản của bạn đang bị hạn chế đăng bài trên Diễn đàn.",
};

function blockMessage(access: ForumAccess): string {
  return (
    BLOCK_MESSAGES[access.blockedBy ?? ""] ?? "Bạn không viết được ở đây."
  );
}

/** Đăng một bài mới. */
export async function createPost(input: {
  viewer: Viewer;
  channelKey: string;
  title: string;
  body: string;
}): Promise<ActionResult<{ postId: string }>> {
  const live = await competitionLive();
  const channel = await channelFor(input.channelKey, input.viewer, live);
  if (!channel) return { ok: false, error: "Không tìm thấy phòng này." };
  if (!channel.access.canWrite) {
    return { ok: false, error: blockMessage(channel.access) };
  }

  const title = checkText(input.title, TITLE_MIN, TITLE_MAX, "Tiêu đề");
  if (!title.ok) return { ok: false, error: title.error };
  const body = checkText(input.body, BODY_MIN, BODY_MAX, "Nội dung");
  if (!body.ok) return { ok: false, error: body.error };

  // Đếm ngay trên database chứ không giữ bộ đếm trong bộ nhớ: Hostinger khởi
  // động lại mỗi lần triển khai, và bộ đếm đó sẽ về không đúng lúc không cần.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await db.forumPost.count({
    where: { authorId: input.viewer.id, createdAt: { gt: since } },
  });
  if (!input.viewer.isAdmin && recent >= RATE_LIMITS.postsPerDay) {
    return {
      ok: false,
      error: `Mỗi ngày đăng tối đa ${RATE_LIMITS.postsPerDay} bài. Hãy quay lại vào ngày mai.`,
    };
  }

  const post = await db.forumPost.create({
    data: {
      channelId: channel.id,
      authorId: input.viewer.id,
      title: title.value,
      body: body.value,
    },
    select: { id: true },
  });

  return { ok: true, value: { postId: post.id } };
}

/** Trả lời một bài, hoặc trả lời một bình luận khác. */
export async function createComment(input: {
  viewer: Viewer;
  postId: string;
  parentId: string | null;
  body: string;
}): Promise<ActionResult<{ commentId: string }>> {
  const post = await db.forumPost.findUnique({
    where: { id: input.postId },
    select: {
      id: true,
      status: true,
      lockedAt: true,
      channel: { select: { key: true, level: true, locked: true } },
    },
  });
  if (!post || post.status !== "VISIBLE") {
    return { ok: false, error: "Bài này không còn nữa." };
  }
  if (post.lockedAt) {
    return { ok: false, error: "Bài này đã đóng, không nhận thêm bình luận." };
  }

  const live = await competitionLive();
  const access = decideForumAccess({
    userLevel: input.viewer.level,
    channelLevel: post.channel.level,
    competitionLive: live,
    channelLocked: post.channel.locked,
    banned: input.viewer.banned,
    isAdmin: input.viewer.isAdmin,
  });
  if (!access.canWrite) return { ok: false, error: blockMessage(access) };

  const body = checkText(input.body, COMMENT_MIN, COMMENT_MAX, "Bình luận");
  if (!body.ok) return { ok: false, error: body.error };

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db.forumComment.count({
    where: { authorId: input.viewer.id, createdAt: { gt: since } },
  });
  if (!input.viewer.isAdmin && recent >= RATE_LIMITS.commentsPerHour) {
    return {
      ok: false,
      error: `Mỗi giờ bình luận tối đa ${RATE_LIMITS.commentsPerHour} lần. Hãy nghỉ một lát.`,
    };
  }

  // Cha phải thuộc ĐÚNG bài này. Thiếu phép kiểm này thì gửi tay một parentId
  // của bài khác sẽ ghép hai cuộc thảo luận vào nhau.
  let parentDepth: number | null = null;
  if (input.parentId) {
    const parent = await db.forumComment.findUnique({
      where: { id: input.parentId },
      select: { depth: true, postId: true, status: true },
    });
    if (!parent || parent.postId !== post.id || parent.status !== "VISIBLE") {
      return { ok: false, error: "Không tìm thấy bình luận bạn đang trả lời." };
    }
    parentDepth = parent.depth;
  }

  const comment = await db.$transaction(async (tx) => {
    const created = await tx.forumComment.create({
      data: {
        postId: post.id,
        authorId: input.viewer.id,
        parentId: input.parentId,
        depth: depthForReply(parentDepth),
        body: body.value,
      },
      select: { id: true },
    });

    // Số đếm và mốc hoạt động đổi trong cùng transaction với hàng bình luận:
    // tách ra thì danh sách bài hiện "0 bình luận" cho bài vừa có người trả lời.
    await tx.forumPost.update({
      where: { id: post.id },
      data: {
        commentCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    return created;
  });

  return { ok: true, value: { commentId: comment.id } };
}

/**
 * Cắm cờ hoặc hạ cờ.
 *
 * Bấm lại đúng nút đang sáng là RÚT phiếu. Đây là đường duy nhất để rút, nên
 * thiếu nó thì một cú bấm nhầm là vĩnh viễn.
 *
 * Ràng buộc unique `(userId, targetType, targetId)` là thứ chặn bầu hai lần —
 * không phải phép kiểm tra ở tầng trên. Hai tab bấm cùng lúc thì cái thua cuộc
 * đụng P2002 và được coi là đã xong.
 */
export async function castVote(input: {
  viewer: Viewer;
  targetType: "POST" | "COMMENT";
  targetId: string;
  clicked: 1 | -1;
}): Promise<
  ActionResult<{ up: number; down: number; value: VoteValue }>
> {
  if (input.viewer.banned) {
    return { ok: false, error: BLOCK_MESSAGES.BANNED };
  }

  // Kiểm quyền đọc phòng chứa mục tiêu: không được bầu cho thứ mình không có
  // quyền nhìn thấy.
  const channelLevel =
    input.targetType === "POST"
      ? (
          await db.forumPost.findUnique({
            where: { id: input.targetId },
            select: { channel: { select: { level: true } } },
          })
        )?.channel.level
      : (
          await db.forumComment.findUnique({
            where: { id: input.targetId },
            select: { post: { select: { channel: { select: { level: true } } } } },
          })
        )?.post.channel.level;

  if (channelLevel === undefined) {
    return { ok: false, error: "Không tìm thấy nội dung này." };
  }
  if (!input.viewer.isAdmin && input.viewer.level < channelLevel) {
    return { ok: false, error: BLOCK_MESSAGES.RANK };
  }

  try {
    const result = await db.$transaction(
      async (tx) => {
        const existing = await tx.forumVote.findUnique({
          where: {
            userId_targetType_targetId: {
              userId: input.viewer.id,
              targetType: input.targetType,
              targetId: input.targetId,
            },
          },
          select: { id: true, value: true },
        });

        const oldValue = (existing?.value ?? 0) as VoteValue;
        const newValue = nextVoteValue(oldValue, input.clicked);
        const delta = voteDelta(oldValue, newValue);
        const counts = voteCountDelta(oldValue, newValue);

        if (newValue === 0 && existing) {
          await tx.forumVote.delete({ where: { id: existing.id } });
        } else if (existing) {
          await tx.forumVote.update({
            where: { id: existing.id },
            data: { value: newValue },
          });
        } else {
          await tx.forumVote.create({
            data: {
              userId: input.viewer.id,
              targetType: input.targetType,
              targetId: input.targetId,
              value: newValue,
            },
          });
        }

        // Ba số đổi trong CÙNG một lệnh: `score` để xếp hạng, `upCount` và
        // `downCount` để hiển thị. Tách thành nhiều lệnh thì một lần treo mạng
        // để lại ba số không khớp nhau, và không có cách nào biết số nào đúng.
        const data = {
          score: { increment: delta },
          upCount: { increment: counts.up },
          downCount: { increment: counts.down },
        };
        const row =
          input.targetType === "POST"
            ? await tx.forumPost.update({
                where: { id: input.targetId },
                data,
                select: { upCount: true, downCount: true },
              })
            : await tx.forumComment.update({
                where: { id: input.targetId },
                data,
                select: { upCount: true, downCount: true },
              });

        return { up: row.upCount, down: row.downCount, value: newValue };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return { ok: true, value: result };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Hai tab bấm cùng lúc: cái thắng đã ghi đúng một phiếu.
      return { ok: false, error: "Phiếu của bạn đã được ghi." };
    }
    throw error;
  }
}

/**
 * Tác giả tự gỡ lời bàn của mình trong 10 phút đầu.
 *
 * Đặt `status = "DELETED"` chứ KHÔNG xóa hàng: những câu trả lời bên dưới còn
 * trỏ tới nó, và xóa cứng sẽ làm chúng thành mồ côi. Thân bài vẫn nằm lại
 * database — cần khi có tranh chấp — nhưng không hiện cho ai nữa.
 *
 * `commentCount` giảm trong CÙNG transaction: tách ra thì danh sách bài đếm
 * một đằng, cây bình luận hiện một nẻo.
 */
export async function deleteOwnComment(input: {
  viewer: Viewer;
  commentId: string;
}): Promise<ActionResult<{ postId: string; channelKey: string }>> {
  const comment = await db.forumComment.findUnique({
    where: { id: input.commentId },
    select: {
      id: true,
      authorId: true,
      createdAt: true,
      status: true,
      postId: true,
      post: { select: { channel: { select: { key: true } } } },
    },
  });
  if (!comment) return { ok: false, error: "Không tìm thấy lời bàn này." };
  if (comment.status !== "VISIBLE") {
    return { ok: true, value: { postId: comment.postId, channelKey: comment.post.channel.key } };
  }

  if (
    !canDeleteComment({
      authorId: comment.authorId,
      viewerId: input.viewer.id,
      createdAt: comment.createdAt,
    })
  ) {
    return {
      ok: false,
      error: `Chỉ tác giả gỡ được, và chỉ trong ${Math.round(COMMENT_DELETE_WINDOW_MS / 60_000)} phút đầu.`,
    };
  }

  await db.$transaction(async (tx) => {
    // updateMany + lọc theo status: hai tab cùng bấm gỡ thì cái thứ hai khớp 0
    // hàng và KHÔNG trừ `commentCount` lần nữa.
    const changed = await tx.forumComment.updateMany({
      where: { id: comment.id, status: "VISIBLE" },
      data: { status: "DELETED" },
    });
    if (changed.count > 0) {
      await tx.forumPost.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      });
    }
  });

  return {
    ok: true,
    value: { postId: comment.postId, channelKey: comment.post.channel.key },
  };
}

/** Học viên báo cáo một bài hoặc một bình luận. */
export async function reportContent(input: {
  viewer: Viewer;
  targetType: "POST" | "COMMENT";
  targetId: string;
  reason: string;
}): Promise<ActionResult> {
  const reason = checkText(input.reason, 10, 1_000, "Lý do báo cáo");
  if (!reason.ok) return { ok: false, error: reason.error };

  // Một người báo cáo cùng một thứ nhiều lần chỉ làm loãng hàng đợi của quản
  // trị viên, không làm nó được xử nhanh hơn.
  const already = await db.forumReport.findFirst({
    where: {
      reporterId: input.viewer.id,
      targetType: input.targetType,
      targetId: input.targetId,
      status: "OPEN",
    },
    select: { id: true },
  });
  if (already) {
    return { ok: true, value: undefined };
  }

  await db.forumReport.create({
    data: {
      reporterId: input.viewer.id,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: reason.value,
    },
  });

  return { ok: true, value: undefined };
}

/** Phiếu của người đang xem, để giao diện tô sáng đúng nút. */
export async function myVotes(
  userId: string,
  targetType: "POST" | "COMMENT",
  targetIds: string[]
): Promise<Map<string, VoteValue>> {
  if (targetIds.length === 0) return new Map();
  const rows = await db.forumVote.findMany({
    where: { userId, targetType, targetId: { in: targetIds } },
    select: { targetId: true, value: true },
  });
  return new Map(rows.map((r) => [r.targetId, r.value as VoteValue]));
}
