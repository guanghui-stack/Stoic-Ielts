import Link from "next/link";
import { UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { BrandLockup } from "@/components/brand";
import { DesktopNav, MobileNav } from "@/components/site-nav";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isLoggedIn = Boolean(user);
  const isAdmin = user?.role === "ADMIN";

  return (
    <header className="relative z-40 bg-paper">
      {/* Sợi chỉ vàng đầu trang — chi tiết editorial */}
      <div className="h-[3px] bg-gold" />

      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <BrandLockup />

        <div className="flex items-center gap-3">
          <div className="hidden lg:block">
            {isLoggedIn ? (
              <Link
                href={isAdmin ? "/quan-tri" : "/hoc-vien"}
                className="flex items-center gap-2 border border-navy px-5 py-2 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-navy transition-colors hover:bg-navy hover:text-paper"
              >
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                {isAdmin ? "Quản trị" : user?.name?.split(" ").slice(-1)[0] ?? "Học viên"}
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/dang-nhap"
                  className="px-4 py-2 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-navy transition-colors hover:text-gold"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/dang-ky"
                  className="border border-navy bg-navy px-5 py-2 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-navy-deep"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
          <MobileNav isLoggedIn={isLoggedIn} isAdmin={isAdmin} />
        </div>
      </div>

      <DesktopNav />
      <div className="border-t border-line" />
    </header>
  );
}
