"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { getQuestionDraft } from "@/lib/forum/question-context";
import { createPost, viewerOf } from "@/lib/forum/service";
import { BODY_MAX, BODY_MIN, checkText } from "@/lib/forum/rules";
import type { ForumFormState } from "./forum";

export async function createQuestionPostAction(_prev: ForumFormState, form: FormData): Promise<ForumFormState> {
  const user = await requireUser();
  const attemptId = String(form.get("attemptId") ?? "");
  const questionId = String(form.get("questionId") ?? "");
  let destination: string;
  try {
    // Tra lại chủ sở hữu và câu nguồn khi đăng; không tin metadata từ ô ẩn.
    const draft = await getQuestionDraft(user, attemptId, questionId);
    if (!draft.ok) return {error: draft.error};
    if (form.get("sourceHash") !== draft.value.reference.sourceHash) {
      return {error: "Câu hỏi nguồn vừa thay đổi. Hãy mở lại từ trang kết quả trước khi đăng."};
    }
    const question = checkText(String(form.get("body") ?? ""), BODY_MIN, BODY_MAX, "Điều bạn muốn hỏi");
    if (!question.ok) return {error: question.error};
    const reasoning = String(form.get("reasoning") ?? "").trim();
    const body = question.value + (reasoning ? `\n\nMình đã suy luận như thế này:\n${reasoning}` : "");
    const channelKey = String(form.get("channelKey") ?? "").trim();
    const result = await createPost({viewer: await viewerOf(user), channelKey,
      title: String(form.get("title") ?? ""), body, questionReference: draft.value.reference});
    if (!result.ok) return {error: result.error};
    destination = `/nghi-su-duong/${channelKey}/${result.value.postId}`;
  } catch {
    return {error: "Chưa đăng được câu hỏi. Nội dung bạn viết vẫn ở đây; hãy thử lại."};
  }
  revalidatePath("/nghi-su-duong");
  revalidatePath("/nghi-su-duong/theo-doi");
  revalidatePath(`/hoc-vien/bai-lam/${attemptId}`);
  redirect(destination);
}
