/**
 * Nhãn kép Tam Quốc cho toàn site.
 *
 * Quy tắc gốc: tên cổ phong giúp GHI NHỚ, nó không được phép làm người mới
 * LẠC ĐƯỜNG. Nên mọi màn hình trọng yếu hiển thị hai lớp — tên chủ đề ở
 * trên, mô tả chức năng ngay bên dưới. Lần đầu xuất hiện trong một trang
 * phải đọc được thành "Phục Bàn — Chữa bài Feynman", không bao giờ chỉ có
 * "Phục Bàn" đứng trơ một mình.
 *
 * Ba chỗ TUYỆT ĐỐI không được dùng từ cổ phong đơn độc, vì hiểu nhầm ở đây
 * gây thiệt hại thật chứ không chỉ khó chịu:
 *  - nút giao dịch và mọi thứ liên quan tới tiền,
 *  - thông báo lỗi hệ thống,
 *  - văn bản chính sách và pháp lý.
 *
 * URL giữ nguyên. Đổi tên là việc của lớp giao diện; đổi route sẽ phá liên
 * kết đã chia sẻ, dữ liệu lịch sử, SEO và Server Actions đang chạy.
 */

export type UiLabel = {
  /** Đường dẫn hiện hữu — không đổi. */
  href: string;
  /** Tên Tam Quốc hiển thị. */
  themed: string;
  /** Mô tả chức năng bắt buộc đi kèm. */
  functional: string;
};

export const UI_LABELS = {
  home: { href: "/", themed: "Cổng Doanh", functional: "Trang chủ HỔ PHÙ · IELTS" },
  student: {
    href: "/hoc-vien",
    themed: "Trung Quân Trướng",
    functional: "Hồ sơ và tổng quan học tập",
  },
  readingAcademic: {
    href: "/luyen-tap/reading",
    themed: "Chiến Trận",
    functional: "Kho đề Reading Academic",
  },
  readingGeneral: {
    href: "/luyen-tap/reading/general",
    themed: "Chiến Trận",
    functional: "Kho đề Reading General",
  },
  readingAssembly: {
    href: "/luyen-tap/reading/ghep-de",
    themed: "Đại Chiến",
    functional: "Ghép Full Test 60 phút",
  },
  attempt: {
    href: "/hoc-vien/bai-lam",
    themed: "Chiến Ký",
    functional: "Kết quả và lịch sử bài làm",
  },
  feynman: {
    href: "/hoc-vien/bai-lam",
    themed: "Phục Bàn",
    functional: "Chữa bài sâu theo phương pháp Feynman",
  },
  titles: {
    href: "/hoc-vien/danh-hieu",
    themed: "Chiến Công",
    functional: "Danh hiệu đã đạt và tiến độ",
  },
  campaign: {
    href: "/hoc-vien/chien-dich",
    themed: "Chiến Dịch",
    functional: "Bản đồ cấp bậc và thí luyện",
  },
  weakness: {
    href: "/hoc-vien/so-so-ho",
    themed: "Sổ Sơ Hở",
    functional: "Dạng câu yếu và lỗi lặp lại",
  },
  studyDays: {
    href: "/hoc-vien/nhat-khoa",
    themed: "Nhật Khóa",
    functional: "Ngày học thật và kỷ luật",
  },
  payments: {
    href: "/thanh-toan",
    themed: "Quân Nhu",
    functional: "Bảng giá và mở khóa học liệu",
  },
  monthly: {
    href: "/nguyet-thi",
    themed: "Nguyệt Thí",
    functional: "Cuộc thi Reading hằng tháng",
  },
  quarterly: {
    href: "/duong-thi",
    themed: "Dương Thí",
    functional: "Cuộc thi Reading hằng quý dành cho người được chọn từ Nguyệt Thí",
  },
  annual: {
    href: "/thien-thi",
    themed: "Thiên Thí",
    functional: "Cuộc thi Reading hằng năm dành cho người được chọn từ Dương Thí",
  },
  results: {
    href: "/bang-vang",
    themed: "Bảng Vàng",
    functional: "Kết quả kỳ thi đã chốt",
  },
  myData: {
    href: "/hoc-vien/du-lieu-cua-toi",
    themed: "Hồ Sơ Riêng",
    functional: "Dữ liệu cá nhân và quyền của bạn",
  },
  hallOfFame: {
    href: "/dien-danh-vong",
    themed: "Điện Danh Vọng",
    functional: "Danh hiệu và người công khai thành tích",
  },
} as const satisfies Record<string, UiLabel>;

export type UiLabelKey = keyof typeof UI_LABELS;

/**
 * Dạng một dòng cho tiêu đề trang: "Chiến Dịch — Bản đồ cấp bậc và thí luyện".
 *
 * Dùng gạch ngang dài chứ không phải gạch nối: đây là hai mệnh đề ngang
 * hàng, không phải một từ ghép.
 */
export function dualLabel(key: UiLabelKey): string {
  const label = UI_LABELS[key];
  return `${label.themed} — ${label.functional}`;
}

/**
 * Ba trụ — dùng chung cho dashboard, trang chủ và bản đồ chiến dịch để
 * không nơi nào gọi khác tên cùng một hoạt động.
 */
export const PILLAR_LABELS = {
  BATTLE: { themed: "Chiến trận", functional: "Làm đề Reading" },
  REVIEW: { themed: "Phục bàn", functional: "Chữa bài Feynman" },
  DRILL: { themed: "Luyện binh", functional: "Ngày học thật" },
} as const;
