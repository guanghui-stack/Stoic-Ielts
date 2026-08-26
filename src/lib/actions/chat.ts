"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  ensureConversation,
  markConversationRead,
  searchStudents,
  sendMessage,
  type StudentSearchResult,
} from "@/lib/chat/service";

export type ChatActionState = {
  error?: string;
  success?: string;
  students?: StudentSearchResult[];
} | undefined;

export async function searchStudentsAction(
  _previous: ChatActionState,
  formData: FormData,
): Promise<ChatActionState> {
  const user = await requireUser();
  const result = await searchStudents(user.id, String(formData.get("query") ?? ""));
  if (!result.ok) return { error: result.error };
  return { students: result.value };
}

export async function startConversationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const otherUserId = String(formData.get("otherUserId") ?? "").trim();
  const result = await ensureConversation(user.id, otherUserId);
  if (!result.ok) return;
  redirect(`/hoc-vien/tin-nhan?conversation=${encodeURIComponent(result.value.conversationId)}`);
}

export async function sendMessageAction(
  _previous: ChatActionState,
  formData: FormData,
): Promise<ChatActionState> {
  const user = await requireUser();
  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const result = await sendMessage(
    user.id,
    conversationId,
    String(formData.get("body") ?? ""),
  );
  if (!result.ok) return { error: result.error };
  revalidatePath("/hoc-vien/tin-nhan");
  return { success: "Đã gửi." };
}

export async function markConversationReadAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const result = await markConversationRead(user.id, conversationId);
  if (result.ok) revalidatePath("/hoc-vien/tin-nhan");
}
