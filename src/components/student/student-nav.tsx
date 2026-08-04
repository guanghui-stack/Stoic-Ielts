import Link from "next/link";
import { features } from "@/lib/features";
import { UI_LABELS, type UiLabelKey } from "@/lib/ui-labels";

/**
 * Thanh điều hướng khu học viên.
 *
 * Là server component chứ không phải client: nó phải đọc được cờ tính năng,
 * mà `features` là server-only. Đổi lại không có trạng thái đang-ở-trang tự
 * động, nên mỗi trang tự truyền `current` — chấp nhận được vì danh sách chỉ
 * có năm mục.
 *
 * Nhãn kép theo §3: khi cờ themedLabels bật thì tên cổ phong đứng trên và mô
 * tả chức năng nằm ngay dưới, không bao giờ để tên cổ phong đứng trơ một
 * mình. Khi cờ tắt thì chỉ hiện mô tả chức năng — người dùng hiện tại không
 * bị đổi từ vựng giữa chừng mà không báo trước.
 */

type Item = { key: UiLabelKey; show: boolean };

const ITEMS: Item[] = [
  { key: "student", show: true },
  { key: "campaign", show: features.campaignMap },
  { key: "titles", show: true },
  { key: "weakness", show: true },
  { key: "studyDays", show: true },
];

export function StudentNav({ current }: { current?: UiLabelKey }) {
  const items = ITEMS.filter((item) => item.show);

  return (
    <nav aria-label="Khu học viên" className="mb-8 border-b border-line">
      <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 pb-3">
        {items.map((item) => {
          const label = UI_LABELS[item.key];
          const active = current === item.key;

          return (
            <li key={item.key}>
              <Link
                href={label.href}
                aria-current={active ? "page" : undefined}
                className={`block border-b-2 pb-1 transition-colors ${
                  active
                    ? "border-gold text-navy-deep"
                    : "border-transparent text-ink-soft hover:text-navy"
                }`}
              >
                {features.themedLabels ? (
                  <>
                    <span className="block font-display text-sm font-semibold">
                      {label.themed}
                    </span>
                    <span className="block font-ui text-[11px] leading-tight text-muted">
                      {label.functional}
                    </span>
                  </>
                ) : (
                  <span className="block font-ui text-sm font-medium">
                    {label.functional}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
