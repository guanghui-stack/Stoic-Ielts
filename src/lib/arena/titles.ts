/**
 * Danh hiệu chất vấn — HÀM THUẦN, không chạm database.
 *
 * Xem `docs/DAC-TA-DAU-TRUONG.md` mục 07.
 *
 * NGUYÊN LÝ, và nó là ranh giới đạo đức chứ không phải lựa chọn kỹ thuật:
 *
 *   Danh hiệu chất vấn chỉ mặt đúng MỘT thứ: hai nửa binh phù không khớp nhau.
 *   Danh cao mà thực thấp, hoặc thực cao mà danh thấp. Nó KHÔNG chê ai yếu.
 *
 *   Nó nhắm vào HÀNH XỬ, không bao giờ nhắm vào NĂNG LỰC. Thua nhiều vì học
 *   chưa giỏi thì không gắn, vì như thế là phạt người yếu.
 *
 * RANH GIỚI THỨ HAI, chép từ `src/lib/integrity/similarity.ts`:
 *
 *   Máy tự gắn cho những gì ĐẾM ĐƯỢC LÀ SỰ THẬT. Gian lận và thông đồng thì
 *   máy chỉ xếp hồ sơ, NGƯỜI xử. Một danh hiệu tiêu cực công khai chính là đổi
 *   trạng thái của một người trước mặt tất cả bạn học.
 */

export const ARENA_TITLE_RULE_VERSION = "2026-08-21-v1";

/* ===================== NGƯỠNG: SỬA Ở ĐÂY, KHÔNG SỬA CHỖ KHÁC ===================== */

/**
 * MỌI CON SỐ CỦA HỆ DANH HIỆU CHẤT VẤN NẰM Ở ĐÂY.
 *
 * ĐỌC KỸ TRƯỚC KHI DÙNG. Đặc tả mục 14 ghi rõ về giai đoạn này:
 *
 *   "Đừng làm sớm hơn, cần dữ liệu trận thật để định ngưỡng."
 *
 * Những con số dưới đây được đặt TRƯỚC KHI có dữ liệu trận thật, nên chúng là
 * số TẠM. Chúng suy ra từ tính toán xác suất chứ không phải từ phân bố Chiến
 * Lực có thật, và phân bố thật gần như chắc chắn sẽ khác.
 *
 * Cả bộ được gieo vào `TitleDefinition.ruleConfigJson`, nên chỉnh được thẳng
 * trong database mà KHÔNG cần deploy lại. Đó là lý do chúng nằm chung một chỗ.
 *
 * Việc đầu tiên phải làm khi có khoảng một trăm trận thật: dựng phân bố Chiến
 * Lực theo từng cấp bậc, rồi đặt lại `ratingGapBelowMedian`.
 */
