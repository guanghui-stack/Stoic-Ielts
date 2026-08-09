import "server-only";

/**
 * Cờ tính năng cho các module Tam Quốc chưa phát hành.
 *
 * Mặc định TẮT. Bảng dữ liệu có thể đã tồn tại trong database mà giao diện
 * vẫn chưa mở — đó chính là mục đích: đưa schema lên production trước, chạy
 * backfill và quan sát, rồi mới bật tính năng cho từng nhóm người dùng.
 *
 * Quy ước đọc biến môi trường là so sánh đúng chuỗi "true". Bất kỳ giá trị
 * nào khác, kể cả "1" hay "TRUE", đều là tắt. Hơi khắt khe nhưng đổi lại
 * không bao giờ có chuyện một biến bị gõ sai lại vô tình mở một module chưa
 * sẵn sàng ra production.
 */
export const features = {
  /** Thương hiệu và art HỔ PHÙ. Bật mặc định vì đây là lớp hiển thị thuần. */
  hoPhuBrand: process.env.ENABLE_HO_PHU_BRAND !== "false",
  /** Engine cấp bậc và thí luyện. */
  ranks: process.env.ENABLE_RANK_ENGINE === "true",
  /** Bản đồ Chiến Dịch. */
  campaignMap: process.env.ENABLE_CAMPAIGN_MAP === "true",
  /** Đổi nhãn giao diện sang tên Tam Quốc trên toàn site. */
  themedLabels: process.env.ENABLE_TAM_QUOC_UI_LABELS === "true",
  /** Ba tầng đại thí Nguyệt - Dương - Thiên. */
  competitionTiers: process.env.ENABLE_COMPETITION_TIERS === "true",
  /**
   * Trang quản trị Feynman AI.
   *
   * Tách khỏi `OPENAI_FEYNMAN_ENABLED`: cờ kia bật/tắt việc GỌI API cho học
   * viên, cờ này bật/tắt trang theo dõi của quản trị viên. Cần xem lại chi phí
   * và hàng đợi cảnh báo của giai đoạn vừa rồi ngay cả khi đã tắt tính năng —
   * đặc biệt là ngay sau khi vừa tắt vì một sự cố.
   */
  feynmanAi: process.env.ENABLE_FEYNMAN_AI_ADMIN === "true",
} as const;
