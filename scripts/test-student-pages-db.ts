/**
 * Kiểm thử TÍCH HỢP hai trang Sổ Sơ Hở và Nhật Khóa — chạm database thật.
 * Chạy: npm run test:student-pages   (cần MySQL cục bộ)
 *
 * `test-weakness.ts` đã kiểm luật xếp hạng dưới dạng hàm thuần. File này kiểm
 * phần NỐI: `loadRankFacts` có chấm lại bài đúng để suy ra thống kê theo dạng
 * câu không, và truy vấn StudyDay của Nhật Khóa có lọc đúng cửa sổ không.
 *
 * Đây là chỗ dễ sai âm thầm nhất: hàm thuần đúng hết, nhưng tầng đọc dữ liệu
 * trả về mảng rỗng thì trang vẫn hiện "chưa đủ dữ liệu" và không ai biết là
 * lỗi.
 *
 * CHỐT AN TOÀN: từ chối chạy nếu DATABASE_URL không trỏ localhost.
 */

import fs from "node:fs";
import { db } from "@/lib/db";
import { loadRankFacts } from "@/lib/ranks/facts";
import { weaknessRows, MIN_SAMPLES } from "@/lib/ranks/weakness";

const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1] ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("TỪ CHỐI: DATABASE_URL không trỏ localhost.");
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

const stamp = Date.now();
let userId = "";

async function cleanup() {
  if (userId) await db.user.delete({ where: { id: userId } }).catch(() => {});
}

const DAY = 24 * 60 * 60 * 1000;
const REAL_DAY_SECONDS = 600;

