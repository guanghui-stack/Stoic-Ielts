import { normalizePathname } from "../motion/route-policy.ts";

export const STUDENT_SHORTCUTS = [
  { href: "/hoc-vien/tin-nhan", title: "Tin nhắn", icon: "messages" },
  { href: "/hoc-vien", title: "Cá nhân", icon: "profile" },
  { href: "/nghi-su-duong", title: "Diễn đàn", icon: "forum" },
  { href: "/hoc-vien/dau-truong", title: "Đấu trường", icon: "arena" },
] as const;

export const INBOX_UPDATED_EVENT = "stoic:inbox-updated";

/**
 * Những nơi thanh lối tắt phải biến mất: đang thi, đang trả tiền, đang xác thực.
 *
 * `/hoc-vien/bai-lam` CỐ Ý không nằm ở đây dù nó cũng là bề mặt tĩnh. Đó là
 * trang xem lại bài — chính là lúc học viên cần tra từ nhất, và tra từ là một
 * mục trên thanh này. Ranh giới phòng thi không bị nới ra vì việc đó: `/lam-bai`
 * vẫn bị chặn, và route tra từ còn từ chối ở tầng máy chủ khi tài khoản còn một
 * lượt làm bài chưa nộp.
 */
const FOCUSED_ROUTES = [
  "/lam-bai", "/hoc-vien/thi-but", "/hoc-vien/thi-luyen",
  "/quan-tri", "/thanh-toan", "/dang-nhap", "/dang-ky", "/doi-mat-khau", "/xem-thu-cbt",
];

function atOrBelow(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function showStudentQuickAccess(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return !FOCUSED_ROUTES.some((prefix) => atOrBelow(path, prefix));
}

export function activeStudentShortcut(pathname: string): string | undefined {
  const path = normalizePathname(pathname);
  // Nhánh tin nhắn/đấu trường cần được nhận diện trước trang cá nhân cha.
  return STUDENT_SHORTCUTS.find((item) => item.href !== "/hoc-vien" && atOrBelow(path, item.href))?.href
    ?? (atOrBelow(path, "/hoc-vien") ? "/hoc-vien" : undefined);
}