export const ARENA_TITLE_THRESHOLDS = {
  DANH_BAT_PHU_THUC: {
    /**
     * Thấp hơn trung vị của người CÙNG CẤP BẬC bao nhiêu điểm thì bị coi là
     * "danh cao mà thực thấp".
     *
     * 200 điểm tương ứng xác suất thắng 24% trước người đồng cấp trung bình.
     * Đây là con số cần chỉnh đầu tiên khi có dữ liệu thật.
     */
    ratingGapBelowMedian: 200,
    /** Chỉ xét trên ngần này trận gần nhất, và CHỈ với người thật. */
    recentDuels: 10,
    /**
     * Phải đúng liên tục ngần này ngày mới gắn.
     *
     * Bộ lọc thời gian này là thứ quan trọng nhất trong cả luật. Với ngưỡng
     * "3 thắng trở xuống trong 10 trận" và người chơi trung bình thật sự,
     * 17,2% người NGAY THẲNG chạm ngưỡng do thuần may rủi, tức cứ 6 người thì
     * 1. Vận rủi thì thoáng qua, danh không xứng thực thì kéo dài.
     */
    sustainedDays: 7,
    /** Xoá khi thắng ngần này trận trước đối thủ Chiến Lực cao hơn. */
    clearWinsVsStronger: 5,
  },

  AN_TAI_DAI_GIA: {
    /** Chiến Lực vượt trung vị đồng cấp bao nhiêu thì coi là "thực vượt danh". */
    ratingGapAboveMedian: 200,
    /** Vũ Môn đã mở mà không khởi thí trong ngần này ngày. */
    idleGateDays: 14,
  },

  AN_BINH_BAT_DONG: {
    /**
     * Từ chối ngần này NGƯỜI THÁCH KHÁC NHAU. Không đếm theo số thư.
     *
     * Bốn chốt bảo vệ nằm ở `countableDeclines` trong `duel.ts`: đếm theo
     * người, mỗi người tối đa một lần mỗi ngày, không tính khi đang trong
     * trận, và chỉ tính thư tới khi họ đang có mặt ở đấu trường.
     */
    distinctChallengers: 10,
    /** Xoá khi nhận và đánh trọn ngần này trận. */
    clearFullDuels: 5,
  },

  LAM_TRAN_THOAT_DAO: {
    /** Bỏ mặc trận tới hết giờ ngần này lần. */
    abandons: 3,
    windowDays: 30,
    /** Xoá khi đánh trọn ngần này trận LIÊN TIẾP, thắng thua không kể. */
    clearConsecutiveFullDuels: 5,
  },

  Y_CUONG_LANG_NHUOC: {
    /**
     * Ngần này trận LIÊN TIẾP do mình CHỦ ĐỘNG gửi chiến thư đều nhắm đối thủ
     * dưới Chiến Lực mình.
     *
     * Chỉ đếm trận chủ động gửi thư. Trận tự ghép do máy chọn đối thủ ngang
     * Chiến Lực, không phải lỗi của ai.
     */
    consecutiveWeakerTargets: 10,
    /** Phải thấp hơn mình ít nhất ngần này điểm mới tính là "kẻ yếu". */
    minRatingGap: 100,
    /** Xoá khi thắng ngần này trận trước đối thủ ngang hoặc cao hơn. */
    clearWinsVsEqualOrStronger: 3,
  },
} as const;

/* ===================== Mã danh hiệu ===================== */

export const ARENA_QUESTION_TITLES = [
  "ARENA_Q01_DANH_BAT_PHU_THUC",
  "ARENA_Q02_AN_TAI_DAI_GIA",
  "ARENA_Q03_AN_BINH_BAT_DONG",
  "ARENA_Q04_LAM_TRAN_THOAT_DAO",
  "ARENA_Q05_Y_CUONG_LANG_NHUOC",
] as const;
export type ArenaQuestionTitle = (typeof ARENA_QUESTION_TITLES)[number];

/** Hai danh hiệu này CHỈ người xét duyệt mới gắn được. Máy không bao giờ tự gắn. */
export const ARENA_MANUAL_TITLES = [
  "ARENA_M01_NGUY_TAO_QUAN_CONG",
  "ARENA_M02_NOI_UNG_NGOAI_HOP",
] as const;
export type ArenaManualTitle = (typeof ARENA_MANUAL_TITLES)[number];

/**
 * Đường chuộc lỗi.
 *
 * Danh hiệu này quan trọng hơn vẻ ngoài của nó: nó biến vết trượt thành một thứ
 * đáng kể, và là lời hứa cụ thể rằng nền tảng không đóng đinh ai vĩnh viễn.
 * Chỉ người TỪNG VẤP mới có được.
 */
export const ARENA_REDEMPTION_TITLE = "ARENA_R01_CAI_QUA_TU_TAN";

export function isArenaQuestionTitle(code: string): code is ArenaQuestionTitle {
  return (ARENA_QUESTION_TITLES as readonly string[]).includes(code);
}

export function isMachineAwardable(code: string): boolean {
  // Hai danh hiệu người xử KHÔNG bao giờ được máy gắn. Đây là chốt chặn cuối
  // cùng, đặt ở tầng luật để không phụ thuộc vào việc ai đó nhớ kiểm ở tầng gọi.
  return !(ARENA_MANUAL_TITLES as readonly string[]).includes(code);
}

/* ===================== Dữ liệu đầu vào ===================== */

export type DuelRecord = {
  duelId: string;
  settledAt: Date;
  /** Chiến Lực của mình lúc đó. */
  myRating: number;
  opponentId: string;
  opponentRating: number;
  /** Đối thủ có phải bot không. Trận với bot KHÔNG đếm cho Danh Bất Phù Thực. */
  opponentIsBot: boolean;
  won: boolean;
  /** Mình có phải người CHỦ ĐỘNG gửi chiến thư không. */
  initiatedByMe: boolean;
  /** Mình có bỏ mặc tới hết giờ không. */
  abandonedByMe: boolean;
  /** Đánh trọn: có nộp bài, không đầu hàng, không bỏ mặc. */
  completedByMe: boolean;
};

