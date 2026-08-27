import { Check } from "lucide-react";
import type { RuleProgress } from "@/lib/ranks/rules";

/**
 * Danh sách tiến độ của một chặng.
 *
 * Dùng `<progress>` thật thay vì div tô màu: trình đọc màn hình đọc được giá
 * trị và ngưỡng mà không cần thêm aria nào, còn người dùng vẫn thấy con số
 * bằng chữ ngay cạnh nên không phụ thuộc vào việc nhìn được thanh màu.
 */
export function TrialProgress({
  items,
  tone = "gold",
}: {
  items: RuleProgress[];
  tone?: "gold" | "azure";
}) {
  if (items.length === 0) return null;

  const bar = tone === "azure" ? "text-azure" : "text-gold";

  return (
    <ul className="m-0 list-none space-y-3 p-0">
      {items.map((item) => {
        const reached = item.current >= item.target;
        const ratio = item.target > 0 ? Math.min(item.current / item.target, 1) : 0;

        return (
          <li key={item.label}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-ui text-sm text-ink-soft">
                {reached && (
                  <Check
                    className="mr-1 inline h-3.5 w-3.5 text-jade-ink"
                    aria-hidden
                  />
                )}
                {item.label}
              </span>
              <span className="font-ui text-sm tabular-nums text-muted">
                {item.current}/{item.target}
              </span>
            </div>
            <progress
              className={`mt-1 h-1.5 w-full ${bar}`}
              value={ratio}
              max={1}
              aria-label={`${item.label}: ${item.current} trên ${item.target}`}
            />
          </li>
        );
      })}
    </ul>
  );
}
