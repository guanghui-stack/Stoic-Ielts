import {
  legacyFriendshipForConversation,
  type LegacyConversationActivity,
} from "./rules.ts";

type LegacyFriendshipData = NonNullable<ReturnType<typeof legacyFriendshipForConversation>>;

export type LegacyFriendshipMigrationDb = {
  $queryRaw<T>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  friendship: {
    createMany(args: { data: LegacyFriendshipData[]; skipDuplicates: true }): Promise<{ count: number }>;
  };
};

export async function backfillLegacyFriendships(database: LegacyFriendshipMigrationDb): Promise<number> {
  let cursor = "";
  let created = 0;
  for (;;) {
    // Chỉ lấy các cặp chưa có quan hệ. Phân trang để không tải toàn bộ tin nhắn
    // vào bộ nhớ; chạy lại vẫn bù được chat phát sinh trong một lần rollback.
    const conversations = await database.$queryRaw<LegacyConversationActivity[]>`
      SELECT dc.id, dc.participantAId, dc.participantBId, dc.createdAt, dc.lastMessageAt,
        (SELECT MIN(dm.createdAt) FROM DirectMessage dm
          WHERE dm.conversationId = dc.id AND dm.senderId = dc.participantAId) AS firstMessageByAAt,
        (SELECT MIN(dm.createdAt) FROM DirectMessage dm
          WHERE dm.conversationId = dc.id AND dm.senderId = dc.participantBId) AS firstMessageByBAt
      FROM DirectConversation dc
      LEFT JOIN Friendship f
        ON f.userAId = dc.participantAId AND f.userBId = dc.participantBId
      WHERE f.id IS NULL AND dc.id > ${cursor}
      ORDER BY dc.id ASC
      LIMIT 100
    `;
    if (conversations.length === 0) return created;
    cursor = conversations[conversations.length - 1].id;
    const data = conversations
      .map(legacyFriendshipForConversation)
      .filter((row): row is LegacyFriendshipData => row !== null);
    if (data.length > 0) {
      // Không sửa quan hệ đã tồn tại, kể cả khi lời mời vừa được xử lý trong
      // lúc chuyển dữ liệu hoặc khi hai tiến trình khởi động cùng lúc.
      const result = await database.friendship.createMany({ data, skipDuplicates: true });
      created += result.count;
    }
  }
}
