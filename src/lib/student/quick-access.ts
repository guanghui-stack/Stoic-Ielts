import { normalizePathname } from "../motion/route-policy.ts";

export const STUDENT_SHORTCUTS = [
  { href: "/hoc-vien/tin-nhan", title: "Tin nhắn", icon: "messages" },
  { href: "/hoc-vien", title: "Cá nhân", icon: "profile" },
  { href: "/nghi-su-duong", title: "Diễn đàn", icon: "forum" },
  { href: "/hoc-vien/dau-truong", title: "Đấu trường", icon: "arena" },
] as const;

export const INBOX_UPDATED_EVENT = "stoic:inbox-updated";

const FOCUSED_ROUTES = [
  "/lam-bai", "/hoc-vien/thi-but", "/hoc-vien/thi-luyen", "/hoc-vien/bai-lam",
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
