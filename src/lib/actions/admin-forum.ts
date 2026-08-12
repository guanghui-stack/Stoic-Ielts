"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const ADMIN_PATH = "/quan-tri/nghi-su-duong";

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
    select: { id: true, status: true },
  });
  if (!post) return;

  await db.forumPost.update({
    where: { id: post.id },
    data: { status: post.status === "VISIBLE" ? "HIDDEN" : "VISIBLE" },
  });
  revalidatePath(ADMIN_PATH);
}

/** Ẩn hoặc hiện lại một bình luận. */
export async function toggleCommentVisibilityAction(commentId: string) {
  await requireAdmin();
  const comment = await db.forumComment.findUnique({
    where: { id: commentId },
    select: { id: true, status: true, postId: true },
  });
  if (!comment) return;

  await db.forumComment.update({
    where: { id: comment.id },
    data: { status: comment.status === "VISIBLE" ? "HIDDEN" : "VISIBLE" },
  });
  revalidatePath(ADMIN_PATH);
}

/** Đóng hoặc mở lại một chủ đề. Đóng thì giữ nội dung, chỉ chặn bình luận mới. */
export async function togglePostLockAction(postId: string) {
  await requireAdmin();
  const post = await db.forumPost.findUnique({
    where: { id: postId },
    select: { id: true, lockedAt: true },
  });
  if (!post) return;

  await db.forumPost.update({
    where: { id: post.id },
    data: { lockedAt: post.lockedAt ? null : new Date() },
  });
  revalidatePath(ADMIN_PATH);
}

/** Ghim hoặc bỏ ghim một chủ đề lên đầu phòng. */
export async function togglePostPinAction(postId: string) {
  await requireAdmin();
  const post = await db.forumPost.findUnique({
    where: { id: postId },
    select: { id: true, pinnedAt: true },
  });
  if (!post) return;

  await db.forumPost.update({
    where: { id: post.id },
    data: { pinnedAt: post.pinnedAt ? null : new Date() },
  });
  revalidatePath(ADMIN_PATH);
}

/** Khóa hoặc mở một phòng. */
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
