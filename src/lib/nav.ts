/**
 * Điều hướng chung của cả site.
 *
 * Gom về một chỗ để nav trên đầu trang, footer và các trang nội dung không bao
 * giờ nói khác nhau về cùng một đường dẫn.
 */

export type NavLink = { href: string; label: string };

/**
 * Một mục trên thanh menu chính. Có `children` thì mục đó là một nhóm: nó vẫn
 * dẫn tới `href` khi bấm, nhưng rê chuột (hoặc tab vào) thì mở danh sách con.
 */
export type NavItem = NavLink & { children?: readonly NavLink[] };

/**
 * Ba tầng thử thách, gom dưới MỘT mục menu.
 *
 * Trước đây ba tầng nằm dàn ngang thành ba mục riêng, chiếm gần nửa thanh menu
 * cho cùng một loại việc. Gom lại để thanh menu nói đúng số nhóm việc mà học
 * viên phải chọn giữa, chứ không nói số trang mà hệ thống có.
 */
export const TIER_NAV = [
  { href: "/nguyet-thi", label: "Thử thách tháng" },
  { href: "/duong-thi", label: "Thử thách quý" },
  { href: "/thien-thi", label: "Thử thách năm" },
] as const satisfies readonly NavLink[];

/**
 * Thanh menu chính.
 *
 * `Đấu trường` nằm sau lớp đăng nhập (`/hoc-vien/dau-truong`). Vẫn để trên menu
 * công khai vì khách không có cách nào khác biết nó tồn tại; khách bấm vào thì
 * `requireUser()` đưa sang trang đăng nhập.
 */
export const MAIN_NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/nguyet-thi", label: "Thử thách", children: TIER_NAV },
  { href: "/hoc-vien/dau-truong", label: "Đấu trường" },
  { href: "/nghi-su-duong", label: "Diễn đàn" },
  { href: "/dien-danh-vong", label: "Dấu mốc cộng đồng" },
  { href: "/bang-bo-cao", label: "Thông báo" },
  { href: "/bang-vang", label: "Thành quả" },
  { href: "/huong-dan", label: "Hướng dẫn" },
] satisfies readonly NavItem[] as readonly NavItem[];

/**
 * Menu chính, có kèm hai tầng quý/năm hay không.
 *
 * Cờ `ENABLE_COMPETITION_TIERS` còn tắt thì `/duong-thi` và `/thien-thi` chưa
 * mở, nên nhóm "Thử thách" rút lại thành một liên kết thẳng tới thử thách
 * tháng — không có menu con chỉ chứa đúng một mục.
 */
export function mainNavItems(showTiers: boolean): readonly NavItem[] {
  if (showTiers) return MAIN_NAV;
  return MAIN_NAV.map((item) =>
    item.children
      ? { href: TIER_NAV[0].href, label: TIER_NAV[0].label }
      : { href: item.href, label: item.label },
  );
}

/**
 * Danh sách phẳng cho footer: footer không có chỗ rê chuột nên mọi đích đến
 * phải tự nằm trên một dòng riêng.
 */
export function footerNavItems(showTiers: boolean): readonly NavLink[] {
  const links: NavLink[] = [];
  for (const item of mainNavItems(showTiers)) {
    if (item.href === "/") continue;
    if (item.children) links.push(...item.children);
    else links.push({ href: item.href, label: item.label });
  }
  return links;
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
