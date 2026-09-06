import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { MERIT_RULE_VERSION, meritBalance } from "@/lib/merit/merit.ts";
import {
  convertibleReputation,
  meritForReputation,
  reputationBalance,
  reputationLedgerKey,
} from "@/lib/forum/reputation";

export type ReputationSummary = {
  /** Tổng phiếu trên toàn bộ nội dung của người này. Có thể âm. */
  earnedTotal: number;
  /** Đã quy đổi sang Đức Hạnh bao nhiêu. */
  converted: number;
  /** Đang có bao nhiêu. Có thể âm. */
  balance: number;
  /** Quy đổi được bao nhiêu ngay bây giờ. Luôn ≥ 0. */
  convertible: number;
};

/**
 * Uy vọng của một học viên.
 *
 * Tổng phiếu được TÍNH RA từ bảng bài viết và bình luận chứ không đọc từ một
 * cột số dư. Chậm hơn một chút, nhưng không bao giờ nói khác sự thật nằm trong
 * bảng phiếu — và đó là thứ đáng đánh đổi với một con số dùng để đổi ra Đức
 * Hạnh, tức là đổi ra quyền mua đề và tiền cược đấu trường.
 *
 * Bài và bình luận ĐÃ XOÁ không được tính: giữ lại điểm của nội dung đã gỡ
 * nghĩa là điểm không còn tra lại được nguồn.
 */
export async function reputationOf(userId: string): Promise<ReputationSummary> {
  const [user, posts, comments] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { reputationConverted: true },
    }),
    db.forumPost.aggregate({
      where: { authorId: userId, status: "VISIBLE" },
      _sum: { upCount: true, downCount: true },
    }),
    db.forumComment.aggregate({
      where: { authorId: userId, status: "VISIBLE" },
      _sum: { upCount: true, downCount: true },
    }),
  ]);

  const earnedTotal =
    (posts._sum.upCount ?? 0) -
    (posts._sum.downCount ?? 0) +
    (comments._sum.upCount ?? 0) -
    (comments._sum.downCount ?? 0);
  const converted = user?.reputationConverted ?? 0;

  return {
    earnedTotal,
    converted,
    balance: reputationBalance(earnedTotal, converted),
    convertible: convertibleReputation(earnedTotal, converted),
  };
}

export type ConvertResult =
  | { ok: true; converted: number; meritBalanceAfter: number }
  | { ok: false; reason: "NOTHING_TO_CONVERT" | "ALREADY_DONE" };

/**
 * Quy đổi toàn bộ uy vọng đang có sang Đức Hạnh, tỉ lệ 1:1.
 *
 * BA VIỆC PHẢI NẰM TRONG CÙNG MỘT TRANSACTION: cộng cột đã-quy-đổi của học
 * viên, cộng ví Đức Hạnh, và ghi một dòng sổ cái. Tách ra thì có một khoảnh
 * khắc Đức Hạnh đã vào ví mà uy vọng chưa bị trừ — bấm lại đúng lúc đó là in
 * ra Đức Hạnh từ hư không.
 *
 * Chống bấm hai lần bằng RÀNG BUỘC UNIQUE trên `ledgerKey`, không bằng một câu
 * `if`: hai tab bấm cùng lúc đều đọc thấy "còn 40 uy vọng" và cả hai đều đúng
 * ở thời điểm đọc.
 */
export async function convertReputationToMerit(
  userId: string,
): Promise<ConvertResult> {
  const summary = await reputationOf(userId);
  if (summary.convertible <= 0) return { ok: false, reason: "NOTHING_TO_CONVERT" };

  const amount = meritForReputation(summary.convertible);
  if (amount <= 0) return { ok: false, reason: "NOTHING_TO_CONVERT" };

  const convertedAfter = summary.converted + summary.convertible;
  const ledgerKey = reputationLedgerKey(userId, convertedAfter);

  try {
    return await db.$transaction(
      async (tx) => {
        // Đọc lại trong transaction: giữa lúc tính ở trên và lúc ghi ở đây, một
        // tab khác có thể đã quy đổi xong.
        const fresh = await tx.user.findUnique({
          where: { id: userId },
          select: { reputationConverted: true },
        });
        if ((fresh?.reputationConverted ?? 0) !== summary.converted) {
          return { ok: false as const, reason: "ALREADY_DONE" as const };
        }

        await tx.user.update({
          where: { id: userId },
          data: { reputationConverted: convertedAfter },
        });

        const wallet = await tx.meritWallet.upsert({
          where: { userId },
          create: { userId, earnedTotal: amount, burnedTotal: 0 },
          update: { earnedTotal: { increment: amount } },
        });

        await tx.meritLedger.create({
          data: {
            userId,
            kind: "EARN",
            amount,
            balanceAfter: meritBalance(wallet),
            ledgerKey,
            ruleVersion: MERIT_RULE_VERSION,
            note: `Quy đổi ${summary.convertible} uy vọng`,
          },
        });

        return {
          ok: true as const,
          converted: summary.convertible,
          meritBalanceAfter: meritBalance(wallet),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    // P2002 = `ledgerKey` đã tồn tại, tức một lần bấm khác đã ghi xong. Đây là
    // đường đi bình thường của hai cú bấm, không phải lỗi.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, reason: "ALREADY_DONE" };
    }
    throw error;
  }
}
