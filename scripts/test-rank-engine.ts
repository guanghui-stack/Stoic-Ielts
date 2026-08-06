/**
 * Kiểm thử TÍCH HỢP rank engine — chạm database thật.
 * Chạy: npm run test:rank-engine   (cần MySQL cục bộ, xem docs/BAN-GIAO-TAM-QUOC.md)
 *
 * Khác với `test-rank-rules.ts` vốn chỉ kiểm hàm thuần, file này kiểm phần
 * NỐI: đọc dữ liệu thật, ghi UserTrial, chạy giao dịch thăng cấp. Đây là tầng
 * mà suốt thời gian dài không kiểm được vì máy phát triển không có MySQL, nên
 * mọi lỗi ở đây chỉ lộ ra sau khi deploy.
 *
 * CHỐT AN TOÀN: từ chối chạy nếu DATABASE_URL không trỏ localhost. Script tạo
 * và xoá dữ liệu — chạy nhầm vào Hostinger là đụng vào tài khoản học viên thật.
 *
 * Tự dọn: mọi bản ghi tạo ra đều bị xoá ở cuối, kể cả khi có phép thử thất bại.
 */

import fs from "node:fs";
import { db } from "@/lib/db";
import { ensureUserRank, processRankEvent, startTrial, syncTrialEligibility } from "@/lib/ranks/engine";
import { loadRankFacts } from "@/lib/ranks/facts";

const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1] ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("TỪ CHỐI: DATABASE_URL không trỏ localhost. Script này ghi và xoá dữ liệu.");
  process.exit(1);
}

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const EMAIL = `rank-engine-test-${Date.now()}@local.test`;
let userId = "";

async function cleanup() {
  if (!userId) return;
  await db.user.delete({ where: { id: userId } }).catch(() => {});
}

