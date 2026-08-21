/**
 * Chiến Lực, ghép cặp, Quy Điền — HÀM THUẦN, không chạm database.
 *
 * Xem `docs/DAC-TA-DAU-TRUONG.md` mục 05.
 *
 * VÌ SAO GHÉP BẰNG CHIẾN LỰC CHỨ KHÔNG BẰNG CẤP BẬC. Kinh nghiệm chỉ tăng và
 * cấp bậc không tụt, nên cấp bậc là hàm của THỜI GIAN, không phải của NĂNG LỰC.
 * Ghép theo cấp bậc sẽ đẩy người chăm mà yếu lên đấu với người cấp cao thật sự
 * mạnh, họ thua liên tục, rồi bị gắn Danh Bất Phù Thực. Hệ thống tự tạo ra tội
 * rồi trừng phạt người ta vì nó.
 *
 * Cấp bậc là huy hiệu hành trình. Chiến Lực làm việc ghép đôi.
 */

export const RATING_RULE_VERSION = "2026-08-21-v1";

/* ===================== Thang Chiến Lực ===================== */

/**
 * Điểm khởi đầu, và cũng là SÀN mà Quy Điền trôi tới.
 *
 * Hai vai trò trùng nhau là có chủ ý, xem `quyDienDrift`.
 */
export const BASE_RATING = 1000;

/** Dưới ngưỡng này còn là người mới, biến động mạnh hơn cho mau về đúng chỗ. */
export const PROVISIONAL_DUELS = 10;
export const K_PROVISIONAL = 40;
export const K_SETTLED = 24;

export function kFactor(duelsPlayed: number): number {
  return duelsPlayed < PROVISIONAL_DUELS ? K_PROVISIONAL : K_SETTLED;
}

/**
 * Xác suất thắng kỳ vọng theo chênh lệch Chiến Lực. Thang Elo chuẩn.
 *
 * Chênh 0 là 50%, chênh 100 là 64%, chênh 300 là 85%.
 */
export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

export type RatingChange = {
  before: number;
  after: number;
  delta: number;
};

/**
 * Chiến Lực sau một trận.
 *
 * `outcome`: 1 thắng, 0 thua, 0.5 hoà. Giảng hoà KHÔNG gọi hàm này, vì giảng
 * hoà trung tính ở mọi chiều kể cả Chiến Lực.
 *
 * Luôn trả về số nguyên: một bảng xếp hạng có số lẻ thì không ai đọc được, mà
 * độ chính xác dưới một điểm cũng không mang thông tin nào.
 */
export function applyDuelResult(input: {
  rating: number;
  opponentRating: number;
  duelsPlayed: number;
  outcome: 0 | 0.5 | 1;
}): RatingChange {
  const k = kFactor(input.duelsPlayed);
  const expected = expectedScore(input.rating, input.opponentRating);
  const delta = Math.round(k * (input.outcome - expected));
  return {
    before: input.rating,
    after: Math.max(0, input.rating + delta),
    delta,
  };
}

/* ===================== Quy Điền ===================== */

/**
 * Chiến Lực trôi xuống bao nhiêu mỗi ngày khi đang Quy Điền.
 *
 * Số nhỏ là có chủ ý: đây là cái giá của việc tạm rút, không phải hình phạt.
 * Người nghỉ ba tuần mất khoảng 40 điểm, đủ để thấy nhưng không đủ để sợ.
 */
export const QUY_DIEN_DRIFT_PER_DAY = 2;

/**
 * Trôi MỘT CHIỀU: chỉ xuống, và có SÀN ở `BASE_RATING`.
 *
 * ĐỌC KỸ VÌ SAO CÓ SÀN. Nếu Chiến Lực trôi về trung vị thì người đang thua sấp
 * mặt sẽ được KÉO LÊN: chỉ cần bấm Quy Điền, ngồi im vài tuần, rồi quay lại
 * sạch sẽ. Cái giá đặt ra để phạt kẻ trốn lại hoá thành phần thưởng cho đúng
 * người cần bắt.
 *
 * Sàn ở đúng điểm khởi đầu làm được cả hai vế của đặc tả cùng lúc: người mạnh
 * mất dần danh tiếng, người yếu giữ nguyên chỗ đang đứng vì họ vốn đã ở dưới
 * sàn rồi.
 */
export function quyDienDrift(input: {
  rating: number;
  daysWithdrawn: number;
}): number {
  if (input.daysWithdrawn <= 0) return input.rating;
  if (input.rating <= BASE_RATING) return input.rating;
  const drifted = input.rating - QUY_DIEN_DRIFT_PER_DAY * input.daysWithdrawn;
  return Math.max(BASE_RATING, drifted);
}

