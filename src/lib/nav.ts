export const MAIN_NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/dien-danh-vong", label: "Điện Danh Vọng" },
  { href: "/bang-vang", label: "Bảng Vàng" },
] as const;

export const READING_NAV = [
  { href: "/luyen-tap/reading", label: "Academic", module: "ACADEMIC" },
  { href: "/luyen-tap/reading/general", label: "General", module: "GENERAL" },
] as const;
