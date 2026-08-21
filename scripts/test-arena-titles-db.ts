/**
 * Danh hiệu chất vấn và liêm chính đấu trường TRÊN DATABASE THẬT.
 * Chạy: node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/test-arena-titles-db.ts
 *
 * `test-arena-titles.ts` đã gác phần luật thuần. Bài này gác phần mà luật thuần
 * không với tới được, và đó là phần dễ sai nhất:
 *
 *   1. Gắn xong có ĐÚNG là kín không, hay lỡ tay để `publicVisible` bật.
 *   2. Gỡ có mở được đường chuộc lỗi không, hay Cải Quá Tự Tân chỉ nằm trong
 *      danh mục cho đẹp.
 *   3. Bot có lọt vào danh hiệu và hồ sơ liêm chính không.
 *   4. Quét lại một trận đã quét có sinh hồ sơ trùng không.
 *
 * File tự dọn dẹp ở cuối, kể cả khi có bài thất bại.
 */
import { db } from "@/lib/db";
import { seedArenaTitles } from "@/lib/arena/title-catalog.ts";
import {
  awardManualTitle,
  evaluateArenaTitles,
  listHeldArenaTitles,
  revokeTitleByReviewer,
} from "@/lib/arena/title-service.ts";
import {
  listIntegrityCases,
  openIntegrityCase,
  resolveIntegrityCase,
  scanDuelForIntegrity,
} from "@/lib/arena/integrity-service.ts";
import { normalizeReadingParts, type ReadingContent } from "@/lib/exercise-content";

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

async function makeUser(tag: string, isBot = false): Promise<string> {
  const u = await db.user.create({
    data: {
      email: `arena-title-${tag}-${STAMP}@wobridges.invalid`,
      name: `Thử ${tag}`,
      role: "STUDENT",
      isBot,
    },
    select: { id: true },
  });
  users.push(u.id);
  return u.id;
}

/**
 * Dựng một trận ĐÃ QUYẾT TOÁN, ghi thẳng vào bảng.
 *
 * Ở đây đi tắt là đúng: bài này gác luật danh hiệu, không gác quyết toán Quân
 * Công, mà `test-duel-db.ts` đã gác phần đó qua đúng đường thật. Dựng ba mươi
 * trận qua đường thật chỉ để lấy ba lần bỏ mặc là đổi một bài chậm lấy một
 * phép kiểm không thêm gì.
 */
