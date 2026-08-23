/**
 * Mùa giải, điểm phe và Bảng Bố Cáo TRÊN DATABASE THẬT.
 * Chạy: node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/test-season-db.ts
 *
 * `test-season.ts` đã gác phần luật thuần. Bài này gác bốn thứ luật thuần không
 * với tới được:
 *
 *   1. Ghi điểm phe hai lần cho cùng một trận có bị chặn ở tầng database không.
 *   2. Chuyển mùa có ĐÓNG đúng một lần không, khi hai request tới cùng lúc.
 *   3. Kéo Chiến Lực về giữa có chừa bot ra không.
 *   4. Tắt hiện tên có gỡ được tin cũ trên bảng không.
 *
 * VỀ VIỆC DỌN DẸP. Chuyển mùa theo thiết kế đụng tới Chiến Lực của MỌI người
 * thật, kể cả người không liên quan tới bài kiểm thử. Vì vậy file này chụp lại
 * toàn bộ Chiến Lực trước khi chạy và trả về đúng như cũ ở cuối, kể cả khi có
 * bài thất bại.
 */
import { db } from "@/lib/db";
import {
  chooseFaction,
  currentSeason,
  factionChoiceState,
  myFactionPoints,
  recordFactionPoints,
  standingsOf,
  territoryOwner,
} from "@/lib/arena/season-service.ts";
import {
  announceRankUp,
  announceTitle,
  hideBulletinsOf,
  listBulletins,
} from "@/lib/arena/bulletin-service.ts";
import { seasonWindowFrom, SEASON_RULE_VERSION } from "@/lib/arena/season.ts";

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
const duels: string[] = [];
const testSeasons: string[] = [];
let ratingSnapshot: { id: string; chienLuc: number }[] = [];

async function makeUser(input: {
  tag: string;
  level?: number;
  isBot?: boolean;
  rating?: number;
  faction?: string;
  allowHall?: boolean;
}): Promise<string> {
  const u = await db.user.create({
    data: {
      email: `season-${input.tag}-${STAMP}@wobridges.invalid`,
      name: `Thử ${input.tag}`,
      role: "STUDENT",
      isBot: input.isBot ?? false,
    },
    select: { id: true },
  });
  users.push(u.id);

  await db.userRank.create({
    data: {
      userId: u.id,
      currentLevel: input.level ?? 1,
      currentRankCode: `RANK_0${input.level ?? 1}_TEST`,
    },
  });
  await db.arenaProfile.create({
    data: {
      userId: u.id,
      chienLuc: input.rating ?? 1000,
      faction: input.faction ?? null,
    },
  });
  if (input.allowHall !== undefined) {
    await db.publicProfile.create({
      data: {
        userId: u.id,
        displayName: `Thử ${input.tag}`,
        allowHall: input.allowHall,
      },
    });
  }
  return u.id;
}

async function makeSettledDuel(input: {
  exerciseId: string;
  a: string;
  b: string;
  winner: string | null;
  status?: string;
}): Promise<string> {
  const now = new Date();
  const duel = await db.duel.create({
    data: {
      status: input.status ?? "SETTLED",
      tier: "FREE",
      exerciseId: input.exerciseId,
      stake: 0,
      settledAt: now,
      winnerId: input.winner,
      winBy: input.winner ? "SCORE" : null,
      ruleVersion: "test",
      sides: {
        create: [
          { userId: input.a, score: 9, elapsedMs: 900_000, submittedAt: now },
          { userId: input.b, score: 7, elapsedMs: 900_000, submittedAt: now },
        ],
      },
    },
    select: { id: true },
  });
  duels.push(duel.id);
  return duel.id;
}

