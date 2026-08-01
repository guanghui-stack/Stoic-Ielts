/**
 * Quy đổi điểm thô Reading sang band — HÀM THUẦN, không chạm database.
 *
 * Vì sao không dùng thẳng phần trăm: danh hiệu đặt mốc theo band (8.0, 8.5)
 * chứ không theo phần trăm. Trong đề IELTS thật, 87% số câu đúng KHÔNG phải
 * band 8.7 — bảng quy đổi không tuyến tính. Dùng phần trăm làm band là nói dối
 * học viên về trình độ của họ, và làm hỏng mọi điều kiện danh hiệu.
 *
 * Mỗi lượt làm bài đều ghi lại `bandScaleVersion` để sau này biết band đó tính
 * theo thang nào — đổi thang không làm sai lệch lịch sử đã có.
 */

export type BandCutoff = { minRaw: number; band: number };

export type BandScale = {
  scaleVersion: string;
  bandMap: BandCutoff[];
};

export type ScoredReadingContent = {
  scoring?: { scaleVersion?: string; bandMap?: BandCutoff[] };
};

/**
 * Bảng quy đổi Academic Reading 40 câu của IELTS.
 *
 * Đề của trung tâm thường ngắn hơn 40 câu. Cách xử lý là quy đổi ĐIỂM CỦA HỌC
 * VIÊN về thang 40 câu rồi tra bảng này, chứ KHÔNG co giãn các mốc trong bảng.
 *
 * Vì sao: co giãn mốc rồi làm tròn khiến hai band cạnh nhau dồn vào cùng một số
 * câu — với đề 14 câu, cả 8.5 lẫn 8.0 đều rơi vào 13 câu, nên band 8.0 vĩnh
 * viễn không ai đạt được. Quy đổi điểm thì mọi mốc đều nhất quán và giải thích
 * được cho học viên: "em đúng 12/14, tương đương 34/40 của đề thật".
 *
 * Giáo viên có thể đè lên bằng `content.scoring` riêng cho từng đề; khi đó
 * thang riêng luôn được ưu tiên.
 */
const OFFICIAL_AR_40: BandCutoff[] = [
  { minRaw: 39, band: 9.0 },
  { minRaw: 37, band: 8.5 },
  { minRaw: 35, band: 8.0 },
  { minRaw: 33, band: 7.5 },
  { minRaw: 30, band: 7.0 },
  { minRaw: 27, band: 6.5 },
  { minRaw: 23, band: 6.0 },
  { minRaw: 19, band: 5.5 },
  { minRaw: 15, band: 5.0 },
  { minRaw: 13, band: 4.5 },
  { minRaw: 10, band: 4.0 },
  { minRaw: 8, band: 3.5 },
  { minRaw: 6, band: 3.0 },
  { minRaw: 4, band: 2.5 },
  { minRaw: 0, band: 0 },
];

export const DEFAULT_SCALE_VERSION = "WOBRIDGES_IELTS_AR_V1";

/** Tra một bảng mốc bất kỳ: mốc cao nhất mà điểm thô vượt qua. */
function lookup(bandMap: BandCutoff[], raw: number): number | null {
  const sorted = [...bandMap].sort((a, b) => b.minRaw - a.minRaw);
  return sorted.find((row) => raw >= row.minRaw)?.band ?? null;
}

/** Thang riêng của đề, chỉ khi khai báo đầy đủ và hợp lệ. */
export function resolveBandScale(
  content: ScoredReadingContent | null | undefined
): BandScale | null {
  const custom = content?.scoring;
  const valid =
    custom &&
    Array.isArray(custom.bandMap) &&
    custom.bandMap.length > 0 &&
    custom.bandMap.every(
      (row) =>
        typeof row?.minRaw === "number" &&
        typeof row?.band === "number" &&
        row.minRaw >= 0 &&
        row.band >= 0 &&
        row.band <= 9
    );
  if (!valid) return null;
  return {
    scaleVersion: custom.scaleVersion?.trim() || "CUSTOM",
    bandMap: custom.bandMap as BandCutoff[],
  };
}

