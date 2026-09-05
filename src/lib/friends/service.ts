import "server-only";

import { db } from "@/lib/db";
import {
  FRIENDSHIP_ACCEPTED,
  FRIENDSHIP_DECLINED,
  FRIENDSHIP_PENDING,
  friendRequestRetryBlocked,
  friendshipStateFor,
  orderedFriendPair,
  type FriendshipState,
} from "@/lib/friends/rules";
import { studentAvatarSource } from "@/lib/avatar/source";

const FRIEND_REQUESTS_PER_DAY = 30;
const MAX_OUTGOING_PENDING = 50;
const FRIEND_OVERVIEW_LIMIT = 300;

type StudentAccount = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  isBot: boolean;
};

export type FriendResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type FriendPerson = {
  id: string;
  name: string;
  avatarSrc: string | null;
};

export type FriendOverview = {
  incoming: FriendPerson[];
  outgoing: FriendPerson[];
  friends: FriendPerson[];
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

export async function sendFriendRequest(
  userId: string,
  otherUserId: string,
): Promise<FriendResult<{ state: FriendshipState }>> {
  if (!otherUserId || userId === otherUserId) {
    return { ok: false, error: "Bạn không thể gửi lời mời cho chính mình." };
  }

  const [viewer, other] = await Promise.all([
    studentAccount(userId),
    studentAccount(otherUserId),
  ]);
  if (!accountIsStudent(viewer) || !accountIsStudent(other)) {
    return { ok: false, error: "Chỉ có thể kết bạn với học viên đang hoạt động." };
  }

  const [userAId, userBId] = orderedFriendPair(userId, otherUserId);
  const state = await db.$transaction(async (tx): Promise<
    FriendshipState | "RETRY_LATER" | "LIMIT_DAILY" | "LIMIT_PENDING" | "REQUEST_CHANGED"
  > => {
    // Khóa hai tài khoản theo cùng thứ tự trước khi đếm, để lời mời song song
    // không vượt hạn mức và hai lời mời đối ứng không giữ khóa ngược nhau.
    for (const accountId of [userAId, userBId]) {
      const locked = await tx.$queryRaw<StudentAccount[]>`
        SELECT id, name, role, active, isBot FROM \`User\`
        WHERE id = ${accountId} FOR UPDATE
      `;
      if (!accountIsStudent(locked[0] ?? null)) return "REQUEST_CHANGED";
    }

    const existing = await tx.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      select: {
        id: true,
        userAId: true,
        userBId: true,
        requestedById: true,
        status: true,
        respondedAt: true,
      },
    });

    if (existing?.status === FRIENDSHIP_ACCEPTED) return "FRIENDS";
    if (existing?.status === FRIENDSHIP_PENDING && existing.requestedById === userId) {
      return "OUTGOING_PENDING";
    }

    // Hai nguoi cung chu dong gui loi moi thi chap nhan ngay, khong bat nguoi
    // gui sau quay lai bam them mot lan nua.
    if (existing?.status === FRIENDSHIP_PENDING) {
      const accepted = await tx.friendship.updateMany({
        where: {
          id: existing.id,
          status: FRIENDSHIP_PENDING,
          requestedById: { not: userId },
        },
        data: { status: FRIENDSHIP_ACCEPTED, respondedAt: new Date() },
      });
      return accepted.count === 1 ? "FRIENDS" : "REQUEST_CHANGED";
    }

    if (existing && friendRequestRetryBlocked(existing, userId, Date.now())) {
      return "RETRY_LATER";
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recentRequests, outgoingPending] = await Promise.all([
      tx.friendship.count({
        where: { requestedById: userId, requestedAt: { gte: since } },
      }),
      tx.friendship.count({
        where: { requestedById: userId, status: FRIENDSHIP_PENDING },
      }),
    ]);
    if (recentRequests >= FRIEND_REQUESTS_PER_DAY) return "LIMIT_DAILY";
    if (outgoingPending >= MAX_OUTGOING_PENDING) return "LIMIT_PENDING";

    // Mot lenh INSERT ... ON DUPLICATE KEY giu y dinh "hai ben cung gui thi
    // thanh ban" ngay ca khi hai request den dong thoi. Upsert Prisma sau mot
    // findUnique co the last-write-wins va lam mat y dinh cua nguoi gui truoc.
    await tx.$executeRaw`
      INSERT INTO \`Friendship\`
        (\`id\`, \`userAId\`, \`userBId\`, \`requestedById\`, \`status\`, \`requestedAt\`, \`createdAt\`, \`updatedAt\`)
      VALUES
        (${crypto.randomUUID()}, ${userAId}, ${userBId}, ${userId}, ${FRIENDSHIP_PENDING}, NOW(3), NOW(3), NOW(3))
      ON DUPLICATE KEY UPDATE
        \`requestedById\` = CASE
          WHEN \`status\` = 'DECLINED' THEN VALUES(\`requestedById\`)
          ELSE \`requestedById\`
        END,
        \`respondedAt\` = CASE
          WHEN \`status\` = 'PENDING' AND \`requestedById\` <> VALUES(\`requestedById\`) THEN NOW(3)
          WHEN \`status\` = 'DECLINED' THEN NULL
          ELSE \`respondedAt\`
        END,
        \`requestedAt\` = CASE
          WHEN \`status\` = 'DECLINED' THEN NOW(3)
          ELSE \`requestedAt\`
        END,
        \`status\` = CASE
          WHEN \`status\` = 'PENDING' AND \`requestedById\` <> VALUES(\`requestedById\`) THEN 'ACCEPTED'
          WHEN \`status\` = 'DECLINED' THEN 'PENDING'
          ELSE \`status\`
        END,
        \`updatedAt\` = NOW(3)
    `;

    const settled = await tx.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      select: { userAId: true, userBId: true, requestedById: true, status: true },
    });
    return friendshipStateFor(settled, userId);
  });

  if (state === "REQUEST_CHANGED") {
    return {
      ok: false,
      error: "Tài khoản hoặc lời mời vừa thay đổi. Hãy tải lại trang rồi thử lại.",
    };
  }
  if (state === "RETRY_LATER") {
    return {
      ok: false,
      error: "Lời mời vừa bị từ chối. Bạn có thể gửi lại sau 7 ngày.",
    };
  }
  if (state === "LIMIT_DAILY") {
    return {
      ok: false,
      error: "Bạn đã gửi nhiều lời mời hôm nay. Hãy thử lại sau 24 giờ.",
    };
  }
  if (state === "LIMIT_PENDING") {
    return {
      ok: false,
      error: "Bạn đang có quá nhiều lời mời chưa được phản hồi.",
    };
  }

  return { ok: true, value: { state } };
}

