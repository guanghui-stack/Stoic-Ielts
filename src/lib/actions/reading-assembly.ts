"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getAccessSnapshot } from "@/lib/access-grants";
import { isAdminRole } from "@/lib/exercise-access";
import { countReadingQuestions } from "@/lib/exercise-content";
import {
  planAutoAssembly,
  planManualAssembly,
  FULL_TEST_MINUTES,
  type AssemblyResult,
  type PassageCandidate,
} from "@/lib/reading-assembly";

/**
 * Tạo một đề Full Test ghép từ ba passage rồi vào phòng thi luôn.
 *
 * Việc CHỌN passage nằm ở `reading-assembly.ts` (hàm thuần, có kiểm thử);
 * file này chỉ lo lấy dữ liệu, kiểm tra quyền và ghi xuống database.
 */

const ERROR_PATH = "/luyen-tap/reading/ghep-de";

/** Danh sách passage có thể ghép, kèm tình trạng quyền của học viên. */
export async function assemblyCandidates(userId: string): Promise<PassageCandidate[]> {
  const [exercises, access, attempts] = await Promise.all([
    db.exercise.findMany({
      where: {
        skill: "READING",
        readingType: "ACADEMIC",
        taskType: "READING_PASSAGE",
        published: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    getAccessSnapshot(userId, "READING"),
    db.attempt.groupBy({
      by: ["exerciseId"],
      where: { userId, status: "GRADED" },
      _count: { _all: true },
    }),
  ]);

  const attemptCountOf = new Map(attempts.map((a) => [a.exerciseId, a._count._all]));

  return exercises.map((ex) => ({
    exerciseId: ex.id,
    title: ex.title,
    questionCount: countReadingQuestions(ex.content),
    tier: (ex.difficultyTier as PassageCandidate["tier"]) ?? "UNKNOWN",
    accessLevel: ex.accessLevel,
    owned:
      ex.accessLevel !== "RESTRICTED" ||
      access.hasAll ||
      access.exerciseIds.has(ex.id),
    attemptCount: attemptCountOf.get(ex.id) ?? 0,
    achievementEligible: ex.achievementEligible,
    competitionOnly: ex.competitionOnly,
    published: ex.published,
    sortKey: ex.title,
  }));
}

export async function createAssemblyAction(formData: FormData) {
  const user = await requireUser();
  const mode = String(formData.get("mode") ?? "AUTO");
  const selected = formData
    .getAll("exerciseId")
    .map((v) => String(v))
    .filter(Boolean);

  const candidates = await assemblyCandidates(user.id);

  const plan: AssemblyResult =
    mode === "MANUAL"
      ? planManualAssembly(candidates, selected)
      : planAutoAssembly(candidates);

  if (!plan.ok) redirect(`${ERROR_PATH}?loi=${plan.reason}`);

  // CHẶN Ở MÁY CHỦ: phải sở hữu đủ cả ba passage. Kiểm tra lại tại đây chứ
  // không tin vào việc giao diện đã ẩn nút — người dùng gọi thẳng action được.
  if (plan.missingAccess.length > 0 && !isAdminRole(user.role)) {
    redirect(`${ERROR_PATH}?loi=CHUA_MUA_DU`);
  }

  const assembly = await db.readingAssembly.create({
    data: {
      userId: user.id,
      mode: plan.mode,
      countsForAchievements: plan.countsForAchievements,
      totalQuestions: plan.totalQuestions,
      durationMinutes: plan.durationMinutes,
      items: {
        create: plan.parts.map((part, index) => ({
          exerciseId: part.exerciseId,
          orderIndex: index + 1,
        })),
      },
    },
    select: { id: true },
  });

  // Lượt làm bài vẫn gắn với passage ĐẦU TIÊN để không phá vỡ quan hệ dữ liệu
  // sẵn có; nội dung thật lấy từ assembly (xem attempt-content.ts).
  const firstExerciseId = plan.parts[0].exerciseId;
  const previous = await db.attempt.count({
    where: { userId: user.id, exerciseId: firstExerciseId },
  });

  const attempt = await db.attempt.create({
    data: {
      userId: user.id,
      exerciseId: firstExerciseId,
      assemblyId: assembly.id,
      attemptNumber: previous + 1,
      answers: "{}",
      deadlineAt: new Date(Date.now() + FULL_TEST_MINUTES * 60_000),
    },
    select: { id: true },
  });

  redirect(`/lam-bai/${attempt.id}`);
}
