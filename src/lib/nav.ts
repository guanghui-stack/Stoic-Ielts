/**
 * Điều hướng chung của cả site.
 *
 * Gom về một chỗ để nav trên đầu trang, footer và các trang nội dung không bao
 * giờ nói khác nhau về cùng một đường dẫn.
 */

export const MAIN_NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/nguyet-thi", label: "Nguyệt Thí" },
  { href: "/nghi-su-duong", label: "Nghị Sự Đường" },
  { href: "/dien-danh-vong", label: "Điện Danh Vọng" },
  { href: "/bang-bo-cao", label: "Bảng Bố Cáo" },
  { href: "/bang-vang", label: "Bảng Vàng" },
] as const;

/**
 * Hai tầng trên của đại thí. Tách khỏi `MAIN_NAV` vì chỉ hiện khi cờ
 * `ENABLE_COMPETITION_TIERS` bật.
 */
export const TIER_NAV = [
  { href: "/duong-thi", label: "Dương Thí" },
  { href: "/thien-thi", label: "Thiên Thí" },
] as const;

/**
 * Menu chính, có kèm hai tầng trên hay không.
 *
 * Vì sao cần hàm này: `/duong-thi` và `/thien-thi` đã có trang, có nhãn trong
 * `ui-labels.ts` và có khu quản trị tuyển chọn — nhưng KHÔNG có liên kết nào
 * dẫn tới. Học viên không có cách nào biết chúng tồn tại ngoài việc tự gõ URL.
 *
 * Chèn ngay sau Nguyệt Thí để menu đọc theo đúng thứ tự leo thang: tháng → quý
 * → năm, rồi mới tới các trang tra cứu.
 */
export function mainNavItems(
  showTiers: boolean
): ReadonlyArray<{ href: string; label: string }> {
  if (!showTiers) return MAIN_NAV;

  const items: Array<{ href: string; label: string }> = [];
  for (const item of MAIN_NAV) {
    items.push(item);
    if (item.href === "/nguyet-thi") items.push(...TIER_NAV);
  }
  return items;
}

/**
 * Hai kho đề Reading.
 *
 * Academic và General là hai kỳ thi khác nhau: luyện nhầm dạng nghĩa là đang
 * giỏi lên ở một kỳ thi mình không dự. Vì vậy chúng tách nhau từ đường dẫn,
 * danh sách đề cho tới việc ghép đề Full Test.
 */
export const READING_NAV = [
  {
    href: "/luyen-tap/reading",
    label: "Academic",
    module: "ACADEMIC",
    blurb:
      "Passage học thuật lấy từ báo khoa học, tạp chí chuyên ngành và sách nghiên cứu. Dạng đề dành cho người nộp hồ sơ du học hoặc xin việc chuyên môn.",
  },
  {
    href: "/luyen-tap/reading/general",
    label: "General",
    module: "GENERAL",
    blurb:
      "Văn bản đời sống: thông báo, quảng cáo, sổ tay nhân viên và bài báo phổ thông. Dạng đề dành cho người đi định cư hoặc làm việc phổ thông.",
  },
] as const;

export type ReadingModule = (typeof READING_NAV)[number]["module"];

export const MODULE_LABELS: Record<string, string> = {
  ACADEMIC: "Academic",
  GENERAL: "General",
};
