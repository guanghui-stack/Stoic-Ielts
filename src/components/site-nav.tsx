"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, Library, Menu, X, UserRound } from "lucide-react";
import { MAIN_NAV, READING_NAV } from "@/lib/nav";

const READING_ICONS = {
  ACADEMIC: BookOpen,
  GENERAL: Library,
} as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (
    href === "/luyen-tap/reading" &&
    pathname.startsWith("/luyen-tap/reading/general")
  ) {
    return false;
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <div className="hidden lg:block">
      {/* Tầng 1: menu chính nằm ngang */}
      <nav aria-label="Điều hướng chính" className="border-t border-line">
        <ul className="mx-auto flex max-w-6xl items-stretch justify-center divide-x divide-line">
          {MAIN_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="flex">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center whitespace-nowrap px-3 py-3.5 font-ui text-[0.72rem] font-semibold uppercase tracking-[0.07em] transition-colors xl:px-5 xl:text-[0.78rem] ${
                    active
                      ? "text-navy-deep"
                      : "text-ink-soft hover:text-navy"
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute inset-x-4 bottom-0 h-[3px] transition-opacity ${
                      active ? "bg-gold opacity-100" : "opacity-0"
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Tầng 2: hai kho đề Reading tách biệt */}
      <nav
        aria-label="Kho Reading"
        className="border-t border-line bg-cream-deep/60"
      >
        <ul className="mx-auto flex max-w-6xl items-center justify-center divide-x divide-line-strong/50">
          <li className="px-6 py-2.5 font-ui text-[0.78rem] font-semibold tracking-wide text-navy-deep">
            Reading
          </li>
          {READING_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = READING_ICONS[item.module];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 px-6 py-2.5 font-ui text-[0.78rem] font-medium tracking-wide transition-colors ${
                    active ? "text-gold" : "text-ink-soft hover:text-navy"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function MobileNav({
  isLoggedIn,
  isAdmin,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Đóng menu" : "Mở menu"}
        className="flex h-11 w-11 cursor-pointer items-center justify-center text-navy-deep"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-line bg-paper shadow-lift">
          <nav aria-label="Điều hướng chính" className="px-6 py-4">
            <ul className="divide-y divide-line">
              {MAIN_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block py-3 font-ui text-sm font-semibold uppercase tracking-[0.08em] ${
                      isActive(pathname, item.href) ? "text-gold" : "text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="label-caps mt-5 mb-2">Reading</p>
            <ul className="grid grid-cols-2 gap-1">
              {READING_NAV.map((item) => {
                const Icon = READING_ICONS[item.module];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2 rounded py-2.5 font-ui text-sm ${
                        isActive(pathname, item.href)
                          ? "text-gold"
                          : "text-ink-soft"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 border-t border-line pt-4">
              <Link
                href={isLoggedIn ? (isAdmin ? "/quan-tri" : "/hoc-vien") : "/dang-nhap"}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 font-ui text-sm font-semibold text-navy"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                {isLoggedIn
                  ? isAdmin
                    ? "Trang quản trị"
                    : "Khu vực học viên"
                  : "Đăng nhập / Đăng ký"}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
