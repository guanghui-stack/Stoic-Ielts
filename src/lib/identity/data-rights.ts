/**
 * Quyền dữ liệu của thí sinh — hàm thuần, không chạm database.
 *
 * Bảng kê ở đây phải LUÔN khớp với `DU-THAO-PHAP-LY-NGUYET-THI.md` mục 2.
 * Hai bên lệch nhau nghĩa là thông báo xử lý dữ liệu nói một đằng, hệ thống
 * làm một nẻo — đúng thứ mà một bản thông báo tồi hay mắc, vì người soạn mô
 * tả theo ý định chứ không theo hệ thống thật.
 *
 * Quyết định của chủ dự án ngày 06/08/2026, ghi lại ở đây để mã nguồn và tài
 * liệu không trôi khỏi nhau:
 *
 *  - Người 16–17 tuổi TỰ đồng ý được, không cần người đại diện.
 *  - `identityKey` giữ 24 tháng rồi xoá, không phải vô thời hạn.
 *  - Rút đồng ý KHÔNG buộc xoá nhật ký của một hồ sơ đang bị rà soát.
 *  - Máy chủ đặt tại Việt Nam, không phát sinh chuyển dữ liệu xuyên biên giới.
 */

/** Nhóm dữ liệu, đúng theo mục 2 của dự thảo pháp lý. */
export type DataCategory = {
  code: string;
  label: string;
  /** Dạng lưu: rõ, băm, hay không hoàn nguyên được. */
  storage: "PLAIN" | "HASHED" | "IRREVERSIBLE";
  purpose: string;
  retention: string;
  /** Rút đồng ý có xoá được nhóm này không. */
  erasableOnWithdrawal: boolean;
};

export const RETENTION_IDENTITY_KEY_MONTHS = 24;
const AFTER_FINALIZE_DAYS = 30;

export const DATA_CATEGORIES: DataCategory[] = [
  {
    code: "IDENTITY_KEY",
    label: "Số giấy tờ tùy thân",
    storage: "IRREVERSIBLE",
    purpose: "Chặn một người tạo nhiều tài khoản để dự thi lại",
    retention: `${RETENTION_IDENTITY_KEY_MONTHS} tháng`,
    // Đây là thứ duy nhất giữ lại sau khi xoá mọi thứ khác. Xoá ngay khi rút
    // đồng ý sẽ mở đúng lỗ hổng mà nó sinh ra để bịt.
    erasableOnWithdrawal: false,
  },
  {
    code: "DOCUMENT_LAST4",
    label: "Bốn số cuối giấy tờ",
    storage: "PLAIN",
    purpose: "Nhân viên đối chiếu bằng mắt khi gọi video xác minh",
    retention: `${AFTER_FINALIZE_DAYS} ngày sau khi chốt giải`,
    erasableOnWithdrawal: true,
  },
  {
    code: "FULL_NAME",
    label: "Họ tên",
    storage: "PLAIN",
    purpose: "Đối chiếu với giấy tờ tùy thân",
    retention: `${AFTER_FINALIZE_DAYS} ngày sau khi chốt giải`,
    erasableOnWithdrawal: true,
  },
  {
    code: "BIRTH_DATE",
    label: "Ngày sinh",
    storage: "PLAIN",
    purpose: "Kiểm tra đủ tuổi dự thi",
    retention: `${AFTER_FINALIZE_DAYS} ngày sau khi chốt giải`,
    erasableOnWithdrawal: true,
  },
  {
    code: "EXAM_EVENTS",
    label: "Nhật ký thao tác trong phòng thi",
    storage: "PLAIN",
    purpose: "Bảo đảm công bằng giữa các thí sinh",
    retention: `${AFTER_FINALIZE_DAYS} ngày`,
    // Nhật ký là bằng chứng của một quy trình có thể bị khiếu nại. Cho xoá
    // theo yêu cầu nghĩa là ai sắp bị loại cũng xoá được bằng chứng.
    erasableOnWithdrawal: false,
  },
  {
    code: "DEVICE_FINGERPRINT",
    label: "Vân tay thiết bị, địa chỉ IP, thông tin trình duyệt",
    storage: "HASHED",
    purpose: "Phát hiện nhiều tài khoản dùng chung một máy",
    retention: `${AFTER_FINALIZE_DAYS} ngày`,
    erasableOnWithdrawal: false,
  },
  {
    code: "ATTEMPT_ANSWERS",
    label: "Đáp án và thời điểm trả lời",
    storage: "PLAIN",
    purpose: "Chấm bài và dựng hồ sơ học tập",
    retention: "Theo hồ sơ học tập",
    erasableOnWithdrawal: true,
  },
];

