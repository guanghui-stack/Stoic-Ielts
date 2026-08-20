/**
 * Ví Quân Công — tầng chạm database.
 *
 * Kỷ luật sao chép từ `payments/coin-service.ts`, và sao chép là có chủ ý: hai
 * sổ cái mà hành xử khác nhau thì sớm muộn sẽ có một cái sai theo cách cái kia
 * đã sửa xong từ lâu.
 *
 * Ba điều giữ nguyên từ sổ cái xu:
 *
 *   1. `upsert` cộng dồn chứ không đọc rồi ghi. Hai lời gọi song song đọc cùng
 *      một số dư rồi ghi đè nhau sẽ nuốt mất một lần cộng.
 *   2. Khoá chống ghi hai lần nằm ở ràng buộc unique của database, không ở một
 *      câu `if` nào đó có thể quên.
 *   3. `amount` luôn dương. Chiều nằm ở `kind`.
 *
 * Điều KHÔNG có ở đây, và không bao giờ được thêm vào: bất cứ hàm nào nhận Xu
 * trả về Quân Công hoặc ngược lại. `scripts/test-economy-invariants.ts` gác
 * điều đó bằng cách đọc mã nguồn.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
// Dùng lại đúng hàm mà hệ danh hiệu và StudyDay đang dùng. Viết một bản thứ
// hai ở đây là cách chắc chắn nhất để hai chỗ nói hai ngày khác nhau về cùng
// một thời điểm, và học viên mất công một ngày mà không hiểu vì sao.
import { dateKeyOf } from "@/lib/achievements/rules.ts";
import {
  MERIT_EARN,
  MERIT_RULE_VERSION,
  type MeritKind,
  meritBalance,
  meritKindDirection,
  qualifiedStudyDayKeys,
  studyDayLedgerKey,
} from "@/lib/merit/merit.ts";

export type MeritWalletView = {
  balance: number;
  earnedTotal: number;
  burnedTotal: number;
};

const EMPTY_WALLET: MeritWalletView = {
  balance: 0,
  earnedTotal: 0,
  burnedTotal: 0,
};

export async function getMeritWallet(userId: string): Promise<MeritWalletView> {
  const wallet = await db.meritWallet.findUnique({ where: { userId } });
  if (!wallet) return EMPTY_WALLET;
  return {
    balance: meritBalance(wallet),
    earnedTotal: wallet.earnedTotal,
    burnedTotal: wallet.burnedTotal,
  };
}

export async function meritLedgerOf(userId: string, take = 20) {
  return db.meritLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/**
 * Ghi một dòng sổ cái và cập nhật ví, trong cùng một transaction.
 *
 * Trả về `false` khi `ledgerKey` đã tồn tại. Đó KHÔNG phải lỗi: nó đúng là
 * điều ta muốn xảy ra khi một job chạy lại hoặc người dùng bấm hai lần.
 */
async function writeMerit(input: {
  userId: string;
  kind: MeritKind;
  amount: number;
  ledgerKey: string;
  studyDateKey?: string;
  note?: string;
}): Promise<{ ok: boolean; balanceAfter: number }> {
  if (input.amount <= 0) {
    throw new Error(
      `[merit] amount phải dương, chiều nằm ở kind. Nhận ${input.amount}`,
    );
  }

  const direction = meritKindDirection(input.kind);

  try {
    return await db.$transaction(
      async (tx) => {
        const wallet = await tx.meritWallet.upsert({
          where: { userId: input.userId },
          create: {
            userId: input.userId,
            earnedTotal: direction === "credit" ? input.amount : 0,
            burnedTotal: direction === "debit" ? input.amount : 0,
          },
          update:
            direction === "credit"
              ? { earnedTotal: { increment: input.amount } }
              : { burnedTotal: { increment: input.amount } },
        });

        const balanceAfter = meritBalance(wallet);

        await tx.meritLedger.create({
          data: {
            userId: input.userId,
            kind: input.kind,
            amount: input.amount,
            balanceAfter,
            ledgerKey: input.ledgerKey,
            studyDateKey: input.studyDateKey ?? null,
            ruleVersion: MERIT_RULE_VERSION,
            note: input.note ?? null,
          },
        });

        return { ok: true, balanceAfter };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    // P2002 = vi phạm ràng buộc unique, tức `ledgerKey` đã có. Cái thắng đã ghi
    // đúng một lần, cái thua rút lui im lặng. Đây là đường đi bình thường, nên
    // không ghi log lỗi ở đây: log sẽ đầy tiếng ồn và che mất lỗi thật.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const wallet = await getMeritWallet(input.userId);
      return { ok: false, balanceAfter: wallet.balance };
    }
    throw error;
  }
}

/**
 * Ghi công những ngày học đạt chuẩn CHƯA được ghi công.
 *
 * Gọi được bao nhiêu lần cũng được: khoá `MERIT:STUDY:<userId>:<dateKey>` bảo
 * đảm mỗi ngày chỉ trả một lần, kể cả khi hai tiến trình chạy song song.
 *
 * Đọc `Attempt` và `FeynmanReview` để biết ngày nào có việc hoàn thành, vì
 * `StudyDay` một mình chỉ nói được thời gian, mà thời gian một mình thì mở tab
 * để đó là đủ.
 */
export async function creditQualifiedStudyDays(
  userId: string,
): Promise<{ creditedDays: string[]; balance: number }> {
  const [studyDays, attempts, reviews] = await Promise.all([
    db.studyDay.findMany({
      where: { userId },
      select: { dateKey: true, activeSeconds: true },
    }),
    db.attempt.findMany({
      where: { userId, submittedAt: { not: null } },
      select: { submittedAt: true },
    }),
    db.feynmanReview.findMany({
      where: { userId, completedAt: { not: null } },
      select: { completedAt: true },
    }),
  ]);

  const completedWork = [
    ...attempts.map((a) => ({ dateKey: dateKeyOf(a.submittedAt as Date) })),
    ...reviews.map((r) => ({ dateKey: dateKeyOf(r.completedAt as Date) })),
  ];

  const qualified = qualifiedStudyDayKeys(studyDays, completedWork);

  // Lọc trước những ngày đã ghi công để không nã database bằng những
  // transaction chắc chắn sẽ bị chặn.
  const already = await db.meritLedger.findMany({
    where: { userId, ledgerKey: { in: qualified.map((d) => studyDayLedgerKey(userId, d)) } },
    select: { studyDateKey: true },
  });
  const done = new Set(already.map((r) => r.studyDateKey));

  const credited: string[] = [];
  let balance = (await getMeritWallet(userId)).balance;

  for (const dateKey of qualified) {
    if (done.has(dateKey)) continue;
    const result = await writeMerit({
      userId,
      kind: "EARN",
      amount: MERIT_EARN.STUDY_DAY,
      ledgerKey: studyDayLedgerKey(userId, dateKey),
      studyDateKey: dateKey,
      note: `Ngày học đạt chuẩn ${dateKey}`,
    });
    balance = result.balanceAfter;
    if (result.ok) credited.push(dateKey);
  }

  return { creditedDays: credited, balance };
}
