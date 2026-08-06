/**
 * Dựng dữ liệu mẫu để XEM hệ Tam Quốc chạy trên máy.
 * Chạy: npm run seed:demo
 *
 * Vì sao cần: database sạch không có học viên nào, nên mọi trang đều hiện
 * trạng thái rỗng và không nhìn ra hệ thống làm được gì. Script này tạo một
 * học viên đã đi được nửa hành trình, cộng một kỳ Dương Thí đủ ba kỳ nguồn
 * để trang quản trị tuyển chọn có thứ để hiển thị.
 *
 * CHỐT AN TOÀN: từ chối chạy nếu DATABASE_URL không trỏ localhost. Script này
 * tạo tài khoản và kết quả thi giả — chạy vào production là làm bẩn dữ liệu thật.
 *
 * Chạy lại được nhiều lần: xoá sạch dữ liệu demo cũ trước khi tạo mới.
 */

import fs from "node:fs";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ensureUserRank, startTrial, processRankEvent } from "@/lib/ranks/engine";

const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1] ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("TỪ CHỐI: DATABASE_URL không trỏ localhost.");
  process.exit(1);
}

const DEMO_TAG = "demo-tam-quoc";
const PASSWORD_NOTE = "Mật khẩu mọi tài khoản demo: demo1234";

// Băm đúng cách hệ thống đang dùng (bcryptjs, cost 10) để đăng nhập được thật.
const demoHash = await bcrypt.hash("demo1234", 10);

console.log("Dọn dữ liệu demo cũ…");
const old = await db.user.findMany({
  where: { email: { contains: DEMO_TAG } },
  select: { id: true },
});
if (old.length > 0) {
  await db.user.deleteMany({ where: { id: { in: old.map((u) => u.id) } } });
}
await db.competition.deleteMany({ where: { code: { startsWith: "DEMO-" } } });

const exercises = await db.exercise.findMany({
  where: { skill: "READING" },
  select: { id: true, title: true },
  take: 6,
});
if (exercises.length < 3) {
  console.error("Cần ít nhất 3 đề Reading. Chạy `npx next start` một lần để seed đề.");
  process.exit(1);
}

/* ===================== Học viên đang đi giữa hành trình ===================== */

console.log("Tạo học viên mẫu…");
const student = await db.user.create({
  data: {
    email: `hoc-vien-${DEMO_TAG}@local.test`,
    name: "Nguyễn Văn Luyện",
    passwordHash: demoHash,
    role: "STUDENT",
    targetOverall: 7.0,
    targetReading: 7.5,
  },
  select: { id: true, email: true },
});

await ensureUserRank(student.id);

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

// Bài làm rải đều 40 ngày để Sổ Sơ Hở và Nhật Khóa có dữ liệu thật.
for (let i = 0; i < 6; i += 1) {
  const exercise = exercises[i % exercises.length];
  await db.attempt.create({
    data: {
      userId: student.id,
      exerciseId: exercise.id,
      status: "GRADED",
      startedAt: new Date(now - (40 - i * 6) * DAY),
      deadlineAt: new Date(now - (40 - i * 6) * DAY + 3600_000),
      submittedAt: new Date(now - (40 - i * 6) * DAY + 1200_000),
      answers: "{}",
      scoreRaw: 8 + i,
      scoreTotal: 14,
      band: 4.5 + i * 0.25,
      elapsedSeconds: 900 + i * 30,
      attemptNumber: i + 1,
      validForAchievements: true,
      integrityStatus: "CLEAR",
    },
  });
}

// Ngày học thật, để Nhật Khóa có chuỗi.
for (let i = 0; i < 25; i += 1) {
  const day = new Date(now - i * DAY);
  await db.studyDay.create({
    data: {
      userId: student.id,
      dateKey: day.toISOString().slice(0, 10),
      activeSeconds: i % 4 === 0 ? 300 : 900 + (i % 5) * 200,
      readingSeconds: 600,
      sessionsCount: 2,
    },
  });
}

