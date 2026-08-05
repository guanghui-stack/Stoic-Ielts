import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";
import { features } from "@/lib/features";

/**
 * Tab "Tuyển chọn" chỉ hiện khi cờ ba tầng đại thí được bật. Hiện một tab dẫn
 * tới trang trả 404 thì tệ hơn là không hiện gì.
 */
const TABS = [
  { href: "/quan-tri", label: "Tổng quan" },
  { href: "/quan-tri/bai-tap", label: "Bài tập" },
  { href: "/quan-tri/hoc-vien", label: "Học viên" },
  { href: "/quan-tri/thanh-toan", label: "Thanh toán" },
  { href: "/quan-tri/phan-thuong", label: "Phần thưởng" },
  { href: "/quan-tri/bo-de", label: "Bộ đề" },
  { href: "/quan-tri/cuoc-thi", label: "Nguyệt Thí" },
  ...(features.ranks ? [{ href: "/quan-tri/cap-bac", label: "Cấp bậc" }] : []),
  ...(features.competitionTiers
    ? [{ href: "/quan-tri/tuyen-chon", label: "Tuyển chọn" }]
    : []),
  { href: "/doi-mat-khau", label: "Đổi mật khẩu" },
];

export const metadata = { title: "Quản trị" };

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return (
    <>
      <div className="border-b border-line bg-navy-deep">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <p className="font-ui text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gold-soft">
            Khu vực quản trị · HỔ PHÙ · IELTS
          </p>
          <nav aria-label="Quản trị" className="flex flex-wrap items-center gap-1">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="px-4 py-1.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-cream/80 transition-colors hover:bg-navy hover:text-paper"
              >
                {t.label}
              </Link>
            ))}
            <form action={logoutAction}>
              <button
                type="submit"
                className="ml-2 flex cursor-pointer items-center gap-1.5 border border-cream/30 px-4 py-1.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-cream/80 transition-colors hover:border-gold-soft hover:text-gold-soft"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Đăng xuất
              </button>
            </form>
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}
