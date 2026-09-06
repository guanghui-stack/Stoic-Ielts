"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type FocusEvent as ReactFocusEvent } from "react";
import { BookOpen, ChevronDown, Library, Menu, X, UserRound } from "lucide-react";
import { READING_NAV, mainNavItems, type NavItem } from "@/lib/nav";

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

/** Nhóm menu sáng đèn khi đang ở BẤT KỲ trang con nào của nó. */
function isItemActive(pathname: string, item: NavItem) {
  if (item.children) {
    return item.children.some((child) => isActive(pathname, child.href));
  }
  return isActive(pathname, item.href);
}

function isReadingActive(
  pathname: string,
  href: string,
  assemblyType: "ACADEMIC" | "GENERAL"
) {
  if (pathname === "/luyen-tap/reading/ghep-de") {
    return href ===
      (assemblyType === "GENERAL"
        ? "/luyen-tap/reading/general"
        : "/luyen-tap/reading");
  }
  return isActive(pathname, href);
}

const TOP_LINK_CLASS =
  "relative flex min-h-12 items-center gap-1 whitespace-nowrap px-3 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.07em] transition-colors xl:px-4 xl:text-[0.76rem]";

function topLinkTone(active: boolean) {
  return active
    ? "text-stoic-primary-deep"
    : "text-stoic-ink-secondary hover:text-stoic-primary-deep";
}

function ActiveUnderline({ active }: { active: boolean }) {
  return (
    <span
      className={`absolute inset-x-4 bottom-0 h-0.5 rounded-full transition-opacity ${
        active ? "bg-stoic-primary opacity-100" : "opacity-0"
      }`}
    />
  );
}

/**
 * Mục menu có danh sách con.
 *
 * Mở bằng rê chuột VÀ bằng bàn phím. Mục cha vẫn là liên kết thật tới thử thách
 * tháng: người dùng bàn phím hay màn hình cảm ứng bấm thẳng vào là tới nơi,
 * không bị kẹt ở một cái nút chỉ dùng để mở menu.
 */
