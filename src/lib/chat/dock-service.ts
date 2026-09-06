import "server-only";
import { db } from "@/lib/db";
import { studentAvatarSource } from "@/lib/avatar/source";
import type { DockInboxItem } from "./dock-rules";

/** Match the dictionary's exam boundary, including an exam in another tab. */
export async function chatPausedForAttempt(userId: string): Promise<boolean> {
  return Boolean(await db.attempt.findFirst({
    where: { userId, status: "IN_PROGRESS", deadlineAt: { gt: new Date() } },
    select: { id: true },
  }));
}

/** Metadata only: no message bodies in the sitewide polling response. */
export async function listDockInbox(userId: string): Promise<DockInboxItem[]> {
  const people = { id: true, name: true, avatarUrl: true, uploadedAvatar: { select: { updatedAt: true } } } as const;
  const conversations = await db.directConversation.findMany({
    where: {
      OR: [{ participantAId: userId }, { participantBId: userId }],
      participantA: { active: true, isBot: false, role: "STUDENT" },
      participantB: { active: true, isBot: false, role: "STUDENT" },
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    take: 50,
    select: {
      id: true, participantAId: true, participantAReadAt: true, participantBReadAt: true,
      participantA: { select: people }, participantB: { select: people },
      messages: {
        where: { senderId: { not: userId } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1,
        select: { id: true, createdAt: true },
      },
    },
  });
  return conversations.map((conversation) => {
    const isA = conversation.participantAId === userId;
    const other = isA ? conversation.participantB : conversation.participantA;
    const readAt = isA ? conversation.participantAReadAt : conversation.participantBReadAt;
    const message = conversation.messages[0];
    return {
      id: conversation.id,
      other: { id: other.id, name: other.name, avatarSrc: studentAvatarSource(other) },
      incomingMessageId: message?.id ?? null,
      unread: Boolean(message && (!readAt || message.createdAt > readAt)),
    };
  });
}
