"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  castVote,
  createComment,
  createPost,
  deleteOwnComment,
  reportContent,
  viewerOf,
} from "@/lib/forum/service";

export type ForumFormState = { error?: string; success?: string } | undefined;

/** Chỉ nhận đúng hai giá trị. Mã lạ gửi tay không được đi tiếp. */
function targetTypeOf(raw: unknown): "POST" | "COMMENT" | null {
  return raw === "POST" || raw === "COMMENT" ? raw : null;
}

export async function createPostAction(
  _prev: ForumFormState,
  formData: FormData
): Promise<ForumFormState> {
  const user = await requireUser();
  const viewer = await viewerOf(user);

  const channelKey = String(formData.get("channelKey") ?? "").trim();
  const tags = Array.from(
    new Set(
      formData
        .getAll("tags")
        .map((value) => String(value).trim().replace(/^#+/, "").slice(0, 36))
        .filter(Boolean)
        .slice(0, 5)
    )
  );
  const body = String(formData.get("body") ?? "");
  const bodyWithTags = tags.length > 0
    ? `**Chủ đề:** ${tags.map((tag) => `#${tag.replace(/\s+/g, "-")}`).join(" ")}\n\n${body}`
    : body;
  const result = await createPost({
    viewer,
    channelKey,
    title: String(formData.get("title") ?? ""),
    body: bodyWithTags,
  });

  if (!result.ok) return { error: result.error };

  revalidatePath(`/nghi-su-duong/${channelKey}`);
  redirect(`/nghi-su-duong/${channelKey}/${result.value.postId}`);
}

export async function createCommentAction(
  _prev: ForumFormState,
  formData: FormData
): Promise<ForumFormState> {
  const user = await requireUser();
  const viewer = await viewerOf(user);

  const postId = String(formData.get("postId") ?? "").trim();
  const channelKey = String(formData.get("channelKey") ?? "").trim();
  const parentRaw = String(formData.get("parentId") ?? "").trim();

  const result = await createComment({
    viewer,
    postId,
    parentId: parentRaw || null,
    body: String(formData.get("body") ?? ""),
  });

  if (!result.ok) return { error: result.error };

  revalidatePath(`/nghi-su-duong/${channelKey}/${postId}`);
  return { success: "Đã gửi." };
}

/**
 * Cắm cờ / hạ cờ.
 *
 * Không trả lỗi ra giao diện khi thất bại: một cú bấm phiếu hỏng không đáng
 * làm gián đoạn việc đọc. Trang được dựng lại nên số hiện ra luôn là số thật
 * trong database, dù cú bấm vừa rồi có ăn hay không.
 */
export async function voteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const viewer = await viewerOf(user);

  const targetType = targetTypeOf(formData.get("targetType"));
  const targetId = String(formData.get("targetId") ?? "").trim();
  const clicked = String(formData.get("clicked") ?? "") === "-1" ? -1 : 1;
  const path = String(formData.get("path") ?? "").trim();

  if (!targetType || !targetId) return;

  await castVote({ viewer, targetType, targetId, clicked });

  // Chỉ nhận đường dẫn NỘI BỘ của chính diễn đàn. Không thì một biểu mẫu gửi
  // tay có thể ép máy chủ dựng lại đường dẫn tùy ý.
  if (path.startsWith("/nghi-su-duong/")) revalidatePath(path);
}

export async function reportAction(
  _prev: ForumFormState,
  formData: FormData
): Promise<ForumFormState> {
  const user = await requireUser();
  const viewer = await viewerOf(user);

  const targetType = targetTypeOf(formData.get("targetType"));
  const targetId = String(formData.get("targetId") ?? "").trim();
  if (!targetType || !targetId) return { error: "Không rõ bạn đang báo cáo gì." };

  const result = await reportContent({
    viewer,
    targetType,
    targetId,
    reason: String(formData.get("reason") ?? ""),
  });

  if (!result.ok) return { error: result.error };
  return {
    success:
      "Đã gửi báo cáo. Quản trị viên sẽ xem và xử lý — cảm ơn bạn đã giữ Diễn đàn an toàn.",
  };
}

/**
 * Tác giả tự gỡ lời bàn của mình.
 *
 * Nhận `commentId` rồi tự tra chủ sở hữu và mốc thời gian Ở MÁY CHỦ — không
 * tin bất cứ dấu hiệu nào từ trình duyệt. Nút gỡ chỉ ẩn đi ở giao diện khi quá
 * hạn; thứ thật sự chặn nằm ở `canDeleteComment` phía máy chủ.
 */
export async function deleteCommentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const viewer = await viewerOf(user);

  const commentId = String(formData.get("commentId") ?? "").trim();
  if (!commentId) return;

  const result = await deleteOwnComment({ viewer, commentId });
  if (result.ok) {
    const { channelKey, postId } = result.value;
    revalidatePath(`/nghi-su-duong/${channelKey}/${postId}`);
  }
}
