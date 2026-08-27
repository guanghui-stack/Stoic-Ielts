import { opponentDecayFactor } from "../experience/experience.ts";

/**
 * Phe phái, điểm phe và mùa giải — HÀM THUẦN, không chạm database.
 *
 * Xem `docs/DAC-TA-DAU-TRUONG.md` mục 09.
 *
 * MỘT CÂU ĐỊNH HÌNH CẢ FILE NÀY:
 *
 *   "Nếu chỉ cộng dồn tổng điểm thì phe đông người luôn thắng và hai phe kia bỏ
 *    cuộc từ giữa mùa."
 *
 * Mọi luật ở đây đều quy về việc chặn điều đó, và chặn nó mà KHÔNG biến người
 * yếu thành gánh nặng cho phe mình. Hai ràng buộc đó kéo ngược nhau, và chỗ nào
 * trong file này trông vòng vo thì gần như chắc chắn là đang cân bằng chúng.
 */

export const SEASON_RULE_VERSION = "2026-08-22-v1";

/* ===================== Ba trụ hiển thị ===================== */

export const FACTIONS = ["WEI", "SHU", "WU"] as const;
export type Faction = (typeof FACTIONS)[number];

export function isFaction(value: string): value is Faction {
  return (FACTIONS as readonly string[]).includes(value);
}

export const FACTION_LABEL: Readonly<Record<Faction, string>> = {
  WEI: "Nhận thức",
  SHU: "Hành động",
  WU: "Ý chí",
};

/** Mã lãnh địa trên bản đồ, khớp `LOCKED_TERRITORIES` trong `campaign/world.ts`. */
export const FACTION_TERRITORY: Readonly<Record<Faction, string>> = {
  WEI: "TERRITORY_WEI",
  SHU: "TERRITORY_SHU",
  WU: "TERRITORY_WU",
};

/**
 * Cấp bậc tối thiểu để chọn trụ.
 *
 * Bốn, tức đầu chặng Rèn luyện. Không phải một con số tự nghĩ ra: đó là ranh giới
 * giữa giai đoạn bắt đầu và giai đoạn thực hành trong `ranks/catalog.ts`, nên nó
 * trùng với lúc người học đã qua giai đoạn làm quen. Chọn trụ ngay ngày đầu thì
 * đó là một cú bấm ngẫu nhiên, mà lựa chọn lại khóa suốt mùa.
 */
export const FACTION_UNLOCK_LEVEL = 4;

/* ===================== Điểm phe ===================== */

/**
 * Thắng cộng theo Chiến Lực đối thủ. Thua cộng một con số PHẲNG.
 *
 * Vì sao thua không cộng theo Chiến Lực đối thủ: nếu có, đường tối ưu là đi
 * thách người mạnh nhất rồi thua cho nhanh. Phần thưởng khi thua tồn tại để
 * người yếu không thấy mình là gánh nặng, không phải để thưởng cho việc săn
 * người mạnh. Nó phẳng vì lý do đó, và nó nhỏ vì cùng lý do đó.
 *
 * Vì sao thua vẫn cộng: đặc tả ghi thẳng "trừ điểm khi thua sẽ khiến người yếu
 * thấy mình là gánh nặng cho phe rồi tránh đấu". Người tránh đấu là hỏng cả hệ.
 */
export const FACTION_POINTS = {
  /** Điểm khi thắng một đối thủ đúng mốc chuẩn 1000. */
  winBase: 10,
  /** Cộng phẳng khi thua, không phụ thuộc đối thủ là ai. */
  lossFlat: 3,
  /** Chiến Lực quy về hệ số: 1000 thành 1.0. */
  ratingAnchor: 1000,
  /** Chặn hai đầu để một trận không bao giờ đáng bằng năm trận. */
  minFactor: 0.5,
  maxFactor: 2,
} as const;

export type DuelOutcomeForFaction = {
  won: boolean;
  truce: boolean;
  opponentIsBot: boolean;
  opponentRating: number;
  /** Lần thứ mấy gặp đúng người này trong ngày hôm nay, bắt đầu từ 1. */
  nthMeetingToday: number;
};

