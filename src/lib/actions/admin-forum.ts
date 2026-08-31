"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { nextModeratedCommentStatus } from "@/lib/forum/rules";
import { requireAdmin } from "@/lib/session";

const ADMIN_PATH = "/quan-tri/nghi-su-duong";
const FORUM_PATH = "/nghi-su-duong";

function revalidatePost(channelKey: string, postId: string) {
  revalidatePath(FORUM_PATH);
  revalidatePath(`${FORUM_PATH}/${channelKey}/${postId}`);
}

/**
 * Công cụ kiểm duyệt Nghị Sự Đường.
 *
 * NGUYÊN TẮC: **ẩn, không xóa.** Nội dung bị báo cáo còn phải tra cứu được khi
 * có tranh chấp — với học viên, với phụ huynh, hoặc với cơ quan chức năng. Xóa
 * cứng là tự tay vứt bằng chứng của chính mình.
 *
 * Xóa vĩnh viễn chỉ làm khi có yêu cầu hợp lệ về quyền dữ liệu, và lúc đó phải
 * là một thao tác riêng có chủ đích, không phải một nút bấm nhầm được.
 */

/** Ẩn hoặc hiện lại một bài. */
export async function togglePostVisibilityAction(postId: string) {
  await requireAdmin();
  const post = await db.forumPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      status: true,
      channel: { select: { key: true } },
    },
  });
  if (!post) return;

  await db.forumPost.update({
    where: { id: post.id },
    data: { status: post.status === "VISIBLE" ? "HIDDEN" : "VISIBLE" },
  });
  revalidatePath(ADMIN_PATH);
  revalidatePost(post.channel.key, post.id);
}

/** Ẩn hoặc hiện lại một bình luận. */
export async function toggleCommentVisibilityAction(commentId: string) {
  await requireAdmin();
  const changed = await db.$transaction(async (tx) => {
    const comment = await tx.forumComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        status: true,
        postId: true,
        post: { select: { channel: { select: { key: true } } } },
      },
    });
    if (!comment) return null;

    const currentStatus =
      comment.status === "VISIBLE" ||
      comment.status === "HIDDEN" ||
      comment.status === "DELETED"
        ? comment.status
        : null;
    if (!currentStatus) return null;
    const nextStatus = nextModeratedCommentStatus(currentStatus);
    if (!nextStatus) return null;

    // Lọc cả trạng thái cũ để hai lần bấm đồng thời không cùng trừ/cộng bộ
    // đếm. Sau đó đếm lại từ dữ liệu thật để tự sửa cả sai lệch lịch sử.
    const updated = await tx.forumComment.updateMany({
      where: { id: comment.id, status: currentStatus },
      data: { status: nextStatus },
    });
    if (updated.count === 0) return null;

    const visibleCount = await tx.forumComment.count({
      where: { postId: comment.postId, status: "VISIBLE" },
    });
    await tx.forumPost.update({
      where: { id: comment.postId },
      data: { commentCount: visibleCount },
    });

    return {
      postId: comment.postId,
      channelKey: comment.post.channel.key,
    };
  });

  revalidatePath(ADMIN_PATH);
  if (changed) revalidatePost(changed.channelKey, changed.postId);
}

/** Đóng hoặc mở lại một chủ đề. Đóng thì giữ nội dung, chỉ chặn bình luận mới. */
export async function togglePostLockAction(postId: string) {
  await requireAdmin();
  const post = await db.forumPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      lockedAt: true,
      channel: { select: { key: true } },
    },
  });
  if (!post) return;

  await db.forumPost.update({
    where: { id: post.id },
    data: { lockedAt: post.lockedAt ? null : new Date() },
  });
  revalidatePath(ADMIN_PATH);
  revalidatePost(post.channel.key, post.id);
}

/** Ghim hoặc bỏ ghim một chủ đề lên đầu feed mà người xem được phép đọc. */
export async function togglePostPinAction(postId: string) {
  await requireAdmin();
  const post = await db.forumPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      pinnedAt: true,
      channel: { select: { key: true } },
    },
  });
  if (!post) return;

  await db.forumPost.update({
    where: { id: post.id },
    data: { pinnedAt: post.pinnedAt ? null : new Date() },
  });
  revalidatePath(ADMIN_PATH);
  revalidatePost(post.channel.key, post.id);
}

/** Khóa hoặc mở phần viết của một bậc nội dung. */
export async function toggleChannelLockAction(channelId: string) {
  await requireAdmin();
  const channel = await db.forumChannel.findUnique({
    where: { id: channelId },
    select: { id: true, locked: true },
  });
  if (!channel) return;

  await db.forumChannel.update({
    where: { id: channel.id },
    data: { locked: !channel.locked },
  });
  revalidatePath(ADMIN_PATH);
  revalidatePath(FORUM_PATH);
}

/**
 * Cấm hoặc bỏ cấm một tài khoản đăng bài.
 *
 * Cấm đăng KHÔNG cấm đọc: khóa học và lịch sử của họ vẫn còn, và họ vẫn theo
 * dõi được cộng đồng. Cắt cả quyền đọc là một hình phạt khác hẳn về mức độ,
 * nên nó phải là một quyết định khác, không phải hệ quả kèm theo.
 */
export async function toggleForumBanAction(userId: string) {
  await requireAdmin();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, forumBannedAt: true },
  });
  if (!user) return;

  await db.user.update({
    where: { id: user.id },
    data: { forumBannedAt: user.forumBannedAt ? null : new Date() },
  });
  revalidatePath(ADMIN_PATH);
  revalidatePath("/quan-tri/hoc-vien");
}

/** Đóng một báo cáo: đã xử lý, hoặc bỏ qua. */
export async function resolveReportAction(formData: FormData) {
  await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  const status =
    String(formData.get("status") ?? "") === "DISMISSED"
      ? "DISMISSED"
      : "RESOLVED";
  const adminNote = String(formData.get("adminNote") ?? "").trim() || null;
  if (!reportId) return;

  await db.forumReport.updateMany({
    where: { id: reportId, status: "OPEN" },
    data: { status, adminNote, resolvedAt: new Date() },
  });
  revalidatePath(ADMIN_PATH);
}
