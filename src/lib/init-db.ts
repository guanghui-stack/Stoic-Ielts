import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { ensureAdminAccount, type AdminDb } from "@/lib/admin-account";
import seedData from "../../prisma/seed-data.json";
import readingGameTheory from "../../prisma/reading-game-theory.json";

/**
 * Tạo bảng trực tiếp bằng SQL MySQL (tương đương `prisma db push` cho schema
 * hiện tại) — không cần Prisma CLI trên hosting. Index và khóa ngoại được
 * khai báo ngay trong CREATE TABLE nên chạy lại vô hại (IF NOT EXISTS).
 */
const DDL = [
  `CREATE TABLE IF NOT EXISTS \`User\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`email\` VARCHAR(191) NOT NULL,
    \`passwordHash\` VARCHAR(191) NOT NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`role\` VARCHAR(191) NOT NULL DEFAULT 'STUDENT',
    \`active\` BOOLEAN NOT NULL DEFAULT true,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`targetOverall\` DOUBLE NULL,
    \`targetReading\` DOUBLE NULL,
    \`targetListening\` DOUBLE NULL,
    \`targetWriting\` DOUBLE NULL,
    \`targetSpeaking\` DOUBLE NULL,
    \`examDate\` DATETIME(3) NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`User_email_key\` (\`email\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Exercise\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`skill\` VARCHAR(191) NOT NULL,
    \`taskType\` VARCHAR(191) NOT NULL,
    \`title\` VARCHAR(191) NOT NULL,
    \`description\` TEXT NOT NULL,
    \`durationMinutes\` INTEGER NOT NULL DEFAULT 60,
    \`content\` TEXT NOT NULL,
    \`published\` BOOLEAN NOT NULL DEFAULT true,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Attempt\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`exerciseId\` VARCHAR(191) NOT NULL,
    \`status\` VARCHAR(191) NOT NULL DEFAULT 'IN_PROGRESS',
    \`startedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`deadlineAt\` DATETIME(3) NOT NULL,
    \`submittedAt\` DATETIME(3) NULL,
    \`autoSubmitted\` BOOLEAN NOT NULL DEFAULT false,
    \`answers\` TEXT NOT NULL,
    \`scoreRaw\` INTEGER NULL,
    \`scoreTotal\` INTEGER NULL,
    \`band\` DOUBLE NULL,
    \`feedback\` TEXT NULL,
    \`gradedAt\` DATETIME(3) NULL,
    \`gradedById\` VARCHAR(191) NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`Attempt_userId_status_idx\` (\`userId\`, \`status\`),
    INDEX \`Attempt_exerciseId_status_idx\` (\`exerciseId\`, \`status\`),
    CONSTRAINT \`Attempt_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`Attempt_exerciseId_fkey\` FOREIGN KEY (\`exerciseId\`) REFERENCES \`Exercise\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`Config\` (
    \`key\` VARCHAR(191) NOT NULL,
    \`value\` TEXT NOT NULL,
    PRIMARY KEY (\`key\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];

/**
 * Migration cộng dồn cho database từ phiên bản trước — MySQL báo lỗi nếu
 * cột đã tồn tại nên từng lệnh được bọc try/catch ở nơi gọi.
 */
const MIGRATIONS = [
  `ALTER TABLE \`User\` ADD COLUMN \`targetOverall\` DOUBLE NULL`,
  `ALTER TABLE \`User\` ADD COLUMN \`targetReading\` DOUBLE NULL`,
  `ALTER TABLE \`User\` ADD COLUMN \`targetListening\` DOUBLE NULL`,
  `ALTER TABLE \`User\` ADD COLUMN \`targetWriting\` DOUBLE NULL`,
  `ALTER TABLE \`User\` ADD COLUMN \`targetSpeaking\` DOUBLE NULL`,
  `ALTER TABLE \`User\` ADD COLUMN \`examDate\` DATETIME(3) NULL`,
];

export async function initDatabase() {
  for (const stmt of DDL) {
    await db.$executeRawUnsafe(stmt);
  }

  for (const stmt of MIGRATIONS) {
    try {
      await db.$executeRawUnsafe(stmt);
    } catch {
      /* cột đã tồn tại — bỏ qua */
    }
  }

  // Tài khoản quản trị: email theo ADMIN_EMAIL (mặc định seed-data.json),
  // mật khẩu CHỈ từ ADMIN_PASSWORD — không bao giờ nằm trong mã nguồn.
  const adminResult = await ensureAdminAccount(db as unknown as AdminDb, {
    email: process.env.ADMIN_EMAIL || seedData.admin.email,
    name: seedData.admin.name,
    envPassword: process.env.ADMIN_PASSWORD,
  });
  for (const msg of adminResult.messages) {
    console.log(`[wobridges] ${msg}`);
  }

  const exercises = [...seedData.exercises, readingGameTheory];
  for (const ex of exercises) {
    const existing = await db.exercise.findFirst({ where: { title: ex.title } });
    if (!existing) {
      await db.exercise.create({
        data: {
          skill: ex.skill,
          taskType: ex.taskType,
          title: ex.title,
          description: ex.description,
          durationMinutes: ex.durationMinutes,
          content: JSON.stringify(ex.content),
        },
      });
      console.log(`[wobridges] Đã tạo bài tập: ${ex.title}`);
    }
  }
}

/**
 * SESSION_SECRET bền vững: lưu trong bảng Config của MySQL để phiên đăng nhập
 * của học viên KHÔNG bị hủy mỗi lần triển khai lại website.
 */
export async function getOrCreateSessionSecret(): Promise<string> {
  const existing = await db.config.findUnique({
    where: { key: "SESSION_SECRET" },
  });
  if (existing?.value) return existing.value;

  const secret = randomBytes(32).toString("hex");
  await db.config.create({ data: { key: "SESSION_SECRET", value: secret } });
  console.log("[wobridges] Đã tạo SESSION_SECRET mới và lưu vào database");
  return secret;
}
