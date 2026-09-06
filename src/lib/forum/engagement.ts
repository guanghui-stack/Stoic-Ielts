import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { competitionLive, viewerOf, type Viewer } from "@/lib/forum/service";
import { decideForumAccess } from "@/lib/forum/rules";
import { canMarkReplyHelpful, notificationRecipients } from "@/lib/forum/engagement-rules";

async function currentViewer(viewer: Viewer) {
  const user = await db.user.findUnique({where: {id: viewer.id}, select: {id: true, role: true, active: true}});
  return user?.active ? viewerOf(user) : null;
}
function visiblePosts(viewer: Viewer): Prisma.ForumPostWhereInput {
  return {status: "VISIBLE", ...(!viewer.isAdmin ? {channel: {level: {lte: viewer.level}}} : {})};
}
function notificationWhere(viewer: Viewer): Prisma.ForumNotificationWhereInput {
  return {userId: viewer.id, comment: {status: "VISIBLE"}, post: {...visiblePosts(viewer), follows: {none: {userId: viewer.id, following: false}}}};
}
function writeAccess(viewer: Viewer, post: {lockedAt: Date | null; channel: {level: number; locked: boolean}}, live: boolean) {
  return !post.lockedAt && decideForumAccess({userLevel: viewer.level, channelLevel: post.channel.level, competitionLive: live, channelLocked: post.channel.locked, banned: viewer.banned, isAdmin: viewer.isAdmin}).canWrite;
}

export async function getThreadEngagement(input: Viewer, postId: string) {
  const viewer = await currentViewer(input);
  if (!viewer) return null;
  const [post, follow, live] = await Promise.all([
    db.forumPost.findFirst({where: {id: postId, ...visiblePosts(viewer)}, select: {authorId: true, lockedAt: true, channel: {select: {level: true, locked: true}}, helpfulReply: {select: {commentId: true, comment: {select: {status: true, postId: true}}}}}}),
    db.forumThreadFollow.findUnique({where: {userId_postId: {userId: viewer.id, postId}}, select: {following: true}}),
    competitionLive(),
  ]);
  if (!post) return null;
  return {following: follow?.following ?? false, helpfulCommentId: post.helpfulReply?.comment.status === "VISIBLE" && post.helpfulReply.comment.postId === postId ? post.helpfulReply.commentId : null, canMarkHelpful: post.authorId === viewer.id && writeAccess(viewer, post, live)};
}

export async function listForumNotifications(input: Viewer) {
  const viewer = await currentViewer(input);
  if (!viewer) return [];
  const rows = await db.forumNotification.findMany({where: notificationWhere(viewer), orderBy: {updatedAt: "desc"}, take: 50, select: {id: true, postId: true, commentId: true, kind: true, readAt: true, updatedAt: true, post: {select: {title: true, channel: {select: {key: true}}}}}});
  return rows.map((row) => ({id: row.id, postId: row.postId, commentId: row.commentId, kind: row.kind, readAt: row.readAt, updatedAt: row.updatedAt, postTitle: row.post.title, channelKey: row.post.channel.key}));
}
export async function countUnreadForumNotifications(input: Viewer) {
  const viewer = await currentViewer(input);
  return viewer ? db.forumNotification.count({where: {...notificationWhere(viewer), readAt: null}}) : 0;
}
export async function listFollowedForumThreads(input: Viewer) {
  const viewer = await currentViewer(input);
  if (!viewer) return [];
  const rows = await db.forumPost.findMany({where: {...visiblePosts(viewer), follows: {some: {userId: viewer.id, following: true}}}, orderBy: {lastActivityAt: "desc"}, take: 50, select: {id: true, title: true, commentCount: true, lastActivityAt: true, channel: {select: {level: true, key: true}}, helpfulReply: {select: {commentId: true, comment: {select: {status: true, postId: true}}}}}});
  return rows.map((row) => ({id: row.id, title: row.title, commentCount: row.commentCount, lastActivityAt: row.lastActivityAt, level: row.channel.level, channelKey: row.channel.key, helpfulCommentId: row.helpfulReply?.comment.status === "VISIBLE" && row.helpfulReply.comment.postId === row.id ? row.helpfulReply.commentId : null}));
}

