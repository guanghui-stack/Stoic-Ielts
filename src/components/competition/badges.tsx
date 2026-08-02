/**
 * Ba huy hiệu Nguyệt Thí.
 *
 * Huy hiệu KHÁC danh hiệu: danh hiệu là chữ và giữ vĩnh viễn, huy hiệu là hình
 * và chỉ sống 30 ngày. Vinh quang của tháng này không nên che mờ người giỏi của
 * tháng sau — đó là lý do chúng có hạn.
 *
 * Vẽ bằng SVG thay vì ảnh: hiện sắc nét ở mọi kích thước, không tốn thêm một
 * lượt tải nào, và đổi màu theo hệ thiết kế được.
 */

const NAVY = "#1e3a5c";
const GOLD = "#b8862b";
const CREAM = "#f6f1e7";

type BadgeProps = { className?: string };

/** Hạng Nhất — Vương miện. */
export function CrownBadge({ className = "h-16 w-16" }: BadgeProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
      <circle cx="32" cy="32" r="30" fill={CREAM} stroke={GOLD} strokeWidth="2.5" />
      <circle cx="32" cy="32" r="25" stroke={GOLD} strokeWidth="1" opacity="0.5" />
      {/* Vương miện năm đỉnh */}
      <path
        d="M18 38l-3-15 8 6 9-12 9 12 8-6-3 15z"
        fill={GOLD}
        stroke={NAVY}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M18 42h28" stroke={NAVY} strokeWidth="2.6" strokeLinecap="round" />
      {/* Ba viên ngọc = ba trụ */}
      <circle cx="25" cy="33" r="1.9" fill={NAVY} />
      <circle cx="32" cy="31" r="1.9" fill={NAVY} />
      <circle cx="39" cy="33" r="1.9" fill={NAVY} />
    </svg>
  );
}

/** Hạng Nhì — Tể tướng: cuộn thư và bút. */
export function ChancellorBadge({ className = "h-16 w-16" }: BadgeProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
      <circle cx="32" cy="32" r="30" fill={CREAM} stroke={NAVY} strokeWidth="2.5" />
      <circle cx="32" cy="32" r="25" stroke={NAVY} strokeWidth="1" opacity="0.35" />
      {/* Cuộn thư */}
      <rect x="19" y="21" width="26" height="22" rx="2" fill={GOLD} stroke={NAVY} strokeWidth="1.6" />
      <path d="M19 26h26M19 31h26" stroke={NAVY} strokeWidth="1.3" opacity="0.55" />
      {/* Con dấu */}
      <circle cx="32" cy="38" r="3.6" fill={CREAM} stroke={NAVY} strokeWidth="1.5" />
      <path d="M15 21c0 3 1.6 4 4 4M49 21c0 3-1.6 4-4 4" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Hạng Ba — Tướng quân: khiên và hai ngọn giáo. */
export function GeneralBadge({ className = "h-16 w-16" }: BadgeProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
      <circle cx="32" cy="32" r="30" fill={CREAM} stroke={NAVY} strokeWidth="2.5" />
      {/* Hai ngọn giáo bắt chéo */}
      <path d="M20 18l24 28M44 18L20 46" stroke={NAVY} strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      {/* Khiên */}
      <path
        d="M32 17l13 5v11c0 8-6 13.5-13 16-7-2.5-13-8-13-16V22z"
        fill={GOLD}
        stroke={NAVY}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M32 24v16" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M25 31h14" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export const BADGE_INFO = [
  {
    code: "MONTHLY_CROWN",
    rank: 1,
    Badge: CrownBadge,
    title: "Nguyệt Vương · Nguyệt Hậu",
    prizeLabel: "999.000đ",
    requirement: "Cả ba đề đạt từ band 8.5",
    note: "Huy hiệu Vương miện, hiệu lực 30 ngày",
  },
  {
    code: "MONTHLY_CHANCELLOR",
    rank: 2,
    Badge: ChancellorBadge,
    title: "Tể tướng Nguyệt Thí",
    prizeLabel: "499.000đ",
    requirement: "Cả ba đề đạt từ band 8.0",
    note: "Huy hiệu Tể tướng, hiệu lực 30 ngày",
  },
  {
    code: "MONTHLY_GENERAL",
    rank: 3,
    Badge: GeneralBadge,
    title: "Tướng quân Nguyệt Thí",
    prizeLabel: "199.000đ",
    requirement: "Cả ba đề đạt từ band 7.5",
    note: "Huy hiệu Tướng quân, hiệu lực 30 ngày",
  },
] as const;

/** Tra huy hiệu theo mã đã lưu trong database. */
export function badgeByCode(code: string) {
  return BADGE_INFO.find((b) => b.code === code) ?? null;
}