try {
  const exercise = await db.exercise.findFirst({
    where: { skill: "READING" },
    select: { id: true },
  });
  if (!exercise) {
    console.error("Không có đề Reading. Chạy `npx next start` một lần để seed.");
    process.exit(1);
  }

  const user = await db.user.create({
    data: {
      email: `student-pages-${stamp}@local.test`,
      name: "Student Pages Test",
      passwordHash: "x",
      role: "STUDENT",
    },
    select: { id: true },
  });
  userId = user.id;

  const now = new Date();

  console.log("\n— loadRankFacts đọc được bài làm —");

  // Bảy lượt trong cửa sổ, một lượt ngoài 180 ngày để kiểm bộ lọc.
  //
  // Số lượt phải đủ để ít nhất một dạng câu vượt ngưỡng 20 mẫu. Nếu không,
  // `weaknessRows` trả về mảng rỗng và mọi phép thử về xếp hạng bên dưới đúng
  // một cách rỗng tuếch — tức là không kiểm được gì.
  //
  // `attemptNumber` phải khác nhau: bảng Attempt có khóa duy nhất trên
  // (userId, exerciseId, attemptNumber) để danh hiệu xét được "lần hợp lệ đầu
  // tiên" mà không bị đổi khi học viên làm lại.
  for (const [index, daysAgo] of [3, 5, 9, 14, 20, 30, 60, 200].entries()) {
    await db.attempt.create({
      data: {
        userId,
        exerciseId: exercise.id,
        status: "GRADED",
        startedAt: new Date(now.getTime() - daysAgo * DAY),
        deadlineAt: new Date(now.getTime() - daysAgo * DAY + 3600_000),
        submittedAt: new Date(now.getTime() - daysAgo * DAY + 1200_000),
        answers: "{}",
        scoreRaw: 9,
        scoreTotal: 14,
        band: 5.5,
        elapsedSeconds: 900,
        attemptNumber: index + 1,
        validForAchievements: true,
        integrityStatus: "CLEAR",
      },
    });
  }

  const facts = await loadRankFacts(userId, { now });
  check("đọc được cả tám lượt làm bài", facts.attempts.length, 8);
  check("mọi lượt đều hợp lệ", facts.attempts.every((a) => a.valid), true);

  // Đây là điểm mấu chốt: thống kê theo dạng câu KHÔNG lưu sẵn trong bảng, nó
  // được suy ra bằng cách chấm lại bài. Nếu bước đó hỏng, mảng rỗng và trang
  // Sổ Sơ Hở im lặng báo "chưa đủ dữ liệu".
  const withStats = facts.attempts.filter(
    (a) => Object.keys(a.questionTypeStats).length > 0,
  );
  check("có suy ra được thống kê theo dạng câu", withStats.length > 0, true);

  const anyPartStats = facts.attempts.some((a) => a.partStats.length > 0);
  check("có suy ra được thống kê theo phần", anyPartStats, true);

  console.log("\n— Cửa sổ 180 ngày của loadRankFacts —");

  const old = facts.attempts.find(
    (a) => now.getTime() - a.submittedAt.getTime() > 190 * DAY,
  );
  check("lượt ngoài 180 ngày vẫn được đếm", facts.attempts.length, 8);
  check(
    "nhưng KHÔNG chấm lại chi tiết cho lượt quá cũ",
    old === undefined || Object.keys(old.questionTypeStats).length === 0,
    true,
  );

  console.log("\n— Sổ Sơ Hở với dữ liệu thật —");

  const rows = weaknessRows(facts.attempts, now);
  const totalQuestions = rows.reduce((sum, r) => sum + r.total, 0);
  console.log(`      (${rows.length} dạng đạt ngưỡng ${MIN_SAMPLES} mẫu, ${totalQuestions} câu)`);
  check("có ít nhất một dạng đạt ngưỡng — bảng không rỗng", rows.length > 0, true);
  check(
    "mọi dòng hiện ra đều đủ ngưỡng mẫu",
    rows.every((r) => r.total >= MIN_SAMPLES),
    true,
  );
  check(
    "xếp từ yếu nhất lên đầu",
    rows.every((r, i) => i === 0 || rows[i - 1].accuracy <= r.accuracy),
    true,
  );

  console.log("\n— Nhật Khóa với dữ liệu thật —");

  for (let i = 0; i < 30; i += 1) {
    await db.studyDay.create({
      data: {
        userId,
        dateKey: new Date(now.getTime() - i * DAY).toISOString().slice(0, 10),
        // Cứ ba ngày có một ngày dưới ngưỡng, để chuỗi bị ngắt thật.
        activeSeconds: i % 3 === 0 ? 300 : 1200,
        readingSeconds: 600,
        sessionsCount: 1,
      },
    });
  }

  const windowFrom = new Date(now.getTime() - 84 * DAY).toISOString().slice(0, 10);
  const days = await db.studyDay.findMany({
    where: { userId, dateKey: { gte: windowFrom } },
    select: { dateKey: true, activeSeconds: true },
  });
  check("đọc được đủ 30 ngày trong cửa sổ 12 tuần", days.length, 30);

  const realDays = days.filter((d) => d.activeSeconds >= REAL_DAY_SECONDS);
  check("đếm đúng số ngày học thật (20/30)", realDays.length, 20);
  check(
    "ngày dưới 10 phút KHÔNG được tính là ngày học thật",
    days.filter((d) => d.activeSeconds < REAL_DAY_SECONDS).length,
    10,
  );

  console.log("\n— Hàng rào liêm chính ở tầng đọc —");

  await db.attempt.updateMany({
    where: { userId },
    data: { integrityStatus: "FLAGGED" },
  });
  const afterFlag = await loadRankFacts(userId, { now });
  check("bài bị gắn cờ liêm chính không còn hợp lệ", afterFlag.attempts.every((a) => !a.valid), true);
  check("và biến mất khỏi Sổ Sơ Hở", weaknessRows(afterFlag.attempts, now).length, 0);
} finally {
  await cleanup();
  await db.$disconnect();
}

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ TÍCH HỢP TRANG HỌC VIÊN ĐỀU ĐẠT\n"
    : `\n❌ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
