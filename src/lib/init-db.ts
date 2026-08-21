import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { ensureAdminAccount, type AdminDb } from "@/lib/admin-account";
import {
  calculateReadingBand,
  isValidAchievementAttempt,
} from "@/lib/reading-band";
import { seedRankCatalog, backfillUserRanks } from "@/lib/ranks/seeds";
import seedData from "../../prisma/seed-data.json";
import readingGameTheory from "../../prisma/reading-game-theory.json";
import readingPaidPack1 from "../../prisma/reading-paid-pack-1.json";

/**
 * Tạo bảng trực tiếp bằng SQL MySQL (tương đương `prisma db push` cho schema
 * hiện tại) — không cần Prisma CLI trên hosting. Index và khóa ngoại được
 * khai báo ngay trong CREATE TABLE nên chạy lại vô hại (IF NOT EXISTS).
 */
const DDL = [
  `CREATE TABLE IF NOT EXISTS \`User\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`email\` VARCHAR(191) NOT NULL,
    \`passwordHash\` VARCHAR(191) NULL,
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
    \`readingType\` VARCHAR(32) NOT NULL DEFAULT 'ACADEMIC',
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

  `CREATE TABLE IF NOT EXISTS \`FeynmanReview\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`attemptId\` VARCHAR(191) NOT NULL,
    \`mode\` VARCHAR(191) NOT NULL,
    \`status\` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    \`passageSummary\` TEXT NULL,
    \`paragraphMap\` TEXT NULL,
    \`confusingPoint\` TEXT NULL,
    \`finalTeachBack\` TEXT NULL,
    \`finalRule\` TEXT NULL,
    \`confidenceBefore\` INTEGER NULL,
    \`confidenceAfter\` INTEGER NULL,
    \`revealedAt\` DATETIME(3) NULL,
    \`completedAt\` DATETIME(3) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`FeynmanReview_attemptId_key\` (\`attemptId\`),
    INDEX \`FeynmanReview_userId_status_idx\` (\`userId\`, \`status\`),
    INDEX \`FeynmanReview_userId_completedAt_idx\` (\`userId\`, \`completedAt\`),
    CONSTRAINT \`FeynmanReview_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`FeynmanReview_attemptId_fkey\` FOREIGN KEY (\`attemptId\`) REFERENCES \`Attempt\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`FeynmanMistake\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`reviewId\` VARCHAR(191) NOT NULL,
    \`questionId\` VARCHAR(191) NOT NULL,
    \`numberLabel\` VARCHAR(191) NOT NULL,
    \`questionType\` VARCHAR(191) NOT NULL,
    \`partNumber\` INTEGER NOT NULL,
    \`sortOrder\` INTEGER NOT NULL,
    \`prompt\` TEXT NOT NULL,
    \`userAnswer\` TEXT NOT NULL,
    \`correctAnswer\` TEXT NOT NULL,
    \`errorType\` VARCHAR(191) NULL,
    \`evidenceParagraph\` VARCHAR(191) NULL,
    \`evidenceText\` TEXT NULL,
    \`firstExplanation\` TEXT NULL,
    \`modelEvidenceParagraph\` VARCHAR(191) NULL,
    \`modelEvidence\` TEXT NULL,
    \`modelExplanation\` TEXT NULL,
    \`modelTrap\` TEXT NULL,
    \`modelParaphrasesJson\` TEXT NULL,
    \`revisedExplanation\` TEXT NULL,
    \`lessonRule\` TEXT NULL,
    \`revealedAt\` DATETIME(3) NULL,
    \`completedAt\` DATETIME(3) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`FeynmanMistake_reviewId_questionId_key\` (\`reviewId\`, \`questionId\`),
    INDEX \`FeynmanMistake_reviewId_idx\` (\`reviewId\`),
    INDEX \`FeynmanMistake_errorType_idx\` (\`errorType\`),
    CONSTRAINT \`FeynmanMistake_reviewId_fkey\` FOREIGN KEY (\`reviewId\`) REFERENCES \`FeynmanReview\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ExerciseAccess\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`exerciseId\` VARCHAR(191) NOT NULL,
    \`grantedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`grantedById\` VARCHAR(191) NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`ExerciseAccess_userId_exerciseId_key\` (\`userId\`, \`exerciseId\`),
    INDEX \`ExerciseAccess_exerciseId_idx\` (\`exerciseId\`),
    CONSTRAINT \`ExerciseAccess_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`ExerciseAccess_exerciseId_fkey\` FOREIGN KEY (\`exerciseId\`) REFERENCES \`Exercise\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`PaymentOrder\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`invoiceNumber\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`exerciseId\` VARCHAR(191) NULL,
    \`returnPath\` TEXT NOT NULL,
    \`offerCode\` VARCHAR(191) NOT NULL,
    \`feature\` VARCHAR(191) NOT NULL,
    \`scope\` VARCHAR(191) NOT NULL,
    \`amount\` INTEGER NOT NULL,
    \`currency\` VARCHAR(16) NOT NULL DEFAULT 'VND',
    \`priceVersion\` VARCHAR(191) NOT NULL,
    \`priceRule\` VARCHAR(191) NOT NULL,
    \`status\` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    \`provider\` VARCHAR(191) NOT NULL DEFAULT 'SEPAY_PG',
    \`providerEnvironment\` VARCHAR(32) NOT NULL,
    \`providerOrderId\` VARCHAR(191) NULL,
    \`providerTransactionId\` VARCHAR(191) NULL,
    \`paymentMethod\` VARCHAR(191) NULL,
    \`introPromoToken\` VARCHAR(191) NULL,
    \`expiresAt\` DATETIME(3) NOT NULL,
    \`paidAt\` DATETIME(3) NULL,
    \`cancelledAt\` DATETIME(3) NULL,
    \`voidedAt\` DATETIME(3) NULL,
    \`lastError\` TEXT NULL,
    \`rawLastPayload\` LONGTEXT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`PaymentOrder_invoiceNumber_key\` (\`invoiceNumber\`),
    UNIQUE INDEX \`PaymentOrder_providerTransactionId_key\` (\`providerTransactionId\`),
    UNIQUE INDEX \`PaymentOrder_introPromoToken_key\` (\`introPromoToken\`),
    INDEX \`PaymentOrder_userId_status_createdAt_idx\` (\`userId\`, \`status\`, \`createdAt\`),
    INDEX \`PaymentOrder_exerciseId_status_idx\` (\`exerciseId\`, \`status\`),
    CONSTRAINT \`PaymentOrder_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`PaymentOrder_exerciseId_fkey\` FOREIGN KEY (\`exerciseId\`) REFERENCES \`Exercise\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`PaymentEvent\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`eventKey\` VARCHAR(191) NOT NULL,
    \`orderId\` VARCHAR(191) NULL,
    \`notificationType\` VARCHAR(191) NOT NULL,
    \`providerTransactionId\` VARCHAR(191) NULL,
    \`processingStatus\` VARCHAR(191) NOT NULL DEFAULT 'RECEIVED',
    \`payloadJson\` LONGTEXT NOT NULL,
    \`errorMessage\` TEXT NULL,
    \`receivedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`processedAt\` DATETIME(3) NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`PaymentEvent_eventKey_key\` (\`eventKey\`),
    INDEX \`PaymentEvent_orderId_receivedAt_idx\` (\`orderId\`, \`receivedAt\`),
    INDEX \`PaymentEvent_processingStatus_receivedAt_idx\` (\`processingStatus\`, \`receivedAt\`),
    CONSTRAINT \`PaymentEvent_orderId_fkey\` FOREIGN KEY (\`orderId\`) REFERENCES \`PaymentOrder\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`AccessGrant\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`exerciseId\` VARCHAR(191) NULL,
    \`orderId\` VARCHAR(191) NULL,
    \`grantKey\` VARCHAR(191) NOT NULL,
    \`feature\` VARCHAR(191) NOT NULL,
    \`scope\` VARCHAR(191) NOT NULL,
    \`source\` VARCHAR(191) NOT NULL,
    \`status\` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    \`startsAt\` DATETIME(3) NOT NULL,
    \`expiresAt\` DATETIME(3) NULL,
    \`revokedAt\` DATETIME(3) NULL,
    \`revokeReason\` TEXT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`AccessGrant_orderId_key\` (\`orderId\`),
    UNIQUE INDEX \`AccessGrant_grantKey_key\` (\`grantKey\`),
    INDEX \`AccessGrant_userId_feature_status_expiresAt_idx\` (\`userId\`, \`feature\`, \`status\`, \`expiresAt\`),
    CONSTRAINT \`AccessGrant_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`AccessGrant_exerciseId_fkey\` FOREIGN KEY (\`exerciseId\`) REFERENCES \`Exercise\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`AccessGrant_orderId_fkey\` FOREIGN KEY (\`orderId\`) REFERENCES \`PaymentOrder\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  /* ===== Ghép đề Full Test từ ba passage ===== */

  `CREATE TABLE IF NOT EXISTS \`ReadingAssembly\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`mode\` VARCHAR(32) NOT NULL,
    \`countsForAchievements\` BOOLEAN NOT NULL,
    \`totalQuestions\` INTEGER NOT NULL,
    \`durationMinutes\` INTEGER NOT NULL DEFAULT 60,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    INDEX \`ReadingAssembly_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
    CONSTRAINT \`ReadingAssembly_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ReadingAssemblyItem\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`assemblyId\` VARCHAR(191) NOT NULL,
    \`exerciseId\` VARCHAR(191) NOT NULL,
    \`orderIndex\` INTEGER NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`ReadingAssemblyItem_assemblyId_orderIndex_key\` (\`assemblyId\`, \`orderIndex\`),
    UNIQUE INDEX \`ReadingAssemblyItem_assemblyId_exerciseId_key\` (\`assemblyId\`, \`exerciseId\`),
    INDEX \`ReadingAssemblyItem_exerciseId_idx\` (\`exerciseId\`),
    CONSTRAINT \`ReadingAssemblyItem_assemblyId_fkey\` FOREIGN KEY (\`assemblyId\`) REFERENCES \`ReadingAssembly\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`ReadingAssemblyItem_exerciseId_fkey\` FOREIGN KEY (\`exerciseId\`) REFERENCES \`Exercise\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ExerciseCollection\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`code\` VARCHAR(191) NOT NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`kind\` VARCHAR(64) NOT NULL DEFAULT 'FREE_READING',
    \`status\` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    \`startsAt\` DATETIME(3) NULL,
    \`endsAt\` DATETIME(3) NULL,
    \`frozenAt\` DATETIME(3) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`ExerciseCollection_code_key\` (\`code\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ExerciseCollectionItem\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`collectionId\` VARCHAR(191) NOT NULL,
    \`exerciseId\` VARCHAR(191) NOT NULL,
    \`sortOrder\` INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`ExerciseCollectionItem_collectionId_exerciseId_key\` (\`collectionId\`, \`exerciseId\`),
    INDEX \`ExerciseCollectionItem_exerciseId_idx\` (\`exerciseId\`),
    CONSTRAINT \`ExerciseCollectionItem_collectionId_fkey\` FOREIGN KEY (\`collectionId\`) REFERENCES \`ExerciseCollection\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`ExerciseCollectionItem_exerciseId_fkey\` FOREIGN KEY (\`exerciseId\`) REFERENCES \`Exercise\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  /* ===== Hệ danh hiệu ===== */

  `CREATE TABLE IF NOT EXISTS \`TitleDefinition\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`code\` VARCHAR(191) NOT NULL,
    \`slug\` VARCHAR(191) NOT NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`description\` TEXT NOT NULL,
    \`quoteKind\` VARCHAR(32) NOT NULL,
    \`quoteSource\` TEXT NULL,
    \`quoteSourceUrl\` TEXT NULL,
    \`category\` VARCHAR(64) NOT NULL,
    \`rarity\` VARCHAR(32) NOT NULL,
    \`visibility\` VARCHAR(32) NOT NULL DEFAULT 'PUBLIC',
    \`ruleKey\` VARCHAR(64) NOT NULL,
    \`ruleConfigJson\` LONGTEXT NOT NULL,
    \`repeatPolicy\` VARCHAR(32) NOT NULL DEFAULT 'ONCE',
    \`rewardCode\` VARCHAR(64) NULL,
    \`active\` BOOLEAN NOT NULL DEFAULT true,
    \`sortOrder\` INTEGER NOT NULL DEFAULT 0,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`TitleDefinition_code_key\` (\`code\`),
    UNIQUE INDEX \`TitleDefinition_slug_key\` (\`slug\`),
    INDEX \`TitleDefinition_category_sortOrder_idx\` (\`category\`, \`sortOrder\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`UserTitle\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`titleId\` VARCHAR(191) NOT NULL,
    \`cycleKey\` VARCHAR(191) NOT NULL DEFAULT 'GLOBAL',
    \`status\` VARCHAR(32) NOT NULL DEFAULT 'EARNED',
    \`publicVisible\` BOOLEAN NOT NULL DEFAULT false,
    \`earnedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`progressSnapshotJson\` LONGTEXT NOT NULL,
    \`sourceEventId\` VARCHAR(191) NULL,
    \`supersededById\` VARCHAR(191) NULL,
    \`revokedAt\` DATETIME(3) NULL,
    \`revokeReason\` TEXT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`UserTitle_userId_titleId_cycleKey_key\` (\`userId\`, \`titleId\`, \`cycleKey\`),
    INDEX \`UserTitle_userId_status_earnedAt_idx\` (\`userId\`, \`status\`, \`earnedAt\`),
    INDEX \`UserTitle_titleId_status_idx\` (\`titleId\`, \`status\`),
    CONSTRAINT \`UserTitle_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`UserTitle_titleId_fkey\` FOREIGN KEY (\`titleId\`) REFERENCES \`TitleDefinition\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`TitleProgress\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`titleId\` VARCHAR(191) NOT NULL,
    \`cycleKey\` VARCHAR(191) NOT NULL DEFAULT 'GLOBAL',
    \`percent\` INTEGER NOT NULL DEFAULT 0,
    \`currentValue\` INTEGER NULL,
    \`targetValue\` INTEGER NULL,
    \`progressJson\` LONGTEXT NOT NULL,
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`TitleProgress_userId_titleId_cycleKey_key\` (\`userId\`, \`titleId\`, \`cycleKey\`),
    INDEX \`TitleProgress_userId_percent_idx\` (\`userId\`, \`percent\`),
    CONSTRAINT \`TitleProgress_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`TitleProgress_titleId_fkey\` FOREIGN KEY (\`titleId\`) REFERENCES \`TitleDefinition\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`AchievementEvent\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`eventKey\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`type\` VARCHAR(64) NOT NULL,
    \`payloadJson\` LONGTEXT NOT NULL,
    \`status\` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    \`attempts\` INTEGER NOT NULL DEFAULT 0,
    \`occurredAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`processedAt\` DATETIME(3) NULL,
    \`lastError\` TEXT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`AchievementEvent_eventKey_key\` (\`eventKey\`),
    INDEX \`AchievementEvent_status_occurredAt_idx\` (\`status\`, \`occurredAt\`),
    INDEX \`AchievementEvent_userId_occurredAt_idx\` (\`userId\`, \`occurredAt\`),
    CONSTRAINT \`AchievementEvent_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`RewardGrant\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`titleAwardId\` VARCHAR(191) NOT NULL,
    \`rewardCode\` VARCHAR(64) NOT NULL,
    \`status\` VARCHAR(32) NOT NULL DEFAULT 'EARNED',
    \`selectedExerciseId\` VARCHAR(191) NULL,
    \`requestedAt\` DATETIME(3) NULL,
    \`reviewedAt\` DATETIME(3) NULL,
    \`reviewedById\` VARCHAR(191) NULL,
    \`fulfilledAt\` DATETIME(3) NULL,
    \`expiresAt\` DATETIME(3) NOT NULL,
    \`readingGrantKey\` VARCHAR(191) NULL,
    \`feynmanGrantKey\` VARCHAR(191) NULL,
    \`note\` TEXT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`RewardGrant_titleAwardId_key\` (\`titleAwardId\`),
    UNIQUE INDEX \`RewardGrant_readingGrantKey_key\` (\`readingGrantKey\`),
    UNIQUE INDEX \`RewardGrant_feynmanGrantKey_key\` (\`feynmanGrantKey\`),
    INDEX \`RewardGrant_status_createdAt_idx\` (\`status\`, \`createdAt\`),
    INDEX \`RewardGrant_userId_status_idx\` (\`userId\`, \`status\`),
    CONSTRAINT \`RewardGrant_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`RewardGrant_titleAwardId_fkey\` FOREIGN KEY (\`titleAwardId\`) REFERENCES \`UserTitle\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  /* ===== Thời gian học thật và hồ sơ công khai ===== */

  `CREATE TABLE IF NOT EXISTS \`StudyDay\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`dateKey\` VARCHAR(16) NOT NULL,
    \`activeSeconds\` INTEGER NOT NULL DEFAULT 0,
    \`readingSeconds\` INTEGER NOT NULL DEFAULT 0,
    \`feynmanSeconds\` INTEGER NOT NULL DEFAULT 0,
    \`sessionsCount\` INTEGER NOT NULL DEFAULT 0,
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`StudyDay_userId_dateKey_key\` (\`userId\`, \`dateKey\`),
    INDEX \`StudyDay_dateKey_idx\` (\`dateKey\`),
    CONSTRAINT \`StudyDay_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`StudyPresence\` (
    \`userId\` VARCHAR(191) NOT NULL,
    \`sessionId\` VARCHAR(191) NOT NULL,
    \`kind\` VARCHAR(32) NOT NULL,
    \`lastSeenAt\` DATETIME(3) NOT NULL,
    \`lastCreditedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`userId\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  /* ===== Nguyệt Thí ===== */

  `CREATE TABLE IF NOT EXISTS \`Competition\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`code\` VARCHAR(191) NOT NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`status\` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    \`timezone\` VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    \`registrationOpenAt\` DATETIME(3) NOT NULL,
    \`registrationCloseAt\` DATETIME(3) NOT NULL,
    \`startAt\` DATETIME(3) NOT NULL,
    \`endAt\` DATETIME(3) NOT NULL,
    \`termsVersion\` VARCHAR(32) NOT NULL DEFAULT 'v1',
    \`finalizedAt\` DATETIME(3) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`Competition_code_key\` (\`code\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`CompetitionExercise\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`competitionId\` VARCHAR(191) NOT NULL,
    \`exerciseId\` VARCHAR(191) NOT NULL,
    \`orderIndex\` INTEGER NOT NULL,
    \`opensAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`CompetitionExercise_competitionId_exerciseId_key\` (\`competitionId\`, \`exerciseId\`),
    UNIQUE INDEX \`CompetitionExercise_competitionId_orderIndex_key\` (\`competitionId\`, \`orderIndex\`),
    INDEX \`CompetitionExercise_exerciseId_idx\` (\`exerciseId\`),
    CONSTRAINT \`CompetitionExercise_competitionId_fkey\` FOREIGN KEY (\`competitionId\`) REFERENCES \`Competition\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`CompetitionExercise_exerciseId_fkey\` FOREIGN KEY (\`exerciseId\`) REFERENCES \`Exercise\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`CompetitionEntry\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`competitionId\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`publicMode\` VARCHAR(32) NOT NULL DEFAULT 'PRIVATE',
    \`publicAlias\` VARCHAR(191) NULL,
    \`status\` VARCHAR(32) NOT NULL DEFAULT 'REGISTERED',
    \`averageBand\` DOUBLE NULL,
    \`lowestBand\` DOUBLE NULL,
    \`totalRaw\` INTEGER NULL,
    \`totalElapsedSeconds\` INTEGER NULL,
    \`completedAt\` DATETIME(3) NULL,
    \`finalRank\` INTEGER NULL,
    \`prizeAmount\` INTEGER NULL,
    \`prizeStatus\` VARCHAR(32) NULL,
    \`registeredAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`finalizedAt\` DATETIME(3) NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`CompetitionEntry_competitionId_userId_key\` (\`competitionId\`, \`userId\`),
    INDEX \`CompetitionEntry_competitionId_status_idx\` (\`competitionId\`, \`status\`),
    CONSTRAINT \`CompetitionEntry_competitionId_fkey\` FOREIGN KEY (\`competitionId\`) REFERENCES \`Competition\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`CompetitionEntry_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`CompetitionAttempt\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`entryId\` VARCHAR(191) NOT NULL,
    \`exerciseId\` VARCHAR(191) NOT NULL,
    \`attemptId\` VARCHAR(191) NOT NULL,
    \`bandSnapshot\` DOUBLE NULL,
    \`rawSnapshot\` INTEGER NULL,
    \`elapsedSeconds\` INTEGER NULL,
    \`integrityStatus\` VARCHAR(32) NOT NULL DEFAULT 'CLEAR',
    \`submittedAt\` DATETIME(3) NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`CompetitionAttempt_attemptId_key\` (\`attemptId\`),
    UNIQUE INDEX \`CompetitionAttempt_entryId_exerciseId_key\` (\`entryId\`, \`exerciseId\`),
    CONSTRAINT \`CompetitionAttempt_entryId_fkey\` FOREIGN KEY (\`entryId\`) REFERENCES \`CompetitionEntry\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`CompetitionAttempt_attemptId_fkey\` FOREIGN KEY (\`attemptId\`) REFERENCES \`Attempt\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`UserBadge\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`competitionId\` VARCHAR(191) NOT NULL,
    \`code\` VARCHAR(64) NOT NULL,
    \`displayVariant\` VARCHAR(64) NULL,
    \`startsAt\` DATETIME(3) NOT NULL,
    \`expiresAt\` DATETIME(3) NOT NULL,
    \`awardedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`revokedAt\` DATETIME(3) NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`UserBadge_userId_competitionId_code_key\` (\`userId\`, \`competitionId\`, \`code\`),
    INDEX \`UserBadge_userId_expiresAt_idx\` (\`userId\`, \`expiresAt\`),
    CONSTRAINT \`UserBadge_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`UserBadge_competitionId_fkey\` FOREIGN KEY (\`competitionId\`) REFERENCES \`Competition\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`IntegrityFlag\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`attemptId\` VARCHAR(191) NULL,
    \`competitionId\` VARCHAR(191) NULL,
    \`type\` VARCHAR(64) NOT NULL,
    \`severity\` VARCHAR(32) NOT NULL,
    \`status\` VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    \`detailsJson\` LONGTEXT NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`resolvedAt\` DATETIME(3) NULL,
    \`resolvedById\` VARCHAR(191) NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`IntegrityFlag_userId_status_severity_idx\` (\`userId\`, \`status\`, \`severity\`),
    INDEX \`IntegrityFlag_status_createdAt_idx\` (\`status\`, \`createdAt\`),
    CONSTRAINT \`IntegrityFlag_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`PublicProfile\` (
    \`userId\` VARCHAR(191) NOT NULL,
    \`displayName\` VARCHAR(191) NOT NULL,
    \`allowHall\` BOOLEAN NOT NULL DEFAULT false,
    \`allowLeaderboard\` BOOLEAN NOT NULL DEFAULT false,
    \`allowWinnerStory\` BOOLEAN NOT NULL DEFAULT false,
    \`equippedTitleAwardId\` VARCHAR(191) NULL,
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`userId\`),
    CONSTRAINT \`PublicProfile_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  /* ================================================================== */
  /*  LIÊM CHÍNH NGUYỆT THÍ                                              */
  /*                                                                     */
  /*  GIỚI HẠN PHẢI NHỚ: index tổng hợp của MySQL tối đa 3072 byte, mỗi   */
  /*  ký tự utf8mb4 chiếm 4 byte — VARCHAR(191) là 764 byte. Từng có lần  */
  /*  một index 5 cột vượt giới hạn khiến bảng không tạo được và sập cả   */
  /*  production. Vì vậy mọi cột kiểu enum ở đây dùng VARCHAR ngắn, và    */
  /*  index dài nhất trong nhóm này là 1528 byte.                         */
  /* ================================================================== */

  `CREATE TABLE IF NOT EXISTS \`IdentityProfile\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`identityKey\` VARCHAR(64) NOT NULL,
    \`fullNameSnapshot\` VARCHAR(191) NOT NULL,
    \`birthDate\` DATETIME(3) NOT NULL,
    \`documentLast4\` VARCHAR(8) NOT NULL,
    \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    \`documentFrontObjectKey\` VARCHAR(255) NULL,
    \`documentBackObjectKey\` VARCHAR(255) NULL,
    \`selfieObjectKey\` VARCHAR(255) NULL,
    \`faceTemplateCiphertext\` LONGTEXT NULL,
    \`verifiedAt\` DATETIME(3) NULL,
    \`reviewedById\` VARCHAR(191) NULL,
    \`expiresAt\` DATETIME(3) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`IdentityProfile_userId_key\` (\`userId\`),
    UNIQUE INDEX \`IdentityProfile_identityKey_key\` (\`identityKey\`),
    INDEX \`IdentityProfile_status_expiresAt_idx\` (\`status\`, \`expiresAt\`),
    CONSTRAINT \`IdentityProfile_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ConsentRecord\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`subjectUserId\` VARCHAR(191) NOT NULL,
    \`purposeCode\` VARCHAR(24) NOT NULL,
    \`policyVersion\` VARCHAR(48) NOT NULL,
    \`status\` VARCHAR(16) NOT NULL DEFAULT 'GRANTED',
    \`grantedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`withdrawnAt\` DATETIME(3) NULL,
    \`ipHash\` VARCHAR(64) NULL,
    \`userAgentHash\` VARCHAR(64) NULL,
    \`evidenceHash\` VARCHAR(64) NOT NULL,
    \`evidenceJson\` LONGTEXT NOT NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`ConsentRecord_subject_purpose_status_idx\` (\`subjectUserId\`, \`purposeCode\`, \`status\`),
    CONSTRAINT \`ConsentRecord_subjectUserId_fkey\` FOREIGN KEY (\`subjectUserId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`IdentityCompetitionLock\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`competitionId\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`identityKey\` VARCHAR(64) NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`IdentityLock_competitionId_identityKey_key\` (\`competitionId\`, \`identityKey\`),
    UNIQUE INDEX \`IdentityLock_competitionId_userId_key\` (\`competitionId\`, \`userId\`),
    CONSTRAINT \`IdentityLock_competitionId_fkey\` FOREIGN KEY (\`competitionId\`) REFERENCES \`Competition\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`IdentityLock_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ExamSession\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`competitionAttemptId\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`sessionTokenHash\` VARCHAR(64) NOT NULL,
    \`deviceBindingHash\` VARCHAR(64) NOT NULL,
    \`sebVersion\` VARCHAR(32) NOT NULL,
    \`sebConfigKey\` VARCHAR(64) NOT NULL,
    \`sebBrowserExamKey\` VARCHAR(64) NOT NULL,
    \`policyVersion\` VARCHAR(32) NOT NULL,
    \`status\` VARCHAR(24) NOT NULL DEFAULT 'CREATED',
    \`integrityStatus\` VARCHAR(16) NOT NULL DEFAULT 'CLEAR',
    \`strikeCount\` INTEGER NOT NULL DEFAULT 0,
    \`riskScore\` INTEGER NOT NULL DEFAULT 0,
    \`protectedLossMs\` INTEGER NOT NULL DEFAULT 0,
    \`continuousMediaLossMs\` INTEGER NOT NULL DEFAULT 0,
    \`lastClientSequence\` INTEGER NOT NULL DEFAULT 0,
    \`webcamState\` VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN',
    \`screenState\` VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN',
    \`networkState\` VARCHAR(16) NOT NULL DEFAULT 'ONLINE',
    \`lastHeartbeatAt\` DATETIME(3) NULL,
    \`disconnectStartedAt\` DATETIME(3) NULL,
    \`resumeUntil\` DATETIME(3) NULL,
    \`forceSubmitAt\` DATETIME(3) NULL,
    \`forceSubmitReason\` VARCHAR(32) NULL,
    \`startedAt\` DATETIME(3) NULL,
    \`endedAt\` DATETIME(3) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`ExamSession_competitionAttemptId_key\` (\`competitionAttemptId\`),
    UNIQUE INDEX \`ExamSession_sessionTokenHash_key\` (\`sessionTokenHash\`),
    INDEX \`ExamSession_status_lastHeartbeatAt_idx\` (\`status\`, \`lastHeartbeatAt\`),
    INDEX \`ExamSession_userId_status_idx\` (\`userId\`, \`status\`),
    CONSTRAINT \`ExamSession_competitionAttemptId_fkey\` FOREIGN KEY (\`competitionAttemptId\`) REFERENCES \`CompetitionAttempt\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`ExamSession_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ExamIntegrityEvent\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`sessionId\` VARCHAR(191) NOT NULL,
    \`dedupeKey\` VARCHAR(191) NOT NULL,
    \`clientSequence\` INTEGER NULL,
    \`type\` VARCHAR(32) NOT NULL,
    \`source\` VARCHAR(16) NOT NULL,
    \`trustLevel\` VARCHAR(16) NOT NULL,
    \`severity\` VARCHAR(16) NOT NULL,
    \`countsAsStrike\` BOOLEAN NOT NULL DEFAULT false,
    \`skipReason\` VARCHAR(24) NULL,
    \`durationMs\` INTEGER NULL,
    \`detailsJson\` LONGTEXT NOT NULL,
    \`occurredAt\` DATETIME(3) NOT NULL,
    \`receivedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`status\` VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    \`reviewedAt\` DATETIME(3) NULL,
    \`reviewedById\` VARCHAR(191) NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`ExamIntegrityEvent_dedupeKey_key\` (\`dedupeKey\`),
    INDEX \`ExamIntegrityEvent_sessionId_occurredAt_idx\` (\`sessionId\`, \`occurredAt\`),
    INDEX \`ExamIntegrityEvent_status_severity_receivedAt_idx\` (\`status\`, \`severity\`, \`receivedAt\`),
    CONSTRAINT \`ExamIntegrityEvent_sessionId_fkey\` FOREIGN KEY (\`sessionId\`) REFERENCES \`ExamSession\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ProctorEvidence\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`sessionId\` VARCHAR(191) NOT NULL,
    \`eventId\` VARCHAR(191) NULL,
    \`type\` VARCHAR(24) NOT NULL,
    \`objectKey\` VARCHAR(255) NOT NULL,
    \`sha256\` VARCHAR(64) NOT NULL,
    \`mimeType\` VARCHAR(64) NOT NULL,
    \`capturedAt\` DATETIME(3) NOT NULL,
    \`expiresAt\` DATETIME(3) NOT NULL,
    \`legalHold\` BOOLEAN NOT NULL DEFAULT false,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    INDEX \`ProctorEvidence_expiresAt_legalHold_idx\` (\`expiresAt\`, \`legalHold\`),
    INDEX \`ProctorEvidence_sessionId_capturedAt_idx\` (\`sessionId\`, \`capturedAt\`),
    CONSTRAINT \`ProctorEvidence_sessionId_fkey\` FOREIGN KEY (\`sessionId\`) REFERENCES \`ExamSession\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`ProctorEvidence_eventId_fkey\` FOREIGN KEY (\`eventId\`) REFERENCES \`ExamIntegrityEvent\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`CandidateExamVariant\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`sessionId\` VARCHAR(191) NOT NULL,
    \`contentVersionId\` VARCHAR(64) NOT NULL,
    \`contentVersionHash\` VARCHAR(64) NOT NULL,
    \`seedHash\` VARCHAR(64) NOT NULL,
    \`passageOrderJson\` LONGTEXT NOT NULL,
    \`questionOrderJson\` LONGTEXT NOT NULL,
    \`optionOrderJson\` LONGTEXT NOT NULL,
    \`canonicalMappingJson\` LONGTEXT NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`CandidateExamVariant_sessionId_key\` (\`sessionId\`),
    CONSTRAINT \`CandidateExamVariant_sessionId_fkey\` FOREIGN KEY (\`sessionId\`) REFERENCES \`ExamSession\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ProctorActionLog\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`sessionId\` VARCHAR(191) NOT NULL,
    \`adminUserId\` VARCHAR(191) NOT NULL,
    \`action\` VARCHAR(24) NOT NULL,
    \`reason\` TEXT NULL,
    \`metadataJson\` LONGTEXT NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    INDEX \`ProctorActionLog_sessionId_createdAt_idx\` (\`sessionId\`, \`createdAt\`),
    INDEX \`ProctorActionLog_adminUserId_createdAt_idx\` (\`adminUserId\`, \`createdAt\`),
    CONSTRAINT \`ProctorActionLog_sessionId_fkey\` FOREIGN KEY (\`sessionId\`) REFERENCES \`ExamSession\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`CompetitionAppeal\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`sessionId\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`status\` VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    \`explanation\` LONGTEXT NOT NULL,
    \`submittedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`deadlineAt\` DATETIME(3) NOT NULL,
    \`decision\` VARCHAR(16) NULL,
    \`decisionReason\` TEXT NULL,
    \`proposedById\` VARCHAR(191) NULL,
    \`confirmedById\` VARCHAR(191) NULL,
    \`resolvedAt\` DATETIME(3) NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`CompetitionAppeal_sessionId_key\` (\`sessionId\`),
    INDEX \`CompetitionAppeal_status_submittedAt_idx\` (\`status\`, \`submittedAt\`),
    CONSTRAINT \`CompetitionAppeal_sessionId_fkey\` FOREIGN KEY (\`sessionId\`) REFERENCES \`ExamSession\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`CompetitionAppeal_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  /* ===== Hệ cấp bậc và thí luyện =====
     Chỉ thêm bảng mới, không đụng tới bảng cũ. Rút lui bằng cách tắt cờ
     tính năng và revert mã nguồn; không bảng nào bị xóa. */

  `CREATE TABLE IF NOT EXISTS \`RankDefinition\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`level\` INTEGER NOT NULL,
    \`code\` VARCHAR(191) NOT NULL,
    \`slug\` VARCHAR(191) NOT NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`era\` VARCHAR(32) NOT NULL,
    \`bandAnchor\` VARCHAR(191) NOT NULL,
    \`description\` TEXT NOT NULL,
    \`active\` BOOLEAN NOT NULL DEFAULT true,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`RankDefinition_level_key\` (\`level\`),
    UNIQUE INDEX \`RankDefinition_code_key\` (\`code\`),
    UNIQUE INDEX \`RankDefinition_slug_key\` (\`slug\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`TrialDefinition\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`code\` VARCHAR(191) NOT NULL,
    \`slug\` VARCHAR(191) NOT NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`featuredGeneralCode\` VARCHAR(32) NOT NULL,
    \`fromLevel\` INTEGER NOT NULL,
    \`toLevel\` INTEGER NOT NULL,
    \`skill\` VARCHAR(191) NOT NULL,
    \`rationale\` TEXT NOT NULL,
    \`narrative\` TEXT NOT NULL,
    \`quoteSource\` VARCHAR(191) NULL,
    \`quoteSourceUrl\` TEXT NULL,
    \`gateRuleKey\` VARCHAR(64) NOT NULL,
    \`gateConfigJson\` LONGTEXT NOT NULL,
    \`successRuleKey\` VARCHAR(64) NOT NULL,
    \`successConfigJson\` LONGTEXT NOT NULL,
    \`retryUnlimited\` BOOLEAN NOT NULL DEFAULT true,
    \`estimate\` VARCHAR(191) NOT NULL,
    \`active\` BOOLEAN NOT NULL DEFAULT true,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`TrialDefinition_code_key\` (\`code\`),
    UNIQUE INDEX \`TrialDefinition_slug_key\` (\`slug\`),
    UNIQUE INDEX \`TrialDefinition_fromLevel_toLevel_key\` (\`fromLevel\`, \`toLevel\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`UserRank\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`currentLevel\` INTEGER NOT NULL DEFAULT 1,
    \`currentRankCode\` VARCHAR(191) NOT NULL DEFAULT 'RANK_01_BACH_THAN',
    \`cardinalTitleCode\` VARCHAR(32) NULL,
    \`promotedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`lastActiveAt\` DATETIME(3) NULL,
    \`version\` INTEGER NOT NULL DEFAULT 1,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`UserRank_userId_key\` (\`userId\`),
    CONSTRAINT \`UserRank_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`UserTrial\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`trialCode\` VARCHAR(64) NOT NULL,
    \`status\` VARCHAR(24) NOT NULL DEFAULT 'LOCKED',
    \`gateSnapshotJson\` LONGTEXT NULL,
    \`progressJson\` LONGTEXT NULL,
    \`resultSnapshotJson\` LONGTEXT NULL,
    \`eligibleAt\` DATETIME(3) NULL,
    \`startedAt\` DATETIME(3) NULL,
    \`completedAt\` DATETIME(3) NULL,
    \`sourceEventId\` VARCHAR(191) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`UserTrial_userId_trialCode_key\` (\`userId\`, \`trialCode\`),
    INDEX \`UserTrial_status_updatedAt_idx\` (\`status\`, \`updatedAt\`),
    CONSTRAINT \`UserTrial_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`TrialRun\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userTrialId\` VARCHAR(191) NOT NULL,
    \`runNumber\` INTEGER NOT NULL,
    \`status\` VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    \`configSnapshotJson\` LONGTEXT NOT NULL,
    \`progressJson\` LONGTEXT NULL,
    \`resultJson\` LONGTEXT NULL,
    \`startedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`endedAt\` DATETIME(3) NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`TrialRun_userTrialId_runNumber_key\` (\`userTrialId\`, \`runNumber\`),
    INDEX \`TrialRun_status_startedAt_idx\` (\`status\`, \`startedAt\`),
    CONSTRAINT \`TrialRun_userTrialId_fkey\` FOREIGN KEY (\`userTrialId\`) REFERENCES \`UserTrial\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`TrialRunEvent\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userTrialId\` VARCHAR(191) NOT NULL,
    \`trialRunId\` VARCHAR(191) NOT NULL,
    \`eventKey\` VARCHAR(191) NOT NULL,
    \`type\` VARCHAR(64) NOT NULL,
    \`sourceId\` VARCHAR(191) NULL,
    \`payloadJson\` LONGTEXT NOT NULL,
    \`occurredAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`TrialRunEvent_eventKey_key\` (\`eventKey\`),
    INDEX \`TrialRunEvent_userTrialId_occurredAt_idx\` (\`userTrialId\`, \`occurredAt\`),
    CONSTRAINT \`TrialRunEvent_trialRunId_fkey\` FOREIGN KEY (\`trialRunId\`) REFERENCES \`TrialRun\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`TrialReflection\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`userTrialId\` VARCHAR(191) NOT NULL,
    \`sourceAttemptId\` VARCHAR(191) NULL,
    \`questionType\` VARCHAR(64) NULL,
    \`evidenceText\` TEXT NOT NULL,
    \`explanation\` TEXT NOT NULL,
    \`lessonRule\` TEXT NOT NULL,
    \`qualityStatus\` VARCHAR(32) NOT NULL DEFAULT 'STRUCTURALLY_VALID',
    \`approvedAt\` DATETIME(3) NULL,
    \`approvedById\` VARCHAR(191) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    INDEX \`TrialReflection_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
    INDEX \`TrialReflection_userTrialId_qualityStatus_idx\` (\`userTrialId\`, \`qualityStatus\`),
    CONSTRAINT \`TrialReflection_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`TrialReflection_userTrialId_fkey\` FOREIGN KEY (\`userTrialId\`) REFERENCES \`UserTrial\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`UserGraceState\` (
    \`userId\` VARCHAR(191) NOT NULL,
    \`tokenCode\` VARCHAR(32) NOT NULL DEFAULT 'HOA_DUNG_DAO',
    \`availableCount\` INTEGER NOT NULL DEFAULT 1,
    \`lastGrantedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`lastUsedAt\` DATETIME(3) NULL,
    \`nextGrantAt\` DATETIME(3) NULL,
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`userId\`),
    CONSTRAINT \`UserGraceState_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // Quyền dữ liệu của thí sinh. Index (userId, status) = 764 + 96 = 860 byte,
  // dư xa so với giới hạn 3072 của InnoDB.
  `CREATE TABLE IF NOT EXISTS \`DataRightsRequest\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`kind\` VARCHAR(24) NOT NULL,
    \`status\` VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    \`scopeJson\` LONGTEXT NOT NULL,
    \`note\` TEXT NULL,
    \`requestedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`resolvedAt\` DATETIME(3) NULL,
    \`resolvedById\` VARCHAR(191) NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`DataRightsRequest_userId_status_idx\` (\`userId\`, \`status\`),
    CONSTRAINT \`DataRightsRequest_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // ===== Tam tầng đại thí: Nguyệt Thí → Dương Thí → Thiên Thí =====
  //
  // Đã cộng byte index trước khi viết: mỗi VARCHAR(191) utf8mb4 chiếm 764
  // byte, giới hạn InnoDB là 3072. Index lớn nhất ở đây là 1528 byte
  // (hai cột VARCHAR(191)), còn dư gấp đôi.

  `CREATE TABLE IF NOT EXISTS \`CompetitionSource\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`targetCompetitionId\` VARCHAR(191) NOT NULL,
    \`sourceCompetitionId\` VARCHAR(191) NOT NULL,
    \`orderIndex\` INTEGER NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`CompetitionSource_target_source_key\` (\`targetCompetitionId\`, \`sourceCompetitionId\`),
    UNIQUE INDEX \`CompetitionSource_target_order_key\` (\`targetCompetitionId\`, \`orderIndex\`),
    CONSTRAINT \`CompetitionSource_target_fkey\` FOREIGN KEY (\`targetCompetitionId\`) REFERENCES \`Competition\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`CompetitionSource_source_fkey\` FOREIGN KEY (\`sourceCompetitionId\`) REFERENCES \`Competition\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`CompetitionQualification\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`targetCompetitionId\` VARCHAR(191) NOT NULL,
    \`sourceCompetitionId\` VARCHAR(191) NOT NULL,
    \`sourceEntryId\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`sourceRank\` INTEGER NOT NULL,
    \`route\` VARCHAR(16) NOT NULL DEFAULT 'DIRECT',
    \`status\` VARCHAR(24) NOT NULL DEFAULT 'OFFERED',
    \`offeredAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`expiresAt\` DATETIME(3) NOT NULL,
    \`acceptedAt\` DATETIME(3) NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`CompetitionQualification_target_user_key\` (\`targetCompetitionId\`, \`userId\`),
    UNIQUE INDEX \`CompetitionQualification_target_entry_key\` (\`targetCompetitionId\`, \`sourceEntryId\`),
    INDEX \`CompetitionQualification_target_status_rank_idx\` (\`targetCompetitionId\`, \`status\`, \`sourceRank\`),
    CONSTRAINT \`CompetitionQualification_target_fkey\` FOREIGN KEY (\`targetCompetitionId\`) REFERENCES \`Competition\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`CompetitionQualification_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  // ---- Feynman AI Tutor ------------------------------------------------
  // Kich thuoc VARCHAR o cac cot trang thai la CO Y: mac dinh 191 x 4 byte
  // (utf8mb4) lam khoa index vuot gioi han 3072 byte cua InnoDB. Production
  // da tung sap vi loi nay. Chay `npm run test:indexes` truoc khi commit.

  `CREATE TABLE IF NOT EXISTS \`FeynmanAiEvaluation\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`reviewId\` VARCHAR(191) NOT NULL,
    \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    \`verdict\` VARCHAR(16) NULL,
    \`similarityPercent\` INTEGER NULL,
    \`confidence\` INTEGER NULL,
    \`reasonJson\` TEXT NULL,
    \`overallAdviceJson\` TEXT NULL,
    \`currentBandSnapshot\` DOUBLE NULL,
    \`targetBandSnapshot\` DOUBLE NULL,
    \`attemptNumberSnapshot\` INTEGER NULL,
    \`weaknessSnapshotJson\` TEXT NULL,
    \`model\` VARCHAR(64) NULL,
    \`promptVersion\` VARCHAR(32) NULL,
    \`schemaVersion\` VARCHAR(32) NULL,
    \`inputTokens\` INTEGER NULL,
    \`outputTokens\` INTEGER NULL,
    \`cachedInputTokens\` INTEGER NULL,
    \`estimatedCostMicroUsd\` INTEGER NULL,
    \`latencyMs\` INTEGER NULL,
    \`openaiRequestId\` VARCHAR(191) NULL,
    \`errorCode\` VARCHAR(64) NULL,
    \`questionLimit\` INTEGER NOT NULL DEFAULT 10,
    \`questionUsed\` INTEGER NOT NULL DEFAULT 0,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`FeynmanAiEvaluation_reviewId_key\` (\`reviewId\`),
    INDEX \`FeynmanAiEvaluation_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
    INDEX \`FeynmanAiEvaluation_status_createdAt_idx\` (\`status\`, \`createdAt\`),
    CONSTRAINT \`FeynmanAiEvaluation_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`FeynmanAiEvaluation_reviewId_fkey\` FOREIGN KEY (\`reviewId\`) REFERENCES \`FeynmanReview\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`FeynmanAiMessage\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`evaluationId\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`requestKey\` VARCHAR(64) NOT NULL,
    \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    \`question\` TEXT NOT NULL,
    \`answer\` TEXT NULL,
    \`rejectReason\` VARCHAR(64) NULL,
    \`model\` VARCHAR(64) NULL,
    \`promptVersion\` VARCHAR(32) NULL,
    \`inputTokens\` INTEGER NULL,
    \`outputTokens\` INTEGER NULL,
    \`cachedInputTokens\` INTEGER NULL,
    \`estimatedCostMicroUsd\` INTEGER NULL,
    \`latencyMs\` INTEGER NULL,
    \`openaiRequestId\` VARCHAR(191) NULL,
    \`errorCode\` VARCHAR(64) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`FeynmanAiMessage_requestKey_key\` (\`requestKey\`),
    INDEX \`FeynmanAiMessage_evaluationId_createdAt_idx\` (\`evaluationId\`, \`createdAt\`),
    INDEX \`FeynmanAiMessage_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
    CONSTRAINT \`FeynmanAiMessage_evaluationId_fkey\` FOREIGN KEY (\`evaluationId\`) REFERENCES \`FeynmanAiEvaluation\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`FeynmanAiMessage_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`FeynmanAiBudget\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`grantedTotal\` INTEGER NOT NULL DEFAULT 0,
    \`usedTotal\` INTEGER NOT NULL DEFAULT 0,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`FeynmanAiBudget_userId_key\` (\`userId\`),
    CONSTRAINT \`FeynmanAiBudget_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ForumChannel\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`key\` VARCHAR(64) NOT NULL,
    \`level\` INTEGER NOT NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`blurb\` TEXT NOT NULL,
    \`sortOrder\` INTEGER NOT NULL DEFAULT 0,
    \`locked\` BOOLEAN NOT NULL DEFAULT false,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`ForumChannel_key_key\` (\`key\`),
    UNIQUE INDEX \`ForumChannel_level_key\` (\`level\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ForumPost\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`channelId\` VARCHAR(191) NOT NULL,
    \`authorId\` VARCHAR(191) NOT NULL,
    \`title\` VARCHAR(200) NOT NULL,
    \`body\` TEXT NOT NULL,
    \`score\` INTEGER NOT NULL DEFAULT 0,
    \`upCount\` INTEGER NOT NULL DEFAULT 0,
    \`downCount\` INTEGER NOT NULL DEFAULT 0,
    \`commentCount\` INTEGER NOT NULL DEFAULT 0,
    \`status\` VARCHAR(16) NOT NULL DEFAULT 'VISIBLE',
    \`pinnedAt\` DATETIME(3) NULL,
    \`lockedAt\` DATETIME(3) NULL,
    \`lastActivityAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`ForumPost_channelId_status_lastActivityAt_idx\` (\`channelId\`, \`status\`, \`lastActivityAt\`),
    INDEX \`ForumPost_authorId_createdAt_idx\` (\`authorId\`, \`createdAt\`),
    CONSTRAINT \`ForumPost_channelId_fkey\` FOREIGN KEY (\`channelId\`) REFERENCES \`ForumChannel\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`ForumPost_authorId_fkey\` FOREIGN KEY (\`authorId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ForumComment\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`postId\` VARCHAR(191) NOT NULL,
    \`authorId\` VARCHAR(191) NOT NULL,
    \`parentId\` VARCHAR(191) NULL,
    \`depth\` INTEGER NOT NULL DEFAULT 0,
    \`body\` TEXT NOT NULL,
    \`score\` INTEGER NOT NULL DEFAULT 0,
    \`upCount\` INTEGER NOT NULL DEFAULT 0,
    \`downCount\` INTEGER NOT NULL DEFAULT 0,
    \`status\` VARCHAR(16) NOT NULL DEFAULT 'VISIBLE',
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`ForumComment_postId_createdAt_idx\` (\`postId\`, \`createdAt\`),
    INDEX \`ForumComment_parentId_idx\` (\`parentId\`),
    CONSTRAINT \`ForumComment_postId_fkey\` FOREIGN KEY (\`postId\`) REFERENCES \`ForumPost\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`ForumComment_authorId_fkey\` FOREIGN KEY (\`authorId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`ForumComment_parentId_fkey\` FOREIGN KEY (\`parentId\`) REFERENCES \`ForumComment\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ForumVote\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`targetType\` VARCHAR(8) NOT NULL,
    \`targetId\` VARCHAR(32) NOT NULL,
    \`value\` INTEGER NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`ForumVote_userId_targetType_targetId_key\` (\`userId\`, \`targetType\`, \`targetId\`),
    INDEX \`ForumVote_targetType_targetId_idx\` (\`targetType\`, \`targetId\`),
    CONSTRAINT \`ForumVote_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ForumReport\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`reporterId\` VARCHAR(191) NOT NULL,
    \`targetType\` VARCHAR(8) NOT NULL,
    \`targetId\` VARCHAR(32) NOT NULL,
    \`reason\` TEXT NOT NULL,
    \`status\` VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    \`adminNote\` TEXT NULL,
    \`resolvedAt\` DATETIME(3) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    INDEX \`ForumReport_status_createdAt_idx\` (\`status\`, \`createdAt\`),
    CONSTRAINT \`ForumReport_reporterId_fkey\` FOREIGN KEY (\`reporterId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`EmailVerification\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`tokenHash\` VARCHAR(64) NOT NULL,
    \`expiresAt\` DATETIME(3) NOT NULL,
    \`consumedAt\` DATETIME(3) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`EmailVerification_tokenHash_key\` (\`tokenHash\`),
    INDEX \`EmailVerification_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
    CONSTRAINT \`EmailVerification_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`CoinWallet\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`grantedTotal\` INTEGER NOT NULL DEFAULT 0,
    \`spentTotal\` INTEGER NOT NULL DEFAULT 0,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`CoinWallet_userId_key\` (\`userId\`),
    CONSTRAINT \`CoinWallet_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`CoinLedger\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`kind\` VARCHAR(191) NOT NULL,
    \`amount\` INTEGER NOT NULL,
    \`balanceAfter\` INTEGER NOT NULL,
    \`ledgerKey\` VARCHAR(191) NOT NULL,
    \`orderId\` VARCHAR(191) NULL,
    \`offerCode\` VARCHAR(191) NULL,
    \`exerciseId\` VARCHAR(191) NULL,
    \`attemptId\` VARCHAR(191) NULL,
    \`note\` TEXT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`CoinLedger_ledgerKey_key\` (\`ledgerKey\`),
    INDEX \`CoinLedger_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
    CONSTRAINT \`CoinLedger_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`CoinLedger_orderId_fkey\` FOREIGN KEY (\`orderId\`) REFERENCES \`PaymentOrder\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // Dau truong P1: vi va so cai Quan Cong. Dat ngay canh vi xu vi hai cai la
  // hai dong tien song song, va nguoi doc file nay can thay ngay rang chung
  // KHONG co bang nao noi chung.
  `CREATE TABLE IF NOT EXISTS \`MeritWallet\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`earnedTotal\` INTEGER NOT NULL DEFAULT 0,
    \`burnedTotal\` INTEGER NOT NULL DEFAULT 0,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`MeritWallet_userId_key\` (\`userId\`),
    CONSTRAINT \`MeritWallet_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`MeritLedger\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`kind\` VARCHAR(16) NOT NULL,
    \`amount\` INTEGER NOT NULL,
    \`balanceAfter\` INTEGER NOT NULL,
    \`ledgerKey\` VARCHAR(191) NOT NULL,
    \`studyDateKey\` VARCHAR(10) NULL,
    \`ruleVersion\` VARCHAR(32) NOT NULL,
    \`note\` TEXT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`MeritLedger_ledgerKey_key\` (\`ledgerKey\`),
    INDEX \`MeritLedger_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
    CONSTRAINT \`MeritLedger_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // Thi But P2: kho cau ngan doc lap va cac luot khao hach.
  // `answerIndex` va `explanation` KHONG BAO GIO duoc gui xuong may khach
  // truoc khi cham xong — xem publicItem() trong lib/thibut/thibut.ts.
  `CREATE TABLE IF NOT EXISTS \`ThiButItem\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`type\` VARCHAR(24) NOT NULL,
    \`difficulty\` VARCHAR(8) NOT NULL,
    \`prompt\` TEXT NOT NULL,
    \`options\` TEXT NOT NULL,
    \`answerIndex\` INTEGER NOT NULL,
    \`explanation\` TEXT NOT NULL,
    \`status\` VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    \`sourceBatch\` VARCHAR(64) NULL,
    \`reviewedById\` VARCHAR(191) NULL,
    \`reviewedAt\` DATETIME(3) NULL,
    \`publishedAt\` DATETIME(3) NULL,
    \`reviewNote\` TEXT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`ThiButItem_status_type_idx\` (\`status\`, \`type\`),
    INDEX \`ThiButItem_status_createdAt_idx\` (\`status\`, \`createdAt\`),
    CONSTRAINT \`ThiButItem_reviewedById_fkey\` FOREIGN KEY (\`reviewedById\`) REFERENCES \`User\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`ThiButAttempt\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`targetKind\` VARCHAR(16) NOT NULL,
    \`targetId\` VARCHAR(191) NOT NULL,
    \`cost\` INTEGER NOT NULL,
    \`itemIds\` TEXT NOT NULL,
    \`answers\` TEXT NULL,
    \`correctCount\` INTEGER NULL,
    \`passed\` BOOLEAN NULL,
    \`startedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`deadlineAt\` DATETIME(3) NOT NULL,
    \`submittedAt\` DATETIME(3) NULL,
    \`retryOfId\` VARCHAR(191) NULL,
    \`ruleVersion\` VARCHAR(32) NOT NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`ThiButAttempt_userId_startedAt_idx\` (\`userId\`, \`startedAt\`),
    INDEX \`ThiButAttempt_userId_targetKind_targetId_idx\` (\`userId\`, \`targetKind\`, \`targetId\`),
    CONSTRAINT \`ThiButAttempt_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`ThiButAttempt_retryOfId_fkey\` FOREIGN KEY (\`retryOfId\`) REFERENCES \`ThiButAttempt\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // Dau truong P3: tran dau va quyet toan. Chua co realtime, do la P4.
  `CREATE TABLE IF NOT EXISTS \`Duel\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`status\` VARCHAR(16) NOT NULL DEFAULT 'INVITED',
    \`tier\` VARCHAR(8) NOT NULL,
    \`exerciseId\` VARCHAR(191) NOT NULL,
    \`stake\` INTEGER NOT NULL DEFAULT 0,
    \`armedAt\` DATETIME(3) NULL,
    \`startedAt\` DATETIME(3) NULL,
    \`deadlineAt\` DATETIME(3) NULL,
    \`settledAt\` DATETIME(3) NULL,
    \`winnerId\` VARCHAR(191) NULL,
    \`winBy\` VARCHAR(8) NULL,
    \`voidReason\` TEXT NULL,
    \`integrityPolicyVersion\` VARCHAR(32) NOT NULL DEFAULT '2026-08-v1',
    \`ruleVersion\` VARCHAR(32) NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`Duel_status_createdAt_idx\` (\`status\`, \`createdAt\`),
    INDEX \`Duel_exerciseId_idx\` (\`exerciseId\`),
    CONSTRAINT \`Duel_exerciseId_fkey\` FOREIGN KEY (\`exerciseId\`) REFERENCES \`Exercise\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`DuelSide\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`duelId\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`attemptId\` VARCHAR(191) NULL,
    \`score\` INTEGER NULL,
    \`elapsedMs\` INTEGER NULL,
    \`submittedAt\` DATETIME(3) NULL,
    \`surrenderedAt\` DATETIME(3) NULL,
    \`abandoned\` BOOLEAN NOT NULL DEFAULT false,
    \`integrityFlags\` TEXT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`DuelSide_duelId_userId_key\` (\`duelId\`, \`userId\`),
    INDEX \`DuelSide_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
    CONSTRAINT \`DuelSide_duelId_fkey\` FOREIGN KEY (\`duelId\`) REFERENCES \`Duel\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`DuelSide_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`DuelInvite\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`fromUserId\` VARCHAR(191) NOT NULL,
    \`toUserId\` VARCHAR(191) NOT NULL,
    \`stake\` INTEGER NOT NULL DEFAULT 0,
    \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    \`duelId\` VARCHAR(191) NULL,
    \`toWasPresent\` BOOLEAN NOT NULL DEFAULT false,
    \`toWasInDuel\` BOOLEAN NOT NULL DEFAULT false,
    \`expiresAt\` DATETIME(3) NOT NULL,
    \`respondedAt\` DATETIME(3) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    INDEX \`DuelInvite_toUserId_status_expiresAt_idx\` (\`toUserId\`, \`status\`, \`expiresAt\`),
    INDEX \`DuelInvite_fromUserId_createdAt_idx\` (\`fromUserId\`, \`createdAt\`),
    CONSTRAINT \`DuelInvite_fromUserId_fkey\` FOREIGN KEY (\`fromUserId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`DuelInvite_toUserId_fkey\` FOREIGN KEY (\`toUserId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`FeynmanAiAttemptState\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`attemptId\` VARCHAR(191) NOT NULL,
    \`lastGradedOn\` DATETIME(3) NULL,
    \`gradedCount\` INTEGER NOT NULL DEFAULT 0,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`FeynmanAiAttemptState_attemptId_key\` (\`attemptId\`),
    CONSTRAINT \`FeynmanAiAttemptState_attemptId_fkey\` FOREIGN KEY (\`attemptId\`) REFERENCES \`Attempt\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`FeynmanAiAlert\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`source\` VARCHAR(16) NOT NULL,
    \`severity\` VARCHAR(16) NOT NULL DEFAULT 'LOW',
    \`status\` VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    \`kind\` VARCHAR(32) NOT NULL,
    \`exerciseId\` VARCHAR(191) NULL,
    \`attemptId\` VARCHAR(191) NULL,
    \`evaluationId\` VARCHAR(191) NULL,
    \`questionCode\` VARCHAR(32) NULL,
    \`detail\` TEXT NULL,
    \`adminNote\` TEXT NULL,
    \`resolvedAt\` DATETIME(3) NULL,
    \`resolvedBy\` VARCHAR(191) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`FeynmanAiAlert_status_severity_createdAt_idx\` (\`status\`, \`severity\`, \`createdAt\`),
    INDEX \`FeynmanAiAlert_exerciseId_createdAt_idx\` (\`exerciseId\`, \`createdAt\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];

/**
 * Migration cộng dồn cho database từ phiên bản trước — MySQL báo lỗi nếu
 * cột đã tồn tại nên từng lệnh được bọc try/catch ở nơi gọi.
 */
const MIGRATIONS = [
  // Dau truong P3: de danh rieng cho san dau. Bang Exercise da co san nen day
  // phai la ALTER, khong phai CREATE TABLE.
  `ALTER TABLE \`Exercise\` ADD COLUMN \`arenaOnly\` BOOLEAN NOT NULL DEFAULT false`,

  // Vi xu: hai cot moi tren don hang co san. Bang CoinWallet/CoinLedger nam o
  // phan CREATE TABLE nen khong can migration.
  `ALTER TABLE \`PaymentOrder\` ADD COLUMN \`orderKind\` VARCHAR(191) NOT NULL DEFAULT 'PACKAGE'`,
  `ALTER TABLE \`PaymentOrder\` ADD COLUMN \`coinsGranted\` INTEGER NOT NULL DEFAULT 0`,

  // Xac minh email
  `ALTER TABLE \`User\` ADD COLUMN \`emailVerifiedAt\` DATETIME(3) NULL`,

  // So cai xu ghi them cot "de nao duoc mo"
  `ALTER TABLE \`CoinLedger\` ADD COLUMN \`exerciseId\` VARCHAR(191) NULL`,

  // Cam dang tren dien dan
  `ALTER TABLE \`User\` ADD COLUMN \`forumBannedAt\` DATETIME(3) NULL`,

  // Dem co cam va co ha RIENG, thay cho mot so rong duy nhat
  `ALTER TABLE \`ForumPost\` ADD COLUMN \`upCount\` INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE \`ForumPost\` ADD COLUMN \`downCount\` INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE \`ForumComment\` ADD COLUMN \`upCount\` INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE \`ForumComment\` ADD COLUMN \`downCount\` INTEGER NOT NULL DEFAULT 0`,

  // Dang nhap Google + gioi han mot thiet bi
  `ALTER TABLE \`User\` MODIFY COLUMN \`passwordHash\` VARCHAR(191) NULL`,
  `ALTER TABLE \`User\` ADD COLUMN \`googleId\` VARCHAR(191) NULL`,
  `ALTER TABLE \`User\` ADD COLUMN \`activeSessionId\` VARCHAR(64) NULL`,
  `CREATE UNIQUE INDEX \`User_googleId_key\` ON \`User\`(\`googleId\`)`,

  `ALTER TABLE \`User\` ADD COLUMN \`targetOverall\` DOUBLE NULL`,
  `ALTER TABLE \`User\` ADD COLUMN \`targetReading\` DOUBLE NULL`,
  `ALTER TABLE \`User\` ADD COLUMN \`targetListening\` DOUBLE NULL`,
  `ALTER TABLE \`User\` ADD COLUMN \`targetWriting\` DOUBLE NULL`,
  `ALTER TABLE \`User\` ADD COLUMN \`targetSpeaking\` DOUBLE NULL`,
  `ALTER TABLE \`User\` ADD COLUMN \`examDate\` DATETIME(3) NULL`,
  `ALTER TABLE \`Exercise\` ADD COLUMN \`accessLevel\` VARCHAR(191) NOT NULL DEFAULT 'PUBLIC'`,
  `ALTER TABLE \`Attempt\` ADD COLUMN \`answersRevealedAt\` DATETIME(3) NULL`,

  // Danh hiệu: siêu dữ liệu lượt làm bài và cờ tính danh hiệu của đề
  `ALTER TABLE \`Exercise\` ADD COLUMN \`achievementEligible\` BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE \`Exercise\` ADD COLUMN \`competitionOnly\` BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE \`Attempt\` ADD COLUMN \`attemptNumber\` INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE \`Attempt\` ADD COLUMN \`answeredCount\` INTEGER NULL`,
  `ALTER TABLE \`Attempt\` ADD COLUMN \`elapsedSeconds\` INTEGER NULL`,
  `ALTER TABLE \`Attempt\` ADD COLUMN \`bandScaleVersion\` VARCHAR(191) NULL`,
  `ALTER TABLE \`Attempt\` ADD COLUMN \`validForAchievements\` BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE \`Attempt\` ADD COLUMN \`integrityStatus\` VARCHAR(32) NOT NULL DEFAULT 'CLEAR'`,
  `ALTER TABLE \`Attempt\` ADD COLUMN \`assemblyId\` VARCHAR(191) NULL`,
  `ALTER TABLE \`Attempt\` ADD INDEX \`Attempt_assemblyId_idx\` (\`assemblyId\`)`,
  `ALTER TABLE \`Exercise\` ADD COLUMN \`difficultyTier\` VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN'`,
  // Tách hai kho IELTS Reading. Mọi đề cũ mặc định thuộc Academic.
  `ALTER TABLE \`Exercise\` ADD COLUMN \`readingType\` VARCHAR(32) NOT NULL DEFAULT 'ACADEMIC'`,

  /* ---- Liêm chính Nguyệt Thí ---- */

  // Phiên bản chính sách được chốt theo TỪNG KỲ THI. Khi xử lý khiếu nại phải
  // xét theo đúng luật đã công bố lúc thi, không phải luật hiện hành.
  `ALTER TABLE \`Competition\` ADD COLUMN \`integrityPolicyVersion\` VARCHAR(32) NOT NULL DEFAULT '2026-08-v1'`,
  `ALTER TABLE \`Competition\` ADD COLUMN \`consentPolicyVersion\` VARCHAR(48) NOT NULL DEFAULT 'consent-2026-08-v1'`,
  `ALTER TABLE \`Competition\` ADD COLUMN \`sebConfigVersion\` VARCHAR(64) NULL`,
  `ALTER TABLE \`Competition\` ADD COLUMN \`examVaultEnvironment\` VARCHAR(16) NOT NULL DEFAULT 'SANDBOX'`,

  // Khung giờ chung thay cho cửa sổ linh hoạt nhiều ngày. Để NULL vì đây là
  // cột thêm vào bảng đã có dữ liệu; mã nguồn bắt buộc phải có đủ ba mốc mới
  // cho mở kỳ thi, chứ không dựa vào ràng buộc NOT NULL của database.
  `ALTER TABLE \`CompetitionExercise\` ADD COLUMN \`checkInOpenAt\` DATETIME(3) NULL`,
  `ALTER TABLE \`CompetitionExercise\` ADD COLUMN \`startsAt\` DATETIME(3) NULL`,
  `ALTER TABLE \`CompetitionExercise\` ADD COLUMN \`endsAt\` DATETIME(3) NULL`,
  `ALTER TABLE \`CompetitionExercise\` ADD COLUMN \`vaultContentVersionId\` VARCHAR(64) NULL`,
  `ALTER TABLE \`CompetitionExercise\` ADD COLUMN \`vaultContentHash\` VARCHAR(64) NULL`,
  `ALTER TABLE \`CompetitionExercise\` ADD COLUMN \`sebConfigCode\` VARCHAR(64) NULL`,

  `ALTER TABLE \`CompetitionEntry\` ADD COLUMN \`identityProfileId\` VARCHAR(191) NULL`,
  `ALTER TABLE \`CompetitionEntry\` ADD COLUMN \`readinessStatus\` VARCHAR(24) NOT NULL DEFAULT 'NOT_READY'`,
  `ALTER TABLE \`CompetitionEntry\` ADD COLUMN \`reviewStatus\` VARCHAR(32) NOT NULL DEFAULT 'CLEAR'`,
  `ALTER TABLE \`CompetitionEntry\` ADD COLUMN \`proposedByAdminId\` VARCHAR(191) NULL`,
  `ALTER TABLE \`CompetitionEntry\` ADD COLUMN \`confirmedByAdminId\` VARCHAR(191) NULL`,
  `ALTER TABLE \`CompetitionEntry\` ADD COLUMN \`manualReviewCompletedAt\` DATETIME(3) NULL`,

  // Phân biệt "hết giờ" với "bị buộc nộp vì liêm chính" — hai việc khác hẳn
  // nhau khi xử lý khiếu nại, mà cột autoSubmitted cũ gộp chung cả hai.
  `ALTER TABLE \`Attempt\` ADD COLUMN \`submissionReason\` VARCHAR(24) NOT NULL DEFAULT 'NORMAL'`,

  `ALTER TABLE \`IntegrityFlag\` ADD COLUMN \`sessionId\` VARCHAR(191) NULL`,
  `ALTER TABLE \`IntegrityFlag\` ADD COLUMN \`sourceEventId\` VARCHAR(191) NULL`,

  // Tam tầng đại thí. Kỳ đang chạy đều là Nguyệt Thí nên giá trị mặc định
  // giữ nguyên hành vi cũ: tier MONTHLY, huy hiệu 30 ngày, vào bằng đăng ký mở.
  `ALTER TABLE \`Competition\` ADD COLUMN \`tier\` VARCHAR(16) NOT NULL DEFAULT 'MONTHLY'`,
  `ALTER TABLE \`Competition\` ADD COLUMN \`seasonKey\` VARCHAR(16) NOT NULL DEFAULT ''`,
  `ALTER TABLE \`Competition\` ADD COLUMN \`featuredGeneralCode\` VARCHAR(24) NULL`,
  `ALTER TABLE \`Competition\` ADD COLUMN \`badgeDurationDays\` INTEGER NOT NULL DEFAULT 30`,
  `CREATE INDEX \`Competition_tier_seasonKey_idx\` ON \`Competition\` (\`tier\`, \`seasonKey\`)`,

  `ALTER TABLE \`CompetitionEntry\` ADD COLUMN \`entrySource\` VARCHAR(16) NOT NULL DEFAULT 'OPEN'`,
  `ALTER TABLE \`CompetitionEntry\` ADD COLUMN \`qualificationId\` VARCHAR(191) NULL`,
  `CREATE UNIQUE INDEX \`CompetitionEntry_qualificationId_key\` ON \`CompetitionEntry\` (\`qualificationId\`)`,

  // ---- Feynman AI Tutor ------------------------------------------------
  // Mot luot lam bai luyen lai duoc nhieu lan, nen FeynmanReview can runNumber.
  // Rang buoc unique cu tren attemptId duoc go RIENG trong applyOnce ben duoi,
  // vi do la thao tac PHA HUY va chi duoc chay dung mot lan.
  `ALTER TABLE \`FeynmanReview\` ADD COLUMN \`runNumber\` INTEGER NOT NULL DEFAULT 1`,
  `CREATE INDEX \`FeynmanReview_attemptId_createdAt_idx\` ON \`FeynmanReview\` (\`attemptId\`, \`createdAt\`)`,

  // Quyen va don hang gan theo LUOT LAM BAI thay vi theo bai.
  `ALTER TABLE \`AccessGrant\` ADD COLUMN \`attemptId\` VARCHAR(191) NULL`,
  `ALTER TABLE \`PaymentOrder\` ADD COLUMN \`attemptId\` VARCHAR(191) NULL`,
  // Thieu index nay thi truy van tim don PENDING tai su dung se quet toan bang.
  `CREATE INDEX \`PaymentOrder_userId_attemptId_status_idx\` ON \`PaymentOrder\` (\`userId\`, \`attemptId\`, \`status\`)`,
];

