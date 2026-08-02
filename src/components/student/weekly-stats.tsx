import { BarChart3 } from "lucide-react";

export type WeeklyRow = {
  label: string;
  r: number;
  minutes: number;
};

function fmtMinutes(m: number) {
  if (m <= 0) return "0p";
  if (m < 60) return `${m}p`;
  return `${Math.floor(m / 60)}g ${m % 60}p`;
}

export function WeeklyStats({ rows }: { rows: WeeklyRow[] }) {
  const total = rows.reduce(
    (acc, row) => ({ r: acc.r + row.r, minutes: acc.minutes + row.minutes }),
    { r: 0, minutes: 0 }
  );

  return (
    <div className="border border-line bg-paper p-7 shadow-card">
      <p className="label-caps flex items-center gap-2">
        <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
        Reading trong 7 ngày
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[320px] border border-line font-ui text-sm">
          <thead>
            <tr className="bg-navy text-paper">
              <th className="px-3 py-2.5 text-left font-semibold">Ngày</th>
              <th className="px-3 py-2.5 text-center font-semibold">Số bài</th>
              <th className="px-3 py-2.5 text-right font-semibold">Thời gian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.label} className="bg-paper">
                <td className="px-3 py-2.5 text-ink-soft">{row.label}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-ink">
                  {row.r || "–"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">
                  {fmtMinutes(row.minutes)}
                </td>
              </tr>
            ))}
            <tr className="bg-cream-deep font-semibold text-ink">
              <td className="px-3 py-2.5">Tổng cộng</td>
              <td className="px-3 py-2.5 text-center tabular-nums">{total.r}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {fmtMinutes(total.minutes)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
