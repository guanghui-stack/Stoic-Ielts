/**
 * Uy vọng của một HỌC VIÊN và việc quy đổi sang Đức Hạnh — luật thuần.
 *
 * Trước đây uy vọng chỉ là điểm của từng bài viết. Uy vọng của một người là
 * tổng phiếu mà nội dung của họ nhận được, và nó KHÔNG được lưu thành một cột
 * số dư riêng: cột đó sẽ trôi khỏi bảng phiếu ngay lần đầu có ai đó rút phiếu
 * mà quên cập nhật. Chỉ lưu phần ĐÃ QUY ĐỔI, còn số đang có thì tính ra.
 *
 *     uy vọng đang có = tổng phiếu (like − dislike) − đã quy đổi
 *
 * VÌ SAO CHỈ QUY ĐỔI SỐ DƯƠNG: chủ dự án chốt điều kiện này, và nó cũng chặn
 * đúng một lỗ hổng — nếu số âm cũng "quy đổi" được thì một người bị dislike
 * nhiều sẽ tạo ra Đức Hạnh âm rồi kéo ví về 0 bằng cách xoá bài.
 */

/** 1 uy vọng = 1 Đức Hạnh. Chủ dự án chốt 2026-09-06. */
export const REPUTATION_TO_MERIT_RATE = 1;

/**
 * Uy vọng đang có của một người.
 *
 * `earnedTotal` là tổng phiếu trên toàn bộ nội dung của họ, có thể ÂM khi bị
 * dislike nhiều hơn like. Không kẹp về 0 ở đây: trang cá nhân phải nói thật số
 * âm đó, việc kẹp là chuyện của bước quy đổi.
 */
export function reputationBalance(earnedTotal: number, converted: number): number {
  return earnedTotal - converted;
}

/**
 * Quy đổi được bao nhiêu ngay lúc này.
 *
 * Luôn ≥ 0. Số dư âm hoặc bằng 0 thì trả về 0 — không có gì để đổi, và cũng
 * không được phép "đổi ngược" để xoá nợ.
 */
export function convertibleReputation(
  earnedTotal: number,
  converted: number,
): number {
  return Math.max(0, reputationBalance(earnedTotal, converted));
}

/** Số Đức Hạnh nhận được khi đổi `amount` uy vọng. */
export function meritForReputation(amount: number): number {
  return Math.max(0, Math.floor(amount * REPUTATION_TO_MERIT_RATE));
}

/**
 * Khoá sổ cái cho một lần quy đổi.
 *
 * Dùng TỔNG đã quy đổi SAU bước này, không dùng thời điểm hay số ngẫu nhiên:
 * bấm hai lần thật nhanh sẽ sinh ra cùng một khoá, và ràng buộc unique của sổ
 * cái chặn lần thứ hai. Nếu khoá mang dấu thời gian thì hai cú bấm là hai khoá
 * khác nhau, và người ta nhận đôi.
 */
export function reputationLedgerKey(userId: string, convertedAfter: number): string {
  return `MERIT:REPUTATION:${userId}:${convertedAfter}`;
}
