export function canMarkReplyHelpful(input: {
  viewerId: string; postAuthorId: string; postId: string; postVisible: boolean;
  canWrite: boolean; comment: {postId: string; authorId: string; status: string} | null;
}) {
  return input.viewerId === input.postAuthorId && input.postVisible && input.canWrite &&
    !!input.comment && input.comment.postId === input.postId &&
    input.comment.authorId !== input.viewerId && input.comment.status === "VISIBLE";
}

/** Bỏ theo dõi là tắt cả lời trả lời trực tiếp trong chủ đề đó. */
export function notificationRecipients(actorId: string, parentAuthorId: string | null, follows: readonly {userId: string; following: boolean}[]) {
  const preferences = new Map(follows.map((row) => [row.userId, row.following]));
  const recipients = new Map<string, "DIRECT_REPLY" | "THREAD_COMMENT">();
  for (const [id, following] of preferences) if (following && id !== actorId) recipients.set(id, "THREAD_COMMENT");
  if (parentAuthorId && parentAuthorId !== actorId && preferences.get(parentAuthorId) !== false) recipients.set(parentAuthorId, "DIRECT_REPLY");
  return [...recipients].map(([userId, kind]) => ({userId, kind}));
}
