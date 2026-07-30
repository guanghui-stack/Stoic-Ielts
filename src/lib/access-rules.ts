/**
 * Quy tắc quyết định quyền làm bài tập — hàm THUẦN, không phụ thuộc database
 * nên kiểm thử được độc lập (scripts/test-access-rules.ts).
 *
 * Đây là logic bảo mật: dùng chung cho cả nơi hiển thị lẫn nơi chặn ở máy chủ,
 * để giao diện và thực tế không bao giờ lệch nhau.
 */

export const ACCESS_LEVELS = ["PUBLIC", "RESTRICTED"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export const ACCESS_LABELS: Record<AccessLevel, string> = {
  PUBLIC: "Ai cũng làm được",
  RESTRICTED: "Cần mở khóa",
};

export function decideExerciseAccess(input: {
  isAdmin: boolean;
  published: boolean;
  accessLevel: string;
  hasGrant: boolean;
}): boolean {
  // Quản trị viên luôn xem/làm được mọi bài, kể cả bài đang ẩn
  if (input.isAdmin) return true;
  // Bài đang ẩn thì học viên không thấy, không làm được
  if (!input.published) return false;
  // Bài công khai: ai đăng nhập cũng làm được
  if (input.accessLevel !== "RESTRICTED") return true;
  // Bài cần mở khóa: chỉ khi quản trị viên đã cấp quyền cho học viên này
  return input.hasGrant;
}
