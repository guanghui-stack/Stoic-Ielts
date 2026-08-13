import { RANK_ERAS, rankByLevel, type RankEra } from "@/lib/ranks/catalog";

/**
 * Huy hiệu chín bậc.
 *
 * KHÁC HẲN huy hiệu cuộc thi ở `components/competition/badges.tsx`:
 *
 * | | Huy hiệu cấp bậc (file này) | Huy hiệu cuộc thi |
 * |---|---|---|
 * | Lấy bằng cách nào | Lên bậc qua quá trình luyện | **Đoạt giải** một kỳ thi |
 * | Ai cũng có thể có | Có, chỉ cần đủ kiên trì | Không, chỉ người thắng |
 * | Sống bao lâu | Vĩnh viễn theo bậc hiện tại | 30 ngày |
 * | Hình | Khiên theo thời đại | Vương miện · ấn · giáp |
 *
 * Trộn hai loại là xoá mất ý nghĩa của loại thứ hai: một huy hiệu ai cũng có
 * thì không còn là phần thưởng.
 *
 * VẼ BẰNG SVG chứ không phải ảnh, cùng lý do đã ghi ở huy hiệu cuộc thi: sắc
 * nét ở mọi cỡ, không tốn thêm lượt tải, và đổi màu theo hệ thiết kế được. Với
 * chín bậc thì đây còn là cách duy nhất giữ chúng nhất quán — chín file ảnh do
 * ba lần đặt hàng khác nhau sẽ không bao giờ cùng một nét.
 */

const CREAM = "#f6f1e7";
const NAVY = "#1e3a5c";

/**
 * Mỗi thời đại một màu và một hình nền, lấy từ bảng màu Tam Quốc.
 *
 * Loạn thế dùng tro — chưa có gì để khoe, và đó là điểm xuất phát bình thường.
 * Quần hùng dùng lam điện của Chiến trận. Tam phân dùng chu sa, màu mà bảng
 * màu đã ghi rõ là dành cho "cấp bậc cao".
 */
const ERA_STYLE: Record<RankEra, { stroke: string; fill: string; accent: string }> = {
  LOAN_THE: { stroke: "#77736c", fill: "#efeae0", accent: "#5f5b54" },
  QUAN_HUNG: { stroke: "#3a7fc4", fill: "#e6eef7", accent: "#2c6099" },
  TAM_PHAN: { stroke: "#a33a2b", fill: "#f4e6e2", accent: "#8e3125" },
};

/**
 * Bậc trong thời đại: 1, 2 hay 3.
 *
 * Số vạch trên khiên đọc ra bậc mà không cần chú thích — ba vạch ở Tam phân
 * là bậc 9. Suy từ `level` chứ không khai tay: khai tay thì thêm một bậc là
 * lệch ngay, và không ai để ý cho tới khi học viên hỏi.
 */
function tierWithinEra(level: number): number {
  return ((level - 1) % 3) + 1;
}

export function RankInsignia({
  level,
  className = "h-9 w-9",
}: {
  level: number;
  className?: string;
}) {
  const rank = rankByLevel(level);
  // Bậc lạ (dữ liệu hỏng) vẽ theo Loạn thế thay vì đổ vỡ: một huy hiệu xám
  // vẫn hơn một trang trắng.
  const era = rank?.era ?? "LOAN_THE";
  const style = ERA_STYLE[era];
  const tier = tierWithinEra(level);
  const label = rank
    ? `${rank.name} — bậc ${level}, ${RANK_ERAS[era].name}`
    : `Bậc ${level}`;

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label={label}
      fill="none"
    >
      <title>{label}</title>

      {/* Khiên: đáy nhọn dần theo thời đại — Loạn thế bo tròn, Tam phân nhọn. */}
      <path
        d={
          era === "TAM_PHAN"
            ? "M24 3l17 6v16c0 10-7 17-17 20-10-3-17-10-17-20V9z"
            : era === "QUAN_HUNG"
              ? "M24 4l16 5.5v15c0 9.5-6.5 16-16 19-9.5-3-16-9.5-16-19v-15z"
              : "M24 5l15 5v14c0 9-6 15-15 17.5C15 39 9 33 9 24V10z"
        }
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Viền trong: chỉ có từ Quần hùng trở lên — bậc càng cao càng nhiều lớp. */}
      {era !== "LOAN_THE" && (
        <path
          d="M24 9l11 4v11.5c0 7-4.5 11.5-11 13.5-6.5-2-11-6.5-11-13.5V13z"
          stroke={style.accent}
          strokeWidth="0.9"
          opacity="0.55"
        />
      )}

      {/* Vạch bậc trong thời đại: một, hai hay ba. */}
      {Array.from({ length: tier }).map((_, index) => (
        <rect
          key={index}
          x={24 - (tier * 5 - 1) / 2 + index * 5}
          y="19"
          width="3"
          height="10"
          rx="0.6"
          fill={style.accent}
        />
      ))}

      {/* Bậc 9 — Đại tướng quân: thêm một ngôi sao trên đỉnh khiên. */}
      {level === 9 && (
        <path
          d="M24 9.5l1.5 3.2 3.5.5-2.6 2.5.7 3.5-3.1-1.7-3.1 1.7.7-3.5-2.6-2.5 3.5-.5z"
          fill={CREAM}
          stroke={style.accent}
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      )}

      {/* Số bậc ở chân khiên: đọc được ngay mà không cần đếm vạch. */}
      <circle cx="24" cy="36.5" r="5.2" fill={NAVY} />
      <text
        x="24"
        y="38.6"
        textAnchor="middle"
        fontSize="7"
        fontWeight="700"
        fill={CREAM}
        fontFamily="system-ui, sans-serif"
      >
        {level}
      </text>
    </svg>
  );
}
