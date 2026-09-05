"use client";

import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./expandable-tabs.module.css";

export type ExpandableTab = {
  href: string;
  title: string;
  icon: LucideIcon;
  notification?: string;
};

type Props = {
  tabs: readonly ExpandableTab[];
  activeHref?: string;
  label?: string;
  motion?: boolean;
  orientation?: "horizontal" | "vertical";
};

/** Các mục dẫn sang trang khác nên dùng liên kết thật, không dùng role="tab". */
export function ExpandableTabs({
  tabs,
  activeHref,
  label = "Truy cập nhanh",
  motion = true,
  orientation = "horizontal",
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const expandedHref = hovered ?? focused ?? activeHref ?? tabs[0]?.href;

  return (
    <nav
      aria-label={label}
      className={styles.tabs}
      data-orientation={orientation}
      data-motion={motion && !focused ? "true" : "false"}
      onPointerLeave={() => setHovered(null)}
    >
      {tabs.map(({ href, title, icon: Icon, notification }) => (
        <Link
          key={href}
          href={href}
          prefetch={false}
          aria-label={notification ? `${title} — ${notification}` : title}
          aria-current={href === activeHref ? "page" : undefined}
          title={notification ? `${title} — ${notification}` : title}
          className={styles.tab}
          data-expanded={href === expandedHref}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setHovered(href);
          }}
          onFocus={() => {
            setHovered(null);
            setFocused(href);
          }}
          onBlur={() => setFocused(null)}
          onClick={() => setHovered(null)}
        >
          <span className={styles.icon} aria-hidden="true">
            <Icon size={21} strokeWidth={1.8} />
            {notification && <span className={styles.dot} />}
          </span>
          <span className={styles.label} aria-hidden="true">{title}</span>
        </Link>
      ))}
    </nav>
  );
}
