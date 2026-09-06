"use server";

import { getCurrentUser } from "@/lib/session";
import { canUseChatRealtime } from "@/lib/chat/realtime-rules";
import { chatPausedForAttempt } from "@/lib/chat/dock-service";
import { validChatId } from "@/lib/chat/dock-rules";
import { ensureConversation, markConversationRead, sendMessage } from "@/lib/chat/service";

async function chatUser() {
  const user = await getCurrentUser();
  if (!user || !canUseChatRealtime(user)) return { error: "Vui lòng đăng nhập tài khoản học viên." } as const;
  if (await chatPausedForAttempt(user.id)) return { error: "Chat tạm ẩn trong lúc bạn làm bài.", paused: true } as const;
  return { user } as const;
}

export async function openChatAction(otherUserId: string) {
  const viewer = await chatUser();
  if (viewer.error) return viewer;
  if (!validChatId(otherUserId)) return { error: "Mã học viên không hợp lệ." };
  const result = await ensureConversation(viewer.user.id, otherUserId);
  return result.ok ? { conversationId: result.value.conversationId } : { error: result.error };
}

export async function sendDockMessageAction(conversationId: string, body: string) {
  const viewer = await chatUser();
  if (viewer.error) return viewer;
  if (!validChatId(conversationId)) return { error: "Mã cuộc trò chuyện không hợp lệ." };
  if (typeof body !== "string") return { error: "Nội dung tin nhắn không hợp lệ." };
  const result = await sendMessage(viewer.user.id, conversationId, body);
  return result.ok ? { messageId: result.value.messageId } : { error: result.error };
}

export async function readDockMessageAction(conversationId: string, messageId: string) {
  const viewer = await chatUser();
  if (viewer.error) return viewer;
  if (!validChatId(conversationId) || !validChatId(messageId)) return { error: "Mã tin nhắn không hợp lệ." };
  const result = await markConversationRead(viewer.user.id, conversationId, messageId);
  return result.ok ? { success: true } : { error: result.error };
}
