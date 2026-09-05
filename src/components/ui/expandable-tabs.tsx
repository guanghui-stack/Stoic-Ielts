"use client";

import Link from "next/link";
import { useState, type PointerEvent as ReactPointerEvent } from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./expandable-tabs.module.css";

export type ExpandableTab = {
  /** Cũng dùng làm khóa React và khóa trạng thái mở rộng, kể cả với mục hành động. */
  href: string;
  title: string;
  icon: LucideIcon;
  notification?: string;
  /**
   * Có `onSelect` thì mục này là NÚT, không phải liên kết.
   *
   * Cần cho những việc phải làm ngay tại trang đang đọc — tra từ chẳng hạn:
   * chuyển sang trang khác để tra rồi quay lại là mất chỗ đang đọc, tức là
   * hỏng đúng mục đích của nó.
   */
  onSelect?: () => void;
  /** Chỉ dùng cho mục hành động: bảng của nó đang mở hay không. */
  expanded?: boolean;
};

type Props = {
  tabs: readonly ExpandableTab[];
  activeHref?: string;
  label?: string;
  motion?: boolean;
};

/** Các mục dẫn sang trang khác nên dùng liên kết thật, không dùng role="tab". */
export function ExpandableTabs({
  tabs,
  activeHref,
  label = "Truy cập nhanh",
  motion = true,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const expandedHref = hovered ?? focused ?? activeHref ?? tabs[0]?.href;

  return (
    <nav
      aria-label={label}
      className={styles.tabs}
      data-motion={motion && !focused ? "true" : "false"}
      onPointerLeave={() => setHovered(null)}
    >
      {tabs.map((tab) => {
        const { href, title, icon: Icon, notification, onSelect, expanded } = tab;
        const label = notification ? `${title} — ${notification}` : title;
        const shared = {
          "aria-label": label,
          title: label,
          className: styles.tab,
          "data-expanded": href === expandedHref,
          onPointerEnter: (event: ReactPointerEvent) => {
            if (event.pointerType === "mouse") setHovered(href);
          },
          onFocus: () => setFocused(href),
          onBlur: () => setFocused(null),
        };
        const inner = (
          <>
            <span className={styles.icon} aria-hidden="true">
              <Icon size={21} strokeWidth={1.8} />
              {notification && <span className={styles.dot} />}
            </span>
            <span className={styles.label} aria-hidden="true">{title}</span>
          </>
        );

        // Mục hành động: nút thật, có aria-expanded để trình đọc màn hình biết
        // nó mở ra một bảng chứ không dẫn đi đâu.
        return onSelect ? (
          <button
            key={href}
            type="button"
            {...shared}
            aria-expanded={expanded ?? false}
            onClick={() => {
              setHovered(null);
              onSelect();
            }}
          >
            {inner}
          </button>
        ) : (
          <Link
            key={href}
            href={href}
            prefetch={false}
            aria-current={href === activeHref ? "page" : undefined}
            {...shared}
            onClick={() => setHovered(null)}
          >
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
