/**
 * Kinh nghiệm — LUẬT THUẦN, không chạm database, không lưu vào cột nào.
 *
 * Kinh nghiệm được TÍNH RA từ lịch sử, không được LƯU. Đổi lại được ba thứ:
 * không có cột nào lệch khỏi sự thật, không migration nào ở P1, và kiểm thử
 * được bằng node thuần trên máy không có MySQL.
 *
 * Vai trò trong hệ, theo `docs/DAC-TA-DAU-TRUONG.md` mục 02:
 *
 *   Kinh nghiệm là nửa KẾT QUẢ ĐO ĐƯỢC. Vũ Môn là nửa QUÁ TRÌNH KIỂM CHỨNG
 *   ĐƯỢC. Thiếu một nửa thì lệnh không có hiệu lực.
 *
 * HAI RÀNG BUỘC, đừng tự đổi:
 *
 * 1. **Kinh nghiệm chỉ tăng, không bao giờ giảm.** Thua một trận vẫn cộng, vì
 *    trận nào cũng là một lần đọc đề thật. Mọi số hạng trong file này phải
 *    không âm, và `scripts/test-experience.ts` gác điều đó.
 * 2. **Kinh nghiệm không bao giờ được là thứ chắn giữa một người đủ năng lực
 *    và cấp bậc kế tiếp.** Vũ Môn mới là ràng buộc thật, kinh nghiệm chỉ định
 *    nhịp. Ngưỡng đặt cao thì nó thành thuế thời gian và cấp bậc thoái hoá
 *    thành huy hiệu thâm niên.
 */

export const EXPERIENCE_RULE_VERSION = "2026-08-20-v1";

/**
 * Điểm kinh nghiệm mỗi việc.
 *
 * Tỷ lệ GIỮA các hoạt động quyết định hành vi nhiều hơn con số tuyệt đối. Nếu
 * mười phút tỉ thí cho nhiều hơn mười phút học và chữa bài, người học tối ưu
 * sẽ bỏ học đi đấu, và ta xây được một trò chơi cạnh tranh với chính sản phẩm
 * của mình.
 *
 * Ước lượng thời gian để cân: một bài Reading khoảng 20 phút, một lượt phục
 * bàn khoảng 10 phút, một ngày học đạt chuẩn ít nhất 25 phút, một trận khoảng
 * 15 phút. Các số dưới đây giữ kinh nghiệm mỗi phút xấp xỉ 1, và nơi nào lệch
 * thì lệch về phía vòng học.
 *
 * Lưu ý: ràng buộc "mỗi phút xấp xỉ ngang nhau" này áp cho KINH NGHIỆM và cố ý
 * KHÔNG áp cho Quân Công. Chủ dự án đã chốt ngày 2026-08-20 rằng Quân Công
 * nghiêng về đấu trường là có chủ ý, vì mục tiêu là người học thi đấu nhiều
 * hơn. Xem đặc tả mục 15.
 */
export const EXPERIENCE_POINTS = {
  /** Một bài hợp lệ đã nộp và được chấm. */
  VALID_ATTEMPT: 20,
  /** Một lượt phục bàn đạt chuẩn. */
  QUALIFIED_REVIEW: 12,
  /** Phục bàn sâu, đủ cả bằng chứng, giải thích và quy tắc. */
  DEEP_REVIEW_BONUS: 6,
  /** Một ngày học đạt chuẩn. Thưởng cho việc quay lại, không cho sản lượng. */
  QUALIFIED_STUDY_DAY: 15,
  /** P3 nối vào: thắng một trận. */
  DUEL_WIN: 18,
  /** P3 nối vào: thua một trận. Vẫn dương, vì vẫn là một lần đọc đề thật. */
  DUEL_LOSS: 6,
} as const;

/**
 * Giảm dần theo đối thủ, đặc tả mục 02.
 *
 * Áp cho TẤT CẢ MỌI NGƯỜI, không riêng bot. Một luật ba tác dụng: chặn cày bot
 * mà không hé lộ bot nào, chặn hai tài khoản cày cho nhau, và đẩy người ta đi
 * tìm đối thủ mới.
 *
 * Chưa dùng ở P1 vì chưa có trận nào. Khai sẵn ở đây để P3 không phải bịa lại.
 */
export const OPPONENT_DECAY = [1, 0.6, 0.3, 0.1] as const;

export function opponentDecayFactor(nthMeetingToday: number): number {
  if (nthMeetingToday < 1) return 0;
  const i = Math.min(nthMeetingToday, OPPONENT_DECAY.length) - 1;
  return OPPONENT_DECAY[i];
}

/* ===================== Tính kinh nghiệm ===================== */

