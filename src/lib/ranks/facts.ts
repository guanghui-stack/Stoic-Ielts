import "server-only";
import { db } from "@/lib/db";
import { gradeReading, type ReadingAnswers } from "@/lib/exercise-content";
import { readingContentForAttempt } from "@/lib/attempt-content";
import {
  PILLAR_TITLE_CODES,
  type QualifiedReviewFact,
  type RankAttemptFact,
  type RankFacts,
} from "@/lib/ranks/rules";
import { GRACE_TOKEN } from "@/lib/ranks/catalog";

/**
 * Đọc dữ liệu thật để nạp cho luật cấp bậc.
 *
 * Tầng này chỉ LẤY dữ liệu, không quyết định gì. Mọi phán xét "đủ điều kiện
 * chưa" nằm ở `rules.ts` dưới dạng hàm thuần, để còn kiểm thử được trên máy
 * không có MySQL.
 *
 * Chi phí đáng lưu ý: thống kê theo dạng câu và theo phần không được lưu sẵn
 * trong bảng Attempt, nên phải chấm lại bài bằng `gradeReading` để suy ra. Với
 * học viên làm hàng trăm bài, chấm lại tất cả là quá đắt cho mỗi lần xét. Vì
 * vậy chỉ những lượt trong `detailWindowDays` gần đây mới được chấm lại chi
 * tiết; lượt cũ hơn vẫn được đếm cho các luật dạng "bao nhiêu bài", chỉ không
 * có số liệu theo dạng câu.
 *
 * Cửa sổ 180 ngày chọn theo cửa ải dài nhất (60 ngày) nhân ba lần dự phòng.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DETAIL_WINDOW_DAYS = 180;

/** Phục bàn "sâu": có đủ ba trường bằng chứng, giải thích và quy tắc rút ra. */
function isDeep(parts: {
  evidence: string | null;
  explanation: string | null;
  lesson: string | null;
}): boolean {
  return Boolean(parts.evidence && parts.explanation && parts.lesson);
}

