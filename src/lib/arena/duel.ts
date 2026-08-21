/**
 * Luật trận, giai đoạn P3 — HÀM THUẦN, không chạm database.
 *
 * Xem `docs/DAC-TA-DAU-TRUONG.md` mục 04.
 *
 * P3 CỐ Ý KHÔNG CÓ: realtime, ghép cặp tự động, Chiến Lực, bot, điểm phe. Tất
 * cả nằm ở P4 và P6. Đây là bản chứng minh mọi luật quyết toán chạy đúng
 * TRƯỚC KHI thêm realtime, vì thêm realtime vào một bộ luật còn sai thì không
 * ai gỡ ra được nữa.
 *
 * BỐN RÀNG BUỘC XƯƠNG SỐNG:
 *
 * 1. **Trừ Quân Công ở bước ARMED, không phải lúc quyết toán.** Chờ tới cuối
 *    mới trừ thì một người mở hai trận song song và cược số Quân Công họ chỉ
 *    có một lần.
 * 2. **Huỷ và phát, KHÔNG chuyển ví sang ví.** Quân Công của người thua bị
 *    huỷ, của người thắng do hệ thống phát ra. Trải nghiệm y hệt, nhưng sổ cái
 *    không có giao dịch giữa hai người dùng, nên hai tài khoản cày cho nhau thì
 *    tổng bằng không.
 * 3. **Giảng hoà trung tính ở MỌI chiều.** Nếu còn được kinh nghiệm thì hai
 *    người vào trận, bấm hoà ở giây thứ năm, ba mươi giây một vòng, không phải
 *    đọc chữ nào.
 * 4. **Đầu hàng phải RẺ HƠN bỏ mặc.** Nếu ngược lại thì không ai đầu hàng nữa,
 *    tất cả sẽ rút dây mạng.
 */

export const DUEL_RULE_VERSION = "2026-08-21-v1";

/* ===================== Vòng đời ===================== */

export const DUEL_STATUSES = [
  "INVITED",
  "ARMED",
  "LIVE",
  "RESOLVING",
  "SETTLED",
  "DECLINED",
  "EXPIRED",
  "TRUCE",
  "ABANDONED",
  "HELD",
  "VOIDED",
] as const;
export type DuelStatus = (typeof DUEL_STATUSES)[number];

