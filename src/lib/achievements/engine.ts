import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { TITLE_SEEDS } from "@/lib/achievements/catalog";
import { features } from "@/lib/features";
import { processRankEvent } from "@/lib/ranks/engine";
import {
  dateKeyOf,
  evalActiveTimeWindow,
  evalCollectionAttemptCount,
  evalCollectionFeynmanComplete,
  evalCollectionMinFirstBand,
  evalCompositeTitles,
  evalFeynmanTotals,
  evalNearComposite,
  evalRecoveryChain,
  evalRollingAttempts,
  evalUniqueFirstAttempts,
  type AttemptFact,
  type CollectionItemFact,
  type ProgressResult,
} from "@/lib/achievements/rules";

/**
 * Bộ máy xét danh hiệu.
 *
 * Chạy theo SỰ KIỆN chứ không tính lại toàn bộ lịch sử mỗi lần học viên mở
 * trang: với vài chục nghìn lượt làm bài, cách tính lại sẽ khiến trang cá nhân
 * chậm dần rồi đứng hẳn.
 *
 * Toàn bộ hàm ở đây đều IDEMPOTENT — chạy lại một sự kiện không trao thêm danh
 * hiệu, không tạo thêm phần thưởng.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const REWARD_TTL_DAYS = 90;

/* ================================================================== */
/* Gieo catalog                                                       */
/* ================================================================== */

/**
 * Đồng bộ catalog trong mã nguồn xuống database.
 *
 * Cập nhật phần MÔ TẢ và điều kiện, nhưng KHÔNG đụng tới danh hiệu đã trao cho
 * học viên — sửa câu chữ không được phép làm ai mất danh hiệu đã có.
 */
export async function seedTitleCatalog(): Promise<number> {
  let touched = 0;
  for (const seed of TITLE_SEEDS) {
    const data = {
      slug: seed.slug,
      name: seed.name,
      description: seed.description,
      quoteKind: seed.quoteKind,
      quoteSource: seed.quoteSource ?? null,
      quoteSourceUrl: seed.quoteSourceUrl ?? null,
      category: seed.category,
      rarity: seed.rarity,
      visibility: seed.visibility ?? "PUBLIC",
      ruleKey: seed.ruleKey,
      ruleConfigJson: JSON.stringify(seed.ruleConfig),
      repeatPolicy: seed.repeatPolicy ?? "ONCE",
      rewardCode: seed.rewardCode ?? null,
      sortOrder: seed.sortOrder,
      active: true,
    };
    await db.titleDefinition.upsert({
      where: { code: seed.code },
      update: data,
      create: { code: seed.code, ...data },
    });
    touched++;
  }
  return touched;
}

/* ================================================================== */
/* Ghi nhận sự kiện                                                    */
/* ================================================================== */

export type AchievementEventType =
  | "READING_GRADED"
  | "FEYNMAN_COMPLETED"
  | "STUDY_TIME_UPDATED"
  | "COLLECTION_ACTIVATED";

/**
 * Đưa một sự kiện vào hàng đợi. Khóa `eventKey` duy nhất khiến việc gọi hai
 * lần cho cùng một lượt làm bài không sinh ra hai lần xét.
 */
export async function recordAchievementEvent(input: {
  userId: string;
  type: AchievementEventType;
  key: string;
  payload?: Record<string, unknown>;
}): Promise<string | null> {
  try {
    const event = await db.achievementEvent.create({
      data: {
        eventKey: `${input.type}:${input.key}`,
        userId: input.userId,
        type: input.type,
        payloadJson: JSON.stringify(input.payload ?? {}),
      },
      select: { id: true },
    });
    return event.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null; // đã ghi nhận trước đó — không phải lỗi
    }
    throw error;
  }
}

/** Nhóm quy tắc cần xét lại cho mỗi loại sự kiện. */
const RULES_FOR_EVENT: Record<AchievementEventType, string[]> = {
  READING_GRADED: [
    "UNIQUE_FIRST_ATTEMPTS",
    "ROLLING_ATTEMPTS",
    "COLLECTION_ATTEMPT_COUNT",
    "COLLECTION_MIN_FIRST_BAND",
    "RECOVERY_CHAIN",
    "COMPOSITE_TITLES",
    "NEAR_COMPOSITE",
  ],
  FEYNMAN_COMPLETED: [
    "FEYNMAN_TOTALS",
    "COLLECTION_FEYNMAN_COMPLETE",
    "COLLECTION_MIN_FIRST_BAND",
    "COMPOSITE_TITLES",
    "NEAR_COMPOSITE",
  ],
  STUDY_TIME_UPDATED: ["ACTIVE_TIME_WINDOW", "COMPOSITE_TITLES", "NEAR_COMPOSITE"],
  COLLECTION_ACTIVATED: [
    "COLLECTION_ATTEMPT_COUNT",
    "COLLECTION_MIN_FIRST_BAND",
    "COLLECTION_FEYNMAN_COMPLETE",
  ],
};

