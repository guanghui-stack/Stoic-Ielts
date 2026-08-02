import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { ensureAdminAccount, type AdminDb } from "@/lib/admin-account";
import {
  calculateReadingBand,
  isValidAchievementAttempt,
} from "@/lib/reading-band";
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
