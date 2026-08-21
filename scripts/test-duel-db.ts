/**
 * Kiểm thử trận đấu TRÊN DATABASE THẬT.
 * Chạy: node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/test-duel-db.ts
 *
 * Bài quan trọng nhất: sau mỗi kịch bản, ĐỐI CHIẾU SỐ DƯ VÍ với tổng sổ cái.
 * Nếu hai con số lệch nhau thì hoặc có người mất Quân Công oan, hoặc có người
 * in ra Quân Công từ hư không, và không có thông báo lỗi nào cho việc đó.
 *
 * Bốn kịch bản: thắng thua có cược, giảng hoà, đầu hàng, huỷ trận.
 *
 * File tự dọn dẹp ở cuối, kể cả khi có bài thất bại.
 */
import { db } from "@/lib/db";
import {
  acceptInvite,
  agreeTruce,
  declineInvite,
  sendInvite,
  settleDuel,
  submitSide,
  surrender,
  voidDuel,
} from "@/lib/arena/duel-service.ts";

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
const users: string[] = [];

async function makeUser(tag: string, merit: number): Promise<string> {
  const u = await db.user.create({
    data: {
      email: `duel-${tag}-${STAMP}@wobridges.invalid`,
      name: `Thử ${tag}`,
      role: "STUDENT",
    },
    select: { id: true },
  });
  await db.meritWallet.create({
    data: { userId: u.id, earnedTotal: merit, burnedTotal: 0 },
  });
  // Ghi kèm một dòng sổ cái cho phần khởi điểm.
  //
  // Nạp thẳng vào ví mà không ghi sổ là dựng ra một trạng thái KHÔNG BAO GIỜ
  // xảy ra trong mã thật: mọi đường cộng Quân Công đều đi qua `writeMerit`.
  // Thiếu dòng này thì phép đối chiếu ví với sổ cái lệch đúng bằng phần khởi
  // điểm, và bài kiểm thử báo lỗi ở chỗ không có lỗi.
  if (merit > 0) {
    await db.meritLedger.create({
      data: {
        userId: u.id,
        kind: "EARN",
        amount: merit,
        balanceAfter: merit,
        ledgerKey: `TEST:SEED:${u.id}`,
        ruleVersion: "test",
        note: "Quân công khởi điểm cho bài kiểm thử",
      },
    });
  }
  users.push(u.id);
  return u.id;
}

/** Số dư ví, và tổng tính lại từ sổ cái. Hai con số này PHẢI bằng nhau. */
async function walletVsLedger(userId: string) {
  const w = await db.meritWallet.findUnique({ where: { userId } });
  const rows = await db.meritLedger.findMany({
    where: { userId },
    select: { kind: true, amount: true },
  });
  const fromLedger = rows.reduce(
    (sum, r) =>
      sum + (r.kind === "STAKE" || r.kind === "BURN" || r.kind === "REVOKE" ? -r.amount : r.amount),
    0,
  );
  return {
    wallet: (w?.earnedTotal ?? 0) - (w?.burnedTotal ?? 0),
    ledger: fromLedger,
  };
}

async function cleanup() {
  if (users.length > 0) {
    await db.user.deleteMany({ where: { id: { in: users } } });
  }
}