/**
 * Quy đổi số câu đúng sang band.
 * Trả về null khi đề không có câu nào — không đoán bừa một con số.
 */
export function calculateReadingBand(
  content: ScoredReadingContent | null | undefined,
  raw: number,
  total: number
): { band: number; scaleVersion: string } | null {
  if (!Number.isFinite(raw) || !Number.isFinite(total) || total <= 0) return null;
  const clamped = Math.max(0, Math.min(raw, total));

  const custom = resolveBandScale(content);
  if (custom) {
    const band = lookup(custom.bandMap, clamped);
    return band === null ? null : { band, scaleVersion: custom.scaleVersion };
  }

  // Quy đổi về thang 40 câu rồi tra bảng gốc. Làm tròn XUỐNG để không rộng tay
  // — thà báo thấp hơn nửa band còn hơn thổi phồng trình độ của học viên.
  const equivalent = Math.floor((clamped * 40) / total);
  const band = lookup(OFFICIAL_AR_40, equivalent);
  return band === null
    ? null
    : { band, scaleVersion: `${DEFAULT_SCALE_VERSION}:${total}` };
}

/**
 * Bảng "đúng bao nhiêu câu thì được band nào" của một đề cụ thể — để hiển thị
 * cho giáo viên và học viên.
 *
 * Dựng bằng cách chạy thử mọi số điểm có thể, nên bảng này LUÔN khớp với cách
 * chấm thật. Band nào đề quá ngắn không thể chạm tới thì đơn giản là không xuất
 * hiện, thay vì hiện ra một mốc không ai đạt được.
 */
export function bandTableFor(
  content: ScoredReadingContent | null | undefined,
  total: number
): Array<{ minRaw: number; band: number }> {
  if (total <= 0) return [];
  const firstRawForBand = new Map<number, number>();
  for (let raw = 0; raw <= total; raw++) {
    const result = calculateReadingBand(content, raw, total);
    if (!result) continue;
    if (!firstRawForBand.has(result.band)) firstRawForBand.set(result.band, raw);
  }
  return [...firstRawForBand.entries()]
    .map(([band, minRaw]) => ({ band, minRaw }))
    .sort((a, b) => b.band - a.band);
}

/**
 * Lượt làm bài này có được tính cho danh hiệu không.
 *
 * Đây là hàng rào chống cày danh hiệu. Mọi điều kiện đều nhằm một việc: chỉ
 * công nhận lần làm bài NGHIÊM TÚC. Nộp bừa, bỏ trống quá nửa, hoặc bấm nộp
 * sau vài giây đều không được tính — nếu tính, danh hiệu sẽ mất hết ý nghĩa
 * và người học nghiêm túc là người thiệt.
 */
export function isValidAchievementAttempt(input: {
  status: string;
  achievementEligible: boolean;
  band: number | null;
  answeredCount: number | null;
  scoreTotal: number | null;
  elapsedSeconds: number | null;
  durationMinutes: number;
  integrityStatus: string;
}): boolean {
  if (input.status !== "GRADED") return false;
  if (!input.achievementEligible) return false;
  if (input.band === null) return false;
  if (input.integrityStatus !== "CLEAR") return false;

  if (!input.scoreTotal || input.scoreTotal <= 0) return false;
  const answered = input.answeredCount ?? 0;
  if (answered / input.scoreTotal < 0.5) return false;

  // Ngưỡng thời gian tối thiểu: 15% thời lượng đề, nhưng không quá 5 phút —
  // đề 60 phút không cần ngồi đủ 9 phút mới được công nhận.
  const minSeconds = Math.min(300, Math.round(input.durationMinutes * 60 * 0.15));
  return (input.elapsedSeconds ?? 0) >= minSeconds;
}