try {
  const exercise = await db.exercise.findFirst({
    where: { skill: "READING" },
    select: { id: true },
  });
  if (!exercise) {
    console.error("Không có đề Reading nào trong database. Chạy `npx next start` một lần để seed.");
    process.exit(1);
  }

  const user = await db.user.create({
    data: { email: EMAIL, name: "Rank Engine Test", passwordHash: "x", role: "STUDENT" },
    select: { id: true },
  });
  userId = user.id;

  console.log("\n— Hồ sơ cấp bậc —");

  const profile = await ensureUserRank(userId);
  check("người mới bắt đầu ở bậc 1", profile.currentLevel, 1);
  check("mã cấp bậc đúng", profile.currentRankCode, "RANK_01_BACH_THAN");

  const again = await ensureUserRank(userId);
  check("gọi lại không tạo hồ sơ thứ hai", again.id, profile.id);

  console.log("\n— Cửa ải đầu tiên tự mở —");

  const facts0 = await loadRankFacts(userId);
  await syncTrialEligibility(userId, facts0, 1);
  const trial0 = await db.userTrial.findUnique({
    where: { userId_trialCode: { userId, trialCode: "TRIAL_01_DAO_VIEN" } },
    select: { status: true },
  });
  check("cửa Đào viên ở trạng thái ELIGIBLE", trial0?.status, "ELIGIBLE");

  console.log("\n— KHÔNG tự thăng cấp khi chưa khởi thí luyện —");

  // Dữ liệu thừa điều kiện vượt, nhưng học viên chưa bấm nút.
  const attemptEarly = await db.attempt.create({
    data: {
      userId, exerciseId: exercise.id, status: "GRADED",
      deadlineAt: new Date(), submittedAt: new Date(), answers: "{}",
      scoreRaw: 12, scoreTotal: 14, band: 6.0, elapsedSeconds: 900,
      validForAchievements: true, integrityStatus: "CLEAR",
    },
    select: { id: true },
  });
  await processRankEvent({ id: `ev-early-${Date.now()}`, userId, type: "READING_GRADED" });
  const afterEarly = await db.userRank.findUnique({ where: { userId }, select: { currentLevel: true } });
  check("vẫn ở bậc 1 vì chưa khởi thí luyện", afterEarly?.currentLevel, 1);

  console.log("\n— Khởi thí luyện —");

  const started = await startTrial(userId, "TRIAL_01_DAO_VIEN");
  check("khởi thí luyện thành công", started.ok, true);

  const activeTrial = await db.userTrial.findUnique({
    where: { userId_trialCode: { userId, trialCode: "TRIAL_01_DAO_VIEN" } },
    select: { id: true, status: true, startedAt: true },
  });
  check("cửa ải chuyển sang ACTIVE", activeTrial?.status, "ACTIVE");
  check("có mốc startedAt", activeTrial?.startedAt !== null, true);

  const runsAfterOne = await db.trialRun.count({ where: { userTrialId: activeTrial!.id } });
  await startTrial(userId, "TRIAL_01_DAO_VIEN");
  const runsAfterTwo = await db.trialRun.count({ where: { userTrialId: activeTrial!.id } });
  check("bấm hai lần không tạo hai lượt ACTIVE", runsAfterTwo, runsAfterOne + 1);

  console.log("\n— Dữ liệu CŨ không được tính cho việc vượt —");

  await processRankEvent({ id: `ev-old-${Date.now()}`, userId, type: "READING_GRADED" });
  const stillOne = await db.userRank.findUnique({ where: { userId }, select: { currentLevel: true } });
  check("bài làm trước khi khởi vẫn không đủ để vượt", stillOne?.currentLevel, 1);

  console.log("\n— Vượt cửa ải bằng dữ liệu MỚI —");

  await db.attempt.create({
    data: {
      userId, exerciseId: exercise.id, status: "GRADED",
      deadlineAt: new Date(), submittedAt: new Date(Date.now() + 1000), answers: "{}",
      scoreRaw: 12, scoreTotal: 14, band: 6.0, elapsedSeconds: 900,
      attemptNumber: 2, validForAchievements: true, integrityStatus: "CLEAR",
    },
  });
  // Phục bàn MIỄN PHÍ — không mua Feynman.
  await db.trialReflection.create({
    data: {
      userId, userTrialId: activeTrial!.id,
      evidenceText: "Đoạn 3 câu 2 nói rõ điều ngược lại.",
      explanation: "Tôi đọc lướt và nhầm từ khóa với một từ đồng nghĩa.",
      lessonRule: "Luôn đối chiếu lại đúng câu chứa từ khóa trước khi chọn.",
    },
  });

  await processRankEvent({ id: `ev-new-${Date.now()}`, userId, type: "READING_GRADED" });

  const promoted = await db.userRank.findUnique({
    where: { userId }, select: { currentLevel: true, currentRankCode: true, version: true },
  });
  check("đã thăng lên bậc 2", promoted?.currentLevel, 2);
  check("mã cấp bậc cập nhật đúng", promoted?.currentRankCode, "RANK_02_NGHIA_BINH");
  check("phục bàn MIỄN PHÍ đủ để vượt, không cần mua Feynman", promoted?.currentLevel, 2);

  const passedTrial = await db.userTrial.findUnique({
    where: { userId_trialCode: { userId, trialCode: "TRIAL_01_DAO_VIEN" } },
    select: { status: true, completedAt: true },
  });
  check("cửa ải chuyển sang PASSED", passedTrial?.status, "PASSED");

  console.log("\n— Idempotent: phát lại sự kiện —");

  const eventId = `ev-replay-${Date.now()}`;
  await processRankEvent({ id: eventId, userId, type: "READING_GRADED" });
  await processRankEvent({ id: eventId, userId, type: "READING_GRADED" });
  const afterReplay = await db.userRank.findUnique({
    where: { userId }, select: { currentLevel: true },
  });
  check("phát lại không thăng thêm cấp", afterReplay?.currentLevel, 2);

  console.log("\n— Cửa ải kế tiếp mở ra —");

  const nextTrial = await db.userTrial.findUnique({
    where: { userId_trialCode: { userId, trialCode: "TRIAL_02_HOANG_CAN" } },
    select: { status: true },
  });
  check("cửa 2 đã có bản ghi trạng thái", nextTrial !== null, true);

  console.log("\n— Không có đường hạ cấp —");

  await db.attempt.update({
    where: { id: attemptEarly.id },
    data: { integrityStatus: "FLAGGED", validForAchievements: false },
  });
  await processRankEvent({ id: `ev-flag-${Date.now()}`, userId, type: "READING_GRADED" });
  const afterFlag = await db.userRank.findUnique({ where: { userId }, select: { currentLevel: true } });
  check("đánh dấu bài cũ là gian lận KHÔNG làm tụt cấp", afterFlag?.currentLevel, 2);
} finally {
  await cleanup();
  await db.$disconnect();
}

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ TÍCH HỢP RANK ENGINE ĐỀU ĐẠT\n"
    : `\n❌ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