/**
 * Trạng thái nào đi tới được trạng thái nào.
 *
 * Khai thành bảng thay vì rải `if` khắp nơi: một chuyển trạng thái sai sẽ làm
 * Quân Công bị trừ hai lần hoặc không bao giờ được hoàn, và cả hai đều là lỗi
 * im lặng. Bảng thì đọc được và kiểm thử được.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<DuelStatus, readonly DuelStatus[]>> = {
  INVITED: ["ARMED", "DECLINED", "EXPIRED", "VOIDED"],
  ARMED: ["LIVE", "VOIDED"],
  LIVE: ["RESOLVING", "TRUCE", "ABANDONED", "HELD", "VOIDED"],
  RESOLVING: ["SETTLED", "HELD", "VOIDED"],
  // Trạng thái cuối. HELD là chỗ duy nhất quay lại được, vì người xét duyệt
  // phải kết luận được theo cả hai hướng.
  SETTLED: [],
  DECLINED: [],
  EXPIRED: [],
  TRUCE: [],
  ABANDONED: ["SETTLED", "HELD"],
  HELD: ["SETTLED", "VOIDED"],
  VOIDED: [],
};

export function canTransition(from: DuelStatus, to: DuelStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Trạng thái đã đóng, không đổi được nữa. */
export function isTerminal(status: DuelStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/**
 * Trạng thái nào đã TRỪ Quân Công rồi.
 *
 * Dùng để biết khi huỷ trận thì có phải hoàn cược không. Trước ARMED thì chưa
 * trừ đồng nào, nên hoàn cược lúc đó là phát tiền từ hư không.
 */
export function hasStakeDeducted(status: DuelStatus): boolean {
  return status !== "INVITED" && status !== "DECLINED" && status !== "EXPIRED";
}

/* ===================== Hai hạng trận ===================== */

export const DUEL_TIERS = ["STAKED", "FREE"] as const;
export type DuelTier = (typeof DUEL_TIERS)[number];

/**
 * Cửa đấu trường LUÔN MỞ, chỉ sới cược là đóng.
 *
 * Hết Quân Công thì không đặt cược được, nhưng vẫn vào đấu được. Không có van
 * này thì người thua vài trận bị khoá khỏi đấu trường đúng lúc họ cần luyện
 * nhất, ngược hẳn mục tiêu đấu nhiều hơn.
 */
export const MIN_STAKE = 5;
export const MAX_STAKE = 100;

/** Hạng không cược nhận ít kinh nghiệm hơn, nhưng vẫn dương. */
export const FREE_TIER_XP_RATIO = 0.65;

export type StakeDecision =
  | { ok: true; tier: DuelTier; stake: number }
  | { ok: false; reason: "BELOW_MIN" | "ABOVE_MAX" | "INSUFFICIENT"; need: number };

/**
 * Chốt hạng trận và mức cược.
 *
 * Cược 0 nghĩa là hạng không cược, và đó là đường hợp lệ chứ không phải lỗi
 * đầu vào. Người hết sạch Quân Công vẫn phải đấu được.
 */
export function decideStake(input: {
  requested: number;
  challengerBalance: number;
  opponentBalance: number;
}): StakeDecision {
  if (input.requested <= 0) return { ok: true, tier: "FREE", stake: 0 };
  if (input.requested < MIN_STAKE) {
    return { ok: false, reason: "BELOW_MIN", need: MIN_STAKE };
  }
  if (input.requested > MAX_STAKE) {
    return { ok: false, reason: "ABOVE_MAX", need: MAX_STAKE };
  }
  // Cả HAI bên phải đủ. Nếu chỉ kiểm người thách thì người bị thách có thể bị
  // kéo vào một mức cược họ không kham nổi.
  const poorest = Math.min(input.challengerBalance, input.opponentBalance);
  if (poorest < input.requested) {
    return { ok: false, reason: "INSUFFICIENT", need: input.requested - poorest };
  }
  return { ok: true, tier: "STAKED", stake: input.requested };
}

/* ===================== Chiến thư ===================== */

/** Thư sống 90 giây. Đủ để trả lời, không đủ để quên mất mình đang bị thách. */
export const INVITE_TTL_SECONDS = 90;

export function inviteExpired(sentAt: Date, now: Date): boolean {
  return now.getTime() - sentAt.getTime() >= INVITE_TTL_SECONDS * 1000;
}

/**
 * Bốn chốt bảo vệ người bị dội chiến thư, đặc tả mục 04.
 *
 * Không có bốn chốt này thì người mạnh bị dội thư liên tục, không thể nhận
 * hết, rồi bị phạt vì ĐƯỢC NHIỀU NGƯỜI MUỐN ĐẤU chứ không phải vì hèn.
 *
 * Hàm này chỉ ĐẾM. Việc gắn danh hiệu Án Binh Bất Động là chuyện của P5.
 */
export type DeclineEvent = {
  challengerId: string;
  dateKey: string;
  /** Người bị thách có đang ở đấu trường lúc thư tới không. */
  wasPresent: boolean;
  /** Họ có đang trong một trận khác không. */
  wasInDuel: boolean;
};

export const IDLE_DECLINE_THRESHOLD = 10;

export function countableDeclines(events: readonly DeclineEvent[]): number {
  const counted = new Set<string>();
  for (const e of events) {
    // Chốt 3: đang trong trận thì không tính.
    if (e.wasInDuel) continue;
    // Chốt 4: chỉ tính thư tới khi họ đang có mặt ở đấu trường.
    if (!e.wasPresent) continue;
    // Chốt 1 và 2: đếm theo NGƯỜI THÁCH, mỗi người tối đa một lần mỗi ngày.
    counted.add(`${e.challengerId}|${e.dateKey}`);
  }
  // Chốt 1 lần nữa ở tầng cuối: đếm số người thách KHÁC NHAU, không đếm số thư.
  return new Set([...counted].map((k) => k.split("|")[0])).size;
}

/* ===================== Giảng hoà ===================== */

export const TRUCE_OFFER = {
  offer:
    "Văn vô đệ nhất. Nay xin gác bút thu quân, hẹn ngày khác lại phân cao thấp.",
  accept: "Chuẩn lời. Hai bên cùng lui, tình nghĩa còn nguyên.",
} as const;

export type TruceGate =
  | { canOffer: true }
  | { canOffer: false; reason: "TOO_LATE" | "TOO_MUCH_ANSWERED" | "NOT_LIVE" };

/**
 * Chỉ được đề nghị giảng hoà trong NỬA ĐẦU thời gian VÀ khi cả hai chưa nộp
 * quá MỘT PHẦN BA số câu.
 *
 * Chốt chặn này tồn tại để người đang thua không dùng giảng hoà làm đường thoát
 * phút chót. Không có nó, giảng hoà trở thành nút huỷ kết quả.
 */
export function truceGate(input: {
  status: DuelStatus;
  startedAt: Date;
  deadlineAt: Date;
  now: Date;
  totalQuestions: number;
  answeredByEach: readonly number[];
}): TruceGate {
  if (input.status !== "LIVE") return { canOffer: false, reason: "NOT_LIVE" };

  const halfway =
    input.startedAt.getTime() +
    (input.deadlineAt.getTime() - input.startedAt.getTime()) / 2;
  if (input.now.getTime() > halfway) {
    return { canOffer: false, reason: "TOO_LATE" };
  }

  const limit = input.totalQuestions / 3;
  if (input.answeredByEach.some((n) => n > limit)) {
    return { canOffer: false, reason: "TOO_MUCH_ANSWERED" };
  }
  return { canOffer: true };
}

/* ===================== Phân định thắng thua ===================== */

export type SideResult = {
  userId: string;
  /** Số câu đúng. MÁY CHỦ chấm. Máy khách không bao giờ gửi điểm lên. */
  score: number;
  /** Đo ở máy chủ lúc nhận bài nộp, không tin đồng hồ trình duyệt. */
  elapsedMs: number;
  submitted: boolean;
  surrendered: boolean;
  abandoned: boolean;
};

export type Verdict =
  | { kind: "WIN"; winnerId: string; loserId: string; by: "SCORE" | "TIME" | "FORFEIT" }
  | { kind: "DRAW" };

/**
 * Ai thắng.
 *
 * Thứ tự: đầu hàng hoặc bỏ mặc trước, rồi điểm, rồi thời gian. Hoà chỉ xảy ra
 * khi bằng cả hai, mà với độ chính xác mili giây thì gần như không bao giờ.
 *
 * Hệ quả có chủ ý: cột "hoà" trên hồ sơ thực chất chỉ đến từ GIẢNG HOÀ. Nó
 * không đo sự bế tắc mà đo sự nhún nhường, nên gọi đúng tên là Hoà khí.
 */
export function decideWinner(a: SideResult, b: SideResult): Verdict {
  const aOut = a.surrendered || a.abandoned;
  const bOut = b.surrendered || b.abandoned;

  if (aOut && bOut) return { kind: "DRAW" };
  if (aOut) return { kind: "WIN", winnerId: b.userId, loserId: a.userId, by: "FORFEIT" };
  if (bOut) return { kind: "WIN", winnerId: a.userId, loserId: b.userId, by: "FORFEIT" };

  if (a.score !== b.score) {
    const [w, l] = a.score > b.score ? [a, b] : [b, a];
    return { kind: "WIN", winnerId: w.userId, loserId: l.userId, by: "SCORE" };
  }
  if (a.elapsedMs !== b.elapsedMs) {
    const [w, l] = a.elapsedMs < b.elapsedMs ? [a, b] : [b, a];
    return { kind: "WIN", winnerId: w.userId, loserId: l.userId, by: "TIME" };
  }
  return { kind: "DRAW" };
}

/* ===================== Quyết toán Quân Công ===================== */

export type MeritEntry = {
  userId: string;
  kind: "STAKE" | "MINT" | "BURN" | "REFUND";
  amount: number;
  reason: string;
};

/**
 * Sổ cái phải ghi những dòng nào khi quyết toán.
 *
 * ĐỌC KỸ CHỖ NÀY. Cược đã bị trừ ở bước ARMED bằng một dòng `STAKE`, nên:
 *
 *   - Người THẮNG nhận `REFUND` (lấy lại cược của chính mình) cộng `MINT`
 *     (phần thắng do hệ thống phát ra). Ròng: cộng đúng một lần mức cược.
 *   - Người THUA không nhận gì. Dòng `STAKE` lúc ARMED chính là phần bị huỷ.
 *     Ròng: trừ đúng một lần mức cược.
 *   - Hoà, giảng hoà, huỷ trận: cả hai nhận `REFUND`. Ròng bằng không.
 *
 * KHÔNG ghi thêm `BURN` cho người thua. Cược của họ đã rời ví từ lúc ARMED;
 * ghi thêm một dòng trừ nữa là trừ hai lần cho cùng một việc.
 *
 * Và không bao giờ có dòng nào chuyển từ ví này sang ví kia. Hai tài khoản cày
 * cho nhau thì một bên mất, một bên được hệ thống phát, tổng bằng không.
 */
export function settlementEntries(input: {
  verdict: Verdict;
  tier: DuelTier;
  stake: number;
  sides: readonly [string, string];
}): MeritEntry[] {
  if (input.tier === "FREE" || input.stake <= 0) return [];

  if (input.verdict.kind === "DRAW") {
    return input.sides.map((userId) => ({
      userId,
      kind: "REFUND" as const,
      amount: input.stake,
      reason: "Hoà, hoàn cược",
    }));
  }

  return [
    {
      userId: input.verdict.winnerId,
      kind: "REFUND",
      amount: input.stake,
      reason: "Thắng trận, hoàn cược của mình",
    },
    {
      userId: input.verdict.winnerId,
      kind: "MINT",
      amount: input.stake,
      reason: "Thắng trận, phần thắng do hệ thống phát",
    },
  ];
}

/** Hoàn cược cả hai. Dùng cho giảng hoà và huỷ trận. */
export function refundEntries(input: {
  tier: DuelTier;
  stake: number;
  sides: readonly [string, string];
  reason: string;
}): MeritEntry[] {
  if (input.tier === "FREE" || input.stake <= 0) return [];
  return input.sides.map((userId) => ({
    userId,
    kind: "REFUND" as const,
    amount: input.stake,
    reason: input.reason,
  }));
}

/**
 * Khoá chống ghi hai lần, dạng `DUEL:<duelId>:<userId>:<kind>`.
 *
 * Đặt ở tầng database đúng cách `TOPUP:<orderId>` đang làm. Job quyết toán chạy
 * lại hoặc hai cú bấm nhanh thì dòng thứ hai bị chặn bởi ràng buộc duy nhất,
 * không phải bởi một câu `if` nào đó có thể quên.
 */
export function duelLedgerKey(
  duelId: string,
  userId: string,
  kind: MeritEntry["kind"],
): string {
  return `DUEL:${duelId}:${userId}:${kind}`;
}

/* ===================== Kinh nghiệm ===================== */

/**
 * Kinh nghiệm mỗi bên nhận sau trận.
 *
 * Đầu hàng RẺ HƠN bỏ mặc: đầu hàng vẫn được một ít, bỏ mặc được không. Nếu
 * ngược lại thì không ai đầu hàng nữa, tất cả sẽ rút dây mạng, và đó là trải
 * nghiệm tệ hơn cho cả hai bên lẫn cho máy chủ.
 *
 * Giảng hoà TRUNG TÍNH TUYỆT ĐỐI, xử ở `truceExperience`.
 */
export const DUEL_XP = {
  WIN: 18,
  LOSS: 6,
  /** Đầu hàng: vẫn dương, vì họ đã đọc được một phần đề. */
  SURRENDER: 2,
  /** Bỏ mặc tới hết giờ: không được gì. */
  ABANDON: 0,
} as const;

export function duelExperience(input: {
  side: SideResult;
  won: boolean;
  tier: DuelTier;
}): number {
  let base: number;
  if (input.side.abandoned) base = DUEL_XP.ABANDON;
  else if (input.side.surrendered) base = DUEL_XP.SURRENDER;
  else base = input.won ? DUEL_XP.WIN : DUEL_XP.LOSS;

  if (input.tier === "FREE") base = Math.round(base * FREE_TIER_XP_RATIO);
  return base;
}

/** Giảng hoà không sinh kinh nghiệm, không sinh gì cả. Đây là luật, không phải số. */
export function truceExperience(): 0 {
  return 0;
}