/**
 * Điểm phe của MỘT trận.
 *
 * Ba cửa trả về 0, và cả ba đều nằm trong đặc tả:
 *
 *  - Trận với bot: bot không thuộc phe nào, và cày bot mà lên điểm phe thì bảng
 *    xếp hạng phe đo số giờ ngồi máy chứ không đo gì khác.
 *  - Giảng hoà: hai người bấm hoà ở giây thứ năm, ba mươi giây một vòng.
 *  - Chưa chọn phe: kiểm ở tầng gọi, không phải ở đây.
 *
 * Luật giảm dần theo đối thủ dùng ĐÚNG hàm của thang kinh nghiệm chứ không viết
 * lại: hai bảng số rời nhau sẽ lệch nhau sau lần chỉnh đầu tiên, và khi đó có
 * một đường cày mở ra mà không ai biết.
 */
export function factionPointsFor(outcome: DuelOutcomeForFaction): number {
  if (outcome.opponentIsBot) return 0;
  if (outcome.truce) return 0;

  const decay = opponentDecayFactor(outcome.nthMeetingToday);

  if (!outcome.won) {
    return Math.round(FACTION_POINTS.lossFlat * decay);
  }

  const raw = outcome.opponentRating / FACTION_POINTS.ratingAnchor;
  const factor = Math.min(
    FACTION_POINTS.maxFactor,
    Math.max(FACTION_POINTS.minFactor, raw),
  );
  return Math.round(FACTION_POINTS.winBase * factor * decay);
}

/* ===================== Xếp hạng phe ===================== */

/**
 * Chỉ tính ngần này người đóng góp nhiều nhất mỗi phe.
 *
 * Đây là lời giải cho "vấn đề kinh điển của ba phe". Đặc tả cho hai lựa chọn,
 * và đây là lựa chọn thứ hai.
 *
 * VÌ SAO KHÔNG CHỌN CÁCH KIA (chia cho số thành viên hoạt động): lấy trung bình
 * nghĩa là một người chơi yếu kéo trung bình phe XUỐNG. Thế là phe có động cơ
 * bảo người yếu đừng đấu, tức tái lập đúng cái mà luật "thua cộng ít, không
 * trừ" vừa dập tắt. Với cách lấy N người đứng đầu, đóng góp của người yếu không
 * bao giờ làm hại phe, chỉ có thể giúp nếu họ lọt vào nhóm đầu.
 *
 * Năm là con số cho một trung tâm nhỏ. Nó nên tăng khi số người dùng tăng, và
 * đó là lý do nó nằm ở đây một mình chứ không rải trong truy vấn.
 */
export const TOP_CONTRIBUTORS = 5;

export type Contribution = { userId: string; faction: Faction; points: number };

export type FactionStanding = {
  faction: Faction;
  /** Tổng điểm của nhóm đóng góp nhiều nhất. Đây là con số xếp hạng. */
  score: number;
  /** Tổng điểm của TOÀN phe. Chỉ để hiển thị, KHÔNG dùng để xếp hạng. */
  totalPoints: number;
  activeMembers: number;
  countedMembers: number;
};

/**
 * Xếp hạng ba phe.
 *
 * Luôn trả về đủ ba phe, kể cả phe chưa ai đóng góp. Ẩn một phe khỏi bảng vì họ
 * đang 0 điểm là cách chắc chắn nhất để họ ở lại 0 điểm.
 *
 * Hoà thì xếp theo tổng điểm toàn phe, rồi tới số người hoạt động, rồi tới thứ
 * tự tên. Cần một thứ tự XÁC ĐỊNH: bảng xếp hạng nhảy chỗ giữa hai lần tải
 * trang trông như hệ thống hỏng.
 */
export function factionStandings(
  contributions: readonly Contribution[],
  topN = TOP_CONTRIBUTORS,
): FactionStanding[] {
  const byFaction = new Map<Faction, Contribution[]>(
    FACTIONS.map((f) => [f, [] as Contribution[]]),
  );
  for (const c of contributions) {
    if (c.points <= 0) continue;
    byFaction.get(c.faction)?.push(c);
  }

  const standings = FACTIONS.map<FactionStanding>((faction) => {
    const rows = (byFaction.get(faction) ?? [])
      .slice()
      .sort((a, b) => b.points - a.points || a.userId.localeCompare(b.userId));
    const counted = rows.slice(0, topN);
    return {
      faction,
      score: counted.reduce((sum, r) => sum + r.points, 0),
      totalPoints: rows.reduce((sum, r) => sum + r.points, 0),
      activeMembers: rows.length,
      countedMembers: counted.length,
    };
  });

  return standings.sort(
    (a, b) =>
      b.score - a.score ||
      b.totalPoints - a.totalPoints ||
      b.activeMembers - a.activeMembers ||
      a.faction.localeCompare(b.faction),
  );
}

