import "server-only";
import { db } from "@/lib/db";
import { decideExerciseAccess } from "@/lib/access-rules";
import { hasActiveAccess, getAccessSnapshot } from "@/lib/access-grants";

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
 * Lưới an toàn cho ĐÚNG MỘT lần triển khai.
 *
 * Quyền cũ nằm ở bảng ExerciseAccess đã được chuyển sang AccessGrant lúc máy
 * chủ khởi động. Nhưng nếu bước chuyển đó lỗi, học viên đang có quyền sẽ mất
 * quyền giữa chừng — nên khi truy vấn sổ cái mới NÉM LỖI (thường là bảng chưa
 * kịp tạo), ta đọc tạm bảng cũ.
 *
 * Chỉ dự phòng khi có LỖI, không dự phòng khi sổ cái trả lời "không có quyền":
 * nếu không, quản trị viên thu hồi quyền xong thì dòng dữ liệu cũ sẽ hồi sinh
 * quyền đó. Xóa hàm này sau khi production chạy ổn định một thời gian.
 */
async function legacyGrantFallback(
  userId: string,
  exerciseId: string,
  error: unknown
): Promise<boolean> {
  console.error(
    "[wobridges] Không đọc được AccessGrant, tạm dùng bảng quyền cũ:",
    error
  );
  const legacy = await db.exerciseAccess.findUnique({
    where: { userId_exerciseId: { userId, exerciseId } },
    select: { id: true },
  });
  return Boolean(legacy);
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

  let hasGrant = false;
  if (needsGrant) {
    try {
      hasGrant = await hasActiveAccess({
        userId: user.id,
        feature: "READING",
        exerciseId: exercise.id,
      });
    } catch (error) {
      hasGrant = await legacyGrantFallback(user.id, exercise.id, error);
    }
  }

  return decideExerciseAccess({
    isAdmin,
    published: exercise.published,
    accessLevel: exercise.accessLevel,
    hasGrant,
  });
}

export type ReadingAccess = {
  /** Đang có gói phủ mọi bài Reading. */
  hasAll: boolean;
  /** Các bài Reading đã mở lẻ. */
  exerciseIds: Set<string>;
  /** Ngày hết hạn gói, null nếu không có gói hoặc gói vĩnh viễn. */
  allExpiresAt: Date | null;
};

/**
 * Quyền Reading của một học viên trong một lần truy vấn — dùng khi cần dựng
 * cả danh sách bài, thay vì hỏi database cho từng bài một.
 */
export async function readingAccessOf(userId: string): Promise<ReadingAccess> {
  try {
    return await getAccessSnapshot(userId, "READING");
  } catch (error) {
    console.error(
      "[wobridges] Không đọc được AccessGrant, tạm dùng bảng quyền cũ:",
      error
    );
    const rows = await db.exerciseAccess.findMany({
      where: { userId },
      select: { exerciseId: true },
    });
    return {
      hasAll: false,
      exerciseIds: new Set(rows.map((r) => r.exerciseId)),
      allExpiresAt: null,
    };
  }
}