/** Điều gì tắt khi Quy Điền. Khai thành dữ liệu để màn hình và máy chủ đọc chung. */
export const QUY_DIEN_EFFECTS = {
  /** Không ai thách được, và lời từ chối không được đếm. */
  challengeable: false,
  /** Biến khỏi bảng xếp hạng. */
  onLeaderboard: false,
  /** Không kiếm được điểm phe. */
  earnsFactionPoints: false,
  /** Chiến Lực chỉ trôi xuống. */
  ratingDriftsDownOnly: true,
} as const;

/* ===================== Ghép cặp tự động ===================== */

export const MATCH_BAND_START = 50;
export const MATCH_BAND_STEP = 50;
export const MATCH_BAND_STEP_SECONDS = 15;
export const MATCH_BAND_MAX = 300;

/**
 * Dải Chiến Lực chấp nhận được sau khi chờ `waitedSeconds`.
 *
 * Nới dần thay vì mở toang ngay: người vào hàng đợi lúc sân đông sẽ gặp đối thủ
 * ngang sức, người chờ lâu vì sân vắng thì thà gặp lệch còn hơn không gặp ai.
 * Chạm trần sau 75 giây.
 */
export function matchBand(waitedSeconds: number): number {
  if (waitedSeconds < 0) return MATCH_BAND_START;
  const steps = Math.floor(waitedSeconds / MATCH_BAND_STEP_SECONDS);
  return Math.min(MATCH_BAND_MAX, MATCH_BAND_START + MATCH_BAND_STEP * steps);
}

export type QueueEntry = {
  userId: string;
  rating: number;
  waitedSeconds: number;
  /** Đối thủ đã gặp hôm nay, để ưu tiên người mới. */
  metToday: ReadonlySet<string>;
};

/**
 * Tìm đối thủ cho người đứng đầu hàng đợi.
 *
 * Hai luật, theo thứ tự:
 *
 * 1. **Phải nằm trong dải của CẢ HAI.** Người chờ lâu có dải rộng, người vừa
 *    vào có dải hẹp; ghép mà chỉ xét dải của một bên thì người vừa vào bị kéo
 *    vào một trận lệch hẳn mà họ không đồng ý.
 * 2. **Ưu tiên người CHƯA gặp hôm nay.** Kinh nghiệm giảm dần theo đối thủ
 *    (mục 02) đã làm việc cày thành vô ích, nhưng đẩy người ta đi tìm đối thủ
 *    mới ngay từ khâu ghép thì tốt hơn là để họ gặp lại rồi mới thất vọng.
 */
export function findOpponent(
  seeker: QueueEntry,
  pool: readonly QueueEntry[],
): QueueEntry | null {
  const seekerBand = matchBand(seeker.waitedSeconds);

  const eligible = pool.filter((c) => {
    if (c.userId === seeker.userId) return false;
    const gap = Math.abs(c.rating - seeker.rating);
    return gap <= seekerBand && gap <= matchBand(c.waitedSeconds);
  });
  if (eligible.length === 0) return null;

  const fresh = eligible.filter(
    (c) => !seeker.metToday.has(c.userId) && !c.metToday.has(seeker.userId),
  );
  const candidates = fresh.length > 0 ? fresh : eligible;

  // Trong số hợp lệ, chọn người GẦN NHẤT về Chiến Lực.
  return candidates.reduce((best, c) =>
    Math.abs(c.rating - seeker.rating) < Math.abs(best.rating - seeker.rating) ? c : best,
  );
}

/* ===================== Giờ điểm binh ===================== */

/**
 * Khung giờ cố định công bố trước, thưởng thêm trong khung đó.
 *
 * Đấu trường đồng thời cần hai người online cùng lúc trong 10 tới 15 phút, mà
 * học viên IELTS học rải rác cả ngày. **Rủi ro lớn nhất của cả tính năng là sân
 * rỗng, và nó là rủi ro sản phẩm chứ không phải kỹ thuật.** Dồn dân số vào một
 * khung thay vì rải đều là cách rẻ nhất để chữa.
 *
 * Giờ Việt Nam. Hai khung: tối muộn sau giờ học thêm, và trưa cuối tuần.
 */
export const MUSTER_WINDOWS = [
  { startHour: 20, endHour: 22, label: "Điểm binh buổi tối" },
  { startHour: 10, endHour: 12, label: "Điểm binh buổi trưa" },
] as const;