// Khởi cửa ải đầu, viết phục bàn miễn phí, rồi để engine tự xét.
const started = await startTrial(student.id, "TRIAL_01_DAO_VIEN");
if (started.ok) {
  const trial = await db.userTrial.findUnique({
    where: { userId_trialCode: { userId: student.id, trialCode: "TRIAL_01_DAO_VIEN" } },
    select: { id: true },
  });
  await db.attempt.create({
    data: {
      userId: student.id,
      exerciseId: exercises[0].id,
      status: "GRADED",
      startedAt: new Date(now + 1000),
      deadlineAt: new Date(now + 3600_000),
      submittedAt: new Date(now + 2000),
      answers: "{}",
      scoreRaw: 11,
      scoreTotal: 14,
      band: 6.0,
      elapsedSeconds: 1000,
      attemptNumber: 7,
      validForAchievements: true,
      integrityStatus: "CLEAR",
    },
  });
  await db.trialReflection.create({
    data: {
      userId: student.id,
      userTrialId: trial!.id,
      questionType: "TFNG",
      evidenceText: "Đoạn 3, câu bắt đầu bằng However, nói rõ điều ngược lại.",
      explanation: "Tôi thấy từ khóa giống nhau nên chọn TRUE mà không đọc hết câu.",
      lessonRule: "Gặp TFNG thì phải đọc trọn câu chứa từ khóa trước khi quyết định.",
    },
  });
  await processRankEvent({ id: `demo-${Date.now()}`, userId: student.id, type: "READING_GRADED" });
}

const rank = await db.userRank.findUnique({
  where: { userId: student.id },
  select: { currentLevel: true, currentRankCode: true },
});

/* ===================== Một kỳ Dương Thí đủ ba kỳ nguồn ===================== */

console.log("Tạo kỳ Dương Thí kèm ba kỳ nguồn…");
const base = { registrationOpenAt: new Date(now), registrationCloseAt: new Date(now), startAt: new Date(now), endAt: new Date(now) };

const monthlyIds: string[] = [];
for (let m = 7; m <= 9; m += 1) {
  const comp = await db.competition.create({
    data: {
      ...base,
      code: `DEMO-M-2026-0${m}`,
      name: `Nguyệt Thí tháng 0${m}/2026`,
      tier: "MONTHLY",
      seasonKey: `2026-0${m}`,
      status: "FINALIZED",
      finalizedAt: new Date(now - 5 * DAY),
    },
    select: { id: true },
  });
  monthlyIds.push(comp.id);

  // Sáu thí sinh mỗi kỳ, band giảm dần để thấy rõ ai lọt ai trượt ngưỡng 7.5.
  for (let r = 1; r <= 6; r += 1) {
    const user = await db.user.create({
      data: {
        email: `thi-sinh-${m}-${r}-${DEMO_TAG}@local.test`,
        name: `Thí sinh ${m}.${r}`,
        passwordHash: demoHash,
        role: "STUDENT",
      },
      select: { id: true },
    });
    await db.competitionEntry.create({
      data: {
        competitionId: comp.id,
        userId: user.id,
        status: "FINALIZED",
        finalRank: r,
        lowestBand: 8.5 - (r - 1) * 0.5,
        averageBand: 8.5 - (r - 1) * 0.4,
        completedAt: new Date(now - 6 * DAY),
        reviewStatus: "CLEAR",
      },
    });
  }
}

const quarterly = await db.competition.create({
  data: {
    ...base,
    code: "DEMO-Q-2026-Q3",
    name: "Dương Thí quý 3/2026",
    tier: "QUARTERLY",
    seasonKey: "2026-Q3",
    status: "DRAFT",
    badgeDurationDays: 90,
  },
  select: { id: true },
});

for (const [index, sourceId] of monthlyIds.entries()) {
  await db.competitionSource.create({
    data: {
      targetCompetitionId: quarterly.id,
      sourceCompetitionId: sourceId,
      orderIndex: index,
    },
  });
}

await db.$disconnect();

console.log("\n===== DỮ LIỆU MẪU ĐÃ SẴN SÀNG =====");
console.log(PASSWORD_NOTE);
console.log(`Học viên : ${student.email}`);
console.log(`Cấp bậc  : bậc ${rank?.currentLevel} (${rank?.currentRankCode})`);
console.log("Kỳ thi   : Dương Thí quý 3/2026 đã gắn đủ 3 kỳ Nguyệt Thí đã chốt");
console.log("\nXem thử:");
console.log("  /hoc-vien              — thẻ cấp bậc, cửa ải kế tiếp, bản đồ thu nhỏ");
console.log("  /hoc-vien/chien-dich   — bản đồ tám cửa ải");
console.log("  /hoc-vien/so-so-ho     — dạng câu yếu");
console.log("  /hoc-vien/nhat-khoa    — 25 ngày học thật");
console.log("  /quan-tri/tuyen-chon   — nguồn tuyển chọn (đăng nhập admin)");