export async function setThreadFollow(input: Viewer, postId: string, following: boolean) {
  const viewer = await currentViewer(input);
  if (!viewer) return {error: "Vui lòng đăng nhập lại."};
  const post = await db.forumPost.findFirst({where: {id: postId, ...visiblePosts(viewer)}, select: {id: true, channel: {select: {key: true}}}});
  if (!post) return {error: "Không tìm thấy chủ đề bạn có thể theo dõi."};
  await db.$transaction(async (tx) => {
    // Tuần tự với gửi bình luận: bỏ theo dõi xong thì phản hồi tới sau không
    // thể dùng lại lựa chọn cũ và làm sống lại thông báo đã tắt.
    await tx.$queryRaw`SELECT id FROM ForumPost WHERE id = ${postId} FOR UPDATE`;
    await tx.forumThreadFollow.upsert({where: {userId_postId: {userId: viewer.id, postId}}, create: {userId: viewer.id, postId, following}, update: {following}});
    if (!following) await tx.forumNotification.updateMany({where: {userId: viewer.id, postId, readAt: null}, data: {readAt: new Date()}});
  });
  return {success: following ? "Đã theo dõi chủ đề." : "Đã tắt thông báo cho chủ đề này.", channelKey: post.channel.key};
}

export async function setHelpfulReply(input: Viewer, postId: string, commentId: string) {
  const viewer = await currentViewer(input);
  if (!viewer) return {error: "Vui lòng đăng nhập lại."};
  const live = await competitionLive();
  // Tuần tự hóa lựa chọn của nhiều tab; không đổi lượt thích, Xu hoặc Đức hạnh.
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM ForumPost WHERE id = ${postId} FOR UPDATE`;
    const post = await tx.forumPost.findFirst({where: {id: postId, ...visiblePosts(viewer)}, select: {authorId: true, lockedAt: true, channel: {select: {level: true, locked: true, key: true}}}});
    if (!post || post.authorId !== viewer.id || !writeAccess(viewer, post, live)) return {error: "Chỉ người hỏi được đánh dấu khi chủ đề đang mở."};
    if (!commentId) {
      await tx.forumHelpfulReply.deleteMany({where: {postId}});
      return {success: "Đã bỏ dấu đã hiểu.", channelKey: post.channel.key};
    }
    await tx.$queryRaw`SELECT id FROM ForumComment WHERE id = ${commentId} FOR UPDATE`;
    const comment = await tx.forumComment.findUnique({where: {id: commentId}, select: {postId: true, authorId: true, status: true}});
    if (!canMarkReplyHelpful({viewerId: viewer.id, postAuthorId: post.authorId, postId, postVisible: true, canWrite: true, comment})) return {error: "Hãy chọn phản hồi còn hiển thị của người khác trong đúng chủ đề này."};
    await tx.forumHelpfulReply.upsert({where: {postId}, create: {postId, commentId}, update: {commentId, createdAt: new Date()}});
    return {success: "Đã đánh dấu phản hồi giúp bạn hiểu.", channelKey: post.channel.key};
  });
}

export async function markForumNotificationRead(input: Viewer, notificationId: string, expectedCommentId: string) {
  const viewer = await currentViewer(input);
  if (!viewer) return {error: "Vui lòng đăng nhập lại."};
  // Không nuốt phản hồi mới vừa đến sau khi người dùng mở trang thông báo.
  await db.forumNotification.updateMany({where: {id: notificationId, commentId: expectedCommentId, ...notificationWhere(viewer), readAt: null}, data: {readAt: new Date()}});
  return {success: "Đã đánh dấu thông báo đã đọc."};
}

/** Chạy trong transaction đã lưu bình luận. Không phát nội dung qua Ably/email. */
export async function enqueueForumReplyNotifications(tx: Prisma.TransactionClient, input: {postId: string; commentId: string; actorId: string; parentId: string | null; level: number}) {
  const follows = await tx.forumThreadFollow.findMany({where: {postId: input.postId}, select: {userId: true, following: true}});
  const parent = input.parentId ? await tx.forumComment.findFirst({where: {id: input.parentId, postId: input.postId, status: "VISIBLE"}, select: {authorId: true}}) : null;
  const recipients = notificationRecipients(input.actorId, parent?.authorId ?? null, follows);
  if (!recipients.length) return;
  const eligible = await tx.user.findMany({where: {id: {in: recipients.map((r) => r.userId)}, active: true, OR: [{role: "ADMIN"}, {rankProfile: {currentLevel: {gte: input.level}}}, ...(input.level <= 1 ? [{rankProfile: null}] : [])]}, select: {id: true}});
  const ids = new Set(eligible.map((user) => user.id));
  const rows = recipients.filter((r) => ids.has(r.userId));
  if (!rows.length) return;
  const now = new Date();
  await tx.forumNotification.createMany({data: rows.map((r) => ({...r, postId: input.postId, commentId: input.commentId, updatedAt: now})), skipDuplicates: true});
  // Hai lệnh cập nhật theo nhóm thay cho một truy vấn cho từng người theo dõi.
  for (const kind of ["THREAD_COMMENT", "DIRECT_REPLY"] as const) {
    const userIds = rows.filter((r) => r.kind === kind).map((r) => r.userId);
    if (userIds.length) await tx.forumNotification.updateMany({where: {postId: input.postId, userId: {in: userIds}}, data: {commentId: input.commentId, kind, readAt: null, updatedAt: now}});
  }
}
