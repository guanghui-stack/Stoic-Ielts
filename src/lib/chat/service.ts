import { db } from "@/lib/db";
import {
  MESSAGE_MIN_INTERVAL_MS,
  orderedParticipants,
  validateMessageBody,
} from "@/lib/chat/rules";
const INBOX_LIMIT = 50;
const MESSAGE_PAGE_SIZE = 100;

type StudentAccount = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  isBot: boolean;
};

export type ChatResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type InboxItem = {
  id: string;
  other: { id: string; name: string };
  lastMessage: { body: string; createdAt: Date; senderId: string } | null;
  lastMessageAt: Date | null;
  unread: boolean;
};

export type ConversationView = {
  id: string;
  other: { id: string; name: string };
  messages: Array<{
    id: string;
    body: string;
    createdAt: Date;
    senderId: string;
    senderName: string;
  }>;
};

export type StudentSearchResult = { id: string; name: string };

function accountIsStudent(account: StudentAccount | null): account is StudentAccount {
  return Boolean(account && account.active && !account.isBot && account.role === "STUDENT");
}

async function studentAccount(userId: string): Promise<StudentAccount | null> {
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, active: true, isBot: true },
  });
}

function isParticipant(
  conversation: { participantAId: string; participantBId: string },
  userId: string,
): boolean {
  return conversation.participantAId === userId || conversation.participantBId === userId;
}

function unreadFor(
  conversation: {
    participantAId: string;
    participantAReadAt: Date | null;
    participantBReadAt: Date | null;
    lastMessageAt: Date | null;
  },
  userId: string,
): boolean {
  if (!conversation.lastMessageAt) return false;
  const readAt = conversation.participantAId === userId
    ? conversation.participantAReadAt
    : conversation.participantBReadAt;
  return !readAt || readAt < conversation.lastMessageAt;
}

export async function listInbox(userId: string): Promise<ChatResult<InboxItem[]>> {
  const account = await studentAccount(userId);
  if (!accountIsStudent(account)) return { ok: false, error: "Chỉ học viên mới dùng được hộp chat." };

  const conversations = await db.directConversation.findMany({
    where: { OR: [{ participantAId: userId }, { participantBId: userId }] },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    take: INBOX_LIMIT,
    include: {
      participantA: { select: { id: true, name: true, role: true, active: true, isBot: true } },
      participantB: { select: { id: true, name: true, role: true, active: true, isBot: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderId: true },
      },
    },
  });

  return {
    ok: true,
    value: conversations.reduce<InboxItem[]>((items, conversation) => {
      const other = conversation.participantAId === userId
        ? conversation.participantB
        : conversation.participantA;
      if (other.role !== "STUDENT" || !other.active || other.isBot) return items;
      items.push({
        id: conversation.id,
        other: { id: other.id, name: other.name },
        lastMessage: conversation.messages[0] ?? null,
        lastMessageAt: conversation.lastMessageAt,
        unread: unreadFor(conversation, userId),
      });
      return items;
    }, []),
  };
}

export async function searchStudents(
  userId: string,
  query: string,
): Promise<ChatResult<StudentSearchResult[]>> {
  const account = await studentAccount(userId);
  if (!accountIsStudent(account)) return { ok: false, error: "Chỉ học viên mới dùng được hộp chat." };
  const term = query.trim();
  if (term.length < 2) return { ok: true, value: [] };

  const students = await db.user.findMany({
    where: {
      id: { not: userId },
      role: "STUDENT",
      active: true,
      isBot: false,
      OR: [
        { name: { contains: term } },
        { email: { contains: term } },
      ],
    },
    orderBy: { name: "asc" },
    take: 20,
    select: { id: true, name: true },
  });

  return { ok: true, value: students };
}

export async function ensureConversation(
  userId: string,
  otherUserId: string,
): Promise<ChatResult<{ conversationId: string }>> {
  if (userId === otherUserId) return { ok: false, error: "Bạn không thể tự tạo cuộc trò chuyện với chính mình." };
  const [viewer, other] = await Promise.all([studentAccount(userId), studentAccount(otherUserId)]);
  if (!accountIsStudent(viewer) || !accountIsStudent(other)) {
    return { ok: false, error: "Chỉ có thể nhắn tin với một học viên đang hoạt động." };
  }

  const [participantAId, participantBId] = orderedParticipants(userId, otherUserId);
  const conversation = await db.directConversation.upsert({
    where: { participantAId_participantBId: { participantAId, participantBId } },
    create: { participantAId, participantBId },
    update: {},
    select: { id: true },
  });
  return { ok: true, value: { conversationId: conversation.id } };
}

