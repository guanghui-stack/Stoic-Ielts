export const MAIN_NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/khoa-hoc-ielts", label: "Khóa học IELTS" },
  { href: "/khoa-e-learning", label: "Khoá E-learning lẻ" },
  { href: "/luyen-tap", label: "Luyện tập 4 kỹ năng" },
  { href: "/bai-mau-writing", label: "Bài mẫu Writing 8.0+" },
  { href: "/ket-qua-hoc-vien", label: "Kết quả học viên" },
  { href: "/dien-danh-vong", label: "Điện Danh Vọng" },
] as const;

export const SKILL_NAV = [
  { href: "/luyen-tap/reading", label: "Reading", skill: "READING" },
  { href: "/luyen-tap/listening", label: "Listening", skill: "LISTENING" },
  { href: "/luyen-tap/writing", label: "Writing", skill: "WRITING" },
  { href: "/luyen-tap/speaking", label: "Speaking", skill: "SPEAKING" },
] as const;

export const SKILL_LABELS: Record<string, string> = {
  READING: "Reading",
  LISTENING: "Listening",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};
