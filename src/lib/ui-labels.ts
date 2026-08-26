/**
 * Nhãn kép STOIC · IELTS cho toàn site.
 *
 * URL, mã dữ liệu và hành vi giữ nguyên. Lớp này chỉ đổi cách gọi ở giao diện.
 * Tên chủ đề luôn đi cùng mô tả chức năng để người mới không phải đoán.
 */

export type UiLabel = {
  /** Đường dẫn hiện hữu — không đổi. */
  href: string;
  /** Tên Stoic hiển thị. */
  themed: string;
  /** Mô tả chức năng bắt buộc đi kèm. */
  functional: string;
};

export const UI_LABELS = {
  home: { href: "/", themed: "Điểm Khởi Tâm", functional: "Trang chủ STOIC · IELTS" },
  student: {
    href: "/hoc-vien",
    themed: "Nội Tâm",
    functional: "Hồ sơ và tổng quan học tập",
  },
  readingAcademic: {
    href: "/luyen-tap/reading",
    themed: "Thực Hành",
    functional: "Kho đề Reading Academic",
  },
  readingGeneral: {
    href: "/luyen-tap/reading/general",
    themed: "Thực Hành",
    functional: "Kho đề Reading General",
  },
  readingAssembly: {
    href: "/luyen-tap/reading/ghep-de",
    themed: "Bài Thi Đầy Đủ",
    functional: "Ghép Full Test 60 phút",
  },
  // Hai nhãn dưới thuộc route kết quả/chữa bài được khóa bằng checksum. Giữ
  // nguyên để shared label không làm thay đổi bề mặt protected.
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
    themed: "Dấu Mốc",
    functional: "Thành quả đã đạt và tiến độ",
  },
  campaign: {
    href: "/hoc-vien/chien-dich",
    themed: "Hành Trình",
    functional: "Bản đồ chặng rèn luyện và thử thách",
  },
  weakness: {
    href: "/hoc-vien/so-so-ho",
    themed: "Điểm Cần Rèn",
    functional: "Dạng câu yếu và lỗi lặp lại",
  },
  studyDays: {
    href: "/hoc-vien/nhat-khoa",
    themed: "Kỷ Luật Ngày",
    functional: "Ngày học thật và nhịp học",
  },
  payments: {
    href: "/thanh-toan",
    themed: "Học Liệu",
    functional: "Bảng giá và mở khóa nội dung",
  },
  monthly: {
    href: "/nguyet-thi",
    themed: "Thử Thách Tháng",
    functional: "Cuộc thi Reading hằng tháng",
  },
  quarterly: {
    href: "/duong-thi",
    themed: "Thử Thách Quý",
    functional: "Cuộc thi Reading hằng quý dành cho người được chọn từ vòng tháng",
  },
  annual: {
    href: "/thien-thi",
    themed: "Thử Thách Năm",
    functional: "Cuộc thi Reading hằng năm dành cho người được chọn từ vòng quý",
  },
  results: {
    href: "/bang-vang",
    themed: "Thành Quả",
    functional: "Kết quả kỳ thi đã chốt",
  },
  myData: {
    href: "/hoc-vien/du-lieu-cua-toi",
    themed: "Hồ Sơ Riêng",
    functional: "Dữ liệu cá nhân và quyền của bạn",
  },
  hallOfFame: {
    href: "/dien-danh-vong",
    themed: "Dấu Mốc Cộng Đồng",
    functional: "Hồ sơ công khai và thành tích",
  },
} as const satisfies Record<string, UiLabel>;

export type UiLabelKey = keyof typeof UI_LABELS;

export function dualLabel(key: UiLabelKey): string {
  const label = UI_LABELS[key];
  return `${label.themed} — ${label.functional}`;
}

export const PILLAR_LABELS = {
  BATTLE: { themed: "Nhận thức", functional: "Nhìn đúng dữ kiện" },
  REVIEW: { themed: "Hành động", functional: "Chữa lỗi bằng bằng chứng" },
  DRILL: { themed: "Ý chí", functional: "Giữ ngày học thật" },
} as const;