export async function loadRankFacts(
  userId: string,
  options: { now?: Date; detailWindowDays?: number } = {},
): Promise<RankFacts> {
  const now = options.now ?? new Date();
  const windowDays = options.detailWindowDays ?? DEFAULT_DETAIL_WINDOW_DAYS;
  const detailFrom = new Date(now.getTime() - windowDays * DAY_MS);

  const [attempts, feynman, reflections, studyDays, titles, grace] =
    await Promise.all([
      db.attempt.findMany({
        where: {
          userId,
          status: "GRADED",
          exercise: { skill: "READING" },
          submittedAt: { not: null },
        },
        select: {
          id: true,
          exerciseId: true,
          band: true,
          elapsedSeconds: true,
          submittedAt: true,
          answers: true,
          assemblyId: true,
          validForAchievements: true,
          integrityStatus: true,
          exercise: { select: { taskType: true, content: true } },
          assembly: { select: { countsForAchievements: true } },
        },
        orderBy: { submittedAt: "asc" },
      }),
      db.feynmanReview.findMany({
        where: { userId, status: "COMPLETED" },
        select: {
          id: true,
          completedAt: true,
          mistakes: {
            select: {
              questionType: true,
              evidenceText: true,
              revisedExplanation: true,
              lessonRule: true,
              completedAt: true,
            },
          },
        },
      }),
      db.trialReflection.findMany({
        where: { userId },
        select: {
          id: true,
          questionType: true,
          evidenceText: true,
          explanation: true,
          lessonRule: true,
          createdAt: true,
        },
      }),
      db.studyDay.findMany({
        where: { userId },
        select: { dateKey: true, activeSeconds: true },
      }),
      db.userTitle.findMany({
        where: { userId, status: "EARNED" },
        select: { title: { select: { code: true } } },
      }),
      db.userGraceState.findUnique({
        where: { userId },
        select: { availableCount: true, tokenCode: true },
      }),
    ]);

  const attemptFacts: RankAttemptFact[] = [];
  for (const attempt of attempts) {
    const submittedAt = attempt.submittedAt as Date;

    // Chỉ lượt sạch mới được dùng cho gate và success. Lượt đang chờ rà soát
    // liêm chính KHÔNG được tính — không kết luận gian lận, nhưng cũng không
    // trao cấp bậc dựa trên dữ liệu chưa chắc chắn.
    const valid =
      attempt.validForAchievements &&
      attempt.integrityStatus === "CLEAR" &&
      (attempt.assemblyId === null ||
        attempt.assembly?.countsForAchievements === true);

    let questionTypeStats: RankAttemptFact["questionTypeStats"] = {};
    let partStats: RankAttemptFact["partStats"] = [];

    if (submittedAt >= detailFrom) {
      try {
        const content = await readingContentForAttempt(attempt);
        const answers = JSON.parse(attempt.answers || "{}") as ReadingAnswers;
        const { detail } = gradeReading(content, answers);

        const byType = new Map<string, { correct: number; total: number }>();
        const byPart = new Map<number, { correct: number; total: number }>();
        for (const q of detail) {
          const t = byType.get(q.type) ?? { correct: 0, total: 0 };
          t.total += 1;
          if (q.correct) t.correct += 1;
          byType.set(q.type, t);

          const p = byPart.get(q.part) ?? { correct: 0, total: 0 };
          p.total += 1;
          if (q.correct) p.correct += 1;
          byPart.set(q.part, p);
        }
        questionTypeStats = Object.fromEntries(byType);
        partStats = [...byPart.entries()]
          .map(([part, s]) => ({ part, ...s }))
          .sort((a, b) => a.part - b.part);
      } catch {
        // Đề bị xóa hoặc nội dung hỏng: bỏ phần thống kê chi tiết chứ không
        // làm sập cả việc xét cấp bậc. Lượt vẫn được đếm cho luật dạng đếm.
      }
    }

    attemptFacts.push({
      id: attempt.id,
      exerciseId: attempt.exerciseId,
      band: attempt.band,
      elapsedSeconds: attempt.elapsedSeconds,
      submittedAt,
      questionTypeStats,
      partStats,
      isFullTest:
        attempt.exercise.taskType === "READING_FULL" || attempt.assemblyId !== null,
      valid,
    });
  }

  const reviewFacts: QualifiedReviewFact[] = [];

  // Feynman trả phí và TrialReflection miễn phí đứng NGANG NHAU ở đây. Đó là
  // điều giữ cho hệ cấp bậc không biến thành trả tiền để mạnh hơn.
  for (const review of feynman) {
    if (!review.completedAt) continue;
    const completed = review.mistakes.filter((m) => m.completedAt);
    reviewFacts.push({
      id: review.id,
      source: "FEYNMAN",
      questionType: completed[0]?.questionType ?? null,
      completedAt: review.completedAt,
      deep: completed.some((m) =>
        isDeep({
          evidence: m.evidenceText,
          explanation: m.revisedExplanation,
          lesson: m.lessonRule,
        }),
      ),
    });
  }

  for (const reflection of reflections) {
    reviewFacts.push({
      id: reflection.id,
      source: "TRIAL_REFLECTION",
      questionType: reflection.questionType,
      completedAt: reflection.createdAt,
      deep: isDeep({
        evidence: reflection.evidenceText,
        explanation: reflection.explanation,
        lesson: reflection.lessonRule,
      }),
    });
  }

  return {
    now,
    attempts: attemptFacts,
    qualifiedReviews: reviewFacts,
    studyDays,
    earnedTitleCodes: new Set(titles.map((t) => t.title.code)),
    // Ba trụ do hệ Danh hiệu quản. Cửa 7 đọc sang chứ không tự tính lại, để
    // hai hệ không bao giờ nói hai con số khác nhau về cùng một việc.
    pillars: await loadPillarProgress(userId),
    graceAvailable:
      grace?.tokenCode === GRACE_TOKEN.code ? grace.availableCount : 0,
  };
}

/**
 * Tiến độ ba trụ, đọc từ bảng tiến độ danh hiệu.
 *
 * Trả về mảng rỗng nếu chưa có bản ghi nào — khi đó cửa 7 báo chưa đủ, đúng
 * như mong đợi, thay vì mở nhầm.
 */
async function loadPillarProgress(
  userId: string,
): Promise<Array<{ code: string; percent: number }>> {
  const rows = await db.titleProgress.findMany({
    where: {
      userId,
      cycleKey: "GLOBAL",
      title: { code: { in: [...PILLAR_TITLE_CODES] } },
    },
    select: { percent: true, title: { select: { code: true } } },
  });
  return rows.map((row) => ({ code: row.title.code, percent: row.percent }));
}
