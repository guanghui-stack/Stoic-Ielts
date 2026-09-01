import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { readingAccessOf, isAdminRole } from "@/lib/exercise-access";
import { getCoinWallet } from "@/lib/payments/coin-service";
import { OFFERS } from "@/lib/payments/catalog";
import { thiButGate } from "@/lib/thibut/thibut-service.ts";
import { buildReadingCatalogMetadata } from "@/lib/reading/catalog";
import {
  ReadingExerciseTable,
  type ReadingExerciseTableRow,
} from "@/components/reading/reading-exercise-table";

/**
 * Đọc dữ liệu nhạy cảm ở server rồi chỉ trao cho bảng một DTO metadata nhỏ.
 * `Exercise.content` chứa đáp án nên không bao giờ được truyền vào component
 * client của dialog.
 */
export async function ExerciseList({
  readingType,
}: {
  readingType: "ACADEMIC" | "GENERAL";
}) {
  const [user, exercises] = await Promise.all([
    getCurrentUser(),
    db.exercise.findMany({
      // Đề Thử thách tháng không được xuất hiện trong kho luyện tập.
      where: {
        skill: "READING",
        readingType,
        taskType: "READING_PASSAGE",
        published: true,
        competitionOnly: false,
        arenaOnly: false,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (exercises.length === 0) {
    return (
      <div className="rounded-stoic-lg border border-stoic-line bg-stoic-canvas px-6 py-14 text-center shadow-stoic-1">
        <p className="font-semibold text-stoic-ink">Kho bài đọc đang được chuẩn bị.</p>
        <p className="mt-2 text-sm text-stoic-ink-muted">
          Vui lòng quay lại sau để xem các passage mới.
        </p>
      </div>
    );
  }

  const exerciseIds = exercises.map((exercise) => exercise.id);
  const [attempts, access, wallet, liveThiButAttempts] = user
    ? await Promise.all([
        db.attempt.findMany({
          where: {
            userId: user.id,
            exercise: { skill: "READING", readingType },
          },
          orderBy: { startedAt: "desc" },
        }),
        readingAccessOf(user.id),
        getCoinWallet(user.id),
        db.thiButAttempt.findMany({
          where: {
            userId: user.id,
            targetKind: "EXERCISE",
            targetId: { in: exerciseIds },
            submittedAt: null,
          },
          select: { targetId: true },
        }),
      ])
    : [
        [],
        { hasAll: false, exerciseIds: new Set<string>(), allExpiresAt: null },
        null,
        [],
      ];

  const canOpen = (exercise: { id: string; accessLevel: string }) =>
    exercise.accessLevel !== "RESTRICTED" ||
    (user
      ? isAdminRole(user.role) ||
        access.hasAll ||
        access.exerciseIds.has(exercise.id)
      : false);

  const lockedExercises = exercises.filter((exercise) => !canOpen(exercise));
  const meritGateEntries = user
    ? await Promise.all(
        lockedExercises.map(async (exercise) =>
          [
            exercise.id,
            await thiButGate({
              userId: user.id,
              targetKind: "EXERCISE",
              targetId: exercise.id,
            }),
          ] as const,
        ),
      )
    : [];
  const meritGateByExercise = new Map(meritGateEntries);
  const liveThiButIds = new Set(liveThiButAttempts.map((attempt) => attempt.targetId));

  const attemptsByExercise = new Map<string, typeof attempts>();
  for (const attempt of attempts) {
    const mine = attemptsByExercise.get(attempt.exerciseId) ?? [];
    mine.push(attempt);
    attemptsByExercise.set(attempt.exerciseId, mine);
  }

  const coinCost = OFFERS.READING_UNLOCK.priceCoins;
  const rows: ReadingExerciseTableRow[] = exercises.map((exercise) => {
    const metadata = buildReadingCatalogMetadata({
      title: exercise.title,
      content: exercise.content,
      difficultyTier: exercise.difficultyTier,
    });
    const mine = attemptsByExercise.get(exercise.id) ?? [];
    const inProgress = mine.some((attempt) => attempt.status === "IN_PROGRESS");
    const best = mine
      .filter(
        (attempt) =>
          attempt.status !== "IN_PROGRESS" &&
          attempt.scoreRaw !== null &&
          attempt.scoreTotal !== null,
      )
      .sort((a, b) => (b.scoreRaw ?? -1) - (a.scoreRaw ?? -1))[0];
    const owned = canOpen(exercise);
    const gate = meritGateByExercise.get(exercise.id);

    return {
      id: exercise.id,
      title: metadata.displayTitle,
      questionCount: metadata.questionCount,
      questionTypes: [...metadata.questionTypeLabels],
      difficultyLabel: metadata.difficultyLabel,
      passageFitLabel: metadata.passageFitLabel,
      durationMinutes: exercise.durationMinutes,
      access:
        exercise.accessLevel !== "RESTRICTED"
          ? "FREE"
          : owned
            ? "OWNED"
            : "LOCKED",
      userSignedIn: Boolean(user),
      inProgress,
      attemptCount: mine.length,
      bestScore:
        best && best.scoreRaw !== null && best.scoreTotal !== null
          ? { raw: best.scoreRaw, total: best.scoreTotal }
          : null,
      coinCost,
      coinBalance: wallet?.balance ?? null,
      merit: gate
        ? {
            balance: gate.balance,
            cost: gate.cost,
            canAfford: gate.canAfford,
            canRetry: gate.canRetry,
            secondsLeft: gate.secondsLeft,
            poolReady: gate.poolReady,
            hasLiveAttempt: liveThiButIds.has(exercise.id),
          }
        : null,
    };
  });

  return <ReadingExerciseTable rows={rows} />;
}
