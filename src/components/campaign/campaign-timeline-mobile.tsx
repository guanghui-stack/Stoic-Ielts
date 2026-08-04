import Link from "next/link";
import { Flag, Lock, Play, Check } from "lucide-react";
import { STATE_LABELS, type CampaignNodeView } from "@/lib/campaign/view";

/**
 * Bản đồ dạng dòng thời gian dọc, dùng cho điện thoại.
 *
 * Cố ý KHÔNG thu nhỏ bản đồ ngang. Ép một bố cục 21:9 vào màn 375px thì chữ
 * nhỏ tới mức không đọc được và node chạm không trúng — đặc tả §7.3 cấm đúng
 * việc đó. Đổi sang danh sách dọc giữ nguyên thứ tự cửa ải, đọc được bằng
 * ngón tay và bằng trình đọc màn hình.
 */

const NODE_STYLE: Record<
  CampaignNodeView["state"],
  { ring: string; Icon: typeof Lock }
> = {
  LOCKED: { ring: "border-line bg-cream-deep text-muted", Icon: Lock },
  AVAILABLE: { ring: "border-gold bg-gold-pale text-gold-ink", Icon: Play },
  ACTIVE: { ring: "border-azure bg-azure-pale text-azure-ink", Icon: Play },
  PASSED: { ring: "border-vermilion bg-vermilion-pale text-vermilion-ink", Icon: Check },
};

export function CampaignTimelineMobile({ nodes }: { nodes: CampaignNodeView[] }) {
  return (
    <ol className="m-0 list-none space-y-3 p-0 lg:hidden">
      {nodes.map((node, index) => {
        const style = NODE_STYLE[node.state];
        const Icon = style.Icon;
        const locked = node.state === "LOCKED";
        const last = index === nodes.length - 1;

        return (
          <li key={node.code} className="relative flex gap-3">
            {/* Đường nối dọc, thuần trang trí nên ẩn khỏi trình đọc màn hình. */}
            {!last && (
              <span
                aria-hidden
                className="absolute left-5 top-11 h-[calc(100%-0.5rem)] w-px bg-line"
              />
            )}

            <span
              className={`z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 ${style.ring}`}
            >
              <Icon className="size-4" aria-hidden />
            </span>

            <Link
              href={locked ? "#" : `/hoc-vien/thi-luyen/${node.trialCode}`}
              aria-disabled={locked}
              tabIndex={locked ? -1 : undefined}
              className={`flex-1 rounded-md border border-line bg-paper p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                locked ? "cursor-default opacity-60" : "hover:border-line-strong"
              }`}
            >
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display font-semibold text-navy-deep">
                  {node.shortTitle}
                </span>
                <span className="text-xs text-muted">{node.functionalLabel}</span>
                {node.isCurrent && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-vermilion-ink">
                    <Flag className="size-3" aria-hidden />
                    Đang ở đây
                  </span>
                )}
              </span>

              <span className="mt-1 block text-xs text-muted">
                {STATE_LABELS[node.state]}
              </span>
              {node.hint && (
                <span className="mt-1 block text-xs text-ink-soft">
                  Còn thiếu: {node.hint}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