export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<ChatResult<ConversationView>> {
  const account = await studentAccount(userId);
  if (!accountIsStudent(account)) return { ok: false, error: "Chỉ học viên mới dùng được hộp chat." };

  const conversation = await db.directConversation.findUnique({
    where: { id: conversationId },
    include: {
      participantA: { select: { id: true, name: true, role: true, active: true, isBot: true } },
      participantB: { select: { id: true, name: true, role: true, active: true, isBot: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: MESSAGE_PAGE_SIZE,
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  });

  if (!conversation || !isParticipant(conversation, userId)) {
    return { ok: false, error: "Không tìm thấy cuộc trò chuyện này." };
  }
  const other = conversation.participantAId === userId
    ? conversation.participantB
    : conversation.participantA;
  if (other.role !== "STUDENT" || !other.active || other.isBot) return { ok: false, error: "Học viên này không còn nhận tin nhắn." };

  return {
    ok: true,
    value: {
      id: conversation.id,
      other: { id: other.id, name: other.name },
      messages: conversation.messages.map((message) => ({
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        senderId: message.senderId,
        senderName: message.sender.name,
      })),
    },
  };
}

export async function markConversationRead(
  userId: string,
  conversationId: string,
): Promise<ChatResult<null>> {
  const conversation = await db.directConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, participantAId: true, participantBId: true },
  });
  if (!conversation || !isParticipant(conversation, userId)) {
    return { ok: false, error: "Không tìm thấy cuộc trò chuyện này." };
  }

  const now = new Date();
  await db.directConversation.update({
    where: { id: conversationId },
    data: conversation.participantAId === userId
      ? { participantAReadAt: now }
      : { participantBReadAt: now },
  });
  return { ok: true, value: null };
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  rawBody: string,
): Promise<ChatResult<{ messageId: string }>> {
  const validBody = validateMessageBody(rawBody);
  if (!validBody.ok) return validBody;

  const result = await db.$transaction(async (tx) => {
    const [viewer, conversation] = await Promise.all([
      tx.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, active: true, isBot: true },
      }),
      tx.directConversation.findUnique({
        where: { id: conversationId },
        select: { id: true, participantAId: true, participantBId: true },
      }),
    ]);
    if (!viewer || viewer.role !== "STUDENT" || !viewer.active || viewer.isBot) {
      return { ok: false as const, error: "Chỉ học viên đang hoạt động mới được gửi tin." };
    }
    if (!conversation || !isParticipant(conversation, userId)) {
      return { ok: false as const, error: "Bạn không thuộc cuộc trò chuyện này." };
    }

    const otherUserId = conversation.participantAId === userId
      ? conversation.participantBId
      : conversation.participantAId;
    const other = await tx.user.findUnique({
      where: { id: otherUserId },
      select: { active: true, isBot: true, role: true },
    });
    if (!other || other.role !== "STUDENT" || !other.active || other.isBot) {
      return { ok: false as const, error: "Học viên này không còn nhận tin nhắn." };
    }

    const recent = await tx.directMessage.findFirst({
      where: { conversationId, senderId: userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (recent && Date.now() - recent.createdAt.getTime() < MESSAGE_MIN_INTERVAL_MS) {
      return { ok: false as const, error: "Bạn gửi hơi nhanh. Hãy chờ một lát rồi thử lại." };
    }

    const now = new Date();
    const message = await tx.directMessage.create({
      data: { conversationId, senderId: userId, body: validBody.value },
      select: { id: true },
    });
    await tx.directConversation.update({
      where: { id: conversationId },
      data: conversation.participantAId === userId
        ? { lastMessageAt: now, participantAReadAt: now }
        : { lastMessageAt: now, participantBReadAt: now },
    });
    return { ok: true as const, value: { messageId: message.id } };
  });

  return result;
}