/**
 * Hệ thống KHÔNG thu thập những thứ này. Liệt kê tường minh vì bản chính sách
 * cũ từng mô tả chúng, và người đọc bản mới có quyền biết chúng đã bị bỏ.
 */
export const NOT_COLLECTED = [
  "Ảnh chụp từ webcam",
  "Ảnh màn hình trong lúc thi",
  "Bản ghi hình hoặc ghi âm phòng thi",
  "Ảnh giấy tờ tùy thân",
  "Dữ liệu sinh trắc khuôn mặt",
];

export type WithdrawalPlan = {
  /** Nhóm sẽ được xoá khi trung tâm xử lý yêu cầu. */
  erasable: DataCategory[];
  /** Nhóm được giữ lại, kèm lý do nói thẳng cho thí sinh. */
  retained: Array<{ category: DataCategory; reason: string }>;
  /** Có hồ sơ đang bị rà soát không — ảnh hưởng tới thời điểm xử lý. */
  underReview: boolean;
};

/**
 * Rút đồng ý sẽ xoá gì và giữ gì.
 *
 * Chủ dự án đã chốt: hồ sơ đang bị rà soát KHÔNG bị buộc xoá nhật ký. Nếu
 * ngược lại thì bất kỳ ai sắp bị loại cũng chỉ cần rút đồng ý là xoá sạch
 * bằng chứng, và toàn bộ quy trình liêm chính thành vô nghĩa.
 */
export function planWithdrawal(underReview: boolean): WithdrawalPlan {
  const erasable: DataCategory[] = [];
  const retained: WithdrawalPlan["retained"] = [];

  for (const category of DATA_CATEGORIES) {
    if (category.erasableOnWithdrawal && !underReview) {
      erasable.push(category);
      continue;
    }

    let reason: string;
    if (category.code === "IDENTITY_KEY") {
      reason = `Giữ ${RETENTION_IDENTITY_KEY_MONTHS} tháng để chặn việc tạo tài khoản mới dự thi lại. Đây là chuỗi băm, không hoàn nguyên ra số giấy tờ được.`;
    } else if (underReview && category.erasableOnWithdrawal) {
      reason =
        "Hồ sơ của bạn đang trong diện rà soát. Dữ liệu được giữ tới khi rà soát khép lại, để việc khiếu nại còn căn cứ.";
    } else {
      reason =
        "Là bằng chứng của một quy trình có thể bị khiếu nại. Xoá theo yêu cầu sẽ khiến người sắp bị loại xoá được chính bằng chứng chống lại mình.";
    }
    retained.push({ category, reason });
  }

  return { erasable, retained, underReview };
}

/** Thời điểm `identityKey` hết hạn lưu, tính từ lần xác minh gần nhất. */
export function identityKeyExpiresAt(verifiedAt: Date): Date {
  const expires = new Date(verifiedAt);
  expires.setMonth(expires.getMonth() + RETENTION_IDENTITY_KEY_MONTHS);
  return expires;
}

export function isIdentityKeyExpired(verifiedAt: Date, now: Date): boolean {
  return identityKeyExpiresAt(verifiedAt).getTime() <= now.getTime();
}
