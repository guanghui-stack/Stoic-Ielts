/**
 * Liêm chính đấu trường — HÀM THUẦN, không chạm database.
 *
 * Xem `docs/DAC-TA-DAU-TRUONG.md` mục 08.
 *
 * RANH GIỚI ĐÃ CÓ SẴN TRONG CODE, chép nguyên từ `lib/integrity/similarity.ts`:
 *
 *   "chỉ là MẪU BẤT THƯỜNG, dùng để xếp thứ tự hồ sơ cho người thật xem, không
 *    bao giờ tự đổi trạng thái của ai."
 *
 * File này KHÔNG kết luận ai gian lận. Nó xếp thứ tự hồ sơ để người xét duyệt
 * xem cái đáng ngờ nhất trước. Mọi hàm ở đây trả về ĐIỂM NGHI VẤN và LÝ DO, và
 * không hàm nào trả về `true` cho câu hỏi "người này có gian lận không".
 *
 * Một danh hiệu tiêu cực công khai chính là đổi trạng thái của một người trước
 * mặt tất cả bạn học. Việc đó cần một con người bấm nút, và tên người đó được
 * ghi lại.
 */

export const INTEGRITY_RULE_VERSION = "2026-08-21-v1";

/* ===================== Bốn tín hiệu ===================== */

export type SignalStrength = "HIGH" | "MEDIUM";

export type Signal = {
  code:
    | "SAME_WRONG_ANSWERS"
    | "IMPOSSIBLY_FAST"
    | "ABILITY_JUMP"
    | "REPEATED_PAIRING";
  strength: SignalStrength;
  /** 0 tới 1. Chỉ dùng để XẾP THỨ TỰ, không phải xác suất gian lận. */
  score: number;
  /** Câu người xét duyệt đọc. Phải nói được con số, không chỉ nói "đáng ngờ". */
  detail: string;
};

export const SIGNAL_LABEL: Readonly<Record<Signal["code"], string>> = {
  SAME_WRONG_ANSWERS: "Trùng đáp án sai",
  IMPOSSIBLY_FAST: "Nhanh bất khả thi",
  ABILITY_JUMP: "Đột biến năng lực",
  REPEATED_PAIRING: "Lặp cặp đấu",
};

/**
 * Độ tin của từng tín hiệu, theo bảng ở đặc tả mục 08.
 *
 * "Cao" nghĩa là một mình nó đã đáng xem hồ sơ. "Trung bình" nghĩa là cần nhiều
 * lần mới chắc, và không bao giờ đủ để kết luận một mình.
 */
export const SIGNAL_STRENGTH: Readonly<Record<Signal["code"], SignalStrength>> = {
  SAME_WRONG_ANSWERS: "HIGH",
  IMPOSSIBLY_FAST: "HIGH",
  ABILITY_JUMP: "MEDIUM",
  REPEATED_PAIRING: "MEDIUM",
};

/* ===================== 1. Trùng đáp án sai ===================== */

/**
 * Hai người cùng sai một kiểu là hiếm.
 *
 * Cùng ĐÚNG thì không nói lên gì: đáp án đúng chỉ có một. Cùng SAI cùng một
 * phương án thì mới đáng chú ý, vì mỗi câu có ba cách sai khác nhau.
 */
export function sameWrongAnswers(input: {
  /** Với mỗi câu: hai lựa chọn, và đáp án đúng. */
  items: readonly { a: number | null; b: number | null; correct: number }[];
}): Signal | null {
  const bothWrong = input.items.filter(
    (i) => i.a !== null && i.b !== null && i.a !== i.correct && i.b !== i.correct,
  );
  if (bothWrong.length === 0) return null;

  const identical = bothWrong.filter((i) => i.a === i.b).length;
  const ratio = identical / bothWrong.length;

  // Ngẫu nhiên, hai người cùng sai sẽ trùng phương án khoảng một phần ba lần,
  // vì mỗi câu bốn lựa chọn thì có ba cách sai. Dưới mức đó là bình thường.
  if (identical < 3 || ratio < 0.6) return null;

  return {
    code: "SAME_WRONG_ANSWERS",
    strength: SIGNAL_STRENGTH.SAME_WRONG_ANSWERS,
    score: Math.min(1, ratio),
    detail: `Trùng ${identical} trên ${bothWrong.length} câu cùng sai, tức ${Math.round(ratio * 100)} phần trăm. Ngẫu nhiên thì khoảng 33 phần trăm.`,
  };
}

/* ===================== 2. Nhanh bất khả thi ===================== */

/**
 * Sàn thời gian tính từ SỐ TỪ của đoạn văn, không phải một con số cố định.
 *
 * Người đọc nhanh nhất cũng cần thời gian để mắt đi hết đoạn văn. Đặt sàn theo
 * số từ thì đề dài và đề ngắn đều được xét đúng, còn một mốc cố định thì hoặc
 * quá lỏng với đề dài hoặc quá chặt với đề ngắn.
 *
 * 700 từ mỗi phút là tốc độ đọc lướt của người rất giỏi. Không ai trả lời được
 * trước khi kịp đọc.
 */
export const MAX_PLAUSIBLE_WPM = 700;

