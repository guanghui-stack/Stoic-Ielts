import { RANK_ERAS, rankByLevel, type RankEra } from "@/lib/ranks/catalog";

/**
 * Huy hiệu chín bậc — QUỸ ĐẠO KIỂM SOÁT.
 *
 * Huy hiệu mới dùng ngôn ngữ hình học của STOIC · IELTS: một tâm điểm rõ ràng,
 * quỹ đạo mở và các nút tiến bộ. Nó tránh hình khiên, vương miện hoặc con dấu
 * cổ điển để không kéo visual system sang fantasy/trung cổ.
 *
 * Ba thời đại vẫn được phân biệt bằng accent tiết chế; số level và tên bậc vẫn
 * đến từ catalog hiện có. Component này chỉ thay phần trình bày, không thay đổi
 * bất kỳ điều kiện, dữ liệu hay quy tắc cấp bậc nào.
 */

const PAPER = "#ffffff";
const SLATE = "#202a44";

type EraStyle = { line: string; ink: string; soft: string };

const ERA_STYLE: Record<RankEra, EraStyle> = {
  LOAN_THE: { line: "#7b8190", ink: "#4f596b", soft: "#eef0f5" },
  QUAN_HUNG: { line: "#5b5fef", ink: "#494cc4", soft: "#e7e8ff" },
  TAM_PHAN: { line: "#d85b78", ink: "#a73f5b", soft: "#fae8ee" },
};

/** Bậc trong thời đại: 1, 2 hoặc 3 điểm tiến bộ trên quỹ đạo. */
function tierWithinEra(level: number): number {
  return ((level - 1) % 3) + 1;
}

const TIER_POINTS = [
  { cx: 21, cy: 43 },
  { cx: 28, cy: 46 },
  { cx: 35, cy: 43 },
] as const;

export function RankInsignia({
  level,
  className = "h-9 w-9",
}: {
  level: number;
  className?: string;
}) {
  const rank = rankByLevel(level);
  const era = rank?.era ?? "LOAN_THE";
  const style = ERA_STYLE[era];
  const tier = tierWithinEra(level);
  const label = rank
    ? `${rank.name} — bậc ${level}, ${RANK_ERAS[era].name}`
    : `Bậc ${level}`;

  return (
    <svg
      viewBox="0 0 56 56"
      className={className}
      role="img"
      aria-label={label}
      fill="none"
    >
      <title>{label}</title>

      {/* Quỹ đạo mở: kết quả và hoàn cảnh luôn chuyển động ngoài tâm điểm. */}
      <path
        d="M42.9 14.2A20.2 20.2 0 1 0 47 34.8"
        stroke={style.line}
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M36.8 20.4A11.8 11.8 0 1 0 38.9 32"
        stroke={style.ink}
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.72"
      />

      {/* Tâm điểm — việc người học có thể làm tiếp theo. */}
      <circle cx="28" cy="28" r="7.2" fill={style.soft} stroke={style.line} strokeWidth="1.2" />
      <circle cx="28" cy="28" r="3.4" fill={style.ink} />
      <circle cx="29.3" cy="26.7" r="1.1" fill={PAPER} opacity="0.8" />

      {/* Một, hai hoặc ba điểm cho tiến bộ trong từng thời đại. */}
      {TIER_POINTS.slice(0, tier).map((point) => (
        <circle key={`${point.cx}-${point.cy}`} cx={point.cx} cy={point.cy} r="2.15" fill={style.ink} />
      ))}

      {/* Bậc cuối có thêm một quỹ đạo ngoài, không thêm biểu tượng mới. */}
      {level === 9 && (
        <circle
          cx="28"
          cy="28"
          r="24"
          stroke={style.line}
          strokeWidth="0.85"
          strokeDasharray="2 3"
          opacity="0.62"
        />
      )}
    </svg>
  );
}

/**
 * Insignia kèm số bậc — dùng ở chỗ cần đọc ngay con số mà không phải đếm điểm,
 * ví dụ màn hình tổng quan cấp bậc.
 */
export function RankInsigniaWithLevel({
  level,
  className = "h-11 w-11",
}: {
  level: number;
  className?: string;
}) {
  const rank = rankByLevel(level);
  const era = rank?.era ?? "LOAN_THE";
  const style = ERA_STYLE[era];

  return (
    <span className="relative inline-flex">
      <RankInsignia level={level} className={className} />
      <span
        className="absolute -bottom-0.5 -right-0.5 inline-flex h-[1.15rem] w-[1.15rem] items-center justify-center rounded-full font-ui text-[0.62rem] font-bold tabular-nums"
        style={{ background: SLATE, color: PAPER, border: `1px solid ${style.line}` }}
        aria-hidden="true"
      >
        {level}
      </span>
    </span>
  );
}
