/**
 * Kiểm thử đấu trường TRÊN DATABASE THẬT.
 * Chạy: node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/test-arena-db.ts
 *
 * Ba thứ chỉ kiểm được ở đây:
 *
 *   1. Quy Điền có thật sự chỉ trôi XUỐNG qua nhiều lần đọc không, hay bị áp
 *      hai lần cho cùng những ngày đó
 *   2. Có mặt theo nhịp tim có tự hết hạn không
 *   3. Chiến Lực sau trận có đối xứng không: bên này cộng bao nhiêu thì bên kia
 *      trừ bấy nhiêu, để tổng của cả sân không tự phình ra
 *
 * File tự dọn dẹp ở cuối, kể cả khi có bài thất bại.
 */
import { db } from "@/lib/db";
import { BASE_RATING, PRESENCE_TTL_SECONDS } from "@/lib/arena/rating.ts";
import {
  applyDuelToRatings,
  enterQuyDien,
  findMatch,
  getArenaProfile,
  heartbeat,
  joinQueue,
  leaderboard,
  leaveQueue,
  leaveQuyDien,
  presentPlayers,
  recordTruce,
} from "@/lib/arena/arena-service.ts";

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
const DAY = 86_400_000;

async function makeUser(tag: string): Promise<string> {
  const u = await db.user.create({
    data: {
      email: `arena-${tag}-${STAMP}@wobridges.invalid`,
      name: `Đấu ${tag}`,
      role: "STUDENT",
    },
    select: { id: true },
  });
  users.push(u.id);
  return u.id;
}

