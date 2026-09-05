import "server-only";
import { db } from "@/lib/db";

/** Chỉ đọc tín hiệu có tin chưa đọc, không tải nội dung hay truy vấn từng hộp thư. */
export async function hasUnreadMessages(userId: string): Promise<boolean> {
  const rows = await db.$queryRaw<Array<{ found: number }>>`
    SELECT 1 AS found
    FROM DirectConversation c
    INNER JOIN User other ON other.id = CASE
      WHEN c.participantAId = ${userId} THEN c.participantBId ELSE c.participantAId END
    WHERE (c.participantAId = ${userId} OR c.participantBId = ${userId})
      AND other.role = 'STUDENT' AND other.active = TRUE AND other.isBot = FALSE
      AND EXISTS (
        SELECT 1 FROM DirectMessage m
        WHERE m.conversationId = c.id AND m.senderId <> ${userId}
          AND (CASE WHEN c.participantAId = ${userId}
            THEN c.participantAReadAt ELSE c.participantBReadAt END IS NULL
          OR m.createdAt > CASE WHEN c.participantAId = ${userId}
            THEN c.participantAReadAt ELSE c.participantBReadAt END)
      )
    LIMIT 1
  `;
  return rows.length > 0;
}