export function impossiblyFast(input: {
  passageWords: number;
  elapsedMs: number;
  score: number;
  total: number;
}): Signal | null {
  if (input.elapsedMs <= 0 || input.passageWords <= 0) return null;

  const minutes = input.elapsedMs / 60_000;
  const wpm = input.passageWords / minutes;
  if (wpm <= MAX_PLAUSIBLE_WPM) return null;

  // Nhanh mà làm sai nhiều thì chỉ là bỏ cuộc, không phải gian lận. Đoán bừa
  // rồi nộp sớm là hành vi bình thường của người chán, và phạt họ là sai.
  const accuracy = input.total > 0 ? input.score / input.total : 0;
  if (accuracy < 0.7) return null;

  return {
    code: "IMPOSSIBLY_FAST",
    strength: SIGNAL_STRENGTH.IMPOSSIBLY_FAST,
    score: Math.min(1, wpm / (MAX_PLAUSIBLE_WPM * 2)),
    detail: `Đọc ${input.passageWords} từ trong ${(minutes).toFixed(1)} phút, tức ${Math.round(wpm)} từ mỗi phút, mà vẫn đúng ${Math.round(accuracy * 100)} phần trăm.`,
  };
}

/* ===================== 3. Đột biến năng lực ===================== */

/**
 * Độ chính xác TRONG TRẬN vượt xa độ chính xác LUYỆN TẬP của chính người đó.
 *
 * So người ta với chính họ chứ không so với người khác. So với người khác là
 * phạt người giỏi, mà giỏi không phải tội.
 *
 * Độ tin TRUNG BÌNH: cần nhiều trận mới chắc. Một trận xuất thần là chuyện có
 * thật, và ai cũng có ngày đẹp trời.
 */
export function abilityJump(input: {
  practiceAccuracy: number;
  duelAccuracy: number;
  duelsCounted: number;
}): Signal | null {
  if (input.duelsCounted < 3) return null;

  const gap = input.duelAccuracy - input.practiceAccuracy;
  if (gap < 0.25) return null;

  return {
    code: "ABILITY_JUMP",
    strength: SIGNAL_STRENGTH.ABILITY_JUMP,
    score: Math.min(1, gap / 0.5),
    detail: `Trong trận đúng ${Math.round(input.duelAccuracy * 100)} phần trăm, luyện tập đúng ${Math.round(input.practiceAccuracy * 100)} phần trăm, chênh ${Math.round(gap * 100)} điểm trên ${input.duelsCounted} trận.`,
  };
}

/* ===================== 4. Lặp cặp đấu ===================== */

/**
 * Một cặp gặp nhau quá nhiều lần, kèm mẫu thắng luân phiên.
 *
 * Luân phiên mới là phần đáng chú ý: hai người cày cho nhau sẽ thay nhau thắng
 * để cả hai cùng lên, còn hai người thật đấu nhiều thì kết quả lệch về một bên.
 *
 * Độ tin TRUNG BÌNH, và cố ý thấp: cơ chế huỷ và phát cộng với luật giảm dần
 * theo đối thủ đã làm việc cày này thành vô ích. Tín hiệu này chỉ để nhìn, đa
 * phần sẽ là hai người bạn thích đấu với nhau.
 */
export function repeatedPairing(input: {
  meetings: number;
  windowDays: number;
  /** Chuỗi thắng thua theo thứ tự thời gian, `true` là bên A thắng. */
  outcomes: readonly boolean[];
}): Signal | null {
  if (input.meetings < 8) return null;

  let alternations = 0;
  for (let i = 1; i < input.outcomes.length; i++) {
    if (input.outcomes[i] !== input.outcomes[i - 1]) alternations++;
  }
  const rate =
    input.outcomes.length > 1 ? alternations / (input.outcomes.length - 1) : 0;
  if (rate < 0.7) return null;

  return {
    code: "REPEATED_PAIRING",
    strength: SIGNAL_STRENGTH.REPEATED_PAIRING,
    score: Math.min(1, (input.meetings / 20) * rate),
    detail: `Gặp nhau ${input.meetings} lần trong ${input.windowDays} ngày, thắng thua luân phiên ${Math.round(rate * 100)} phần trăm số lần.`,
  };
}

/* ===================== Xếp thứ tự hồ sơ ===================== */

export type CaseRanking = {
  /** 0 tới 1. CHỈ để xếp thứ tự, KHÔNG phải xác suất gian lận. */
  priority: number;
  signals: readonly Signal[];
  /** Có đáng đưa vào hàng chờ người xem không. */
  worthReviewing: boolean;
};

/**
 * Xếp thứ tự hồ sơ cho người xét duyệt.
 *
 * Một tín hiệu độ tin CAO là đủ để đưa vào hàng chờ. Hai tín hiệu TRUNG BÌNH
 * cũng đủ. Một tín hiệu trung bình đứng một mình thì không: đó là mức mà người
 * ngay thẳng chạm tới thường xuyên, và bắt người xét duyệt đọc những hồ sơ đó
 * là cách chắc chắn nhất khiến họ ngừng đọc kỹ.
 *
 * KHÔNG có ngưỡng nào ở đây tự động gắn danh hiệu hay khoá tài khoản. Hàm này
 * chỉ trả về thứ tự.
 */
export function rankCase(signals: readonly Signal[]): CaseRanking {
  const high = signals.filter((s) => s.strength === "HIGH").length;
  const medium = signals.filter((s) => s.strength === "MEDIUM").length;

  const priority = Math.min(
    1,
    signals.reduce(
      (sum, s) => sum + s.score * (s.strength === "HIGH" ? 1 : 0.4),
      0,
    ) / 2,
  );

  return {
    priority,
    signals,
    worthReviewing: high >= 1 || medium >= 2,
  };
}