export type TitleFacts = {
  now: Date;
  rating: number;
  /** Trung vị Chiến Lực của những người CÙNG CẤP BẬC. Null khi chưa đủ mẫu. */
  peerMedianRating: number | null;
  duels: readonly DuelRecord[];
  /** Số người thách khác nhau đã bị từ chối, đã qua bốn chốt bảo vệ. */
  countableDeclines: number;
  /** Vũ Môn kế tiếp đã mở bao nhiêu ngày mà chưa khởi thí. Null nếu chưa mở. */
  openGateIdleDays: number | null;
};

export type TitleVerdict = {
  code: ArenaQuestionTitle;
  /** Điều kiện đang đúng hay không. Chưa chắc đã gắn: xem `sustainedDays`. */
  conditionMet: boolean;
  /** Điều kiện xoá đang đúng hay không. */
  clearMet: boolean;
  /** Câu giải thích cho người bị gắn đọc. Luôn nói rõ đường ra. */
  explanation: string;
};

/* ===================== Năm luật máy tự gắn ===================== */

function recentVsHumans(facts: TitleFacts, limit: number): DuelRecord[] {
  return facts.duels
    .filter((d) => !d.opponentIsBot)
    .slice()
    .sort((a, b) => b.settledAt.getTime() - a.settledAt.getTime())
    .slice(0, limit);
}

export function evaluateDanhBatPhuThuc(facts: TitleFacts): TitleVerdict {
  const t = ARENA_TITLE_THRESHOLDS.DANH_BAT_PHU_THUC;
  const recent = recentVsHumans(facts, t.recentDuels);

  // Chưa đủ mẫu thì KHÔNG kết luận. Gắn danh hiệu cho người mới đánh ba trận
  // là phạt người chưa kịp chứng minh gì.
  const enoughData =
    facts.peerMedianRating !== null && recent.length >= t.recentDuels;

  const conditionMet =
    enoughData &&
    facts.rating <= (facts.peerMedianRating as number) - t.ratingGapBelowMedian;

  const winsVsStronger = facts.duels.filter(
    (d) => d.won && d.opponentRating > d.myRating,
  ).length;
  const backInRange =
    facts.peerMedianRating !== null &&
    facts.rating > facts.peerMedianRating - t.ratingGapBelowMedian;

  return {
    code: "ARENA_Q01_DANH_BAT_PHU_THUC",
    conditionMet,
    clearMet: backInRange || winsVsStronger >= t.clearWinsVsStronger,
    explanation: `Xoá khi Chiến Lực trở lại vùng của người đồng cấp, hoặc thắng ${t.clearWinsVsStronger} trận trước đối thủ mạnh hơn. Hiện đã thắng ${winsVsStronger}.`,
  };
}

export function evaluateAnTaiDaiGia(facts: TitleFacts): TitleVerdict {
  const t = ARENA_TITLE_THRESHOLDS.AN_TAI_DAI_GIA;
  const strongEnough =
    facts.peerMedianRating !== null &&
    facts.rating >= facts.peerMedianRating + t.ratingGapAboveMedian;
  const idling =
    facts.openGateIdleDays !== null && facts.openGateIdleDays >= t.idleGateDays;

  return {
    code: "ARENA_Q02_AN_TAI_DAI_GIA",
    conditionMet: strongEnough && idling,
    // Xoá NGAY khi khởi thí. Đây là danh hiệu dễ xoá nhất trong cả nhóm, và cố
    // ý dễ: nó không tố cáo ai, nó chỉ nhắc rằng cửa đang mở.
    clearMet: facts.openGateIdleDays === null,
    explanation: "Xoá ngay khi bạn khởi thí Vũ Môn kế tiếp.",
  };
}

export function evaluateAnBinhBatDong(facts: TitleFacts): TitleVerdict {
  const t = ARENA_TITLE_THRESHOLDS.AN_BINH_BAT_DONG;
  const fullDuels = facts.duels.filter((d) => d.completedByMe).length;

  return {
    code: "ARENA_Q03_AN_BINH_BAT_DONG",
    conditionMet: facts.countableDeclines >= t.distinctChallengers,
    clearMet: fullDuels >= t.clearFullDuels,
    explanation: `Xoá khi nhận và đánh trọn ${t.clearFullDuels} trận. Hiện đã đánh trọn ${fullDuels}.`,
  };
}