async function makeSettledDuel(input: {
  exerciseId: string;
  a: string;
  b: string;
  daysAgo: number;
  aAbandoned: boolean;
  winnerIsA?: boolean;
}): Promise<string> {
  const at = new Date(Date.now() - input.daysAgo * 86_400_000);
  const duel = await db.duel.create({
    data: {
      status: "SETTLED",
      tier: "FREE",
      exerciseId: input.exerciseId,
      stake: 0,
      settledAt: at,
      winnerId: input.winnerIsA ? input.a : input.b,
      winBy: "SCORE",
      ruleVersion: "test",
      sides: {
        create: [
          {
            userId: input.a,
            score: input.aAbandoned ? 0 : 8,
            elapsedMs: 900_000,
            submittedAt: input.aAbandoned ? null : at,
            abandoned: input.aAbandoned,
          },
          {
            userId: input.b,
            score: 9,
            elapsedMs: 900_000,
            submittedAt: at,
            abandoned: false,
          },
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
}

try {
  const exercise = await db.exercise.findFirst({
    where: { skill: "READING", published: true },
    select: { id: true, content: true },
  });
  if (!exercise) throw new Error("Database chưa có đề Reading nào đã xuất bản.");

  /* ============ 1. Danh mục ============ */
  console.log("\n— Danh mục tám danh hiệu —");

  const seeded = await seedArenaTitles();
  check("gieo đủ tám danh hiệu", seeded, 8);

  const privateCount = await db.titleDefinition.count({
    where: { category: { in: ["ARENA_QUESTION", "ARENA_MANUAL"] }, visibility: "PRIVATE_ONLY" },
  });
  check("bảy danh hiệu chất vấn đều KÍN", privateCount, 7);

  const redemption = await db.titleDefinition.findUnique({
    where: { code: "ARENA_R01_CAI_QUA_TU_TAN" },
    select: { visibility: true },
  });
  check("chỉ Cải Quá Tự Tân là CÔNG KHAI", redemption?.visibility, "PUBLIC");

  // Gieo lại phải không đổi gì. Hàm này chạy MỖI lần khởi động máy chủ.
  await seedArenaTitles();
  check(
    "gieo lại không nhân đôi",
    await db.titleDefinition.count({ where: { code: { startsWith: "ARENA_" } } }),
    8,
  );

  /* ============ 2. Máy gắn, rồi máy gỡ ============ */
  console.log("\n— Bỏ mặc ba trận, rồi đánh trọn năm trận —");

  const a = await makeUser("a");
  const b = await makeUser("b");

  for (let i = 0; i < 3; i++) {
    await makeSettledDuel({
      exerciseId: exercise.id,
      a,
      b,
      daysAgo: 20 - i,
      aAbandoned: true,
    });
  }

  const first = await evaluateArenaTitles(a);
  check("gắn Lâm Trận Thoát Đào", first.awarded, ["ARENA_Q04_LAM_TRAN_THOAT_DAO"]);

  const held = await db.userTitle.findFirst({
    where: { userId: a, title: { code: "ARENA_Q04_LAM_TRAN_THOAT_DAO" } },
    select: { publicVisible: true, status: true },
  });
  // Điều dễ sai nhất trong cả tính năng: một cột `true` ở đây biến hệ danh hiệu
  // chất vấn thành bảng bêu tên trước mặt bạn học.
  check("danh hiệu này KHÔNG công khai", held?.publicVisible, false);
  check("trạng thái là đã nhận", held?.status, "EARNED");

  const again = await evaluateArenaTitles(a);
  check("xét lại không gắn lần hai", again.awarded, []);

  // Năm trận đánh trọn LIÊN TIẾP, mới hơn ba trận bỏ mặc.
  for (let i = 0; i < 5; i++) {
    await makeSettledDuel({
      exerciseId: exercise.id,
      a,
      b,
      daysAgo: 5 - i,
      aAbandoned: false,
    });
  }

  const cleared = await evaluateArenaTitles(a);
  check("máy tự gỡ khi đã sửa", cleared.revoked, ["ARENA_Q04_LAM_TRAN_THOAT_DAO"]);

  const revokedRow = await db.userTitle.findFirst({
    where: { userId: a, title: { code: "ARENA_Q04_LAM_TRAN_THOAT_DAO" } },
    select: { status: true, revokedAt: true, revokeReason: true },
  });
  // Gỡ là một SỰ KIỆN, không phải một phép xoá: Cải Quá Tự Tân đòi bằng chứng
  // rằng người này từng bị gắn rồi tự xoá được.
  check("hàng vẫn còn, chỉ đổi trạng thái", revokedRow?.status, "REVOKED");
  check("có mốc thời gian gỡ", revokedRow?.revokedAt !== null, true);
  check("và có lý do gỡ", (revokedRow?.revokeReason ?? "").length > 0, true);

  const redeemed = await db.userTitle.findFirst({
    where: { userId: a, title: { code: "ARENA_R01_CAI_QUA_TU_TAN" } },
    select: { publicVisible: true, status: true },
  });
  check("và được Cải Quá Tự Tân", redeemed?.status, "EARNED");
  check("danh hiệu chuộc lỗi thì CÔNG KHAI", redeemed?.publicVisible, true);

  /* ============ 3. Bot không mang danh hiệu ============ */
  console.log("\n— Bot —");

  const bot = await makeUser("bot", true);
  for (let i = 0; i < 3; i++) {
    await makeSettledDuel({
      exerciseId: exercise.id,
      a: bot,
      b,
      daysAgo: 20 - i,
      aAbandoned: true,
    });
  }
  const botResult = await evaluateArenaTitles(bot);
  check("bot bỏ mặc ba trận vẫn KHÔNG bị gắn gì", botResult.awarded, []);

  /* ============ 4. Danh hiệu người xử ============ */
  console.log("\n— Hai danh hiệu chỉ người mới gắn được —");

  const reviewer = await makeUser("reviewer");
  const c = await makeUser("c");

  let threw = false;
  try {
    await awardManualTitle({
      userId: c,
      code: "ARENA_M01_NGUY_TAO_QUAN_CONG",
      reviewerId: reviewer,
      evidence: "   ",
    });
  } catch {
    threw = true;
  }
  check("không có bằng chứng thì không gắn được", threw, true);

  const manual = await awardManualTitle({
    userId: c,
    code: "ARENA_M01_NGUY_TAO_QUAN_CONG",
    reviewerId: reviewer,
    evidence: "Đã đối chiếu sổ Quân Công với lịch sử trận, lệch 240 điểm không có trận tương ứng.",
  });
  check("có bằng chứng thì gắn được", manual, true);

  const manualRow = await db.userTitle.findFirst({
    where: { userId: c, title: { code: "ARENA_M01_NGUY_TAO_QUAN_CONG" } },
    select: { publicVisible: true, progressSnapshotJson: true },
  });
  check("cũng KHÔNG công khai", manualRow?.publicVisible, false);
  check(
    "ghi lại TÊN người quyết định",
    String(manualRow?.progressSnapshotJson ?? "").includes(reviewer),
    true,
  );

  const heldList = await listHeldArenaTitles(60);
  check(
    "hiện trong danh sách để gỡ",
    heldList.some((r) => r.user.id === c && r.title.code === "ARENA_M01_NGUY_TAO_QUAN_CONG"),
    true,
  );

  const revokedManual = await revokeTitleByReviewer({
    userId: c,
    code: "ARENA_M01_NGUY_TAO_QUAN_CONG",
    reviewerId: reviewer,
    reason: "Khiếu nại đúng, đã xem lại toàn bộ lịch sử",
  });
  check("gỡ được", revokedManual, true);

  // Gỡ danh hiệu NGƯỜI XỬ thì KHÔNG tự phát Cải Quá Tự Tân. Trao một danh hiệu
  // công khai đẹp đẽ ngay sau khi gỡ một kết luận gian lận đã xác minh là quyết
  // định của chủ nền tảng, không phải của một dòng mã viết sẵn.
  check(
    "gỡ danh hiệu người xử KHÔNG tự phát danh hiệu chuộc lỗi",
    await db.userTitle.count({
      where: { userId: c, title: { code: "ARENA_R01_CAI_QUA_TU_TAN" } },
    }),
    0,
  );

  /* ============ 5. Hồ sơ liêm chính ============ */
  console.log("\n— Hồ sơ liêm chính —");

  const d = await makeUser("d");
  const e = await makeUser("e");

  // Cùng sai một kiểu ở mọi câu: đây là tín hiệu độ tin CAO.
  const content = JSON.parse(exercise.content) as ReadingContent;
  const qids: string[] = [];
  for (const part of normalizeReadingParts(content)) {
    for (const group of part.questionGroups) {
      for (const q of group.questions) qids.push(q.id);
    }
  }
  check("đề mẫu có đủ câu để xét", qids.length >= 3, true);

  const sameWrong = JSON.stringify(
    Object.fromEntries(qids.map((id) => [id, "dap-an-sai-giong-het-nhau"])),
  );
  const now = new Date();
  const attemptIds: string[] = [];
  for (const userId of [d, e]) {
    const attempt = await db.attempt.create({
      data: {
        userId,
        exerciseId: exercise.id,
        status: "GRADED",
        deadlineAt: now,
        submittedAt: now,
        answers: sameWrong,
        scoreRaw: 0,
        scoreTotal: qids.length,
      },
      select: { id: true },
    });
    attemptIds.push(attempt.id);
  }

  const duel = await db.duel.create({
    data: {
      status: "SETTLED",
      tier: "FREE",
      exerciseId: exercise.id,
      stake: 0,
      settledAt: now,
      ruleVersion: "test",
      sides: {
        create: [
          { userId: d, attemptId: attemptIds[0], score: 0, elapsedMs: 900_000, submittedAt: now },
          { userId: e, attemptId: attemptIds[1], score: 0, elapsedMs: 900_000, submittedAt: now },
        ],
      },
    },
    select: { id: true },
  });
  duels.push(duel.id);

  const scan = await scanDuelForIntegrity({ duelId: duel.id, now });
  check("mở hồ sơ cho CẢ HAI bên", scan.opened.length, 2);

  const rescan = await scanDuelForIntegrity({ duelId: duel.id, now });
  // Quyết toán chạy lại là chuyện bình thường, và ba hồ sơ giống hệt nhau trông
  // như ba lần vi phạm với người xét duyệt.
  check("quét lại KHÔNG sinh hồ sơ trùng", rescan.opened.length, 0);

  const queue = await listIntegrityCases({ status: "OPEN", take: 50 });
  const mine = queue.filter((c) => c.subject.id === d || c.subject.id === e);
  check("hồ sơ vào hàng chờ", mine.length, 2);
  check("và có nêu tín hiệu kèm số liệu", mine[0].signals.length >= 1, true);
  check(
    "tín hiệu trùng đáp án sai được nhận ra",
    mine[0].signals.some((s) => s.code === "SAME_WRONG_ANSWERS"),
    true,
  );
  check(
    "hàng chờ xếp theo mức nghi vấn giảm dần",
    queue.every((c, i) => i === 0 || queue[i - 1].priority >= c.priority),
    true,
  );

  // Trận có bot KHÔNG bao giờ vào hàng chờ: bot đọc đề trong không giây, và để
  // bot lọt vào là hàng chờ ngập rác trong một ngày.
  const botAttempt = await db.attempt.create({
    data: {
      userId: bot,
      exerciseId: exercise.id,
      status: "GRADED",
      deadlineAt: now,
      submittedAt: now,
      answers: sameWrong,
      scoreRaw: 0,
      scoreTotal: qids.length,
    },
    select: { id: true },
  });
  const botDuel = await db.duel.create({
    data: {
      status: "SETTLED",
      tier: "FREE",
      exerciseId: exercise.id,
      stake: 0,
      settledAt: now,
      ruleVersion: "test",
      sides: {
        create: [
          { userId: d, attemptId: attemptIds[0], score: 0, elapsedMs: 900_000, submittedAt: now },
          { userId: bot, attemptId: botAttempt.id, score: 0, elapsedMs: 900_000, submittedAt: now },
        ],
      },
    },
    select: { id: true },
  });
  duels.push(botDuel.id);
  const botScan = await scanDuelForIntegrity({ duelId: botDuel.id, now });
  check("trận có bot KHÔNG mở hồ sơ nào", botScan.opened, []);

  /* ============ 6. Đóng hồ sơ ============ */
  console.log("\n— Đóng hồ sơ —");

  const caseId = mine[0].id;

  let noteThrew = false;
  try {
    await resolveIntegrityCase({
      caseId,
      reviewerId: reviewer,
      verdict: "CLEARED",
      note: "  ",
    });
  } catch {
    noteThrew = true;
  }
  // Khi có khiếu nại về sau, câu hỏi luôn là "lần trước đã xem và kết luận gì",
  // và một hồ sơ đóng không lời không trả lời được câu đó.
  check("đóng hồ sơ mà không ghi kết luận thì không được", noteThrew, true);

  const closed = await resolveIntegrityCase({
    caseId,
    reviewerId: reviewer,
    verdict: "CLEARED",
    note: "Đã mở lại bài làm hai bên, đề này chỉ có bốn lựa chọn và cả hai đều bỏ trống nửa sau.",
  });
  check("có kết luận thì đóng được", closed, true);

  const twice = await resolveIntegrityCase({
    caseId,
    reviewerId: reviewer,
    verdict: "CONFIRMED",
    note: "Thử đóng lần hai",
  });
  check("đóng lần hai thì không ăn thua", twice, false);

  const closedRow = await db.arenaIntegrityCase.findUnique({
    where: { id: caseId },
    select: { status: true, resolvedById: true },
  });
  check("kết luận đầu tiên được giữ nguyên", closedRow?.status, "CLEARED");
  check("và ghi tên người đóng", closedRow?.resolvedById, reviewer);

  // Đóng hồ sơ KHÔNG gắn danh hiệu nào. Đây là ranh giới quan trọng nhất của cả
  // màn hình xét duyệt: hai việc, hai nút, hai lần bấm.
  check(
    "đóng hồ sơ KHÔNG gắn danh hiệu nào",
    await db.userTitle.count({
      where: { userId: d, title: { category: { in: ["ARENA_QUESTION", "ARENA_MANUAL"] } } },
    }),
    0,
  );

  const manualOpen = await openIntegrityCase({
    userId: d,
    peerId: null,
    duelId: null,
    signals: [],
    priority: 0.9,
  });
  check("hồ sơ không có tín hiệu nào thì không mở", manualOpen, false);
} catch (error) {
  console.error("\n✗ LỖI KHI CHẠY:", error);
  failures++;
} finally {
  await cleanup();
  await db.$disconnect();
}

console.log(
  failures === 0
    ? "\n✅ DANH HIỆU CHẤT VẤN VÀ HỒ SƠ LIÊM CHÍNH CHẠY ĐÚNG TRÊN DATABASE\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
