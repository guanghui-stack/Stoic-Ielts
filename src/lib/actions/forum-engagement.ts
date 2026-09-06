"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { viewerOf } from "@/lib/forum/service";
import { markForumNotificationRead, setHelpfulReply, setThreadFollow } from "@/lib/forum/engagement";
import type { ForumFormState } from "./forum";

function id(form: FormData, name: string) { return String(form.get(name) ?? "").trim().slice(0, 191); }
function refresh(postId: string, channelKey?: string) {
  revalidatePath("/nghi-su-duong");
  revalidatePath("/nghi-su-duong/theo-doi");
  if (postId && channelKey) revalidatePath(`/nghi-su-duong/${channelKey}/${postId}`);
}
export async function setHelpfulReplyAction(_prev: ForumFormState, form: FormData): Promise<ForumFormState> {
  const viewer = await viewerOf(await requireUser());
  const postId = id(form, "postId");
  try { const result = await setHelpfulReply(viewer, postId, id(form, "commentId")); refresh(postId, "channelKey" in result ? result.channelKey : undefined); return result; }
  catch { return {error: "Chưa lưu được dấu đã hiểu. Hãy thử lại."}; }
}
export async function setThreadFollowAction(_prev: ForumFormState, form: FormData): Promise<ForumFormState> {
  const viewer = await viewerOf(await requireUser());
  if (form.get("following") !== "true" && form.get("following") !== "false") return {error: "Lựa chọn theo dõi không hợp lệ."};
  const postId = id(form, "postId");
  try { const result = await setThreadFollow(viewer, postId, form.get("following") === "true"); refresh(postId, result.channelKey); return result; }
  catch { return {error: "Chưa lưu được lựa chọn theo dõi. Hãy thử lại."}; }
}
export async function markForumNotificationReadAction(_prev: ForumFormState, form: FormData): Promise<ForumFormState> {
  const viewer = await viewerOf(await requireUser());
  try { const result = await markForumNotificationRead(viewer, id(form, "notificationId"), id(form, "commentId")); refresh(""); return result; }
  catch { return {error: "Chưa cập nhật được thông báo. Hãy thử lại."}; }
}