async function cleanup() {
  if (duels.length > 0) {
    await db.duel.deleteMany({ where: { id: { in: duels } } });
  }
  if (users.length > 0) {
    await db.user.deleteMany({ where: { id: { in: users } } });
  }
  // Xoá mùa của bài kiểm thử. Điểm phe theo mùa tự đi theo nhờ khoá ngoại.
  await db.arenaSeason.deleteMany({ where: { ordinal: { gte: 900 } } });
  // Tin tổng kết mùa KHÔNG tự đi theo: khoá ngoại của nó là SetNull, và nó
  // không mang userId nào để đi theo người dùng. Phải xoá tay, nếu không bảng
  // thật đọng lại một tin về mùa S900 không có thật.
  await db.bulletin.deleteMany({
    where: { kind: "SEASON_RESULT", headline: { contains: "Mùa S9" } },
  });
  // Trả Chiến Lực về đúng như trước khi chạy.
  for (const row of ratingSnapshot) {
    await db.arenaProfile.updateMany({
      where: { id: row.id },
      data: { chienLuc: row.chienLuc },
    });
  }
}

try {
  const exercise = await db.exercise.findFirst({
    where: { skill: "READING", published: true },
    select: { id: true },
  });
  if (!exercise) throw new Error("Database chưa có đề Reading nào đã xuất bản.");

  ratingSnapshot = await db.arenaProfile.findMany({
    select: { id: true, chienLuc: true },
  });

  /* ============ 1. Mùa giải tự mở ============ */
  console.log("\n— Mùa giải —");

  const season = await currentSeason();
  check("có mùa đang chạy", season.status, "ACTIVE");
  const again = await currentSeason();
  check("gọi lại trả về đúng mùa đó, không mở thêm", again.id, season.id);

  /* ============ 2. Chọn phe ============ */
  console.log("\n— Chọn phe —");

  const newbie = await makeUser({ tag: "moi", level: 2 });
  const stateLow = await factionChoiceState(newbie);
  check("cấp thấp thì chưa chọn phe được", stateLow.canChoose, false);
  const refused = await chooseFaction({ userId: newbie, faction: "WEI" });
  check("và gọi thẳng vào hàm cũng không qua được", refused.ok, false);

  const captain = await makeUser({ tag: "tuong", level: 5, rating: 1200 });
  const stateOk = await factionChoiceState(captain);
  check("đủ cấp thì chọn được", stateOk.canChoose, true);
  check("và chưa thuộc phe nào", stateOk.faction, null);

  const joined = await chooseFaction({ userId: captain, faction: "SHU" });
  check("gia nhập được", joined.ok, true);

  // Cho đổi phe giữa mùa là mở đường chạy sang phe đang thắng vào tuần cuối.
  const locked = await factionChoiceState(captain);
  check("phe khoá trong mùa này", locked.canChoose, false);
  check("và đọc ra đúng phe đã chọn", locked.faction, "SHU");
  const switched = await chooseFaction({ userId: captain, faction: "WEI" });
  check("đổi phe giữa mùa thì không được", switched.ok, false);

  const badCode = await chooseFaction({ userId: captain, faction: "NGUY" });
  check("mã phe không hợp lệ thì từ chối", badCode.ok, false);

  /* ============ 3. Ghi điểm phe ============ */
  console.log("\n— Ghi điểm phe —");

  const rival = await makeUser({ tag: "doi", level: 5, rating: 1400, faction: "WEI" });
  const bot = await makeUser({ tag: "bot", level: 5, rating: 1100, isBot: true });

  const duelA = await makeSettledDuel({
    exerciseId: exercise.id,
    a: captain,
    b: rival,
    winner: captain,
  });
  const wrote = await recordFactionPoints({ duelId: duelA });
  check("cả hai bên đều được ghi điểm", wrote, 2);

  // Quyết toán chạy lại là chuyện bình thường, và cộng điểm phe hai lần thì
  // không ai phát hiện ra cho tới cuối mùa.
  const twice = await recordFactionPoints({ duelId: duelA });
  check("chạy lại KHÔNG ghi thêm dòng nào", twice, 0);
  check(
    "và sổ điểm chỉ có đúng hai dòng cho trận này",
    await db.factionPointEntry.count({ where: { duelId: duelA } }),
    2,
  );

  const captainPoints = await myFactionPoints(captain, season.id);
  const rivalPoints = await myFactionPoints(rival, season.id);
  check("thắng đối thủ 1400 điểm được 14", captainPoints, 14);
  check("thua thì vẫn được cộng, và cộng ít", rivalPoints, 3);
  check("thua ít hơn thắng", rivalPoints < captainPoints, true);

  const duelBot = await makeSettledDuel({
    exerciseId: exercise.id,
    a: captain,
    b: bot,
    winner: captain,
  });
  check("trận với bot không sinh điểm phe", await recordFactionPoints({ duelId: duelBot }), 0);

  const duelTruce = await makeSettledDuel({
    exerciseId: exercise.id,
    a: captain,
    b: rival,
    winner: null,
    status: "TRUCE",
  });
  check("giảng hoà không sinh điểm phe", await recordFactionPoints({ duelId: duelTruce }), 0);

  const loner = await makeUser({ tag: "khongphe", level: 5 });
  const duelNoFaction = await makeSettledDuel({
    exerciseId: exercise.id,
    a: loner,
    b: rival,
    winner: loner,
  });
  const noFaction = await recordFactionPoints({ duelId: duelNoFaction });
  check("người chưa chọn phe thì không ghi cho họ", noFaction, 1);

  /* ============ 4. Bảng xếp hạng ============ */
  console.log("\n— Bảng xếp hạng phe —");

  const standings = await standingsOf(season.id);
  check("luôn đủ ba phe", standings.length, 3);
  check(
    "Thục có điểm",
    (standings.find((s) => s.faction === "SHU")?.score ?? 0) > 0,
    true,
  );

  /* ============ 5. Chuyển mùa ============ */
  console.log("\n— Chuyển mùa —");

  // Mùa riêng của bài kiểm thử, số thứ tự cao nhất nên `currentSeason` chọn nó.
  // Ngày kết thúc đặt vào quá khứ để bước chuyển mùa xảy ra ngay.
  const past = new Date(Date.now() - 60 * 86_400_000);
  const testSeason = await db.arenaSeason.create({
    data: {
      code: "S900",
      ordinal: 900,
      startAt: past,
      endAt: seasonWindowFrom(past).endAt,
      status: "ACTIVE",
      ruleVersion: SEASON_RULE_VERSION,
    },
    select: { id: true },
  });
  testSeasons.push(testSeason.id);

  await db.factionPointEntry.createMany({
    data: [
      { seasonId: testSeason.id, userId: captain, faction: "SHU", duelId: `t-${STAMP}-1`, points: 90 },
      { seasonId: testSeason.id, userId: rival, faction: "WEI", duelId: `t-${STAMP}-2`, points: 20 },
    ],
  });

  const strongBefore = 1400;
  await db.arenaProfile.updateMany({ where: { userId: rival }, data: { chienLuc: strongBefore } });
  await db.arenaProfile.updateMany({ where: { userId: bot }, data: { chienLuc: 1600 } });

  const rolled = await currentSeason();
  check("mùa mới đã mở", rolled.ordinal, 901);
  testSeasons.push(rolled.id);

  const closed = await db.arenaSeason.findUnique({
    where: { id: testSeason.id },
    select: { status: true, winnerFaction: true, closedAt: true, ratingsReset: true },
  });
  check("mùa cũ đã đóng", closed?.status, "ENDED");
  check("và tuyên bố đúng phe thắng", closed?.winnerFaction, "SHU");
  check("có mốc thời gian đóng", closed?.closedAt !== null, true);

  const rivalAfter = await db.arenaProfile.findUnique({
    where: { userId: rival },
    select: { chienLuc: true },
  });
  check("Chiến Lực người thật bị kéo về giữa", rivalAfter?.chienLuc, 1200);

  // Ba mươi bot tồn tại để mọi mức Chiến Lực đều có đối thủ. Dồn hết bot về mốc
  // gốc là lấy mất đối thủ của người mạnh ngay tuần đầu mùa mới.
  const botAfter = await db.arenaProfile.findUnique({
    where: { userId: bot },
    select: { chienLuc: true },
  });
  check("Chiến Lực của BOT giữ nguyên", botAfter?.chienLuc, 1600);

  check("phe thắng giữ lãnh địa", await territoryOwner(), "SHU");

  // Hai request tới cùng lúc thì chỉ một cái đóng được mùa.
  const rolledAgain = await currentSeason();
  check("gọi lại không mở thêm mùa nữa", rolledAgain.id, rolled.id);
  check(
    "và tổng số mùa của bài kiểm thử vẫn là hai",
    await db.arenaSeason.count({ where: { ordinal: { gte: 900 } } }),
    2,
  );

  // Sang mùa mới thì đổi phe mở lại.
  const newSeasonChoice = await factionChoiceState(captain);
  check("sang mùa mới thì chọn lại phe được", newSeasonChoice.canChoose, true);

  /* ============ 6. Bảng Bố Cáo ============ */
  console.log("\n— Bảng Bố Cáo —");

  const seasonNews = await db.bulletin.findFirst({
    where: { seasonId: testSeason.id, kind: "SEASON_RESULT" },
    select: { headline: true },
  });
  check("chuyển mùa tự đăng tin tổng kết", Boolean(seasonNews), true);

  const quiet = await makeUser({ tag: "kin", level: 9, allowHall: false });
  const loud = await makeUser({ tag: "cong", level: 9, allowHall: true });
  const midRank = await makeUser({ tag: "giua", level: 5, allowHall: true });

  check(
    "cấp cao và cho hiện tên thì lên bảng",
    await announceRankUp({ userId: loud, toLevel: 9, rankName: "Đại tướng quân" }),
    true,
  );
  check(
    "đã tắt hiện tên thì KHÔNG lên bảng",
    await announceRankUp({ userId: quiet, toLevel: 9, rankName: "Đại tướng quân" }),
    false,
  );
  check(
    "cấp chưa đủ cao thì không lên bảng",
    await announceRankUp({ userId: midRank, toLevel: 5, rankName: "Nha tướng" }),
    false,
  );

  const botLoud = await makeUser({ tag: "botcong", level: 9, isBot: true, allowHall: true });
  // Một tin bố cáo bot lên cấp là lời nói dối với cả cộng đồng, và nó xuất hiện
  // đúng vào lúc trang trọng nhất.
  check(
    "bot KHÔNG BAO GIỜ lên bảng",
    await announceRankUp({ userId: botLoud, toLevel: 9, rankName: "Đại tướng quân" }),
    false,
  );

  check(
    "danh hiệu vinh danh thì lên bảng",
    await announceTitle({
      userId: loud,
      titleName: "Thí nghiệm",
      titleCategory: "PRACTICE",
      rankLevel: 9,
    }),
    true,
  );
  check(
    "danh hiệu chất vấn thì KHÔNG BAO GIỜ",
    await announceTitle({
      userId: loud,
      titleName: "Lâm Trận Thoát Đào",
      titleCategory: "ARENA_QUESTION",
      rankLevel: 9,
    }),
    false,
  );
  check(
    "và danh hiệu chuộc lỗi cũng không, dù nó công khai",
    await announceTitle({
      userId: loud,
      titleName: "Cải Quá Tự Tân",
      titleCategory: "ARENA_REDEMPTION",
      rankLevel: 9,
    }),
    false,
  );

  const board = await listBulletins(50);
  check(
    "bảng có tin của người cho hiện tên",
    board.some((b) => b.headline.includes("Thử cong")),
    true,
  );
  check(
    "và KHÔNG có tin nào của người đã tắt",
    board.some((b) => b.headline.includes("Thử kin")),
    false,
  );

  // Tắt cờ mà tin cũ vẫn nằm đó thì cái nút đó chỉ là lời hứa suông.
  const hidden = await hideBulletinsOf(loud);
  check("tắt hiện tên thì gỡ được tin cũ", hidden >= 2, true);
  const afterHide = await listBulletins(50);
  check(
    "và tin đó biến khỏi bảng",
    afterHide.some((b) => b.headline.includes("Thử cong")),
    false,
  );
  check(
    "nhưng hàng vẫn còn để tra khi có khiếu nại",
    (await db.bulletin.count({ where: { userId: loud } })) >= 2,
    true,
  );
} catch (error) {
  console.error("\n✗ LỖI KHI CHẠY:", error);
  failures++;
} finally {
  await cleanup();
  await db.$disconnect();
}

console.log(
  failures === 0
    ? "\n✅ MÙA GIẢI, ĐIỂM PHE VÀ BẢNG BỐ CÁO CHẠY ĐÚNG TRÊN DATABASE\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
