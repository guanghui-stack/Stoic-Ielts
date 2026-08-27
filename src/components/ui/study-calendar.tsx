"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CircleCheck, Flame } from "lucide-react";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function StudyCalendar({
  activityDates,
  streakDates = [],
  initialMonth,
  selectedDate,
  onSelect,
  title = "Lịch học",
}: {
  activityDates: readonly string[];
  streakDates?: readonly string[];
  initialMonth?: string;
  selectedDate?: string;
  onSelect?: (isoDate: string) => void;
  title?: string;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const parsed = initialMonth ? parseIsoDate(`${initialMonth}-01`) : null;
    return new Date((parsed ?? today).getFullYear(), (parsed ?? today).getMonth(), 1);
  });

  const active = useMemo(() => new Set(activityDates), [activityDates]);
  const streak = useMemo(() => new Set(streakDates), [streakDates]);
  const days = useMemo(() => calendarCells(visibleMonth), [visibleMonth]);
  const monthLabel = new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  function moveMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <section className="rounded-stoic-lg border border-stoic-line bg-stoic-canvas p-5 shadow-stoic-1 md:p-6" aria-label={title}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.09em] text-stoic-primary-deep">
            Kỷ luật ngày
          </p>
          <h2 className="mt-1 text-xl font-medium capitalize tracking-[-0.01em] text-stoic-ink">
            {monthLabel}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stoic-line text-stoic-ink-secondary hover:border-stoic-primary hover:bg-stoic-primary-soft"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stoic-line text-stoic-ink-secondary hover:border-stoic-primary hover:bg-stoic-primary-soft"
            aria-label="Tháng sau"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1.5" role="grid" aria-label={monthLabel}>
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="flex h-9 items-center justify-center text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-stoic-ink-muted"
            role="columnheader"
          >
            {day}
          </div>
        ))}

        {days.map(({ date, inMonth }) => {
          const iso = toIsoDate(date);
          const isToday = sameDay(date, today);
          const hasActivity = active.has(iso);
          const isStreak = streak.has(iso);
          const isSelected = selectedDate === iso;
          const label = buildDayLabel(date, { hasActivity, isStreak, isToday });

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect?.(iso)}
              disabled={!onSelect}
              role="gridcell"
              aria-label={label}
              aria-current={isToday ? "date" : undefined}
              aria-selected={isSelected}
              className={`relative flex min-h-11 items-center justify-center rounded-stoic-md border text-sm font-medium tabular-nums transition-colors ${
                isSelected
                  ? "border-stoic-primary bg-stoic-primary text-white"
                  : isStreak
                    ? "border-stoic-primary/20 bg-stoic-primary-soft text-stoic-primary-deep"
                    : isToday
                      ? "border-2 border-stoic-primary bg-stoic-canvas text-stoic-ink"
                      : "border-transparent text-stoic-ink-secondary hover:border-stoic-line hover:bg-stoic-canvas-soft"
              } ${inMonth ? "" : "opacity-35"} disabled:cursor-default`}
            >
              <span>{date.getDate()}</span>
              {hasActivity ? (
                <span
                  className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-stoic-sage"}`}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-stoic-line pt-4 text-xs text-stoic-ink-muted">
        <span className="inline-flex items-center gap-2">
          <CircleCheck className="h-4 w-4 text-stoic-sage" aria-hidden="true" />
          Có hoạt động học
        </span>
        <span className="inline-flex items-center gap-2">
          <Flame className="h-4 w-4 text-stoic-primary-deep" aria-hidden="true" />
          Thuộc chuỗi ngày học
        </span>
      </div>
    </section>
  );
}

function calendarCells(month: Date): Array<{ date: Date; inMonth: boolean }> {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, monthIndex, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { date, inMonth: date.getMonth() === monthIndex };
  });
}

function buildDayLabel(
  date: Date,
  state: { hasActivity: boolean; isStreak: boolean; isToday: boolean },
): string {
  const labels = [new Intl.DateTimeFormat("vi-VN", { dateStyle: "full" }).format(date)];
  if (state.isToday) labels.push("hôm nay");
  if (state.hasActivity) labels.push("có hoạt động học");
  if (state.isStreak) labels.push("thuộc chuỗi ngày học");
  return labels.join(", ");
}

function parseIsoDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}