export type ExperienceFacts = {
  /** Bài đã nộp, hợp lệ. Cùng định nghĩa `valid` với `ranks/rules.ts`. */
  validAttempts: number;
  /** Lượt phục bàn đạt chuẩn. */
  qualifiedReviews: number;
  /** Trong số đó, bao nhiêu lượt là phục bàn sâu. */
  deepReviews: number;
  /** Số ngày học đạt chuẩn. Xem `merit.qualifiedStudyDayKeys`. */
  qualifiedStudyDays: number;
  /** P3 nối vào. Ở P1 luôn bằng không. */
  duelWins?: number;
  duelLosses?: number;
  /**
   * P3 nối vào: tổng kinh nghiệm đã bị trừ bớt do gặp lại cùng đối thủ trong
   * ngày. Luôn không âm, và luôn nhỏ hơn hoặc bằng phần kinh nghiệm trận.
   */
  duelDecayDeduction?: number;
};

export type ExperienceBreakdown = {
  total: number;
  parts: Array<{ label: string; points: number }>;
};

export function experienceOf(facts: ExperienceFacts): ExperienceBreakdown {
  const deep = Math.min(facts.deepReviews, facts.qualifiedReviews);
  const wins = facts.duelWins ?? 0;
  const losses = facts.duelLosses ?? 0;
  const duelRaw =
    wins * EXPERIENCE_POINTS.DUEL_WIN + losses * EXPERIENCE_POINTS.DUEL_LOSS;
  // Kẹp ở 0: giảm dần chỉ được LÀM NHỎ phần kinh nghiệm trận, không bao giờ
  // được kéo tổng xuống dưới phần đã kiếm từ việc học.
  const duel = Math.max(0, duelRaw - Math.max(0, facts.duelDecayDeduction ?? 0));

  const parts = [
    {
      label: "Bài đã nộp",
      points: facts.validAttempts * EXPERIENCE_POINTS.VALID_ATTEMPT,
    },
    {
      label: "Phục bàn",
      points:
        facts.qualifiedReviews * EXPERIENCE_POINTS.QUALIFIED_REVIEW +
        deep * EXPERIENCE_POINTS.DEEP_REVIEW_BONUS,
    },
    {
      label: "Ngày học thật",
      points: facts.qualifiedStudyDays * EXPERIENCE_POINTS.QUALIFIED_STUDY_DAY,
    },
    { label: "Tỉ thí", points: duel },
  ].filter((p) => p.points > 0);

  return { total: parts.reduce((s, p) => s + p.points, 0), parts };
}

/* ===================== Ngưỡng Vũ Môn ===================== */

/**
 * Ngưỡng kinh nghiệm để Vũ Môn bậc N HIỆN RA.
 *
 * Cố ý đặt RẤT THẤP, và cố ý dưới mức mà một người học đều đặn đạt được trước
 * khi họ thoả điều kiện năng lực của cửa ải. Kinh nghiệm định nhịp, Vũ Môn mới
 * là ràng buộc thật.
 *
 * Cách đọc bảng: một ngày học đạt chuẩn có nộp một bài đáng 35 điểm (15 ngày
 * học + 20 bài). Nên bậc 2 mở sau khoảng ba ngày học thật, bậc 9 sau khoảng
 * một trăm ngày. Trong khi đó điều kiện năng lực của bậc 9 đòi hỏi nhiều hơn
 * thế rất nhiều, nên trên thực tế kinh nghiệm gần như không bao giờ là thứ
 * chắn đường.
 *
 * Nếu có báo cáo "tôi đủ điều kiện mà cửa không mở vì thiếu kinh nghiệm", thì
 * bảng này sai, không phải người đó sai. Hạ số xuống.
 */
export const GATE_EXPERIENCE_BY_LEVEL: Readonly<Record<number, number>> = {
  1: 0,
  2: 100,
  3: 260,
  4: 520,
  5: 900,
  6: 1_400,
  7: 2_100,
  8: 2_900,
  9: 3_800,
};

export function gateExperienceFor(level: number): number {
  return GATE_EXPERIENCE_BY_LEVEL[level] ?? 0;
}

/**
 * Kinh nghiệm đã đủ để cửa bậc `level` hiện ra chưa.
 *
 * Trả về cả tiến độ, vì màn hình cấp bậc phải nói được còn thiếu bao nhiêu chứ
 * không chỉ nói đủ hay chưa đủ.
 */
export function experienceGate(
  level: number,
  experience: number,
): { complete: boolean; current: number; target: number } {
  const target = gateExperienceFor(level);
  return { complete: experience >= target, current: experience, target };
}
