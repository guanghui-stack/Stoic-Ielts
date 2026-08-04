/**
 * Lục tướng — sáu hình tượng dẫn dắt toàn bộ cốt truyện.
 *
 * Người học KHÔNG nhập vai bất kỳ danh tướng nào. Họ là một người vô danh
 * bước vào thời loạn, được sáu hình tượng dẫn qua sáu bài học khác nhau.
 * Các điển tích chỉ là ẩn dụ cho kỹ năng đọc, không phải trò tái hiện chiến
 * tranh hay tiểu sử lịch sử.
 *
 * Ba điều sáu nhân vật này KHÔNG làm:
 *  - không trao điểm thưởng hay lợi thế nào,
 *  - không tạo phe phái để người học chọn,
 *  - không thay đổi ngưỡng chấm điểm của bất kỳ bài nào.
 *
 * Họ chỉ làm một việc: đặt tên cho một năng lực học tập và cảnh báo đúng cái
 * bẫy đi kèm năng lực đó. Mỗi nhân vật vì vậy luôn có cả `strength` lẫn
 * `weakness` — kể một nửa là kể sai.
 *
 * Phạm vi phiên bản 1 đóng ở đúng sáu người. Không thêm Lưu Bị, Tào Tháo,
 * Gia Cát Lượng hay bất kỳ nhân vật trung tâm nào khác nếu chưa có quyết
 * định mới của chủ dự án.
 *
 * Quy tắc chữ: mọi danh xưng viết bằng chữ cái Latin có dấu tiếng Việt.
 * Tuyệt đối không có ký tự chữ Hán — kể cả trong chú thích. Script
 * `npm run test:no-han` sẽ chặn nếu ai đó thêm vào.
 */

export type GeneralCode =
  | "TRUONG_PHI"
  | "QUAN_VU"
  | "TRIEU_VAN"
  | "HOANG_TRUNG"
  | "MA_SIEU"
  | "LU_BO";

/** Vai trò cốt truyện — dùng để chọn giọng kể, không dùng để tính toán gì. */
export type GeneralRole =
  | "KHOI_TRAN"
  | "CHINH_DAO"
  | "TINH_TAM"
  | "BEN_BI"
  | "BIEN_HOA"
  | "DOI_THU_PHAN_CHIEU";

/**
 * Màu accent. Mỗi nhân vật giữ đúng một màu, và một màn hình chỉ được dùng
 * accent của nhân vật đang làm chủ thể. Đây là ràng buộc thiết kế cứng: ảnh
 * thủy mặc mà có hai màu phép thuật trở lên là ảnh bị loại.
 */
export type GeneralAccent =
  | "VERMILION"
  | "JADE"
  | "BLUE"
  | "GOLD"
  | "SILVER_BLUE"
  | "FIRE";

export type General = {
  code: GeneralCode;
  /** Danh xưng Hán-Việt bằng chữ cái Latin. */
  name: string;
  role: GeneralRole;
  /** Nhãn tiếng Việt của vai trò, dùng trực tiếp trên giao diện. */
  roleLabel: string;
  accent: GeneralAccent;
  /** Tên màu tiếng Việt, dùng trong tài liệu và trang preview asset. */
  accentLabel: string;
  /** Lớp Tailwind cho chữ — đã chọn biến thể đạt tương phản AA trên nền kem. */
  accentTextClass: string;
  /** Lớp Tailwind cho viền và mảng đồ họa. */
  accentBorderClass: string;
  /** Năng lực học tập nhân vật đại diện. */
  strength: string;
  /** Cái bẫy đi kèm chính năng lực đó. Luôn phải kể cùng strength. */
  weakness: string;
  /** Khóa ảnh chân dung trong art manifest. */
  portraitArtKey: string;
};