export function evaluateLamTranThoatDao(facts: TitleFacts): TitleVerdict {
  const t = ARENA_TITLE_THRESHOLDS.LAM_TRAN_THOAT_DAO;
  const from = facts.now.getTime() - t.windowDays * 86_400_000;
  const abandons = facts.duels.filter(
    (d) => d.abandonedByMe && d.settledAt.getTime() >= from,
  ).length;

  // Đánh trọn LIÊN TIẾP, tính từ trận gần nhất ngược về.
  const ordered = facts.duels
    .slice()
    .sort((a, b) => b.settledAt.getTime() - a.settledAt.getTime());
  let streak = 0;
  for (const d of ordered) {
    if (!d.completedByMe) break;
    streak++;
  }

  return {
    code: "ARENA_Q04_LAM_TRAN_THOAT_DAO",
    conditionMet: abandons >= t.abandons,
    clearMet: streak >= t.clearConsecutiveFullDuels,
    explanation: `Xoá khi đánh trọn ${t.clearConsecutiveFullDuels} trận liên tiếp, thắng thua không kể. Hiện chuỗi đang là ${streak}.`,
  };
}

export function evaluateYCuongLangNhuoc(facts: TitleFacts): TitleVerdict {
  const t = ARENA_TITLE_THRESHOLDS.Y_CUONG_LANG_NHUOC;

  // CHỈ đếm trận do mình chủ động gửi chiến thư. Trận tự ghép do máy chọn đối
  // thủ ngang Chiến Lực, không phải lỗi của ai.
  const initiated = facts.duels
    .filter((d) => d.initiatedByMe)
    .sort((a, b) => b.settledAt.getTime() - a.settledAt.getTime());

  let consecutiveWeak = 0;
  for (const d of initiated) {
    if (d.opponentRating <= d.myRating - t.minRatingGap) consecutiveWeak++;
    else break;
  }

  const winsVsEqualOrStronger = facts.duels.filter(
    (d) => d.won && d.opponentRating >= d.myRating,
  ).length;

  return {
    code: "ARENA_Q05_Y_CUONG_LANG_NHUOC",
    conditionMet: consecutiveWeak >= t.consecutiveWeakerTargets,
    clearMet: winsVsEqualOrStronger >= t.clearWinsVsEqualOrStronger,
    explanation: `Xoá khi thắng ${t.clearWinsVsEqualOrStronger} trận trước đối thủ ngang hoặc mạnh hơn. Hiện đã thắng ${winsVsEqualOrStronger}.`,
  };
}

export function evaluateAll(facts: TitleFacts): TitleVerdict[] {
  return [
    evaluateDanhBatPhuThuc(facts),
    evaluateAnTaiDaiGia(facts),
    evaluateAnBinhBatDong(facts),
    evaluateLamTranThoatDao(facts),
    evaluateYCuongLangNhuoc(facts),
  ];
}

/* ===================== Bộ lọc thời gian ===================== */

export type WatchDecision =
  | { action: "START_WATCH"; since: Date }
  | { action: "AWARD" }
  | { action: "CLEAR_WATCH" }
  | { action: "HOLD" };

/**
 * Chỉ Danh Bất Phù Thực có bộ lọc thời gian, và nó là phần quan trọng nhất của
 * cả luật đó.
 *
 * Vận rủi thì thoáng qua, danh không xứng thực thì kéo dài. Không có bộ lọc
 * này, cứ 6 người ngay thẳng thì 1 người bị gắn danh hiệu công khai vì thuần
 * may rủi.
 */
export function decideWatch(input: {
  conditionMet: boolean;
  watchingSince: Date | null;
  now: Date;
  sustainedDays: number;
}): WatchDecision {
  if (!input.conditionMet) {
    return input.watchingSince ? { action: "CLEAR_WATCH" } : { action: "HOLD" };
  }
  if (!input.watchingSince) return { action: "START_WATCH", since: input.now };

  const days =
    (input.now.getTime() - input.watchingSince.getTime()) / 86_400_000;
  return days >= input.sustainedDays ? { action: "AWARD" } : { action: "HOLD" };
}
