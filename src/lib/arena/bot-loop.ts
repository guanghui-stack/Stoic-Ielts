import "server-only";
import { db } from "@/lib/db";
import {
  BASE_RATING,
  botAcceptDelaySeconds,
  botOnlineAt,
  botScore,
  botSubmitAfterSeconds,
} from "@/lib/arena/rating.ts";
import {
  acceptInvite,
  recordDuelAttemptResult,
} from "@/lib/arena/duel-service.ts";

/**
 * Vòng lặp bot: có mặt, nhận chiến thư, nộp bài.
 *
 * VÌ SAO CHẠY THEO NHỊP TIM CỦA NGƯỜI THẬT chứ không phải một job định giờ: dự
 * án này không có bộ định giờ nào, và gói Hostinger không cho chạy tiến trình
 * nền. Bot chỉ cần hoạt động khi có người thật ở sân, mà lúc đó thì đã có nhịp
 * tim rồi. Sân không người thì bot có đánh cũng chẳng ai thấy.
 *
 * Hàm này CỐ Ý làm ít việc mỗi nhịp và không bao giờ ném lỗi ra ngoài: nó chạy
 * trên đường đi của một request mà người dùng đang chờ.
 */
export async function tickBots(now = new Date()): Promise<void> {
  const hourVN = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );

  const bots = await db.user.findMany({
    where: { isBot: true, active: true },
    select: { id: true, email: true },
    orderBy: { email: "asc" },
  });
  if (bots.length === 0) return;

  await refreshBotPresence(bots, hourVN, now);
  await acceptPendingInvites(now);
  await submitDueDuels(now);
}

/** Bot nào đang trong khung giờ của mình thì ghi nhận có mặt. */
async function refreshBotPresence(
  bots: readonly { id: string }[],
  hourVN: number,
  now: Date,
): Promise<void> {
  for (let i = 0; i < bots.length; i++) {
    if (!botOnlineAt(i, hourVN)) continue;
    await db.arenaPresence.upsert({
      where: { userId: bots[i].id },
      create: { userId: bots[i].id, lastSeenAt: now, status: "IDLE" },
      update: { lastSeenAt: now },
    });
  }
}

/**
 * Nhận những chiến thư gửi cho bot, sau khi đã nghĩ đủ lâu.
 *
 * Không nhận tức khắc: nhận lời trong nửa giây là dấu hiệu lộ rõ thứ hai, ngay
 * sau việc Chiến Lực trùng nhau.
 */
async function acceptPendingInvites(now: Date): Promise<void> {
  const pending = await db.duelInvite.findMany({
    where: {
      status: "PENDING",
      expiresAt: { gt: now },
      toUser: { isBot: true },
    },
    select: { id: true, toUserId: true, createdAt: true },
    take: 10,
  });

  for (const invite of pending) {
    const waited = (now.getTime() - invite.createdAt.getTime()) / 1000;
    // Độ trễ suy từ chính mã thư, nên cùng một thư luôn ra cùng một mốc: gọi
    // lại ở nhịp sau không làm bot đổi ý về việc đã đủ lâu hay chưa.
    if (waited < botAcceptDelaySeconds(seededRoll(invite.id))) continue;
    try {
      await acceptInvite({ inviteId: invite.id, userId: invite.toUserId, now });
    } catch {
      // Thư hết hạn hoặc không đủ Quân Công. Nhịp sau tự dọn.
    }
  }
}

/**
 * Nộp bài cho những bot đang trong trận và đã tới lượt.
 *
 * Điểm sinh từ `botScore`, tức từ chính Chiến Lực của bot. Đi qua ĐÚNG cửa
 * `recordDuelAttemptResult` mà người thật dùng, nên không tồn tại đường chấm
 * thứ hai nào.
 */
async function submitDueDuels(now: Date): Promise<void> {
  const sides = await db.duelSide.findMany({
    where: {
      submittedAt: null,
      surrenderedAt: null,
      user: { isBot: true },
      duel: { status: "LIVE" },
    },
    select: {
      userId: true,
      attemptId: true,
      duel: {
        select: {
          id: true,
          startedAt: true,
          deadlineAt: true,
          exercise: { select: { content: true } },
        },
      },
    },
    take: 10,
  });

  for (const side of sides) {
    const { duel } = side;
    if (!duel.startedAt || !duel.deadlineAt || !side.attemptId) continue;

    const durationSeconds =
      (duel.deadlineAt.getTime() - duel.startedAt.getTime()) / 1000;
    const elapsed = (now.getTime() - duel.startedAt.getTime()) / 1000;
    const roll = seededRoll(`${duel.id}:${side.userId}`);
    if (elapsed < botSubmitAfterSeconds(durationSeconds, roll)) continue;

    const profile = await db.arenaProfile.findUnique({
      where: { userId: side.userId },
      select: { chienLuc: true },
    });
    const total = countQuestions(duel.exercise.content);
    const score = botScore(profile?.chienLuc ?? BASE_RATING, total, roll);

    try {
      await db.attempt.updateMany({
        where: { id: side.attemptId, status: "IN_PROGRESS" },
        data: {
          status: "GRADED",
          submittedAt: now,
          scoreRaw: score,
          scoreTotal: total,
        },
      });
      await recordDuelAttemptResult({
        attemptId: side.attemptId,
        userId: side.userId,
        scoreRaw: score,
        now,
      });
    } catch {
      // Trận vừa bị huỷ hoặc đã quyết toán. Nhịp sau tự dọn.
    }
  }
}

/**
 * Đếm số câu của một đề, đọc từ khối JSON `Exercise.content`.
 *
 * Trả về 13 khi không đọc được: đó là số câu của một passage IELTS điển hình,
 * và một con số hợp lý còn hơn ném lỗi giữa nhịp tim của người dùng.
 */
function countQuestions(contentJson: string): number {
  try {
    const parsed = JSON.parse(contentJson) as {
      parts?: { questionGroups?: { questions?: unknown[] }[] }[];
      questionGroups?: { questions?: unknown[] }[];
    };
    const groups = parsed.parts
      ? parsed.parts.flatMap((p) => p.questionGroups ?? [])
      : (parsed.questionGroups ?? []);
    const n = groups.reduce((sum, g) => sum + (g.questions?.length ?? 0), 0);
    return n > 0 ? n : 13;
  } catch {
    return 13;
  }
}

/**
 * Bộ sinh số ngẫu nhiên TẤT ĐỊNH theo một chuỗi khoá.
 *
 * Cùng một trận và cùng một bot thì luôn ra cùng dãy số. Nhờ vậy nhịp tim gọi
 * lại nhiều lần không làm bot đổi ý về mốc nộp bài của mình, và điểm nó làm
 * được cũng không đổi giữa hai lần gọi.
 *
 * Dùng `Math.random` ở đây sẽ khiến mỗi nhịp cho một mốc khác nhau, và bot sẽ
 * nộp bài ngay ở nhịp đầu tiên mà con số ngẫu nhiên tình cờ đủ nhỏ.
 */
function seededRoll(key: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let x = Math.imul(h ^ (h >>> 15), 1 | h);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