async function cleanup() {
  if (users.length === 0) return;
  await db.matchQueueEntry.deleteMany({ where: { userId: { in: users } } });
  await db.arenaPresence.deleteMany({ where: { userId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
}

try {
  const exercise = await db.exercise.findFirst({
    where: { skill: "READING", published: true },
    select: { id: true },
  });
  if (!exercise) throw new Error("Database chưa có đề Reading nào.");

  console.log("\n— Hồ sơ đấu trường —");

  const a = await makeUser("a");
  const p = await getArenaProfile(a);
  check("hồ sơ tự tạo khi đọc lần đầu", p.chienLuc, BASE_RATING);
  check("chưa đánh trận nào", p.duelsPlayed, 0);
  check("chưa Quy Điền", p.quyDienAt, null);

  console.log("\n— Quy Điền: trôi xuống, có sàn, KHÔNG áp hai lần —");

  const b = await makeUser("b");
  await db.arenaProfile.upsert({
    where: { userId: b },
    create: { userId: b, chienLuc: 1400 },
    update: { chienLuc: 1400 },
  });

  const tenDaysAgo = new Date(Date.now() - 10 * DAY);
  await enterQuyDien(b, tenDaysAgo);

  const after10 = await getArenaProfile(b);
  check("nghỉ 10 ngày thì mất 20 điểm", after10.chienLuc, 1380);

  // Đọc lại NGAY: không được trừ thêm lần nữa cho cùng những ngày đó.
  const readAgain = await getArenaProfile(b);
  check("đọc lại ngay thì KHÔNG trừ thêm", readAgain.chienLuc, 1380);
  const readThrice = await getArenaProfile(b);
  check("đọc lần ba cũng vậy", readThrice.chienLuc, 1380);

  // Người yếu: đã ở dưới sàn, không bị đẩy xuống nữa.
  const c = await makeUser("c");
  await db.arenaProfile.upsert({
    where: { userId: c },
    create: { userId: c, chienLuc: 700 },
    update: { chienLuc: 700 },
  });
  await enterQuyDien(c, new Date(Date.now() - 60 * DAY));
  check("người yếu nghỉ 60 ngày vẫn giữ nguyên", (await getArenaProfile(c)).chienLuc, 700);

  // Người mạnh nghỉ rất lâu: dừng đúng ở sàn, không xuyên qua.
  const d = await makeUser("d");
  await db.arenaProfile.upsert({
    where: { userId: d },
    create: { userId: d, chienLuc: 1300 },
    update: { chienLuc: 1300 },
  });
  await enterQuyDien(d, new Date(Date.now() - 400 * DAY));
  check("nghỉ rất lâu thì dừng đúng ở sàn", (await getArenaProfile(d)).chienLuc, BASE_RATING);

  console.log("\n— Quy Điền tắt mọi thứ —");

  await joinQueue({ userId: b, stake: 0 });
  check(
    "đang Quy Điền thì KHÔNG vào hàng đợi được",
    await db.matchQueueEntry.count({ where: { userId: b } }),
    0,
  );
  check("và KHÔNG được ghi nhận có mặt", await heartbeat({ userId: b }), false);

  const board = await leaderboard(100);
  check(
    "người Quy Điền BIẾN KHỎI bảng xếp hạng",
    board.some((r) => r.userId === b),
    false,
  );

  await leaveQuyDien(b);
  check("quay lại thì hết Quy Điền", await db.arenaProfile.findUnique({ where: { userId: b }, select: { quyDienAt: true } }).then((r) => r?.quyDienAt), null);
  check("nhưng phần đã trôi KHÔNG được trả lại", (await getArenaProfile(b)).chienLuc, 1380);

  console.log("\n— Có mặt theo nhịp tim —");

  const e = await makeUser("e");
  const f = await makeUser("f");
  await heartbeat({ userId: e });
  await heartbeat({ userId: f });
  const present = await presentPlayers();
  check(
    "cả hai đang có mặt",
    [e, f].every((id) => present.some((x) => x.userId === id)),
    true,
  );

  // Đẩy lùi mốc thấy lần cuối ra quá hạn.
  await db.arenaPresence.update({
    where: { userId: f },
    data: { lastSeenAt: new Date(Date.now() - (PRESENCE_TTL_SECONDS + 30) * 1000) },
  });
  const present2 = await presentPlayers();
  check("quá hạn thì rơi khỏi danh sách", present2.some((x) => x.userId === f), false);
  check("người còn nhịp tim thì vẫn ở lại", present2.some((x) => x.userId === e), true);
  check(
    "bản ghi cũ KHÔNG bị xoá, chỉ bị lọc",
    await db.arenaPresence.count({ where: { userId: f } }),
    1,
  );

  console.log("\n— Hàng đợi ghép cặp —");

  const g = await makeUser("g");
  const h = await makeUser("h");
  await db.arenaProfile.upsert({ where: { userId: g }, create: { userId: g, chienLuc: 1000 }, update: { chienLuc: 1000 } });
  await db.arenaProfile.upsert({ where: { userId: h }, create: { userId: h, chienLuc: 1020 }, update: { chienLuc: 1020 } });

  await joinQueue({ userId: g, stake: 0 });
  check("một mình thì chưa ghép được", await findMatch({ userId: g }), null);

  await joinQueue({ userId: h, stake: 0 });
  check("có người ngang sức thì ghép được", await findMatch({ userId: g }), h);
  check("và ngược lại cũng vậy", await findMatch({ userId: h }), g);

  // Vào hàng đợi lần nữa không được đặt lại thời gian chờ.
  const beforeRejoin = await db.matchQueueEntry.findUnique({ where: { userId: g } });
  await joinQueue({ userId: g, stake: 0 });
  const afterRejoin = await db.matchQueueEntry.findUnique({ where: { userId: g } });
  check(
    "gọi lại KHÔNG đặt lại thời gian chờ, nếu không thì dải không bao giờ nới",
    afterRejoin?.joinedAt.getTime(),
    beforeRejoin?.joinedAt.getTime(),
  );

  // Người lệch quá xa mà cả hai vừa vào thì không ghép.
  const i = await makeUser("i");
  await db.arenaProfile.upsert({ where: { userId: i }, create: { userId: i, chienLuc: 1400 }, update: { chienLuc: 1400 } });
  await joinQueue({ userId: i, stake: 0 });
  check("lệch 400 điểm mà vừa vào thì không ghép", await findMatch({ userId: i }), null);

  await leaveQueue(g);
  await leaveQueue(h);
  await leaveQueue(i);
  check("rời hàng đợi thì sạch", await db.matchQueueEntry.count({ where: { userId: { in: [g, h, i] } } }), 0);

  console.log("\n— Chiến Lực sau trận: cộng trừ ĐỐI XỨNG —");

  const x = await makeUser("x");
  const y = await makeUser("y");
  await db.arenaProfile.upsert({ where: { userId: x }, create: { userId: x, chienLuc: 1000, duelsPlayed: 50 }, update: { chienLuc: 1000, duelsPlayed: 50 } });
  await db.arenaProfile.upsert({ where: { userId: y }, create: { userId: y, chienLuc: 1000, duelsPlayed: 50 }, update: { chienLuc: 1000, duelsPlayed: 50 } });

  const duel = await db.duel.create({
    data: {
      status: "SETTLED",
      tier: "FREE",
      exerciseId: exercise.id,
      stake: 0,
      ruleVersion: "test",
      winnerId: x,
      sides: { create: [{ userId: x }, { userId: y }] },
    },
    select: { id: true },
  });

  await applyDuelToRatings({ duelId: duel.id, winnerId: x });
  const xp = await getArenaProfile(x);
  const yp = await getArenaProfile(y);
  check("người thắng lên điểm", xp.chienLuc > 1000, true);
  check("người thua xuống điểm", yp.chienLuc < 1000, true);
  check(
    "TỔNG hai bên không đổi: sân không tự phình điểm ra",
    xp.chienLuc + yp.chienLuc,
    2000,
  );
  check("cả hai đều tăng số trận đã đánh", [xp.duelsPlayed, yp.duelsPlayed], [51, 51]);
  check("ghi đúng thắng thua", [xp.wins, yp.losses], [1, 1]);

  console.log("\n— Giảng hoà: chỉ một dấu Hoà khí, KHÔNG đụng Chiến Lực —");

  const ratingBefore = (await getArenaProfile(x)).chienLuc;
  const truceDuel = await db.duel.create({
    data: {
      status: "TRUCE",
      tier: "FREE",
      exerciseId: exercise.id,
      stake: 0,
      ruleVersion: "test",
      sides: { create: [{ userId: x }, { userId: y }] },
    },
    select: { id: true },
  });
  await recordTruce(truceDuel.id);
  const xAfterTruce = await getArenaProfile(x);
  check("Hoà khí tăng một", xAfterTruce.truces, 1);
  check("Chiến Lực KHÔNG đổi", xAfterTruce.chienLuc, ratingBefore);
  check("số trận đã đánh KHÔNG tăng", xAfterTruce.duelsPlayed, 51);
} catch (error) {
  console.error("\n✗ LỖI KHI CHẠY:", error);
  failures++;
} finally {
  await cleanup();
  await db.$disconnect();
}

console.log(
  failures === 0
    ? "\n✅ ĐẤU TRƯỜNG CHẠY ĐÚNG: QUY ĐIỀN TRÔI MỘT CHIỀU, CHIẾN LỰC ĐỐI XỨNG\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
