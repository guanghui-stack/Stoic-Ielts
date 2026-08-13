"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

type AdminTab = { href: string; label: string };

function isActive(pathname: string, href: string) {
  if (href === "/quan-tri") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ tabs }: { tabs: AdminTab[] }) {
  const pathname = usePathname();
  const allowPressMotion = !pathname.startsWith("/quan-tri/ai-feynman");

  return (
    <nav aria-label="Quản trị" className="flex flex-wrap items-center gap-1">
      {tabs.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`${allowPressMotion ? "motion-press " : ""}border-b-2 px-4 py-1.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.08em] ${
              active
                ? "border-gold-soft bg-navy text-paper"
                : "border-transparent text-cream/80 transition-colors hover:bg-navy hover:text-paper"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
      <form action={logoutAction}>
        <button
          type="submit"
          className={`${allowPressMotion ? "motion-press " : ""}ml-2 flex cursor-pointer items-center gap-1.5 border border-cream/30 px-4 py-1.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-cream/80 transition-colors hover:border-gold-soft hover:text-gold-soft`}
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Đăng xuất
        </button>
      </form>
    </nav>
  );
}