/** Thưởng thêm phần trăm kinh nghiệm trong khung giờ điểm binh. */
export const MUSTER_XP_BONUS = 0.25;

export function musterWindowAt(hourVN: number): (typeof MUSTER_WINDOWS)[number] | null {
  return (
    MUSTER_WINDOWS.find((w) => hourVN >= w.startHour && hourVN < w.endHour) ?? null
  );
}

export function musterMultiplier(hourVN: number): number {
  return musterWindowAt(hourVN) ? 1 + MUSTER_XP_BONUS : 1;
}

/* ===================== Có mặt ở đấu trường ===================== */

/**
 * Bao lâu không thấy tín hiệu thì coi như đã rời sân.
 *
 * Dùng nhịp tim và mốc `lastSeenAt` chứ KHÔNG dùng trạng thái kết nối. Đặc tả
 * mục 04 đã chốt: mạng 4G rớt thật, cuộc gọi đến cũng làm trình duyệt ngủ, và
 * logic dò mất kết nối rất khó tin cậy trên Hostinger. Một mốc thời gian thì
 * luôn đọc được, kể cả sau khi máy chủ khởi động lại.
 */
export const PRESENCE_TTL_SECONDS = 45;
export const PRESENCE_HEARTBEAT_SECONDS = 15;

export function isPresent(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() < PRESENCE_TTL_SECONDS * 1000;
}

/* ===================== Dân số bot ===================== */

export const BOT_FLOOR = 5;
export const BOT_CAP = 30;
export const BOT_MAX_SHARE = 0.25;

/**
 * Nên có bao nhiêu bot đang có mặt, khi có `humansPresent` người thật.
 *
 * Sàn 5 giữ vĩnh viễn cho khung giờ vắng, và nó CỐ Ý thắng luật 25% lúc mới ra
 * mắt: khi chỉ có vài người thật thì tỷ lệ bot cao là chuyện phải chấp nhận,
 * vì thà sân có người còn hơn sân rỗng. Luật 25% chỉ bắt đầu có hiệu lực khi
 * dân số thật vượt khoảng 20 người.
 *
 * Vượt trần thì bot dư chuyển sang Quy Điền, tức rút qua ĐÚNG CỬA mà người thật
 * dùng. Không cần code đặc biệt, và nhìn từ ngoài y hệt một người bận việc tạm
 * nghỉ.
 */
export function targetBotCount(humansPresent: number): number {
  const byShare = Math.floor((humansPresent * BOT_MAX_SHARE) / (1 - BOT_MAX_SHARE));
  return Math.min(BOT_CAP, Math.max(BOT_FLOOR, byShare));
}

/**
 * Bot có được sinh điểm phe không. KHÔNG.
 *
 * Nhưng VẪN tính Chiến Lực, vì lúc mới ra mắt bot là phần lớn dân số và người
 * mới phải có cách định vị thực lực. Xem đặc tả mục 06.
 */
export const BOT_RULES = {
  earnsFactionPoints: false,
  affectsRating: true,
  /** Không để máy quyết định một danh hiệu công khai dựa trên kết quả với máy. */
  countsForTitleDanhBatPhuThuc: false,
  /** Giấu trong bảng đấu là vô hại, giấu trong một cuộc trò chuyện thì không. */
  allowedInChat: false,
} as const;

/* ===================== Bot đánh như thế nào ===================== */

/**
 * Độ chính xác của bot, suy từ chính Chiến Lực của nó.
 *
 * HỆ SỐ NÀY KHÔNG PHẢI ĐOÁN. Đặc tả mục 06 đòi "thắng bot khó ĐÚNG BẰNG thắng
 * người cùng Chiến Lực". Với đề 13 câu và điểm phân phối nhị thức, hệ số 0.00068
 * mỗi điểm cho ra xác suất thắng khớp thang Elo trong sai số dưới 0.5 điểm phần
 * trăm:
 *
 *   chênh Chiến Lực    mô phỏng    Elo kỳ vọng
 *          0             50.0%        50.0%
 *         50             56.8%        57.1%
 *        100             63.5%        64.0%
 *        200             75.7%        76.0%
 *        300             85.6%        84.9%
 *
 * Đổi hệ số thì phải tính lại bảng trên. Đặt cao hơn thì bot mạnh thành bất khả
 * chiến bại và lộ ngay; đặt thấp hơn thì Chiến Lực của bot nói dối về sức nó.
 */
export const BOT_ACCURACY_PER_RATING = 0.00068;
export const BOT_ACCURACY_MIN = 0.18;
export const BOT_ACCURACY_MAX = 0.92;