export async function respondToFriendRequest(
  userId: string,
  otherUserId: string,
  response: "ACCEPT" | "DECLINE",
): Promise<FriendResult<{ state: FriendshipState }>> {
  if (!otherUserId || userId === otherUserId) {
    return { ok: false, error: "Lời mời kết bạn không hợp lệ." };
  }

  const [viewer, other] = await Promise.all([
    studentAccount(userId),
    studentAccount(otherUserId),
  ]);
  if (!accountIsStudent(viewer) || !accountIsStudent(other)) {
    return { ok: false, error: "Chỉ học viên đang hoạt động mới phản hồi lời mời." };
  }

  const [userAId, userBId] = orderedFriendPair(userId, otherUserId);
  const friendship = await db.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { id: true, requestedById: true, status: true },
  });
  if (
    !friendship ||
    friendship.status !== FRIENDSHIP_PENDING ||
    friendship.requestedById === userId
  ) {
    return { ok: false, error: "Lời mời này không còn chờ bạn phản hồi." };
  }

  const accepted = response === "ACCEPT";
  const updated = await db.friendship.updateMany({
    where: {
      id: friendship.id,
      status: FRIENDSHIP_PENDING,
      requestedById: { not: userId },
    },
    data: {
      status: accepted ? FRIENDSHIP_ACCEPTED : FRIENDSHIP_DECLINED,
      respondedAt: new Date(),
    },
  });
  if (updated.count !== 1) {
    return { ok: false, error: "Lời mời vừa được cập nhật ở một phiên khác." };
  }
  return { ok: true, value: { state: accepted ? "FRIENDS" : "NONE" } };
}

export async function listFriendOverview(userId: string): Promise<FriendResult<FriendOverview>> {
  const account = await studentAccount(userId);
  if (!accountIsStudent(account)) {
    return { ok: false, error: "Chỉ học viên mới sử dụng được danh sách bạn bè." };
  }

  const rows = await db.friendship.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
      status: { in: [FRIENDSHIP_PENDING, FRIENDSHIP_ACCEPTED] },
    },
    orderBy: { updatedAt: "desc" },
    take: FRIEND_OVERVIEW_LIMIT,
    include: {
      userA: {
        select: { id: true, name: true, role: true, active: true, isBot: true, avatarUrl: true, uploadedAvatar: { select: { updatedAt: true } } },
      },
      userB: {
        select: { id: true, name: true, role: true, active: true, isBot: true, avatarUrl: true, uploadedAvatar: { select: { updatedAt: true } } },
      },
    },
  });

  const overview: FriendOverview = { incoming: [], outgoing: [], friends: [] };
  for (const row of rows) {
    const other = row.userAId === userId ? row.userB : row.userA;
    if (!accountIsStudent(other)) continue;
    const person = {
      id: other.id,
      name: other.name,
      avatarSrc: studentAvatarSource(other),
    };
    const state = friendshipStateFor(row, userId);
    if (state === "FRIENDS") overview.friends.push(person);
    else if (state === "INCOMING_PENDING") overview.incoming.push(person);
    else if (state === "OUTGOING_PENDING") overview.outgoing.push(person);
  }
  return { ok: true, value: overview };
}

export async function friendshipStatesForStudents(
  userId: string,
  studentIds: string[],
): Promise<Map<string, FriendshipState>> {
  if (studentIds.length === 0) return new Map();
  const rows = await db.friendship.findMany({
    where: {
      OR: [
        { userAId: userId, userBId: { in: studentIds } },
        { userBId: userId, userAId: { in: studentIds } },
      ],
    },
    select: { userAId: true, userBId: true, requestedById: true, status: true },
  });

  return new Map(
    rows.map((row) => [
      row.userAId === userId ? row.userBId : row.userAId,
      friendshipStateFor(row, userId),
    ]),
  );
}
