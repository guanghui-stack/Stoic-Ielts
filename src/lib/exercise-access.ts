import "server-only";
import { db } from "@/lib/db";
import { decideExerciseAccess } from "@/lib/access-rules";

export {
  ACCESS_LEVELS,
  ACCESS_LABELS,
  type AccessLevel,
} from "@/lib/access-rules";

/** Quản trị viên luôn xem/làm được mọi bài. */
export function isAdminRole(role: string) {
  return role === "ADMIN";
}

/**
 * Kiểm tra một học viên có được phép làm bài tập này không.
 * Dùng ở CẢ nơi hiển thị lẫn nơi bắt đầu làm bài (chặn gọi thẳng URL).
 */
export async function canAccessExercise(
  user: { id: string; role: string },
  exercise: { id: string; accessLevel: string; published: boolean }
): Promise<boolean> {
  const isAdmin = isAdminRole(user.role);
  // Chỉ truy vấn database khi thực sự cần (bài RESTRICTED, người dùng thường)
  const needsGrant =
    !isAdmin && exercise.published && exercise.accessLevel === "RESTRICTED";
  const hasGrant = needsGrant
    ? Boolean(
        await db.exerciseAccess.findUnique({
          where: {
            userId_exerciseId: { userId: user.id, exerciseId: exercise.id },
          },
          select: { id: true },
        })
      )
    : false;

  return decideExerciseAccess({
    isAdmin,
    published: exercise.published,
    accessLevel: exercise.accessLevel,
    hasGrant,
  });
}

/** Tập id bài tập RESTRICTED mà học viên đã được mở khóa. */
export async function grantedExerciseIds(userId: string): Promise<Set<string>> {
  const rows = await db.exerciseAccess.findMany({
    where: { userId },
    select: { exerciseId: true },
  });
  return new Set(rows.map((r) => r.exerciseId));
}