export function botAccuracy(rating: number): number {
  const raw = 0.5 + (rating - BASE_RATING) * BOT_ACCURACY_PER_RATING;
  return Math.max(BOT_ACCURACY_MIN, Math.min(BOT_ACCURACY_MAX, raw));
}

/**
 * Điểm bot làm được trên một đề `total` câu.
 *
 * `roll` là hàm sinh số ngẫu nhiên, truyền từ ngoài vào để kiểm thử được: bài
 * kiểm thử truyền hàm tất định, máy chủ thật truyền `Math.random`.
 */
export function botScore(
  rating: number,
  total: number,
  roll: () => number,
): number {
  const p = botAccuracy(rating);
  let correct = 0;
  for (let i = 0; i < total; i++) if (roll() < p) correct++;
  return correct;
}

/**
 * Bot này có online vào giờ này không.
 *
 * Mười cái tên luôn có mặt, không bao giờ ngủ, nhịp đều tăm tắp thì lộ trong
 * một tuần. Nên mỗi bot có một khung giờ RIÊNG, suy từ số thứ tự của nó, và
 * khung đó lệch nhau giữa các bot.
 *
 * Mỗi bot thức khoảng 9 tiếng mỗi ngày, và không bot nào thức cùng khung với
 * bot liền kề.
 */
export function botOnlineAt(botIndex: number, hourVN: number): boolean {
  const start = (botIndex * 7 + 6) % 24;
  const span = 9;
  const offset = (hourVN - start + 24) % 24;
  return offset < span;
}

/**
 * Bot nghĩ bao lâu trước khi nhận chiến thư, và bao lâu trước khi nộp bài.
 *
 * Nhận lời tức khắc là dấu hiệu lộ rõ thứ hai sau Chiến Lực trùng nhau. Nộp bài
 * đúng một mốc thời gian cố định cũng vậy.
 */
export function botAcceptDelaySeconds(roll: () => number): number {
  return 4 + Math.floor(roll() * 22);
}

export function botSubmitAfterSeconds(
  durationSeconds: number,
  roll: () => number,
): number {
  // Từ 35% tới 85% thời lượng đề. Không bao giờ nộp ở giây cuối, và không bao
  // giờ nộp nhanh tới mức không thể đọc hết đề.
  return Math.floor(durationSeconds * (0.35 + roll() * 0.5));
}

/* ===================== Hẹn trận ===================== */

/**
 * Đặt lịch với ai đó vào giờ sau. Đây là cách DUY NHẤT để hai người bận vẫn đấu
 * được, khi trận buộc phải diễn ra đồng thời.
 */
export const APPOINTMENT_MIN_LEAD_MINUTES = 10;
export const APPOINTMENT_MAX_LEAD_DAYS = 7;
/** Nhắc trước bao lâu. Cả hai bên đều được nhắc. */
export const APPOINTMENT_REMINDER_MINUTES = 5;
/** Quá giờ hẹn bao lâu mà không ai vào thì bỏ lịch. */
export const APPOINTMENT_GRACE_MINUTES = 10;

export type AppointmentCheck =
  | { ok: true }
  | { ok: false; reason: "TOO_SOON" | "TOO_FAR" };

export function checkAppointment(input: {
  at: Date;
  now: Date;
}): AppointmentCheck {
  const minutes = (input.at.getTime() - input.now.getTime()) / 60_000;
  if (minutes < APPOINTMENT_MIN_LEAD_MINUTES) return { ok: false, reason: "TOO_SOON" };
  if (minutes > APPOINTMENT_MAX_LEAD_DAYS * 24 * 60) {
    return { ok: false, reason: "TOO_FAR" };
  }
  return { ok: true };
}

/* ===================== Chỉ số công khai ===================== */

/**
 * Thắng suất trước đối thủ MẠNH HƠN.
 *
 * Thắng suất tổng gần như vô dụng: khi ghép cặp làm đúng việc, mọi người hội tụ
 * về khoảng 50% và so hai người với nhau không nói lên gì. Chỉ số có thông tin
 * thật là thắng suất trước người có Chiến Lực cao hơn mình.
 *
 * Trả `null` khi chưa có trận nào như vậy, thay vì 0: chưa từng gặp người mạnh
 * hơn không giống với gặp mà thua sạch.
 */
export function winRateVsStronger(
  duels: readonly { myRating: number; opponentRating: number; won: boolean }[],
): number | null {
  const relevant = duels.filter((d) => d.opponentRating > d.myRating);
  if (relevant.length === 0) return null;
  return relevant.filter((d) => d.won).length / relevant.length;
}
