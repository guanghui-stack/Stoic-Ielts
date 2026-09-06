import Link from "next/link";
import { UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { BrandLockup } from "@/components/brand";
import { DesktopNav, MobileNav } from "@/components/site-nav";
import { features } from "@/lib/features";
import { navDisplayName } from "@/lib/student/display-name";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isLoggedIn = Boolean(user);
  const isAdmin = user?.role === "ADMIN";

  return (
    <header className="relative z-40 border-b border-stoic-line bg-stoic-canvas/95 font-stoic text-stoic-ink backdrop-blur">
      <div className="h-0.5 bg-gradient-to-r from-stoic-sherbet via-stoic-primary to-stoic-ruby" />

      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <BrandLockup />

        <div className="flex items-center gap-3">
          <div className="hidden lg:block">
            {isLoggedIn ? (
              <Link
                href={isAdmin ? "/quan-tri" : "/hoc-vien"}
                className="inline-flex min-h-11 max-w-56 items-center gap-2 rounded-stoic-pill border border-stoic-primary bg-stoic-canvas px-5 py-2 text-sm font-semibold text-stoic-primary-deep shadow-stoic-1 transition-colors hover:bg-stoic-primary-soft/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
                title={isAdmin ? "Quản trị" : (user?.name ?? "Học viên")}
              >
                <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {isAdmin ? "Quản trị" : navDisplayName(user?.name)}
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/dang-nhap"
                  className="inline-flex min-h-11 items-center rounded-stoic-pill px-4 py-2 text-sm font-semibold text-stoic-ink-secondary transition-colors hover:bg-stoic-canvas-soft hover:text-stoic-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/dang-ky"
                  className="inline-flex min-h-11 items-center rounded-stoic-pill border border-stoic-primary bg-stoic-primary px-5 py-2 text-sm font-semibold text-white shadow-stoic-1 transition-colors hover:border-stoic-primary-deep hover:bg-stoic-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
          <MobileNav
            isLoggedIn={isLoggedIn}
            isAdmin={isAdmin}
            showTiers={features.competitionTiers}
          />
        </div>
      </div>

      <DesktopNav showTiers={features.competitionTiers} />
    </header>
  );
}
