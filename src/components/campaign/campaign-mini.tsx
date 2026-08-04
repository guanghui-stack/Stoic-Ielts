import Link from "next/link";
import { ArrowRight, Check, Lock, Play } from "lucide-react";
import { STATE_LABELS, type CampaignNodeView } from "@/lib/campaign/view";

/**
 * Dải bản đồ thu nhỏ cho Trung Quân Trướng.
 *
 * Cố ý chỉ hiện BA node quanh vị trí hiện tại chứ không tải cả bản đồ. Đặc tả
 * §3.1 yêu cầu đúng như vậy vì hai lý do: ảnh nền 21:9 nặng nửa megabyte kéo
 * chậm trang chính, và người học mở hồ sơ ra là để biết "giờ làm gì tiếp",
 * không phải để ngắm toàn cảnh chiến dịch.
 */

const ICON: Record<CampaignNodeView["state"], typeof Lock> = {
  LOCKED: Lock,
  AVAILABLE: Play,
  ACTIVE: Play,
  PASSED: Check,
};

const TONE: Record<CampaignNodeView["state"], string> = {
  LOCKED: "border-line bg-cream-deep text-muted",
  AVAILABLE: "border-gold bg-gold-pale text-gold-ink",
  ACTIVE: "border-azure bg-azure-pale text-azure-ink",
  PASSED: "border-vermilion bg-vermilion-pale text-vermilion-ink",
};

/** Lấy cửa vừa qua, cửa đang tới và cửa kế tiếp. */
export function nearestNodes(nodes: CampaignNodeView[]): CampaignNodeView[] {
  const currentIndex = nodes.findIndex((node) => node.isCurrent);
  if (currentIndex === -1) return nodes.slice(-3);
  const start = Math.max(0, Math.min(currentIndex - 1, nodes.length - 3));
  return nodes.slice(start, start + 3);
}

export function CampaignMini({ nodes }: { nodes: CampaignNodeView[] }) {
  const shown = nearestNodes(nodes);

  return (
    <div>
      <ol className="m-0 flex list-none gap-2 p-0">
        {shown.map((node) => {
          const Icon = ICON[node.state];
          return (
            <li key={node.code} className="flex-1">
              <div
                className={`h-full border p-3 ${TONE[node.state]}`}
                aria-label={`${node.shortTitle} — ${node.functionalLabel}. ${STATE_LABELS[node.state]}`}
              >
                <Icon className="size-4" aria-hidden />
                <p className="mt-2 font-display text-sm font-semibold text-navy-deep">
                  {node.shortTitle}
                </p>
                <p className="mt-0.5 font-ui text-[11px] leading-tight text-muted">
                  {node.functionalLabel}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <Link
        href="/hoc-vien/chien-dich"
        className="mt-3 inline-flex items-center gap-1.5 font-ui text-sm text-navy hover:underline"
      >
        Xem toàn bộ Chiến Dịch
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}
