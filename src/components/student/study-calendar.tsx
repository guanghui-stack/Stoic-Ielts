import { CalendarDays } from "lucide-react";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/**
 * Lịch chuyên cần: tháng hiện tại (giờ Việt Nam), ngày có nộp bài
 * được tô vàng đồng, hôm nay có viền navy.
 */
export function StudyCalendar({
  monthLabel,
  offset,
  daysInMonth,
  activeDays,
  today,
}: {
  monthLabel: string;
  offset: number; // số ô trống trước ngày 1 (tuần bắt đầu Thứ 2)
  daysInMonth: number;
  activeDays: number[];
  today: number;
}) {
  const active = new Set(activeDays);
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="border border-line bg-paper p-7 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label-caps flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          Lịch chuyên cần
        </p>
        <span className="flex items-center gap-2 font-ui text-xs text-muted">
          <span className="h-2.5 w-2.5 bg-gold" aria-hidden="true" />
          Ngày có nộp bài
        </span>
      </div>
      <p className="mt-4 font-display text-lg font-bold text-navy-deep">
        {monthLabel}
      </p>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="py-1 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted"
          >
            {w}
          </span>
        ))}
        {cells.map((day, i) =>
          day === null ? (
            <span key={`e${i}`} />
          ) : (
            <span
              key={day}
              className={`mx-auto flex h-9 w-9 items-center justify-center font-ui text-sm tabular-nums ${
                active.has(day)
                  ? "bg-gold font-bold text-navy-deep"
                  : "text-ink-soft"
              } ${day === today ? "ring-2 ring-inset ring-navy" : ""}`}
              aria-label={
                active.has(day)
                  ? `Ngày ${day}: có nộp bài`
                  : `Ngày ${day}`
              }
            >
              {day}
            </span>
          )
        )}
      </div>
      <p className="mt-4 border-t border-line pt-3 font-ui text-xs leading-relaxed text-muted">
        Mỗi ô vàng là một ngày bạn đã nộp ít nhất một bài — hãy giữ chuỗi ngày
        vàng dài nhất có thể.
      </p>
    </div>
  );
}
