"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Flag, Lock, Play } from "lucide-react";
import { STATE_LABELS, type CampaignNodeView } from "@/lib/campaign/view";
import { heroCutoutFor } from "@/lib/campaign/hero-cutouts";
import {
  DEFAULT_TILT,
  heroTransition,
  motionSettings,
  tiltFromPointer,
} from "@/lib/campaign/motion";

/**
 * Bản đồ Chiến Dịch dựng theo kỹ thuật 2.5D.
 *
 * Cách nó hoạt động, vì đọc CSS không thì khó thấy:
 *
 *   .stage  đặt `perspective` — không có nó thì mọi phép xoay 3D trông phẳng lì.
 *   .world  nghiêng `rotateX(TILT)` — cả mặt đất ngả ra sau như nhìn từ trên xuống.
 *   node    là mảng phẳng NẰM trên mặt đất, nghiêng theo world.
 *   nhãn, cột cờ, nhân vật  xoay NGƯỢC `rotateX(-TILT)` để đứng thẳng dậy.
 *   bóng đổ  KHÔNG xoay ngược, nên nó nằm bẹp trên đất — đó là thứ tạo ảo giác
 *            khối rõ nhất, hơn cả bản thân phép nghiêng.
 *
 * Ba ràng buộc của đặc tả §7.3 quyết định phần lớn mã bên dưới:
 *
 *  1. `prefers-reduced-motion` phải tắt HẾT chuyển động, kể cả parallax. Người
 *     bị say chuyển động không nên phải chọn giữa "dùng được" và "chóng mặt".
 *  2. Node vẫn là `Link` thật với `aria-label` đầy đủ. Hiệu ứng thị giác không
 *     được đánh đổi bằng việc bàn phím đi không hết bản đồ.
 *  3. Trạng thái phân biệt bằng HÌNH và CHỮ, không chỉ bằng màu.
 *
 * Component này chỉ dựng ở màn hình rộng. Ép 2.5D vào 375px thì chữ nhỏ tới
 * mức không đọc được — bản mobile là dòng thời gian dọc, ở file khác.
 */

const NODE_STYLE: Record<
  CampaignNodeView["state"],
  { ring: string; dot: string; Icon: typeof Lock }
> = {
  LOCKED: { ring: "border-line", dot: "bg-cream-deep", Icon: Lock },
  AVAILABLE: { ring: "border-gold", dot: "bg-gold-pale", Icon: Play },
  ACTIVE: { ring: "border-azure", dot: "bg-azure-pale", Icon: Play },
  PASSED: { ring: "border-vermilion", dot: "bg-vermilion-pale", Icon: Check },
};

function nodeLabel(node: CampaignNodeView): string {
  const parts = [
    `${node.shortTitle} — ${node.functionalLabel}`,
    STATE_LABELS[node.state],
  ];
  if (node.hint) parts.push(`Còn thiếu: ${node.hint}`);
  return parts.join(". ");
}

/** Node nhân vật đang đứng: cửa ải hiện tại, hoặc cửa cuối đã vượt. */
function heroNode(nodes: CampaignNodeView[]): CampaignNodeView | undefined {
  return (
    nodes.find((node) => node.isCurrent) ??
    [...nodes].reverse().find((node) => node.state === "PASSED") ??
    nodes[0]
  );
}

