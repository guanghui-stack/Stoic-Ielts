"use client";

import { useEffect, useState } from "react";

/**
 * Mục lục năm nhóm danh hiệu.
 *
 * Vì sao cần chạy phía trình duyệt: liên kết neo thì HTML thuần làm được, nhưng
 * phần khó là cho học viên biết mình ĐANG ở nhóm nào khi cuộn. Không có nó,
 * cuộn được vài màn hình là mất phương hướng — mà đây đúng là thứ người dùng
 * muốn: hình dung tổng quát.
 *
 * Nếu JavaScript không chạy, các liên kết vẫn nhảy đúng chỗ; chỉ mất phần tô đậm.
 */

export type TocItem = {
  anchor: string;
  label: string;
  count: number;
  blurb: string;
};

export function CatalogToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.anchor ?? "");

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.anchor))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    // Chọn tiêu đề nhóm nằm cao nhất mà vẫn còn trong màn hình. Dùng vị trí
    // thật thay vì tin vào thứ tự sự kiện của observer — cuộn nhanh hoặc mở/đóng
    // một danh hiệu đều làm thứ tự đó đảo lộn.
    const pick = () => {
      let current = sections[0];
      for (const section of sections) {
        // 140px: chừa khoảng thở, để nhóm được coi là "đang xem" ngay trước khi
        // tiêu đề của nó chạm mép trên màn hình
        if (section.getBoundingClientRect().top <= 140) current = section;
      }
      setActive(current.id);
    };

    pick();
    const observer = new IntersectionObserver(pick, {
      rootMargin: "-140px 0px -60% 0px",
      threshold: [0, 1],
    });
    for (const section of sections) observer.observe(section);
    window.addEventListener("scroll", pick, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", pick);
    };
  }, [items]);

  return (
    <>
      {/* ===== Máy tính: cột dính bên trái ===== */}
      <nav
        aria-label="Mục lục nhóm danh hiệu"
        className="hidden lg:block lg:sticky lg:top-8 lg:self-start"
      >
        <p className="label-caps border-b border-line pb-2.5">Tổng quan</p>
        <ol className="mt-4 space-y-1">
          {items.map((item, index) => {
            const isActive = active === item.anchor;
            return (
              <li key={item.anchor}>
                <a
                  href={`#${item.anchor}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex items-baseline gap-2.5 border-l-2 py-2 pl-3 pr-2 font-ui text-sm transition-colors ${
                    isActive
                      ? "border-gold bg-gold-pale font-semibold text-navy-deep"
                      : "border-line text-ink-soft hover:border-line-strong hover:text-navy"
                  }`}
                >
                  <span className="font-ui text-[0.68rem] tabular-nums text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">{item.label}</span>
                  <span className="font-ui text-[0.68rem] tabular-nums text-muted">
                    {item.count}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
        <p className="mt-5 border-t border-line pt-4 font-ui text-xs leading-relaxed text-muted">
          Trong mỗi nhóm, danh hiệu xếp từ dễ đến khó.
        </p>
      </nav>

      {/*
        Điện thoại: hàng thẻ cuộn ngang, dính trên đầu.

        `min-w-0` là bắt buộc chứ không phải trang trí: đây là một ô lưới, mà ô
        lưới mặc định không co nhỏ hơn nội dung của nó. Thiếu nó thì năm thẻ
        `shrink-0` bên trong đẩy phình cả cột và làm TOÀN TRANG trôi ngang.
      */}
      <nav
        aria-label="Mục lục nhóm danh hiệu"
        className="sticky top-0 z-30 -mx-6 min-w-0 border-b border-line bg-paper/95 px-6 py-3 backdrop-blur lg:hidden"
      >
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {items.map((item) => {
            const isActive = active === item.anchor;
            return (
              <li key={item.anchor} className="shrink-0">
                <a
                  href={`#${item.anchor}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex items-center gap-1.5 border px-3 py-1.5 font-ui text-[0.78rem] transition-colors ${
                    isActive
                      ? "border-gold bg-gold-pale font-semibold text-navy-deep"
                      : "border-line text-ink-soft"
                  }`}
                >
                  {item.label}
                  <span className="tabular-nums text-muted">{item.count}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
