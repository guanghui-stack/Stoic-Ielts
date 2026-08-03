/**
 * Điều kiện danh tính để được dự Nguyệt Thí.
 *
 * Tách khỏi key.ts vì file này thuần và phải kiểm thử được bằng node, còn key.ts
 * đụng tới biến môi trường bí mật.
 *
 * Quyết định phạm vi: Nguyệt Thí chỉ nhận thí sinh từ 16 tuổi. Nhờ vậy hệ thống
 * KHÔNG thu thập dữ liệu sinh trắc học của trẻ em và không cần luồng đồng ý của
 * người đại diện — phần nghĩa vụ nặng nhất theo Luật 91/2025. Nếu sau này hạ độ
 * tuổi, phải làm lại đánh giá tác động xử lý dữ liệu TRƯỚC khi mở đăng ký.
 */

export const MIN_COMPETITION_AGE = 16;

/** Tuổi tròn tại một mốc thời gian, tính theo lịch chứ không chia 365 ngày. */
export function ageAt(birthDate: Date, at: Date): number {
  let age = at.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = at.getUTCMonth() - birthDate.getUTCMonth();
  const dayDiff = at.getUTCDate() - birthDate.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age;
}

export type EligibilityCheck = {
  eligible: boolean;
  age: number;
  missing: string[];
};

/**
 * Xét một hồ sơ đã đủ điều kiện đăng ký chưa.
 *
 * Trả về DANH SÁCH thiếu gì thay vì một chữ "không đủ điều kiện": thí sinh cần
 * biết phải bổ sung gì, và bộ phận hỗ trợ cần trả lời được câu "vì sao em bị từ
 * chối" mà không phải mở database.
 */
export function checkIdentityEligibility(input: {
  birthDate: Date | null;
  at: Date;
  /** Đã xác minh danh tính qua video trước ngày thi chưa. */
  identityVerified: boolean;
  consentTerms: boolean;
  consentMonitoring: boolean;
}): EligibilityCheck {
  const missing: string[] = [];
  const age = input.birthDate ? ageAt(input.birthDate, input.at) : -1;

  if (!input.birthDate) missing.push("Chưa khai ngày sinh");
  else if (age < MIN_COMPETITION_AGE) {
    missing.push(`Nguyệt Thí chỉ dành cho thí sinh từ ${MIN_COMPETITION_AGE} tuổi`);
  }

  if (!input.identityVerified) {
    missing.push("Chưa hoàn tất buổi xác minh danh tính qua video với trung tâm");
  }
  if (!input.consentTerms) missing.push("Chưa đồng ý thể lệ Nguyệt Thí");
  if (!input.consentMonitoring) {
    missing.push("Chưa đồng ý việc ghi nhật ký thao tác trong lúc thi");
  }

  return { eligible: missing.length === 0, age, missing };
}

/**
 * Các loại đồng ý.
 *
 * Tách lớp là bắt buộc: gộp tất cả vào một ô tích thì sự đồng ý không còn là tự
 * nguyện cho từng mục đích. Riêng PUBLICITY (hiện tên trên Bảng Vàng) KHÔNG được
 * gộp vào nhóm bắt buộc — không ai phải đánh đổi quyền riêng tư để được dự thi.
 *
 * PHẠM VI ĐÃ THU HẸP (chốt 2026-08-03): kỳ thi KHÔNG dùng webcam, KHÔNG ghi ảnh
 * màn hình và KHÔNG đối chiếu khuôn mặt tự động. Xác minh danh tính do nhân viên
 * làm trực tiếp qua video và KHÔNG lưu lại ảnh nào. Nhờ vậy hệ thống không xử lý
 * dữ liệu sinh trắc học, và loại đồng ý BIOMETRIC đã được bỏ hẳn.
 *
 * MONITORING nay chỉ còn nghĩa: ghi nhật ký thao tác trong phòng thi (sao chép,
 * chuyển cửa sổ, phím tắt). Không có hình ảnh nào.
 */
export const CONSENT_PURPOSES = {
  TERMS: { required: true, label: "Thể lệ Nguyệt Thí và các hành vi bị cấm" },
  MONITORING: {
    required: true,
    label: "Ghi nhật ký thao tác trong lúc thi (không có hình ảnh)",
  },
  PUBLICITY: { required: false, label: "Hiện tên trên Bảng Vàng khi đoạt giải" },
} as const;

export type ConsentPurpose = keyof typeof CONSENT_PURPOSES;

export function requiredConsents(): ConsentPurpose[] {
  return (Object.keys(CONSENT_PURPOSES) as ConsentPurpose[]).filter(
    (key) => CONSENT_PURPOSES[key].required
  );
}