/* ================================================================== */
/* Xử lý sự kiện                                                       */
/* ================================================================== */

export async function processAchievementEvent(eventId: string): Promise<void> {
  // Giành quyền xử lý: hai tiến trình cùng chạy thì chỉ một cái đi tiếp
  const claimed = await db.achievementEvent.updateMany({
    where: { id: eventId, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "PROCESSING", attempts: { increment: 1 }, lastError: null },
  });
  if (claimed.count === 0) return;

  const event = await db.achievementEvent.findUnique({ where: { id: eventId } });
  if (!event) return;

  try {
    await evaluateUser(event.userId, {
      ruleKeys: RULES_FOR_EVENT[event.type as AchievementEventType] ?? [],
      sourceEventId: event.id,
    });

    // Cấp bậc dùng chung hàng đợi này thay vì có hàng đợi riêng, nhưng vẫn là
    // hai hệ độc lập ở tầng nghiệp vụ: Danh hiệu không thăng cấp, Cấp bậc
    // không trao danh hiệu. Lỗi bên cấp bậc KHÔNG được làm hỏng việc trao
    // danh hiệu đã tính xong ở trên, nên nó có try/catch riêng.
    if (features.ranks) {
      try {
        await processRankEvent({
          id: event.id,
          userId: event.userId,
          type: event.type,
        });
      } catch (rankError) {
        console.error("[wobridges] Xét cấp bậc thất bại:", rankError);
      }
    }

    await db.achievementEvent.update({
      where: { id: event.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
  } catch (error) {
    await db.achievementEvent.update({
      where: { id: event.id },
      data: { status: "FAILED", lastError: String(error).slice(0, 2000) },
    });
    // Không ném lại: một danh hiệu tính lỗi KHÔNG được phép làm hỏng việc nộp
    // bài của học viên. Cron sẽ thử lại.
    console.error("[wobridges] Xét danh hiệu thất bại:", error);
  }
}

/** Dữ liệu dùng chung cho mọi quy tắc — lấy MỘT LẦN thay vì mỗi quy tắc một lần. */
async function loadUserFacts(userId: string) {
  const now = new Date();
  const [attempts, reviews, studyDays, collection, earned] = await Promise.all([
    db.attempt.findMany({
      where: { userId, status: "GRADED", exercise: { skill: "READING" } },
      select: {
        id: true,
        exerciseId: true,
        band: true,
        submittedAt: true,
        attemptNumber: true,
        validForAchievements: true,
        assemblyId: true,
        exercise: { select: { taskType: true } },
        assembly: { select: { countsForAchievements: true } },
      },
    }),
    db.feynmanReview.findMany({
      where: { userId, status: "COMPLETED" },
      select: {
        id: true,
        completedAt: true,
        finalTeachBack: true,
        confidenceBefore: true,
        confidenceAfter: true,
        attempt: { select: { exerciseId: true } },
        mistakes: {
          select: {
            evidenceText: true,
            revisedExplanation: true,
            lessonRule: true,
            completedAt: true,
          },
        },
      },
    }),
    db.studyDay.findMany({ where: { userId }, select: { dateKey: true, activeSeconds: true } }),
    db.exerciseCollection.findFirst({
      where: { kind: "FREE_READING", status: "ACTIVE" },
      include: { items: { select: { exerciseId: true } } },
    }),
    db.userTitle.findMany({
      where: { userId, status: "EARNED" },
      select: { title: { select: { code: true } } },
    }),
  ]);

  const facts: AttemptFact[] = attempts
    .filter((a) => a.submittedAt !== null)
    .map((a) => ({
      id: a.id,
      exerciseId: a.exerciseId,
      band: a.band,
      submittedAt: a.submittedAt as Date,
      attemptNumber: a.attemptNumber,
      isFullTest:
        a.exercise.taskType === "READING_FULL" || a.assemblyId !== null,
      // Đề học viên TỰ CHỌN passage không được tính danh hiệu — xem
      // reading-assembly.ts để hiểu vì sao.
      valid:
        a.validForAchievements &&
        (a.assemblyId === null || a.assembly?.countsForAchievements === true),
    }));

  const completedMistakes = reviews.flatMap((r) => r.mistakes).filter((m) => m.completedAt);
  const feynmanFacts = {
    completedReviews: reviews.length,
    completedMistakes: completedMistakes.length,
    fullFieldMistakes: completedMistakes.filter(
      (m) => m.evidenceText && m.revisedExplanation && m.lessonRule
    ).length,
    teachBackLongCount: reviews.filter((r) => (r.finalTeachBack ?? "").length >= 180).length,
    confidenceImprovedCount: reviews.filter(
      (r) =>
        r.confidenceAfter !== null &&
        r.confidenceBefore !== null &&
        r.confidenceAfter > r.confidenceBefore
    ).length,
  };

  const feynmanByExercise = new Set(reviews.map((r) => r.attempt.exerciseId));
  const collectionItems: CollectionItemFact[] = (collection?.items ?? []).map((item) => ({
    exerciseId: item.exerciseId,
    feynmanCompleted: feynmanByExercise.has(item.exerciseId),
    attempts: facts
      .filter((f) => f.exerciseId === item.exerciseId)
      .sort((x, y) => x.attemptNumber - y.attemptNumber),
  }));

  const activeDaysAll = studyDays.filter((d) => d.activeSeconds >= 600).length;

  return {
    now,
    facts,
    feynmanFacts,
    studyDays,
    collection,
    collectionItems,
    activeDaysAll,
    earnedCodes: new Set(earned.map((e) => e.title.code)),
    distinctExercises: new Set(facts.filter((f) => f.valid).map((f) => f.exerciseId)).size,
    feynmanReviewCount: reviews.length,
  };
}

type UserFacts = Awaited<ReturnType<typeof loadUserFacts>>;

function evaluateSeed(
  seed: { ruleKey: string; ruleConfig: Record<string, unknown> },
  data: UserFacts,
  pillarPercent: Map<string, number>
): ProgressResult | null {
  // Cấu hình đọc từ JSON nên không còn kiểu tĩnh. Nguồn của nó là catalog
  // trong chính mã nguồn này (đã có kiểm thử), không phải dữ liệu người dùng
  // nhập — nên ép kiểu ở đây là chấp nhận được.
  const c = seed.ruleConfig as never;
  switch (seed.ruleKey) {
    case "UNIQUE_FIRST_ATTEMPTS":
      return evalUniqueFirstAttempts(data.facts, c);
    case "ROLLING_ATTEMPTS":
      return evalRollingAttempts(data.facts, c, data.now);
    case "FEYNMAN_TOTALS":
      return evalFeynmanTotals(data.feynmanFacts, c);
    case "ACTIVE_TIME_WINDOW":
      return evalActiveTimeWindow(
        data.studyDays,
        {
          distinctExercises: data.distinctExercises,
          feynmanReviews: data.feynmanReviewCount,
          outputs: data.facts.filter((f) => f.valid).length + data.feynmanReviewCount,
        },
        c,
        data.now
      );
    case "COMPOSITE_TITLES":
      return evalCompositeTitles(data.earnedCodes, c);
    case "NEAR_COMPOSITE":
      return evalNearComposite(data.earnedCodes, pillarPercent, c);
    case "RECOVERY_CHAIN":
      return evalRecoveryChain(data.facts, c);
    case "COLLECTION_ATTEMPT_COUNT":
      return evalCollectionAttemptCount(data.collectionItems, c);
    case "COLLECTION_MIN_FIRST_BAND":
      return evalCollectionMinFirstBand(data.collectionItems, c, {
        activeDays: data.activeDaysAll,
      });
    case "COLLECTION_FEYNMAN_COMPLETE":
      return evalCollectionFeynmanComplete(data.collectionItems, c);
    default:
      return null;
  }
}

/**
 * Xét lại danh hiệu cho một học viên.
 *
 * Chạy HAI VÒNG là cố ý: vòng một xét các danh hiệu độc lập, vòng hai xét danh
 * hiệu tổng hợp — vì trụ vừa đạt ở vòng một phải được nhìn thấy ở vòng hai,
 * nếu không học viên sẽ phải chờ tới lần nộp bài kế tiếp mới nhận được vé thi.
 */
export async function evaluateUser(
  userId: string,
  options: { ruleKeys?: string[]; sourceEventId?: string | null } = {}
): Promise<void> {
  const definitions = await db.titleDefinition.findMany({ where: { active: true } });
  if (definitions.length === 0) return;

  const wanted = options.ruleKeys?.length
    ? definitions.filter((d) => options.ruleKeys!.includes(d.ruleKey))
    : definitions;

  // Danh hiệu tổng hợp phải xét SAU cùng
  const composite = wanted.filter((d) =>
    ["COMPOSITE_TITLES", "NEAR_COMPOSITE"].includes(d.ruleKey)
  );
  const plain = wanted.filter((d) => !composite.includes(d));

  let data = await loadUserFacts(userId);
  const pillarPercent = new Map<string, number>();

  for (const round of [plain, composite]) {
    if (round.length === 0) continue;
    for (const definition of round) {
      const config = safeConfig(definition.ruleConfigJson);
      const result = evaluateSeed(
        { ruleKey: definition.ruleKey, ruleConfig: config },
        data,
        pillarPercent
      );
      if (!result) continue;

      pillarPercent.set(definition.code, result.percent);
      const cycleKey = resolveCycleKey(definition.repeatPolicy, data.collection?.code);

      await db.titleProgress.upsert({
        where: {
          userId_titleId_cycleKey: { userId, titleId: definition.id, cycleKey },
        },
        update: {
          percent: result.percent,
          currentValue: result.currentValue,
          targetValue: result.targetValue,
          progressJson: JSON.stringify({ detail: result.detail, hint: result.hint }),
        },
        create: {
          userId,
          titleId: definition.id,
          cycleKey,
          percent: result.percent,
          currentValue: result.currentValue,
          targetValue: result.targetValue,
          progressJson: JSON.stringify({ detail: result.detail, hint: result.hint }),
        },
      });

      if (result.earned) {
        await awardTitle({
          userId,
          definition,
          cycleKey,
          sourceEventId: options.sourceEventId ?? null,
          snapshot: result.detail,
        });
      }
    }
    // Nạp lại dữ liệu để vòng hai nhìn thấy trụ vừa được trao
    if (round === plain && composite.length > 0) data = await loadUserFacts(userId);
  }
}

function safeConfig(json: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/** Danh hiệu theo bộ đề thì gắn mã bộ đề, còn lại là GLOBAL. */
function resolveCycleKey(repeatPolicy: string, collectionCode?: string): string {
  if (repeatPolicy === "PER_COLLECTION" && collectionCode) return collectionCode;
  return "GLOBAL";
}

/**
 * Trao danh hiệu và tạo phần thưởng (nếu có) trong MỘT transaction.
 *
 * Khóa duy nhất (userId, titleId, cycleKey) khiến trao lại là thao tác vô hại.
 * Phần thưởng gắn 1-1 với danh hiệu đã trao nên cũng không thể nhân đôi (T10).
 */
async function awardTitle(input: {
  userId: string;
  definition: { id: string; visibility: string; rewardCode: string | null };
  cycleKey: string;
  sourceEventId: string | null;
  snapshot: unknown;
}): Promise<void> {
  await db.$transaction(async (tx) => {
    const award = await tx.userTitle.upsert({
      where: {
        userId_titleId_cycleKey: {
          userId: input.userId,
          titleId: input.definition.id,
          cycleKey: input.cycleKey,
        },
      },
      update: {},
      create: {
        userId: input.userId,
        titleId: input.definition.id,
        cycleKey: input.cycleKey,
        // Danh hiệu riêng tư KHÔNG bao giờ được đánh dấu công khai
        publicVisible: input.definition.visibility !== "PRIVATE_ONLY",
        sourceEventId: input.sourceEventId,
        progressSnapshotJson: JSON.stringify(input.snapshot),
      },
    });

    if (input.definition.rewardCode) {
      await tx.rewardGrant.upsert({
        where: { titleAwardId: award.id },
        update: {},
        create: {
          userId: input.userId,
          titleAwardId: award.id,
          rewardCode: input.definition.rewardCode,
          expiresAt: new Date(award.earnedAt.getTime() + REWARD_TTL_DAYS * DAY_MS),
        },
      });
    }
  });
}

/** Ngày hôm nay theo múi giờ Việt Nam — dùng chung cho phần thời gian học. */
export { dateKeyOf };