export function CampaignMap25D({ nodes }: { nodes: CampaignNodeView[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: DEFAULT_TILT, z: 0 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const standing = heroNode(nodes);

  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    if (reduced) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTilt(
      tiltFromPointer(reduced, {
        x: (event.clientX - rect.left) / rect.width - 0.5,
        y: (event.clientY - rect.top) / rect.height - 0.5,
      }),
    );
  }

  // Nhân vật là tướng của cửa ải đang tới. Tướng chưa có ảnh cắt rời thì rơi
  // về cờ hổ phù — bản đồ vẫn đọc được, chỉ là chưa có hồn.
  const cutout = heroCutoutFor(standing?.featuredGeneralCode);

  const motion = motionSettings(reduced);
  const worldTilt = reduced ? motion.tilt : tilt.x;
  const worldTwist = reduced ? 0 : tilt.z;
  const counter = -worldTilt;
  const move = heroTransition(reduced);

  return (
    <div
      ref={stageRef}
      onMouseMove={handleMove}
      onMouseLeave={() => motion.parallax && setTilt({ x: DEFAULT_TILT, z: 0 })}
      className="relative hidden lg:block"
      style={{ perspective: "1100px", perspectiveOrigin: "50% 30%", aspectRatio: "16 / 10" }}
    >
      <div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${worldTilt}deg) rotateZ(${worldTwist}deg)`,
          transition: motion.transition,
        }}
      >
        {/* Mặt đất. Lưới mờ và vệt mực tạo cảm giác địa hình khi chưa có ảnh. */}
        <div
          className="absolute rounded-2xl border-2 border-line-strong bg-cream paper-grain"
          style={{
            inset: "-6%",
            backgroundImage: [
              "repeating-linear-gradient(0deg, transparent 0 46px, rgba(120,100,70,.07) 46px 47px)",
              "repeating-linear-gradient(90deg, transparent 0 46px, rgba(120,100,70,.07) 46px 47px)",
              "radial-gradient(circle at 62% 68%, rgba(150,120,80,.18), transparent 55%)",
            ].join(","),
            boxShadow: "0 40px 60px rgba(0,0,0,.28)",
          }}
        />

        {/* Con đường nối các cửa ải, vẽ phẳng trên mặt đất. */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <polyline
            points={nodes.map((n) => `${n.x},${n.y}`).join(" ")}
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="0.5"
            strokeDasharray="2 1.5"
            opacity="0.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <ul className="absolute inset-0 m-0 list-none p-0">
          {nodes.map((node) => {
            const style = NODE_STYLE[node.state];
            const Icon = style.Icon;
            const locked = node.state === "LOCKED";

            return (
              <li
                key={node.code}
                className="absolute"
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                {/* Mảng tròn nằm PHẲNG trên đất — không xoay ngược. */}
                <span
                  aria-hidden
                  className={`absolute block rounded-full border-2 border-dashed ${style.ring} ${style.dot}`}
                  style={{ width: 76, height: 76, marginLeft: -38, marginTop: -38, opacity: 0.75 }}
                />

                {/* Cột cờ dựng đứng — chỉ ở cửa đã vượt. */}
                {node.state === "PASSED" && (
                  <span
                    aria-hidden
                    className="absolute block bg-ink-soft"
                    style={{
                      width: 2,
                      height: 44,
                      marginLeft: -1,
                      bottom: 0,
                      transformOrigin: "bottom center",
                      transform: `rotateX(${counter}deg)`,
                    }}
                  >
                    <span
                      className="absolute block bg-vermilion"
                      style={{
                        top: 0,
                        left: 2,
                        width: 22,
                        height: 14,
                        clipPath: "polygon(0 0, 100% 0, 78% 50%, 100% 100%, 0 100%)",
                      }}
                    />
                  </span>
                )}

                {/* Nhãn và biểu tượng đứng dậy khỏi mặt đất. */}
                <Link
                  href={locked ? "#" : `/hoc-vien/thi-luyen/${node.trialCode}`}
                  aria-label={nodeLabel(node)}
                  aria-disabled={locked}
                  tabIndex={locked ? -1 : undefined}
                  className={`absolute flex w-28 flex-col items-center gap-1 rounded-md px-2 py-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                    locked ? "cursor-default opacity-60" : "hover:bg-cream/80"
                  }`}
                  style={{
                    left: -56,
                    bottom: 0,
                    transformOrigin: "bottom center",
                    transform: `rotateX(${counter}deg) translateY(-46px)`,
                  }}
                >
                  <Icon className="size-4 text-ink-soft" aria-hidden />
                  <span className="font-display text-sm font-semibold text-navy-deep">
                    {node.shortTitle}
                  </span>
                  <span className="font-ui text-[11px] leading-tight text-muted">
                    {node.functionalLabel}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {standing && (
          <>
            {/* Bóng NẰM trên mặt đất: không xoay ngược, nên nó bẹt theo world. */}
            <span
              aria-hidden
              className="absolute block rounded-full"
              style={{
                left: `${standing.x}%`,
                top: `${standing.y}%`,
                width: 96,
                height: 32,
                marginLeft: -48,
                marginTop: -10,
                background: "radial-gradient(ellipse, rgba(0,0,0,.32), transparent 70%)",
                transition: move,
              }}
            />

            <div
              className="absolute"
              style={{
                left: `${standing.x}%`,
                top: `${standing.y}%`,
                transformOrigin: "bottom center",
                transform: `rotateX(${counter}deg)`,
                transition: move,
                filter: "drop-shadow(0 6px 6px rgba(0,0,0,.3))",
              }}
            >
              {cutout ? (
                // Vó ngựa chạm đúng cạnh dưới ảnh nên neo bằng `bottom: 0`.
                // Dùng thẻ img thường: next/image thêm wrapper và lazy-load,
                // cả hai đều làm hỏng phép neo trong không gian 3D.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cutout.src}
                  alt={cutout.alt}
                  className="absolute block"
                  style={{
                    width: cutout.width,
                    // BẮT BUỘC: CSS reset của Tailwind đặt `img { max-width: 100% }`.
                    // Thẻ cha ở đây chỉ là điểm neo nên bề ngang bằng 0, khiến
                    // max-width cũng thành 0 và bóp ảnh xuống 0x0 — ảnh vẫn tải
                    // được nên lỗi này im lặng hoàn toàn.
                    maxWidth: "none",
                    marginLeft: -cutout.width / 2,
                    bottom: 0,
                  }}
                />
              ) : (
                // Chưa có ảnh: cờ hổ phù cắm tại vị trí. Bản đồ vẫn đọc được.
                <span
                  className="absolute flex flex-col items-center"
                  style={{ marginLeft: -12, bottom: 0 }}
                >
                  <Flag className="size-5 text-vermilion-ink" aria-hidden />
                  <span className="mt-0.5 block h-8 w-0.5 bg-ink-soft" />
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Chú giải nằm ngoài không gian 3D để luôn đọc được. */}
      <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center font-ui text-xs text-muted">
        {standing
          ? `Bạn đang ở ${standing.shortTitle} · ${STATE_LABELS[standing.state]}`
          : "Chưa bắt đầu hành trình"}
      </p>
    </div>
  );
}