export async function initDatabase() {
  /**
   * Mỗi lệnh tạo bảng chạy độc lập.
   *
   * Bài học phải trả giá: một lệnh CREATE TABLE lỗi từng làm dừng cả vòng lặp,
   * nên những bảng phía sau không được tạo VÀ các bước quan trọng khác (kiểm
   * tra tài khoản quản trị, chuyển dữ liệu cũ) cũng không chạy. Lỗi vẫn được
   * ném ra ở cuối để không ai tưởng mọi thứ vẫn ổn.
   */
  const ddlErrors: string[] = [];
  for (const stmt of DDL) {
    try {
      await db.$executeRawUnsafe(stmt);
    } catch (err) {
      const name = stmt.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/)?.[1] ?? "?";
      ddlErrors.push(`${name}: ${String(err).slice(0, 300)}`);
      console.error(`[wobridges] Không tạo được bảng ${name}:`, err);
    }
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

  /**
   * Catalog cấp bậc và hồ sơ cấp bậc mức 1.
   *
   * Chạy KHÔNG phụ thuộc cờ ENABLE_RANK_ENGINE, và đó là chủ ý: dữ liệu phải
   * có mặt sẵn trước khi giao diện được mở, để lúc bật cờ không ai phải chờ
   * một đợt backfill chạy giữa giờ cao điểm.
   *
   * Bọc try/catch riêng vì đây là module mới nhất. Một lỗi ở đây không được
   * phép làm hỏng việc khởi tạo của những phần đã chạy ổn định lâu nay.
   */
  try {
    const seeded = await seedRankCatalog(db);
    const backfilled = await backfillUserRanks(db);
    console.log(
      `[wobridges] Cap bac: ${seeded.ranks} cap, ${seeded.trials} thi luyen; ` +
        `tao moi ${backfilled} ho so cap bac.`,
    );
  } catch (err) {
    console.error("[wobridges] Khong seed duoc he cap bac:", err);
  }

  const exercises: SeedExercise[] = [
    ...seedData.exercises,
    readingGameTheory,
    ...readingPaidPack1,
  ].filter((exercise) => exercise.skill === "READING");
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
          accessLevel: ex.accessLevel ?? "PUBLIC",
          // Đề trả phí có sẵn mức độ khó và cờ tính danh hiệu, để quản trị
          // viên không phải bấm lại từng cái sau mỗi lần thêm đề.
          achievementEligible: ex.achievementEligible ?? false,
          difficultyTier: ex.difficultyTier ?? "UNKNOWN",
        },
      });
      console.log(`[wobridges] Đã tạo bài tập: ${ex.title}`);
    }
  }

  // Bổ sung lời giải mẫu Feynman (question.learning) cho các bài đã tồn tại.
  // Chỉ chạy một lần VÀ chỉ khi bản trên máy chủ chưa có lời giải nào —
  // không bao giờ ghi đè nội dung giáo viên đã tự soạn.
  // Go rang buoc "mot luot lam bai chi mot phien Feynman".
  //
  // Day la thao tac PHA HUY nen phai boc applyOnce: chay lai lan hai tren
  // database da go roi se nem loi va lam ban log moi lan khoi dong. Unique moi
  // (attemptId, runNumber) duoc tao trong CUNG mot lan chay, vi neu go duoc
  // khoa cu ma khong tao duoc khoa moi thi bang mat hoan toan rang buoc.
  await applyOnce("FEYNMAN_REVIEW_MULTI_RUN_v1", async () => {
    try {
      await db.$executeRawUnsafe(
        "ALTER TABLE `FeynmanReview` DROP INDEX `FeynmanReview_attemptId_key`"
      );
    } catch {
      /* database moi tao tu schema hien tai thi khoa nay khong ton tai */
    }
    try {
      await db.$executeRawUnsafe(
        "CREATE UNIQUE INDEX `FeynmanReview_attemptId_runNumber_key` " +
          "ON `FeynmanReview` (`attemptId`, `runNumber`)"
      );
    } catch {
      /* da tao roi */
    }
  });

  await applyOnce("SEED_FEYNMAN_LEARNING_v1", async () => {
    for (const ex of exercises) {
      const seedContent = JSON.stringify(ex.content);
      if (!seedContent.includes('"learning"')) continue;
      const existing = await db.exercise.findFirst({ where: { title: ex.title } });
      if (!existing || existing.content.includes('"learning"')) continue;
      await db.exercise.update({
        where: { id: existing.id },
        data: { content: seedContent },
      });
      console.log(`[wobridges] Đã bổ sung lời giải mẫu Feynman cho: ${ex.title}`);
    }
  });

  // Áp mức truy cập từ dữ liệu seed cho các bài ĐÃ TỒN TẠI — chỉ chạy MỘT LẦN
  // (đánh dấu trong bảng Config) để không ghi đè thiết lập quản trị viên tự đổi.
  await applyOnce("SEED_ACCESS_LEVEL_v1", async () => {
    for (const ex of exercises) {
      if (!ex.accessLevel) continue;
      const res = await db.exercise.updateMany({
        where: { title: ex.title, accessLevel: { not: ex.accessLevel } },
        data: { accessLevel: ex.accessLevel },
      });
      if (res.count > 0) {
        console.log(
          `[wobridges] Đặt mức truy cập ${ex.accessLevel} cho: ${ex.title}`
        );
      }
    }
  });

  // Mở toàn bộ đề Reading thành miễn phí — theo mô hình kinh doanh đã chốt ở
  // docs/DAC-TA-FEYNMAN-AI.md §2.1: đề thi miễn phí, tiền chỉ thu ở lớp chữa
  // sâu (39k/19k) và ví lượt AI (29k). Ba gói Reading cũ đã `retired` từ trước,
  // nhưng dữ liệu thì chưa ai đổi, nên học viên vẫn đụng tường 9.000đ.
  //
  // applyOnce chứ không phải mỗi lần khởi động: quản trị viên vẫn phải khoá lại
  // được một đề cụ thể sau này (nút ở /quan-tri/bai-tap) mà không bị lần triển
  // khai kế tiếp mở toang ra.
  //
  // Quyền đã mua KHÔNG bị đụng tới: AccessGrant cũ nằm nguyên, người đã trả
  // 9.000đ hay 99.000đ không mất gì — chỉ là thứ họ mua nay ai cũng có.
  await applyOnce("PUBLIC_READING_ALL_v1", async () => {
    const res = await db.exercise.updateMany({
      where: { skill: "READING", accessLevel: "RESTRICTED" },
      data: { accessLevel: "PUBLIC" },
    });
    if (res.count > 0) {
      console.log(`[wobridges] Da mo mien phi ${res.count} de Reading.`);
    }
  });

  /**
   * Doi chieu mo hinh: KHOA lai toan bo de Reading, mo le 9 xu moi de.
   *
   * Buoc PUBLIC_READING_ALL_v1 ngay tren da chay hom 11/08 va mo het de ra —
   * buoc nay dao nguoc no theo quyet dinh cua chu du an ngay 12/08. GIU NGUYEN
   * CA HAI, dung xoa buoc cu: `applyOnce` danh dau theo khoa, xoa buoc cu di
   * thi database nao chua chay se chay nham thu tu.
   *
   * Doi lai, moi tai khoan da xac minh email duoc tang 150 xu = 16 de. Hai ve
   * nay di cung nhau, tach mot ve ra la doi mo hinh kinh doanh chu khong con
   * la sua loi.
   */
  await applyOnce("RESTRICT_READING_ALL_v1", async () => {
    const res = await db.exercise.updateMany({
      where: { skill: "READING", accessLevel: { not: "RESTRICTED" } },
      data: { accessLevel: "RESTRICTED" },
    });
    if (res.count > 0) {
      console.log(`[wobridges] Da khoa ${res.count} de Reading — mo le 9 xu.`);
    }
  });

  /**
   * Tai khoan tao TRUOC ngay co xac minh email duoc coi la da xac minh.
   *
   * Khong lam buoc nay thi moi hoc vien dang hoc bong dung mat quyen nhan qua
   * chao mung va co the bi chan o nhung cho doi email da xac minh — ho khong
   * lam gi sai, chi la dang ky truoc khi luat doi.
   */
  await applyOnce("GRANDFATHER_EMAIL_VERIFIED_v1", async () => {
    const res = await db.user.updateMany({
      where: { emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
    if (res.count > 0) {
      console.log(`[wobridges] Da danh dau ${res.count} tai khoan cu la da xac minh.`);
    }
  });

  /**
   * Tang qua chao mung cho tai khoan da co tu truoc.
   *
   * Chu du an chot 12/08/2026: tang mot lan cho TAT CA, khong chi tai khoan
   * moi. Ly do la de vua bi khoa lai — nguoi dang hoc do khong lam gi sai va
   * khong duoc de ho mat quyen ma khong co gi bu.
   *
   * Goi `grantWelcomeCoins` chu khong tu viet lai phep cong: no da co khoa
   * `GIFT:WELCOME:<userId>` chong tang hai lan, va mot nguoi vua duoc tang qua
   * o buoc dang ky roi lai duoc buoc nay tang them la mat tien that.
   */
  /**
   * Chín phòng Nghị Sự Đường, mỗi bậc một phòng.
   *
   * Tên và mã lấy THẲNG từ `RANK_SEEDS` chứ không chép tay: chép tay thì đổi
   * tên một bậc là lệch ngay, và lệch ở đây nghĩa là học viên bậc 4 nhìn thấy
   * một phòng mang tên bậc 5.
   *
   * KHÔNG bọc applyOnce: đây là seed idempotent theo `key`, cần chạy lại mỗi
   * lần triển khai để phòng mới (nếu sau này thêm bậc) tự xuất hiện. Phòng đã
   * có thì chỉ cập nhật tên và mô tả, KHÔNG đụng tới `locked` — đó là thiết
   * lập của quản trị viên.
   */
  try {
    const { RANK_SEEDS } = await import("@/lib/ranks/catalog");
    for (const rank of RANK_SEEDS) {
      await db.forumChannel.upsert({
        where: { key: rank.slug },
        create: {
          key: rank.slug,
          level: rank.level,
          name: rank.name,
          blurb: rank.description,
          sortOrder: rank.level,
        },
        update: {
          level: rank.level,
          name: rank.name,
          blurb: rank.description,
          sortOrder: rank.level,
        },
      });
    }
    console.log(`[wobridges] Nghi Su Duong: ${RANK_SEEDS.length} phong.`);
  } catch (err) {
    console.error("[wobridges] Khong seed duoc phong dien dan:", err);
  }

  /**
   * Dựng lại hai số đếm cờ từ sổ phiếu đã có.
   *
   * Cột `upCount`/`downCount` thêm sau khi diễn đàn đã có phiếu thật, nên phải
   * đếm ngược từ `ForumVote` — nguồn sự thật duy nhất. Đếm lại từ phiếu chứ
   * KHÔNG suy từ `score`: score chỉ là hiệu số, không tách được 3 cắm 1 hạ với
   * 2 cắm 0 hạ, mà hai thứ đó hiện ra màn hình khác hẳn nhau.
   */
  await applyOnce("FORUM_VOTE_COUNTS_BACKFILL_v1", async () => {
    for (const targetType of ["POST", "COMMENT"] as const) {
      const groups = await db.forumVote.groupBy({
        by: ["targetId", "value"],
        where: { targetType },
        _count: { _all: true },
      });

      const tally = new Map<string, { up: number; down: number }>();
      for (const row of groups) {
        const current = tally.get(row.targetId) ?? { up: 0, down: 0 };
        if (row.value > 0) current.up += row._count._all;
        else current.down += row._count._all;
        tally.set(row.targetId, current);
      }

      for (const [targetId, counts] of tally) {
        const data = { upCount: counts.up, downCount: counts.down };
        if (targetType === "POST") {
          await db.forumPost.updateMany({ where: { id: targetId }, data });
        } else {
          await db.forumComment.updateMany({ where: { id: targetId }, data });
        }
      }
      if (tally.size > 0) {
        console.log(
          `[wobridges] Dung lai so dem co cho ${tally.size} ${targetType}.`
        );
      }
    }
  });

  await applyOnce("WELCOME_COINS_BACKFILL_v1", async () => {
    const { grantWelcomeCoins } = await import("@/lib/payments/coin-service");
    const users = await db.user.findMany({
      where: { emailVerifiedAt: { not: null } },
      select: { id: true },
    });

    let granted = 0;
    for (const user of users) {
      if (await grantWelcomeCoins(user.id)) granted++;
    }
    console.log(
      `[wobridges] Qua chao mung: da tang cho ${granted}/${users.length} tai khoan cu.`
    );
  });

  // Chuyển quyền đã cấp ở bảng cũ ExerciseAccess sang sổ cái AccessGrant.
  // Quyền cũ đều là Reading mở lẻ và vĩnh viễn (expiresAt = null) nên học viên
  // không mất gì. INSERT IGNORE + grantKey duy nhất khiến chạy lại vô hại.
  await applyOnce("MIGRATE_EXERCISE_ACCESS_TO_GRANT_v1", async () => {
    const moved = await db.$executeRawUnsafe(`
      INSERT IGNORE INTO \`AccessGrant\`
        (\`id\`, \`userId\`, \`exerciseId\`, \`orderId\`, \`grantKey\`,
         \`feature\`, \`scope\`, \`source\`, \`status\`, \`startsAt\`,
         \`expiresAt\`, \`createdAt\`, \`updatedAt\`)
      SELECT
        CONCAT('legacy_', ea.id), ea.userId, ea.exerciseId, NULL,
        CONCAT('LEGACY:', ea.id), 'READING', 'EXERCISE', 'LEGACY',
        'ACTIVE', ea.grantedAt, NULL, ea.grantedAt, NOW(3)
      FROM \`ExerciseAccess\` ea
    `);
    console.log(
      `[wobridges] Đã chuyển ${moved} quyền truy cập cũ sang sổ cái AccessGrant`
    );
  });

  // Bật cờ tính danh hiệu cho các đề Reading đang công khai. Chỉ chạy MỘT LẦN
  // để quản trị viên tắt/bật lại về sau không bị ghi đè.
  await applyOnce("SEED_ACHIEVEMENT_ELIGIBLE_v1", async () => {
    const res = await db.exercise.updateMany({
      where: { skill: "READING", published: true, competitionOnly: false },
      data: { achievementEligible: true },
    });
    console.log(`[wobridges] Bật tính danh hiệu cho ${res.count} đề Reading`);
  });

  // Đánh số thứ tự lượt làm và dựng lại siêu dữ liệu cho bài làm CŨ.
  // Học viên đã bỏ công làm bài trước khi có hệ danh hiệu vẫn phải được ghi
  // nhận — bắt họ làm lại từ đầu là phủ nhận công sức có thật.
  await applyOnce("BACKFILL_ATTEMPT_METADATA_v1", async () => {
    await db.$executeRawUnsafe(`
      UPDATE \`Attempt\` a
      JOIN (
        SELECT \`id\`, ROW_NUMBER() OVER (
          PARTITION BY \`userId\`, \`exerciseId\` ORDER BY \`startedAt\`, \`id\`
        ) AS rn
        FROM \`Attempt\`
      ) r ON r.\`id\` = a.\`id\`
      SET a.\`attemptNumber\` = r.rn
    `);

    const old = await db.attempt.findMany({
      where: { status: "GRADED", exercise: { skill: "READING" } },
      include: {
        exercise: {
          select: { content: true, durationMinutes: true, achievementEligible: true },
        },
      },
    });

    let updated = 0;
    for (const attempt of old) {
      const content = safeParse(attempt.exercise.content);
      const answers = safeParse(attempt.answers) ?? {};
      const answeredCount = Object.values(answers as Record<string, unknown>).filter(
        (v) => v !== null && v !== undefined && String(v).trim() !== ""
      ).length;
      const elapsedSeconds = attempt.submittedAt
        ? Math.max(
            0,
            Math.round(
              (attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000
            )
          )
        : null;
      const bandResult = calculateReadingBand(
        content as never,
        attempt.scoreRaw ?? 0,
        attempt.scoreTotal ?? 0
      );

      const valid = isValidAchievementAttempt({
        status: attempt.status,
        achievementEligible: attempt.exercise.achievementEligible,
        band: bandResult?.band ?? null,
        answeredCount,
        scoreTotal: attempt.scoreTotal,
        elapsedSeconds,
        durationMinutes: attempt.exercise.durationMinutes,
        integrityStatus: attempt.integrityStatus,
      });

      await db.attempt.update({
        where: { id: attempt.id },
        data: {
          answeredCount,
          elapsedSeconds,
          band: bandResult?.band ?? null,
          bandScaleVersion: bandResult?.scaleVersion ?? null,
          validForAchievements: valid,
        },
      });
      updated++;
    }
    console.log(`[wobridges] Đã dựng lại dữ liệu cho ${updated} bài làm cũ`);
  });

  // Ràng buộc chống trùng số thứ tự lượt làm. Đặt SAU khi đã đánh số lại;
  // nằm trong danh sách migration nên lỗi (nếu còn trùng) không làm sập gì.
  try {
    await db.$executeRawUnsafe(
      "ALTER TABLE `Attempt` ADD UNIQUE INDEX `Attempt_userId_exerciseId_attemptNumber_key` (`userId`, `exerciseId`, `attemptNumber`)"
    );
  } catch {
    /* đã có, hoặc dữ liệu cũ còn trùng — không chặn khởi động */
  }

  // Đồng bộ danh mục danh hiệu. Chạy MỖI lần khởi động (không phải applyOnce)
  // để sửa câu chữ trong mã nguồn là thấy ngay trên website; danh hiệu học
  // viên đã nhận không bị đụng tới.
  try {
    const { seedTitleCatalog } = await import("@/lib/achievements/engine");
    const count = await seedTitleCatalog();
    console.log(`[wobridges] Đã đồng bộ ${count} danh hiệu`);
  } catch (err) {
    console.error("[wobridges] Không đồng bộ được danh mục danh hiệu:", err);
  }

  // Gieo kho câu Thí Bút. Chạy mỗi lần khởi động và tự biết dừng khi đã đủ,
  // nên push lên main là kho có mặt trên máy chủ, không phải gõ lệnh nào.
  try {
    const { seedThiButBank } = await import("@/lib/thibut/seeds");
    const { created, published } = await seedThiButBank();
    if (created > 0) {
      console.log(
        `[wobridges] Thi But: nap ${created} cau, phat hanh ${published} cau.`,
      );
    }
  } catch (err) {
    // Không chặn khởi động: thiếu kho câu thì Thí Bút đóng, phần còn lại của
    // website vẫn phải chạy.
    console.error("[wobridges] Khong gieo duoc kho cau Thi But:", err);
  }

  // Xét danh hiệu MỘT LẦN cho bài làm đã có từ trước.
  //
  // Việc dựng lại band ở trên mới chỉ chuẩn bị số liệu; nếu không chạy thêm
  // bước này, học viên đã làm đủ ba bài từ tuần trước vẫn thấy 0 danh hiệu cho
  // tới khi họ nộp thêm một bài nữa. Công sức có thật mà hệ thống làm ngơ.
  await applyOnce("EVALUATE_TITLES_BACKFILL_v1", async () => {
    const { evaluateUser } = await import("@/lib/achievements/engine");
    const students = await db.user.findMany({
      where: { role: "STUDENT", active: true },
      select: { id: true },
      // Giới hạn phòng khi database lớn: phần còn lại sẽ được xét dần khi họ
      // nộp bài tiếp theo, không ai mất gì.
      take: 500,
    });
    let awarded = 0;
    for (const student of students) {
      try {
        await evaluateUser(student.id);
        awarded++;
      } catch (err) {
        console.error(`[wobridges] Không xét được danh hiệu cho ${student.id}:`, err);
      }
    }
    console.log(`[wobridges] Đã xét danh hiệu lần đầu cho ${awarded} học viên`);
  });

  // Báo lỗi ở CUỐI, sau khi mọi việc độc lập đã chạy xong
  if (ddlErrors.length > 0) {
    throw new Error(`Lỗi tạo bảng — ${ddlErrors.join(" | ")}`);
  }
}

type SeedExercise = {
  skill: string;
  taskType: string;
  title: string;
  description: string;
  durationMinutes: number;
  content: unknown;
  accessLevel?: string;
  achievementEligible?: boolean;
  difficultyTier?: string;
};

/** Đọc JSON không ném lỗi — dữ liệu cũ có thể hỏng, không được làm sập khởi động. */
function safeParse(text: string | null | undefined): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Chạy một tác vụ đúng một lần trong đời database (đánh dấu ở bảng Config). */
async function applyOnce(key: string, fn: () => Promise<void>) {
  const done = await db.config.findUnique({ where: { key } });
  if (done) return;
  await fn();
  await db.config.upsert({
    where: { key },
    update: { value: new Date().toISOString() },
    create: { key, value: new Date().toISOString() },
  });
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
