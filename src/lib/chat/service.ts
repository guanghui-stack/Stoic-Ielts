import { db } from "@/lib/db";
import {
  MESSAGE_MIN_INTERVAL_MS,
  conversationPermissions,
  orderedParticipants,
  validateMessageBody,
} from "@/lib/chat/rules";
import { publishChatMessageCreated } from "@/lib/chat/ably-server";
import { FRIENDSHIP_ACCEPTED, friendshipStateFor, orderedFriendPair, type FriendshipState } from "@/lib/friends/rules";
import { friendshipStatesForStudents } from "@/lib/friends/service";
import { studentAvatarSource } from "@/lib/avatar/source";
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
  friendshipState: FriendshipState;
  other: { id: string; name: string; avatarSrc: string | null };
  lastMessage: { body: string; createdAt: Date; senderId: string } | null;
  lastMessageAt: Date | null;
  unread: boolean;
  unreadCount: number;
};

export type ConversationView = {
  id: string;
  friendshipState: FriendshipState;
  canSend: boolean;
  other: { id: string; name: string; avatarSrc: string | null };
  messages: Array<{
    id: string;
    body: string;
    createdAt: Date;
    senderId: string;
    senderName: string;
  }>;
};

export type StudentSearchResult = {
  id: string;
  name: string;
  avatarSrc: string | null;
  friendshipState: FriendshipState;
};

function accountIsStudent(account: StudentAccount | null): account is StudentAccount {
  return Boolean(account && account.active && !account.isBot && account.role === "STUDENT");
}

async function studentAccount(userId: string): Promise<StudentAccount | null> {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      active: true,
      isBot: true,
    },
  });
}

export async function listInbox(userId: string): Promise<ChatResult<InboxItem[]>> {
  const account = await studentAccount(userId);
  if (!accountIsStudent(account)) return { ok: false, error: "Chỉ học viên mới dùng được hộp chat." };

  // Lịch sử vẫn thuộc về hai người tham gia, kể cả khi chưa kết bạn hoặc
  // đã từ chối lời mời. Quyền gửi tin được kiểm tra riêng trên máy chủ.
  const conversations = await db.directConversation.findMany({
    where: {
      OR: [
        { participantAId: userId },
        { participantBId: userId },
      ],
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    take: INBOX_LIMIT,
    include: {
      participantA: { select: { id: true, name: true, role: true, active: true, isBot: true, avatarUrl: true, uploadedAvatar: { select: { updatedAt: true } } } },
      participantB: { select: { id: true, name: true, role: true, active: true, isBot: true, avatarUrl: true, uploadedAvatar: { select: { updatedAt: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderId: true },
      },
    },
  });

  const states = await friendshipStatesForStudents(
    userId,
    conversations.map((conversation) =>
      conversation.participantAId === userId ? conversation.participantBId : conversation.participantAId,
    ),
  );
  const inboxItems = await Promise.all(
    conversations.map(async (conversation): Promise<InboxItem | null> => {
      const other = conversation.participantAId === userId
        ? conversation.participantB
        : conversation.participantA;
      if (other.role !== "STUDENT" || !other.active || other.isBot) return null;

      const readAt = conversation.participantAId === userId
        ? conversation.participantAReadAt
        : conversation.participantBReadAt;
      const unreadCount = await db.directMessage.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          ...(readAt ? { createdAt: { gt: readAt } } : {}),
        },
      });

      return {
        id: conversation.id,
        friendshipState: states.get(other.id) ?? "NONE",
        other: {
          id: other.id,
          name: other.name,
          avatarSrc: studentAvatarSource(other),
        },
        lastMessage: conversation.messages[0] ?? null,
        lastMessageAt: conversation.lastMessageAt,
        unread: unreadCount > 0,
        unreadCount,
      };
    }),
  );

  return {
    ok: true,
    value: inboxItems.filter((item): item is InboxItem => item !== null),
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
    select: { id: true, name: true, avatarUrl: true, uploadedAvatar: { select: { updatedAt: true } } },
  });

  const states = await friendshipStatesForStudents(userId, students.map((student) => student.id));
  return {
    ok: true,
    value: students.map((student) => ({
      id: student.id,
      name: student.name,
      avatarSrc: studentAvatarSource(student),
      friendshipState: states.get(student.id) ?? "NONE",
    })),
  };
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
  const [userAId, userBId] = orderedFriendPair(userId, otherUserId);
  const friendship = await db.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { status: true },
  });
  if (friendship?.status !== FRIENDSHIP_ACCEPTED) {
    return { ok: false, error: "Hai học viên cần kết bạn trước khi nhắn tin." };
  }
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
      participantA: { select: { id: true, name: true, role: true, active: true, isBot: true, avatarUrl: true, uploadedAvatar: { select: { updatedAt: true } } } },
      participantB: { select: { id: true, name: true, role: true, active: true, isBot: true, avatarUrl: true, uploadedAvatar: { select: { updatedAt: true } } } },
      messages: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: MESSAGE_PAGE_SIZE,
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  });

  if (!conversation || !conversationPermissions(conversation, userId).canRead) {
    return { ok: false, error: "Không tìm thấy cuộc trò chuyện này." };
  }
  const other = conversation.participantAId === userId
    ? conversation.participantB
    : conversation.participantA;
  if (other.role !== "STUDENT" || !other.active || other.isBot) return { ok: false, error: "Học viên này không còn nhận tin nhắn." };
  const [userAId, userBId] = orderedFriendPair(userId, other.id);
  const friendship = await db.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { userAId: true, userBId: true, requestedById: true, status: true },
  });

  return {
    ok: true,
    value: {
      id: conversation.id,
      friendshipState: friendshipStateFor(friendship, userId),
      canSend: conversationPermissions(conversation, userId, friendship?.status).canSend,
      other: {
        id: other.id,
        name: other.name,
        avatarSrc: studentAvatarSource(other),
      },
      messages: [...conversation.messages].reverse().map((message) => ({
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
  const [viewer, conversation] = await Promise.all([
    studentAccount(userId),
    db.directConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, participantAId: true, participantBId: true },
    }),
  ]);
  if (!accountIsStudent(viewer) || !conversation || !conversationPermissions(conversation, userId).canRead) {
    return { ok: false, error: "Không tìm thấy cuộc trò chuyện này." };
  }

  const otherUserId = conversation.participantAId === userId
    ? conversation.participantBId
    : conversation.participantAId;
  if (!accountIsStudent(await studentAccount(otherUserId))) {
    return { ok: false, error: "Học viên này không còn nhận tin nhắn." };
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
    if (!conversation || !conversationPermissions(conversation, userId).canRead) {
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

    const [userAId, userBId] = orderedFriendPair(userId, otherUserId);
    const friendship = await tx.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      select: { status: true },
    });
    if (!conversationPermissions(conversation, userId, friendship?.status).canSend) {
      return { ok: false as const, error: "Hai học viên cần kết bạn trước khi nhắn tin." };
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
    return {
      ok: true as const,
      value: { messageId: message.id, recipientUserId: otherUserId },
    };
  });

  if (!result.ok) return result;

  // Tin đã commit vào MySQL trước khi báo realtime. Ably lỗi vẫn không được
  // biến một tin đã lưu thành trạng thái gửi thất bại ở phía người dùng.
  await publishChatMessageCreated({
    recipientUserId: result.value.recipientUserId,
    conversationId,
    messageId: result.value.messageId,
  });
  return { ok: true, value: { messageId: result.value.messageId } };
}
