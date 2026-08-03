/**
 * Phân tích sau kỳ thi — tìm dấu hiệu cấu kết giữa các thí sinh.
 *
 * ĐIỀU QUAN TRỌNG NHẤT PHẢI HIỂU TRƯỚC KHI ĐỌC CODE:
 *
 * Không tồn tại "bộ phát hiện AI" đáng tin cho đáp án trắc nghiệm. Một đáp án
 * đúng không cho biết người trả lời là người hay máy. Những gì tính được ở đây
 * chỉ là MẪU BẤT THƯỜNG, dùng để xếp thứ tự hồ sơ cho người thật xem — không bao
 * giờ tự đổi trạng thái của ai.
 *
 * Vì sao chỉ so đáp án SAI: hai thí sinh giỏi cùng chọn đúng cả 40 câu là chuyện
 * hoàn toàn bình thường và không nói lên điều gì. Nhưng cùng sai một kiểu, ở cùng
 * những câu, với cùng phương án sai — đó mới là thứ hiếm khi xảy ra ngẫu nhiên.
 *
 * Mọi đáp án đưa vào đây PHẢI đã quy về canonical ID. So sánh khi chưa quy chuẩn
 * sẽ tạo ra hàng loạt nghi ngờ sai vì mỗi người có thứ tự câu và phương án khác nhau.
 *
 * File thuần, kiểm thử bằng node.
 */

export type CanonicalItem = {
  questionId: string;
  answer: string;
  correct: boolean;
  /** Mốc thời gian thí sinh chốt đáp án này, tính bằng mili-giây. */
  answeredAtMs?: number;
};

export type CanonicalResult = {
  sessionId: string;
  userId: string;
  items: CanonicalItem[];
};

export type PairSignal = {
  aSessionId: string;
  bSessionId: string;
  /** Tỷ lệ trùng đáp án SAI trên tổng số câu ít nhất một bên sai. */
  wrongOverlap: number;
  sameWrongCount: number;
  eitherWrongCount: number;
  /** Số câu hai người chốt đáp án gần như cùng lúc. */
  timingMatches: number;
  comparableCount: number;
};

function indexByQuestion(result: CanonicalResult): Map<string, CanonicalItem> {
  return new Map(result.items.map((item) => [item.questionId, item]));
}

/**
 * Tỷ lệ trùng đáp án sai giữa hai bài làm.
 *
 * Mẫu số là số câu ít nhất một bên sai, không phải tổng số câu. Nếu lấy tổng số
 * câu, hai thí sinh giỏi cùng đúng 38/40 sẽ ra tỷ lệ thấp giả tạo và che mất
 * việc họ sai giống hệt nhau ở đúng 2 câu còn lại.
 */
export function wrongAnswerSimilarity(a: CanonicalResult, b: CanonicalResult): PairSignal {
  const bByQuestion = indexByQuestion(b);
  let sameWrong = 0;
  let eitherWrong = 0;
  let timingMatches = 0;
  let comparable = 0;

  for (const itemA of a.items) {
    const itemB = bByQuestion.get(itemA.questionId);
    if (!itemB) continue;
    comparable += 1;

    if (!itemA.correct || !itemB.correct) eitherWrong += 1;
    if (!itemA.correct && !itemB.correct && itemA.answer === itemB.answer) sameWrong += 1;

    if (itemA.answeredAtMs !== undefined && itemB.answeredAtMs !== undefined) {
      // 3 giây: đủ hẹp để loại trùng ngẫu nhiên trong bài 60 phút, đủ rộng để
      // vẫn bắt được trường hợp một người đọc đáp án cho người kia chép.
      if (Math.abs(itemA.answeredAtMs - itemB.answeredAtMs) <= 3_000) timingMatches += 1;
    }
  }

  return {
    aSessionId: a.sessionId,
    bSessionId: b.sessionId,
    wrongOverlap: eitherWrong === 0 ? 0 : sameWrong / eitherWrong,
    sameWrongCount: sameWrong,
    eitherWrongCount: eitherWrong,
    timingMatches,
    comparableCount: comparable,
  };
}

/**
 * Ngưỡng đánh dấu một cặp đáng xem.
 *
 * Cố ý đặt cao và yêu cầu ĐỦ SỐ LƯỢNG TUYỆT ĐỐI chứ không chỉ tỷ lệ: hai người
 * cùng sai 2 câu và trùng cả 2 cho ra tỷ lệ 100% nhưng chẳng chứng minh được gì
 * — trên đề 40 câu, trùng 2 câu sai là chuyện thường ngày.
 */
export const SIMILARITY_THRESHOLDS = {
  minSameWrong: 6,
  minWrongOverlap: 0.6,
  minTimingMatches: 12,
} as const;

export function isSuspiciousPair(signal: PairSignal): boolean {
  const overlapFlag =
    signal.sameWrongCount >= SIMILARITY_THRESHOLDS.minSameWrong &&
    signal.wrongOverlap >= SIMILARITY_THRESHOLDS.minWrongOverlap;
  const timingFlag = signal.timingMatches >= SIMILARITY_THRESHOLDS.minTimingMatches;
  return overlapFlag || timingFlag;
}

/**
 * So tất cả các cặp trong một kỳ thi.
 *
 * Với 30 thí sinh chỉ có 435 cặp, và kể cả 200 người cũng chỉ 19.900 cặp — nhẹ,
 * chạy trực tiếp được, không cần tối ưu gì thêm.
 */
export function analyzeCompetition(results: CanonicalResult[]): {
  pairs: PairSignal[];
  suspicious: PairSignal[];
} {
  const pairs: PairSignal[] = [];
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      pairs.push(wrongAnswerSimilarity(results[i], results[j]));
    }
  }
  const suspicious = pairs
    .filter(isSuspiciousPair)
    .sort((a, b) => b.wrongOverlap - a.wrongOverlap);
  return { pairs, suspicious };
}

/**
 * Cờ "điểm cao bất thường so với thời gian làm".
 *
 * So với chính nhóm thi cùng đề chứ không so với một hằng số cố định: đề dễ thì
 * cả nhóm đều nhanh, và như vậy nhanh không còn là điều bất thường.
 */
export function flagFastHighScorers(input: {
  entries: Array<{ sessionId: string; durationMs: number; scorePercent: number }>;
}): string[] {
  const { entries } = input;
  if (entries.length < 5) return [];

  const durations = entries.map((e) => e.durationMs).sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length / 2)];

  return entries
    .filter((e) => e.durationMs <= median * 0.5 && e.scorePercent >= 0.9)
    .map((e) => e.sessionId);
}

/**
 * Danh sách bắt buộc rà soát thủ công trước khi chốt giải.
 *
 * Top 10 luôn phải rà kể cả khi hệ thống báo sạch. Lý do đơn giản: đây là những
 * người nhận tiền, và một giải trao nhầm gây thiệt hại lớn hơn nhiều so với công
 * sức xem lại vài hồ sơ.
 */
export function mandatoryReviewSessions(input: {
  ranked: Array<{ sessionId: string; integrityStatus: string }>;
  topN?: number;
}): string[] {
  const topN = input.topN ?? 10;
  const required = new Set<string>();
  input.ranked.slice(0, topN).forEach((entry) => required.add(entry.sessionId));
  input.ranked
    .filter((entry) => entry.integrityStatus !== "CLEAR")
    .forEach((entry) => required.add(entry.sessionId));
  return [...required];
}
