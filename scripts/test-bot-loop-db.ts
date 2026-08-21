/**
 * Kiểm thử vòng lặp bot TRÊN DATABASE THẬT.
 * Chạy: node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/test-bot-loop-db.ts
 *
 * Trọn một vòng: người thật gửi chiến thư cho bot, bot nghĩ rồi nhận, cả hai
 * làm bài, máy chủ chấm và quyết toán, Chiến Lực hai bên đổi.
 *
 * Ba thứ chỉ kiểm được ở đây:
 *
 *   1. Bot có NHẬN chiến thư không, và có nhận TỨC KHẮC không. Nhận trong nửa
 *      giây là dấu hiệu lộ rõ thứ hai sau Chiến Lực trùng nhau.
 *   2. Trận với bot có tạo lượt làm bài thật cho cả hai bên không.
 *   3. Điểm bot làm được có nằm trong khoảng hợp lý với Chiến Lực của nó không.
 *
 * File tự dọn dẹp ở cuối, kể cả khi có bài thất bại.
 */
import { db } from "@/lib/db";
import { tickBots } from "@/lib/arena/bot-loop.ts";
import { sendInvite, recordDuelAttemptResult } from "@/lib/arena/duel-service.ts";
import { botAccuracy } from "@/lib/arena/rating.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const STAMP = Date.now();
let humanId = "";
let duelId = "";

async function cleanup() {
  if (duelId) await db.duel.deleteMany({ where: { id: duelId } });
  if (humanId) await db.user.deleteMany({ where: { id: humanId } });
}

try {
  const bots = await db.user.findMany({
    where: { isBot: true },
    select: { id: true, name: true },
    take: 1,
  });
  if (bots.length === 0) throw new Error("Chưa có bot nào. Khởi động máy chủ một lần trước.");
  const bot = bots[0];

  const human = await db.user.create({
    data: {
      email: `bot-test-${STAMP}@wobridges.invalid`,
      name: "Người thật thử",
      role: "STUDENT",
    },
    select: { id: true },
  });
  humanId = human.id;

  console.log("\n— Người thật gửi chiến thư cho bot —");

  const invite = await sendInvite({
    fromUserId: humanId,
    toUserId: bot.id,
    stake: 0,
    toWasPresent: true,
  });
  if (!invite.ok) throw new Error(`Không gửi được thư: ${invite.reason}`);
  check("thư đã gửi", invite.ok, true);

  // Nhịp NGAY LẬP TỨC: bot chưa được nhận, vì nó phải nghĩ đã.
  await tickBots(new Date());
  const stillPending = await db.duelInvite.findUnique({
    where: { id: invite.inviteId },
    select: { status: true },
  });
  check(
    "bot KHÔNG nhận tức khắc: nhận trong nửa giây là lộ ngay",
    stillPending?.status,
    "PENDING",
  );

  console.log("\n— Sau khi bot nghĩ xong —");

  // Đẩy thời gian tới 40 giây sau, quá mức nghĩ lâu nhất là 26 giây.
  const later = new Date(Date.now() + 40_000);
  await tickBots(later);

  const accepted = await db.duelInvite.findUnique({
    where: { id: invite.inviteId },
    select: { status: true, duelId: true },
  });
  check("bot đã nhận lời", accepted?.status, "ACCEPTED");
  if (!accepted?.duelId) throw new Error("Nhận lời mà không tạo trận");
  duelId = accepted.duelId;

  const sides = await db.duelSide.findMany({
    where: { duelId },
    select: { userId: true, attemptId: true },
  });
  check("trận có đúng hai bên", sides.length, 2);
  check(
    "CẢ HAI bên đều có lượt làm bài thật, kể cả bot",
    sides.every((s) => Boolean(s.attemptId)),
    true,
  );

  const attempts = await db.attempt.findMany({
    where: { id: { in: sides.map((s) => s.attemptId as string) } },
    select: { status: true, validForAchievements: true },
  });
  check("lượt làm bài đang mở", attempts.every((a) => a.status === "IN_PROGRESS"), true);
  check(
    "bài trong trận KHÔNG tính vào danh hiệu luyện tập",
    attempts.every((a) => a.validForAchievements === false),
    true,
  );

  console.log("\n— Bot nộp bài khi tới lượt —");

  const duel = await db.duel.findUnique({
    where: { id: duelId },
    select: { startedAt: true, deadlineAt: true },
  });
  const duration =
    (duel!.deadlineAt!.getTime() - duel!.startedAt!.getTime()) / 1000;

  // Đẩy tới 90% thời lượng: quá mốc nộp muộn nhất của bot là 85%.
  const late = new Date(duel!.startedAt!.getTime() + duration * 0.9 * 1000);
  await tickBots(late);

  const botSide = await db.duelSide.findFirst({
    where: { duelId, userId: bot.id },
    select: { score: true, submittedAt: true },
  });
  check("bot đã nộp", Boolean(botSide?.submittedAt), true);
  check("và có điểm", typeof botSide?.score === "number", true);

  const profile = await db.arenaProfile.findUnique({
    where: { userId: bot.id },
    select: { chienLuc: true },
  });
  const total =
    (await db.attempt.findFirst({
      where: { id: sides.find((s) => s.userId === bot.id)?.attemptId ?? "" },
      select: { scoreTotal: true },
    }))?.scoreTotal ?? 13;
  const expected = botAccuracy(profile?.chienLuc ?? 1000) * total;
  const score = botSide?.score ?? -1;
  check(
    `điểm ${score} nằm trong khoảng hợp lý quanh kỳ vọng ${expected.toFixed(1)} của Chiến Lực ${profile?.chienLuc}`,
    score >= 0 && score <= total && Math.abs(score - expected) <= total * 0.45,
    true,
  );

  console.log("\n— Người thật nộp, trận tự quyết toán —");

  const humanSide = sides.find((s) => s.userId === humanId);
  await recordDuelAttemptResult({
    attemptId: humanSide!.attemptId as string,
    userId: humanId,
    scoreRaw: total,
    now: late,
  });

  const settled = await db.duel.findUnique({
    where: { id: duelId },
    select: { status: true, winnerId: true },
  });
  check("trận đã quyết toán", settled?.status, "SETTLED");
  check("người thật làm đúng hết nên thắng", settled?.winnerId, humanId);

  const humanProfile = await db.arenaProfile.findUnique({
    where: { userId: humanId },
    select: { chienLuc: true, wins: true },
  });
  check("người thật được cộng Chiến Lực", (humanProfile?.chienLuc ?? 0) > 1000, true);
  check("và ghi một trận thắng", humanProfile?.wins, 1);
} catch (error) {
  console.error("\n✗ LỖI KHI CHẠY:", error);
  failures++;
} finally {
  await cleanup();
  await db.$disconnect();
}

console.log(
  failures === 0
    ? "\n✅ BOT CHẠY TRỌN MỘT VÒNG: NGHĨ, NHẬN, LÀM BÀI, QUYẾT TOÁN\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
