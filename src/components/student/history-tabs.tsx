import Link from "next/link";
import { ArrowRight, History } from "lucide-react";

export type HistoryItem = {
  id: string;
  title: string;
  submittedAtLabel: string;
  resultLabel: string;
  href: string;
};

/** Lịch sử các bài Reading đã hoàn thành. */
export function HistoryTabs({ items }: { items: HistoryItem[] }) {
  return (
    <div className="border border-line bg-paper p-7 shadow-card">
      <p className="label-caps flex items-center gap-2">
        <History className="h-3.5 w-3.5" aria-hidden="true" />
        Lịch sử Reading
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] font-ui text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left">
              <th className="py-2.5 pr-4 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted">
                Bài tập
              </th>
              <th className="py-2.5 pr-4 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted">
                Nộp lúc
              </th>
              <th className="py-2.5 pr-4 text-center text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted">
                Kết quả
              </th>
              <th className="py-2.5 text-right text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted">
                Chi tiết
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-cream">
                <td className="max-w-[300px] truncate py-3 pr-4 font-semibold text-ink">
                  {item.title}
                </td>
                <td className="py-3 pr-4 tabular-nums text-ink-soft">
                  {item.submittedAtLabel}
                </td>
                <td className="py-3 pr-4 text-center font-semibold tabular-nums text-navy-deep">
                  {item.resultLabel}
                </td>
                <td className="py-3 text-right">
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 font-semibold text-navy hover:text-gold"
                  >
                    Xem
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