/**
 * Phe thắng mùa, hoặc `null` khi chưa có gì để tuyên bố.
 *
 * Trả `null` khi cả ba phe đều 0 điểm, và cũng trả `null` khi hai phe đứng đầu
 * bằng nhau ở CẢ hai con số. Tuyên bố một phe thắng bằng thứ tự bảng chữ cái là
 * điều tệ nhất có thể làm ở cuối một mùa tám tuần.
 */
export function seasonWinner(
  standings: readonly FactionStanding[],
): Faction | null {
  if (standings.length === 0) return null;
  const [first, second] = standings;
  if (first.score <= 0) return null;
  if (second && first.score === second.score && first.totalPoints === second.totalPoints) {
    return null;
  }
  return first.faction;
}

/* ===================== Mùa giải ===================== */

/**
 * Tám tuần. Đặc tả cho khoảng sáu tới tám, và tám là đầu dài.
 *
 * Chọn đầu dài vì trung tâm nhỏ: mùa sáu tuần với ít người chơi thì phần lớn
 * mùa trôi qua trước khi đủ trận để bảng xếp hạng nói lên điều gì. Rút ngắn lại
 * dễ hơn kéo dài ra, vì rút ngắn không làm ai mất công đã bỏ ra.
 */
export const SEASON_LENGTH_DAYS = 56;

export type SeasonWindow = { startAt: Date; endAt: Date };

export function seasonWindowFrom(startAt: Date): SeasonWindow {
  return {
    startAt,
    endAt: new Date(startAt.getTime() + SEASON_LENGTH_DAYS * 86_400_000),
  };
}

export type SeasonStatus = "UPCOMING" | "ACTIVE" | "ENDED";

export function seasonStatusAt(window: SeasonWindow, now: Date): SeasonStatus {
  if (now < window.startAt) return "UPCOMING";
  if (now >= window.endAt) return "ENDED";
  return "ACTIVE";
}

