export const FRIENDSHIP_PENDING = "PENDING";
export const FRIENDSHIP_ACCEPTED = "ACCEPTED";
export const FRIENDSHIP_DECLINED = "DECLINED";
export const FRIEND_REQUEST_RETRY_MS = 7 * 24 * 60 * 60 * 1000;

export type FriendshipState =
  | "NONE"
  | "OUTGOING_PENDING"
  | "INCOMING_PENDING"
  | "FRIENDS";

export type FriendshipRow = {
  userAId: string;
  userBId: string;
  requestedById: string;
  status: string;
};

export type LegacyConversationActivity = {
  id: string;
  participantAId: string;
  participantBId: string;
  createdAt: Date;
  lastMessageAt: Date | null;
  firstMessageByAAt: Date | null;
  firstMessageByBAt: Date | null;
};

// Chỉ tin nhắn thực sự từ cả hai phía mới chứng minh quan hệ hai chiều.
// Người duy nhất từng gửi tin trở thành người gửi lời mời, dù nằm ở phía A hay B.
export function legacyFriendshipForConversation(conversation: LegacyConversationActivity) {
  const firstA = conversation.firstMessageByAAt;
  const firstB = conversation.firstMessageByBAt;
  if ((!firstA && !firstB) || conversation.participantAId === conversation.participantBId) {
    return null;
  }
  const aSentFirst = firstA !== null && (firstB === null || firstA <= firstB);
  const [userAId, userBId] = orderedFriendPair(
    conversation.participantAId,
    conversation.participantBId,
  );
  return {
    id: `legacy_${conversation.id}`,
    userAId,
    userBId,
    requestedById: aSentFirst ? conversation.participantAId : conversation.participantBId,
    status: firstA && firstB ? FRIENDSHIP_ACCEPTED : FRIENDSHIP_PENDING,
    requestedAt: (aSentFirst ? firstA : firstB)!,
    respondedAt: firstA && firstB ? new Date(Math.max(firstA.getTime(), firstB.getTime())) : null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.lastMessageAt ?? conversation.createdAt,
  };
}

export function friendRequestRetryBlocked(
  friendship: Pick<FriendshipRow, "requestedById" | "status"> & {
    respondedAt: Date | null;
  },
  requesterId: string,
  nowMs: number,
): boolean {
  return Boolean(
    friendship.status === FRIENDSHIP_DECLINED &&
    friendship.requestedById === requesterId &&
    friendship.respondedAt &&
    nowMs - friendship.respondedAt.getTime() < FRIEND_REQUEST_RETRY_MS,
  );
}

export function orderedFriendPair(firstId: string, secondId: string): [string, string] {
  return firstId < secondId ? [firstId, secondId] : [secondId, firstId];
}

export function friendshipStateFor(
  friendship: FriendshipRow | null | undefined,
  viewerId: string,
): FriendshipState {
  if (!friendship) return "NONE";
  if (friendship.userAId !== viewerId && friendship.userBId !== viewerId) {
    return "NONE";
  }
  if (friendship.status === FRIENDSHIP_ACCEPTED) return "FRIENDS";
  if (friendship.status !== FRIENDSHIP_PENDING) return "NONE";
  return friendship.requestedById === viewerId
    ? "OUTGOING_PENDING"
    : "INCOMING_PENDING";
}
