import Link from "next/link";
import { Flag, Lock, Play, Check } from "lucide-react";
import { ART_ASSETS } from "@/lib/brand/art-manifest";
import { InkWashArt } from "@/components/brand/ink-wash-art";
import { STATE_LABELS, type CampaignNodeView } from "@/lib/campaign/view";

/**
 * Bản đồ Chiến Dịch cho màn hình rộng.
 *
 * Ba điều kiện của §7.3 quyết định cách viết component này:
 *
 *  1. Mỗi node là một `Link` hoặc `button` thật, không phải div bắt sự kiện
 *     click. Bàn phím phải đi hết được bản đồ.
 *  2. Trạng thái phân biệt bằng HÌNH và CHỮ, không chỉ bằng màu — người mù
 *     màu vẫn phải đọc được bản đồ. Mỗi node có một biểu tượng riêng.
 *  3. Điều kiện còn thiếu nằm trong `aria-label`, không chỉ trong tooltip
 *     hiện ra khi rê chuột — thiết bị cảm ứng không có trạng thái rê chuột.
 *
 * Ảnh nền là trang trí thuần nên `alt` rỗng: mô tả một bức tranh phong cảnh
 * cho trình đọc màn hình chỉ làm ồn, mọi thông tin thật đều nằm trong DOM.
 */

const NODE_STYLE: Record<
  CampaignNodeView["state"],
  { ring: string; dot: string; Icon: typeof Lock }
> = {
  LOCKED: { ring: "border-line text-muted", dot: "bg-cream-deep", Icon: Lock },
  AVAILABLE: {
    ring: "border-gold text-gold-ink",
    dot: "bg-gold-pale",
    Icon: Play,
  },
  ACTIVE: {
    ring: "border-azure text-azure-ink",
    dot: "bg-azure-pale",
    Icon: Play,
  },
  PASSED: {
    ring: "border-vermilion text-vermilion-ink",
    dot: "bg-vermilion-pale",
    Icon: Check,
  },
};

function nodeLabel(node: CampaignNodeView): string {
  const parts = [
    `${node.shortTitle} — ${node.functionalLabel}`,
    STATE_LABELS[node.state],
  ];
  if (node.hint) parts.push(`Còn thiếu: ${node.hint}`);
  return parts.join(". ");
}

export function CampaignMap({ nodes }: { nodes: CampaignNodeView[] }) {
  return (
    <div
      className="relative hidden overflow-hidden rounded-lg border border-line bg-paper lg:block"
      style={{ aspectRatio: "21 / 9" }}
    >
      <InkWashArt asset={ART_ASSETS.campaignMap} className="object-cover opacity-70" />

      <ul className="absolute inset-0 m-0 list-none p-0">
        {nodes.map((node) => {
          const style = NODE_STYLE[node.state];
          const Icon = style.Icon;
          const locked = node.state === "LOCKED";

          return (
            <li
              key={node.code}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <Link
                href={locked ? "#" : `/hoc-vien/thi-luyen/${node.trialCode}`}
                aria-label={nodeLabel(node)}
                aria-disabled={locked}
                tabIndex={locked ? -1 : undefined}
                className={`group flex w-32 flex-col items-center gap-1 rounded-md p-2 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                  locked ? "cursor-default opacity-60" : "hover:bg-cream/70"
                }`}
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-full border-2 ${style.ring} ${style.dot}`}
                >
                  <Icon className="size-4" aria-hidden />
                </span>

                {node.isCurrent && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-vermilion-ink">
                    <Flag className="size-3" aria-hidden />
                    Đang ở đây
                  </span>
                )}

                <span className="font-display text-sm font-semibold text-navy-deep">
                  {node.shortTitle}
                </span>
                <span className="text-[11px] leading-tight text-muted">
                  {node.functionalLabel}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