/** Số ngày còn lại, làm tròn lên. Trả 0 khi mùa đã hết. */
export function daysLeftInSeason(window: SeasonWindow, now: Date): number {
  const ms = window.endAt.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

/**
 * Mã mùa, dạng `S001`. Đọc được, xếp được, và không lộ ngày tháng.
 */
export function seasonCode(ordinal: number): string {
  return `S${String(ordinal).padStart(3, "0")}`;
}

/* ===================== Kéo Chiến Lực về giữa ===================== */

/**
 * Giữ lại một nửa khoảng cách tới mốc chuẩn.
 *
 * Một nửa vì hai lẽ. Một, phép này ĐƠN ĐIỆU: ai cao hơn trước mùa mới vẫn cao
 * hơn sau, nên không ai bị lật ngược công sức. Hai, nó thu hẹp khoảng cách đủ
 * để người mới vào mùa sau không nhìn vào bảng rồi bỏ đi luôn.
 *
 * KHÔNG đụng tới cấp bậc, kinh nghiệm và Quân Công. Đặc tả ghi rõ, và lý do thì
 * rõ hơn nữa: ba thứ đó là công sức học thật, còn Chiến Lực chỉ là thước đo
 * dùng để ghép cặp trong một mùa.
 */
export const SEASON_RATING_RETAIN = 0.5;
export const SEASON_RATING_ANCHOR = 1000;

export function seasonResetRating(chienLuc: number): number {
  const gap = chienLuc - SEASON_RATING_ANCHOR;
  return Math.round(SEASON_RATING_ANCHOR + gap * SEASON_RATING_RETAIN);
}

/* ===================== Lãnh địa ===================== */

/**
 * Phe thắng chiếm lãnh địa cho tới HẾT MÙA SAU.
 *
 * Nghĩa là trong mùa đang chạy, chủ lãnh địa là phe thắng mùa TRƯỚC. Đó là điểm
 * hay của luật này: phần thưởng nằm ở mùa sau, nên nó vẫn còn ý nghĩa với người
 * mới vào giữa mùa, và phe thắng có thứ để giữ chứ không chỉ có thứ để khoe.
 */
export function territoryOwnerNow(
  previousSeasonWinner: Faction | null,
): Faction | null {
  return previousSeasonWinner;
}

/* ===================== Thông Báo ===================== */

/**
 * Cấp bậc tối thiểu để một tin lên bảng: bảy, tức đầu chặng Tích hợp.
 *
 * Cũng là ranh giới giai đoạn có sẵn trong `ranks/catalog.ts`, không phải số tự
 * nghĩ ra. Thông báo chỉ nên xuất hiện khi một dấu mốc đủ ý nghĩa; nếu ai cũng
 * được ghi nhận, bảng sẽ trở thành nhiễu và tiến bộ mất trọng lượng.
 */
export const BULLETIN_MIN_RANK_LEVEL = 7;

export const BULLETIN_KINDS = [
  "RANK_UP",
  "SEASON_RESULT",
  "TITLE_EARNED",
] as const;
export type BulletinKind = (typeof BULLETIN_KINDS)[number];

/**
 * Nhóm danh hiệu KHÔNG BAO GIỜ lên Thông Báo.
 *
 * `ARENA_QUESTION` và `ARENA_MANUAL` thì hiển nhiên: đưa lời nhắc riêng tư lên
 * bảng công cộng là bêu riếu.
 *
 * `ARENA_REDEMPTION` mới là cái bẫy. “Sửa mình bằng hành động” là danh hiệu
 * CÔNG KHAI, nhưng chỉ người TỪNG nhận một lời nhắc riêng tư mới có được nó.
 * Đưa lên Thông Báo sẽ vô tình tiết lộ lịch sử đó, nên nó chỉ ở lại trên hồ sơ,
 * nơi nó là niềm tự hào riêng.
 */
export const BULLETIN_FORBIDDEN_CATEGORIES = [
  "ARENA_QUESTION",
  "ARENA_MANUAL",
  "ARENA_REDEMPTION",
] as const;

export type AnnounceRequest = {
  kind: BulletinKind;
  /** Cấp bậc lúc xảy ra sự việc. Bỏ trống với tin của hệ thống. */
  rankLevel?: number;
  /** Nhóm danh hiệu, chỉ có với `TITLE_EARNED`. */
  titleCategory?: string;
  /** Người này có cho hiện tên ở nơi công cộng không. */
  allowsPublicName: boolean;
};

export type AnnounceDecision = { allowed: boolean; reason: string };

/**
 * Tin này có được lên Thông Báo không.
 *
 * Ba chốt của đặc tả nằm gọn trong hàm này, theo đúng thứ tự ưu tiên: quyền
 * riêng tư trước, rồi tới nhóm danh hiệu cấm, rồi mới tới ngưỡng cấp bậc.
 *
 * Quyền riêng tư đứng TRƯỚC vì nó là quyền, không phải một bộ lọc chất lượng.
 * Ai đã tắt thì không có tin nào của họ lên bảng, dù tin đó đẹp tới đâu.
 */
export function canAnnounce(req: AnnounceRequest): AnnounceDecision {
  if (req.kind === "SEASON_RESULT") {
    // Tin của hệ thống, không mang tên ai, nên không có gì để hỏi ý.
    return { allowed: true, reason: "Tin tổng kết mùa của hệ thống." };
  }

  if (!req.allowsPublicName) {
    return {
      allowed: false,
      reason: "Người này đã tắt hiện tên ở nơi công cộng.",
    };
  }

  if (
    req.kind === "TITLE_EARNED" &&
    req.titleCategory &&
    (BULLETIN_FORBIDDEN_CATEGORIES as readonly string[]).includes(req.titleCategory)
  ) {
    return {
      allowed: false,
      reason: "Danh hiệu nhóm này không bao giờ lên bảng công cộng.",
    };
  }

  if ((req.rankLevel ?? 0) < BULLETIN_MIN_RANK_LEVEL) {
    return {
      allowed: false,
      reason: `Chỉ từ cấp bậc ${BULLETIN_MIN_RANK_LEVEL} trở lên mới bố cáo.`,
    };
  }

  return { allowed: true, reason: "Đủ điều kiện bố cáo." };
}