try {
  const exercise = await db.exercise.findFirst({
    where: { skill: "READING", published: true },
    select: { id: true },
  });
  if (!exercise) throw new Error("Database chưa có đề Reading nào đã xuất bản.");

  /* ============ Kịch bản 1: thắng thua có cược ============ */
  console.log("\n— Kịch bản 1: trận có cược, có kẻ thắng người thua —");

  const a = await makeUser("a", 100);
  const b = await makeUser("b", 100);

  const inv = await sendInvite({ fromUserId: a, toUserId: b, stake: 20 });
  if (!inv.ok) throw new Error(`Không gửi được chiến thư: ${inv.reason}`);

  const dup = await sendInvite({ fromUserId: a, toUserId: b, stake: 20 });
  check("mỗi cặp chỉ một thư treo", dup.ok, false);
  if (!dup.ok) check("lý do đúng", dup.reason, "ALREADY_PENDING");

  const self = await sendInvite({ fromUserId: a, toUserId: a, stake: 20 });
  check("không tự thách chính mình", self.ok, false);

  const accepted = await acceptInvite({ inviteId: inv.inviteId, userId: b });
  if (!accepted.ok) throw new Error(`Không nhận lời được: ${accepted.reason}`);

  // Trừ cược ở bước vũ trang, KHÔNG đợi quyết toán.
  const afterArm = await walletVsLedger(a);
  check("cược bị trừ ngay khi nhận lời", afterArm.wallet, 80);
  check("ví khớp sổ cái sau khi vũ trang", afterArm.wallet, afterArm.ledger);
  check(
    "sổ cái ghi đúng một dòng STAKE cho mỗi bên",
    await db.meritLedger.count({ where: { userId: a, kind: "STAKE" } }),
    1,
  );

  await submitSide({ duelId: accepted.duelId, userId: a, score: 11 });
  const notReady = await settleDuel({ duelId: accepted.duelId });
  check("một bên nộp thì CHƯA quyết toán được", notReady.ok, false);
  if (!notReady.ok) check("lý do đúng", notReady.reason, "NOT_READY");

  await submitSide({ duelId: accepted.duelId, userId: b, score: 9 });
  const settled = await settleDuel({ duelId: accepted.duelId });
  if (!settled.ok) throw new Error("Không quyết toán được");
  check("người điểm cao hơn thắng", settled.verdict.kind === "WIN" && settled.verdict.winnerId, a);

  const aEnd = await walletVsLedger(a);
  const bEnd = await walletVsLedger(b);
  check("người thắng: 100 thành 120", aEnd.wallet, 120);
  check("người thua: 100 thành 80", bEnd.wallet, 80);
  check("ví người thắng khớp sổ cái", aEnd.wallet, aEnd.ledger);
  check("ví người thua khớp sổ cái", bEnd.wallet, bEnd.ledger);
  check(
    "TỔNG hai bên vẫn là 200: hệ thống không in thêm cũng không nuốt mất",
    aEnd.wallet + bEnd.wallet,
    200,
  );
  check(
    "người thua KHÔNG có dòng BURN: dòng STAKE lúc vũ trang chính là phần bị huỷ",
    await db.meritLedger.count({ where: { userId: b, kind: "BURN" } }),
    0,
  );
  check(
    "người thắng nhận đúng một REFUND và một MINT",
    [
      await db.meritLedger.count({ where: { userId: a, kind: "REFUND" } }),
      await db.meritLedger.count({ where: { userId: a, kind: "MINT" } }),
    ],
    [1, 1],
  );

  // Chạy lại: khoá chống ghi hai lần phải chặn.
  const again = await settleDuel({ duelId: accepted.duelId });
  check("quyết toán lần hai bị từ chối", again.ok, false);
  const aStill = await walletVsLedger(a);
  check("và số dư KHÔNG đổi", aStill.wallet, 120);

  /* ============ Kịch bản 2: giảng hoà ============ */
  console.log("\n— Kịch bản 2: giảng hoà, trung tính ở mọi chiều —");

  const c = await makeUser("c", 100);
  const d = await makeUser("d", 100);
  const inv2 = await sendInvite({ fromUserId: c, toUserId: d, stake: 30 });
  if (!inv2.ok) throw new Error("Không gửi được thư 2");
  const duel2 = await acceptInvite({ inviteId: inv2.inviteId, userId: d });
  if (!duel2.ok) throw new Error("Không nhận lời 2");

  check("đã trừ cược", (await walletVsLedger(c)).wallet, 70);

  const truceLate = await agreeTruce({
    duelId: duel2.duelId,
    totalQuestions: 12,
    answeredByEach: [9, 1],
  });
  check("nộp quá một phần ba thì KHÔNG giảng hoà được", truceLate.ok, false);
  if (!truceLate.ok) check("lý do đúng", truceLate.reason, "TOO_MUCH_ANSWERED");

  const truce = await agreeTruce({
    duelId: duel2.duelId,
    totalQuestions: 12,
    answeredByEach: [1, 2],
  });
  check("giảng hoà sớm thì được", truce.ok, true);

  const cEnd = await walletVsLedger(c);
  const dEnd = await walletVsLedger(d);
  check("giảng hoà: hoàn cược, cả hai về đúng 100", [cEnd.wallet, dEnd.wallet], [100, 100]);
  check("ví khớp sổ cái sau giảng hoà", [cEnd.wallet === cEnd.ledger, dEnd.wallet === dEnd.ledger], [true, true]);

  /* ============ Kịch bản 3: đầu hàng ============ */
  console.log("\n— Kịch bản 3: đầu hàng thì thua, dù chưa nộp câu nào —");

  const e = await makeUser("e", 100);
  const f = await makeUser("f", 100);
  const inv3 = await sendInvite({ fromUserId: e, toUserId: f, stake: 10 });
  if (!inv3.ok) throw new Error("Không gửi được thư 3");
  const duel3 = await acceptInvite({ inviteId: inv3.inviteId, userId: f });
  if (!duel3.ok) throw new Error("Không nhận lời 3");

  check("đầu hàng được ghi nhận", await surrender({ duelId: duel3.duelId, userId: e }), true);
  await submitSide({ duelId: duel3.duelId, userId: f, score: 3 });

  const settled3 = await settleDuel({ duelId: duel3.duelId });
  if (!settled3.ok) throw new Error("Không quyết toán được trận 3");
  check(
    "người đầu hàng thua, bên kia thắng dù chỉ đúng 3 câu",
    settled3.verdict.kind === "WIN" && settled3.verdict.winnerId,
    f,
  );
  check("thắng theo hình thức bỏ cuộc", settled3.verdict.kind === "WIN" && settled3.verdict.by, "FORFEIT");
  check("người đầu hàng mất cược", (await walletVsLedger(e)).wallet, 90);
  check("người kia được cược", (await walletVsLedger(f)).wallet, 110);

  /* ============ Kịch bản 4: huỷ trận ============ */
  console.log("\n— Kịch bản 4: huỷ trận thì hoàn cược cả hai —");

  const g = await makeUser("g", 100);
  const h = await makeUser("h", 100);
  const inv4 = await sendInvite({ fromUserId: g, toUserId: h, stake: 25 });
  if (!inv4.ok) throw new Error("Không gửi được thư 4");
  const duel4 = await acceptInvite({ inviteId: inv4.inviteId, userId: h });
  if (!duel4.ok) throw new Error("Không nhận lời 4");

  check("đã trừ cược", (await walletVsLedger(g)).wallet, 75);

  let threw = false;
  try {
    await voidDuel({ duelId: duel4.duelId, reason: "   " });
  } catch {
    threw = true;
  }
  check("huỷ trận mà không ghi lý do thì bị chặn", threw, true);

  check(
    "huỷ trận có lý do thì chạy",
    await voidDuel({ duelId: duel4.duelId, reason: "Đề bị lỗi hiển thị" }),
    true,
  );
  const gEnd = await walletVsLedger(g);
  const hEnd = await walletVsLedger(h);
  check("cả hai được hoàn về 100", [gEnd.wallet, hEnd.wallet], [100, 100]);
  check("ví khớp sổ cái", [gEnd.wallet === gEnd.ledger, hEnd.wallet === hEnd.ledger], [true, true]);
  const voided = await db.duel.findUnique({
    where: { id: duel4.duelId },
    select: { status: true, voidReason: true },
  });
  check("trạng thái và lý do được ghi lại", [voided?.status, voided?.voidReason], [
    "VOIDED",
    "Đề bị lỗi hiển thị",
  ]);

  /* ============ Từ chối chiến thư ============ */
  console.log("\n— Từ chối chiến thư: chưa trừ đồng nào —");

  const i = await makeUser("i", 50);
  const j = await makeUser("j", 50);
  const inv5 = await sendInvite({ fromUserId: i, toUserId: j, stake: 15 });
  if (!inv5.ok) throw new Error("Không gửi được thư 5");
  check("từ chối được", await declineInvite({ inviteId: inv5.inviteId, userId: j }), true);
  check("người gửi vẫn nguyên 50", (await walletVsLedger(i)).wallet, 50);
  check("người từ chối vẫn nguyên 50", (await walletVsLedger(j)).wallet, 50);
  check(
    "không sinh dòng sổ cái nào của trận",
    await db.meritLedger.count({
      where: { userId: { in: [i, j] }, ledgerKey: { startsWith: "DUEL:" } },
    }),
    0,
  );

  /* ============ Hạng không cược ============ */
  console.log("\n— Hạng không cược: cửa đấu trường luôn mở —");

  const k = await makeUser("k", 0);
  const l = await makeUser("l", 0);
  const inv6 = await sendInvite({ fromUserId: k, toUserId: l, stake: 0 });
  check("người hết sạch Quân Công vẫn thách đấu được", inv6.ok, true);
  if (!inv6.ok) throw new Error("Không gửi được thư 6");
  const duel6 = await acceptInvite({ inviteId: inv6.inviteId, userId: l });
  check("và vào trận được", duel6.ok, true);
  if (!duel6.ok) throw new Error("Không nhận lời 6");

  await submitSide({ duelId: duel6.duelId, userId: k, score: 8 });
  await submitSide({ duelId: duel6.duelId, userId: l, score: 5 });
  const settled6 = await settleDuel({ duelId: duel6.duelId });
  check("quyết toán được", settled6.ok, true);
  check("nhưng KHÔNG sinh dòng sổ cái nào", settled6.ok && settled6.entries.length, 0);
  check("số dư vẫn là 0", (await walletVsLedger(k)).wallet, 0);
} catch (error) {
  console.error("\n✗ LỖI KHI CHẠY:", error);
  failures++;
} finally {
  await cleanup();
  await db.$disconnect();
}

console.log(
  failures === 0
    ? "\n✅ QUYẾT TOÁN TRẬN ĐÚNG: VÍ KHỚP SỔ CÁI Ở MỌI KỊCH BẢN\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