export const STORY_GENERALS: Record<GeneralCode, General> = {
  TRUONG_PHI: {
    code: "TRUONG_PHI",
    name: "Trương Phi",
    role: "KHOI_TRAN",
    roleLabel: "Người mở trận",
    accent: "VERMILION",
    accentLabel: "Chu sa",
    accentTextClass: "text-vermilion-ink",
    accentBorderClass: "border-vermilion",
    strength: "Dám bắt đầu, quyết đoán, quản lý được áp lực thời gian.",
    weakness: "Vội vàng, đọc lướt, trả lời theo xung động.",
    portraitArtKey: "generalTruongPhi",
  },
  QUAN_VU: {
    code: "QUAN_VU",
    name: "Quan Vũ",
    role: "CHINH_DAO",
    roleLabel: "Người giữ chính đạo",
    accent: "JADE",
    accentLabel: "Lục ngọc",
    accentTextClass: "text-jade-ink",
    accentBorderClass: "border-jade",
    strength: "Bám bằng chứng, nhất quán, liêm chính trong thi cử.",
    weakness: "Bảo thủ, quá tin vào từ khóa nằm trên bề mặt.",
    portraitArtKey: "generalQuanVu",
  },
  TRIEU_VAN: {
    code: "TRIEU_VAN",
    name: "Triệu Vân",
    role: "TINH_TAM",
    roleLabel: "Người giữ bình tĩnh giữa trận",
    accent: "BLUE",
    accentLabel: "Lam điện",
    accentTextClass: "text-azure-ink",
    accentBorderClass: "border-azure",
    strength: "Độ chính xác dưới áp lực, làm trọn Full Test, cứu phần yếu.",
    weakness: "Quá thận trọng, tiêu tốn quá nhiều thời gian ở một câu.",
    portraitArtKey: "generalTrieuVan",
  },
  HOANG_TRUNG: {
    code: "HOANG_TRUNG",
    name: "Hoàng Trung",
    role: "BEN_BI",
    roleLabel: "Người chứng minh sức bền",
    accent: "GOLD",
    accentLabel: "Kim đồng",
    accentTextClass: "text-gold-ink",
    accentBorderClass: "border-gold",
    strength: "Luyện tập dài hạn, phục bàn sâu, tiến bộ muộn nhưng chắc.",
    weakness: "Nản vì tiến bộ chậm, hoặc vì nghĩ mình bắt đầu đã quá muộn.",
    portraitArtKey: "generalHoangTrung",
  },
  MA_SIEU: {
    code: "MA_SIEU",
    name: "Mã Siêu",
    role: "BIEN_HOA",
    roleLabel: "Người phá thế bằng biến hóa",
    accent: "SILVER_BLUE",
    accentLabel: "Bạc lam",
    accentTextClass: "text-silver-blue-ink",
    accentBorderClass: "border-silver-blue",
    strength: "Thích nghi dạng câu, chuyển chiến thuật, giữ được nhịp độ.",
    weakness: "Ham tốc độ, đổi chiến thuật quá sớm khi chưa đủ dữ kiện.",
    portraitArtKey: "generalMaSieu",
  },
  LU_BO: {
    code: "LU_BO",
    name: "Lữ Bố",
    role: "DOI_THU_PHAN_CHIEU",
    roleLabel: "Đối thủ phản chiếu thiên phú",
    accent: "FIRE",
    accentLabel: "Hỏa cam",
    accentTextClass: "text-fire-ink",
    accentBorderClass: "border-fire",
    strength: "Bài kiểm tra cuối về năng lực tổng hợp và bản lĩnh.",
    weakness: "Chạy theo điểm số; thiên phú không đi cùng kỷ luật và liêm chính.",
    portraitArtKey: "generalLuBo",
  },
};

/**
 * Thứ tự xuất hiện chuẩn. Nguyệt Thí xoay vòng theo đúng danh sách này rồi
 * lặp lại, nên thứ tự ở đây là dữ liệu chứ không phải trang trí.
 */
export const GENERAL_ORDER: GeneralCode[] = [
  "TRUONG_PHI",
  "QUAN_VU",
  "TRIEU_VAN",
  "HOANG_TRUNG",
  "MA_SIEU",
  "LU_BO",
];

export function generalByCode(code: GeneralCode): General {
  return STORY_GENERALS[code];
}

/**
 * Chọn nhân vật cho một kỳ Nguyệt Thí theo vòng xoay cố định.
 *
 * Nhận số thứ tự kỳ thi (0, 1, 2, ...) và trả về nhân vật tương ứng. Dùng
 * phép chia lấy dư nên vòng lặp tự đóng, không cần bảng cấu hình riêng.
 */
export function featuredGeneralForSeason(seasonIndex: number): General {
  const size = GENERAL_ORDER.length;
  // Số âm vẫn phải rơi vào đúng vòng: -1 nghĩa là kỳ ngay trước kỳ số 0.
  const index = ((seasonIndex % size) + size) % size;
  return STORY_GENERALS[GENERAL_ORDER[index]];
}
