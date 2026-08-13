"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Award, ChevronDown, Info } from "lucide-react";

type AchievementDisclosureProps = {
  index: number;
  name: string;
  rarity: string;
  attribution: string | null;
  description: string;
  count: number;
  percent: number;
  guide: {
    summary: string;
    steps: string[];
    notes: string[];
  };
};

export function AchievementDisclosure({
  index,
  name,
  rarity,
  attribution,
  description,
  count,
  percent,
  guide,
}: AchievementDisclosureProps) {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const regionId = useId();

  // Nội dung có thể đổi chiều cao khi font tải xong hoặc cửa sổ đổi kích thước.
  // Đo lại khi đang mở để tránh cắt mất dòng ở các chiều rộng màn hình khác nhau.
  useEffect(() => {
    const content = contentRef.current;
    if (!open || !content) return;

    const observer = new ResizeObserver(() => {
      setHeight(content.scrollHeight);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [open]);

  function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    setHeight(nextOpen ? (contentRef.current?.scrollHeight ?? 0) : 0);
  }

  return (
    <div
      className={`achievement-disclosure border bg-paper ${
        open ? "border-navy shadow-card" : "border-line"
      }`}
      data-open={open}
    >
      <button
        type="button"
        aria-controls={regionId}
        aria-expanded={open}
        onClick={toggle}
        className="motion-press flex w-full cursor-pointer flex-wrap items-start gap-4 p-6 text-left hover:bg-cream"
      >
        <span className="flex shrink-0 items-baseline gap-2 pt-0.5">
          <span className="font-ui text-xs font-semibold tabular-nums text-muted">
            {index}
          </span>
          <Award className="h-4 w-4 text-gold" aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-bold text-navy-deep">
              {name}
            </span>
            <span className="border border-line-strong px-2 py-0.5 font-ui text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted">
              {rarity}
            </span>
          </span>
          {attribution && (
            <span className="mt-1.5 block font-ui text-xs italic text-muted">
              {attribution}
            </span>
          )}
          <span className="mt-2.5 block text-[0.93rem] leading-relaxed text-ink-soft">
            {description}
          </span>
          <span className="mt-3 inline-flex items-center gap-1.5 font-ui text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-navy">
            <ChevronDown
              className="achievement-disclosure__chevron h-3.5 w-3.5"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
              aria-hidden="true"
            />
            {open ? "Thu gọn" : "Cách đạt được"}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block font-display text-3xl font-bold tabular-nums text-navy-deep">
            {count}
          </span>
          <span className="block font-ui text-xs text-muted">
            {percent}% học viên
          </span>
        </span>
      </button>

      <div
        id={regionId}
        className="achievement-disclosure__region"
        style={{ height }}
        aria-hidden={!open}
      >
        <div ref={contentRef} className="border-t border-line bg-cream px-6 py-6">
          <p className="font-ui text-sm font-semibold text-navy-deep">
            {guide.summary}
          </p>

          {guide.steps.length > 0 && (
            <>
              <p className="label-caps mt-5">
                Cần đạt đủ các điều kiện sau
              </p>
              <ul className="mt-3 space-y-2">
                {guide.steps.map((step, stepIndex) => (
                  <li
                    key={stepIndex}
                    className="flex gap-3 text-[0.93rem] leading-relaxed text-ink-soft"
                  >
                    <span
                      className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 bg-gold"
                      aria-hidden="true"
                    />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {guide.notes.length > 0 && (
            <div className="mt-6 space-y-2.5 border-t border-line pt-5">
              {guide.notes.map((note, noteIndex) => (
                <p
                  key={noteIndex}
                  className="flex gap-2.5 font-ui text-[0.85rem] leading-relaxed text-muted"
                >
                  <Info
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{note}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