function DesktopNavGroup({
  item,
  active,
  pathname,
}: {
  item: NavItem;
  active: boolean;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const children = item.children ?? [];

  // Rời khỏi cả cụm mới đóng: đi từ mục cha xuống mục con cũng là một lần
  // `blur`, đóng ngay ở đó thì không ai bấm được vào menu con.
  const onBlur = (event: ReactFocusEvent<HTMLLIElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  };

  return (
    <li
      className="relative flex"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={onBlur}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-expanded={open}
        className={`${TOP_LINK_CLASS} ${topLinkTone(active)}`}
      >
        {item.label}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
        <ActiveUnderline active={active} />
      </Link>

      <ul
        hidden={!open}
        className="absolute left-1/2 top-full z-50 min-w-56 -translate-x-1/2 rounded-stoic-md border border-stoic-line bg-stoic-canvas p-1.5 shadow-stoic-2"
      >
        {children.map((child) => {
          const childActive = isActive(pathname, child.href);
          return (
            <li key={child.href}>
              <Link
                href={child.href}
                aria-current={childActive ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`block min-h-11 rounded-stoic-pill px-4 py-2.5 text-[0.78rem] font-semibold tracking-wide transition-colors ${
                  childActive
                    ? "bg-stoic-primary-soft/45 text-stoic-primary-deep"
                    : "text-stoic-ink-secondary hover:bg-stoic-canvas-soft hover:text-stoic-primary-deep"
                }`}
              >
                {child.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

export function DesktopNav({ showTiers }: { showTiers: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const assemblyType =
    searchParams.get("dang") === "GENERAL" ? "GENERAL" : "ACADEMIC";
  const mainNav = mainNavItems(showTiers);
  return (
    <div className="hidden bg-stoic-canvas font-stoic lg:block">
      {/* Tầng 1: menu chính nằm ngang */}
      <nav aria-label="Điều hướng chính" className="border-t border-stoic-line">
        <ul className="mx-auto flex max-w-6xl items-stretch justify-center gap-1 px-3">
          {mainNav.map((item) => {
            const active = isItemActive(pathname, item);
            if (item.children) {
              return (
                <DesktopNavGroup
                  key={item.href}
                  item={item}
                  active={active}
                  pathname={pathname}
                />
              );
            }
            return (
              <li key={item.href} className="flex">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`${TOP_LINK_CLASS} ${topLinkTone(active)}`}
                >
                  {item.label}
                  <ActiveUnderline active={active} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Tầng 2: hai kho đề Reading tách biệt */}
      <nav
        aria-label="Kho Reading"
        className="border-t border-stoic-line bg-stoic-canvas-soft/90"
      >
        <ul className="mx-auto flex max-w-6xl items-center justify-center gap-1 px-4 py-1.5">
          <li className="px-4 py-2 text-xs font-semibold tracking-wide text-stoic-ink">
            Reading
          </li>
          {READING_NAV.map((item) => {
            const active = isReadingActive(pathname, item.href, assemblyType);
            const Icon = READING_ICONS[item.module];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-2 rounded-stoic-pill px-5 py-2 text-xs font-semibold tracking-wide transition-colors ${
                    active
                      ? "bg-stoic-canvas text-stoic-primary-deep shadow-stoic-1"
                      : "text-stoic-ink-muted hover:bg-stoic-canvas/70 hover:text-stoic-primary-deep"
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
  showTiers,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
  showTiers: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const assemblyType =
    searchParams.get("dang") === "GENERAL" ? "GENERAL" : "ACADEMIC";
  const [open, setOpen] = useState(false);
  const mainNav = mainNavItems(showTiers);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Đóng menu" : "Mở menu"}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-stoic-pill text-stoic-ink transition-colors hover:bg-stoic-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-stoic-line bg-stoic-canvas font-stoic shadow-stoic-2">
          <nav aria-label="Điều hướng chính" className="px-6 py-4">
            <ul className="divide-y divide-stoic-line">
              {mainNav.map((item) => (
                <li key={item.href}>
                  {/*
                    Trên màn hình hẹp không có "rê chuột": nhóm được trải phẳng
                    thành nhãn nhóm + các mục con, thay vì một menu phải bấm hai
                    lần mới tới nơi.
                  */}
                  {item.children ? (
                    <div className="py-3">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-stoic-ink-muted">
                        {item.label}
                      </p>
                      <ul className="mt-1">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={() => setOpen(false)}
                              className={`block min-h-11 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] ${
                                isActive(pathname, child.href)
                                  ? "text-stoic-primary-deep"
                                  : "text-stoic-ink"
                              }`}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`block min-h-11 py-3 text-sm font-semibold uppercase tracking-[0.08em] ${
                        isActive(pathname, item.href)
                          ? "text-stoic-primary-deep"
                          : "text-stoic-ink"
                      }`}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <p className="mb-2 mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-stoic-ink-muted">
              Reading
            </p>
            <ul className="grid grid-cols-2 gap-2 rounded-stoic-lg bg-stoic-canvas-soft p-1.5">
              {READING_NAV.map((item) => {
                const Icon = READING_ICONS[item.module];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex min-h-11 items-center gap-2 rounded-stoic-pill px-3 py-2.5 text-sm font-semibold ${
                        isReadingActive(pathname, item.href, assemblyType)
                          ? "bg-stoic-canvas text-stoic-primary-deep shadow-stoic-1"
                          : "text-stoic-ink-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 border-t border-stoic-line pt-4">
              <Link
                href={isLoggedIn ? (isAdmin ? "/quan-tri" : "/hoc-vien") : "/dang-nhap"}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-2 rounded-stoic-pill text-sm font-semibold text-stoic-primary-deep"
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
