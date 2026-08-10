/**
 * Luật của Feynman AI Tutor — HÀM THUẦN, không chạm database, không gọi mạng.
 *
 * Cùng lý do với `payments/payment-rules.ts`: máy phát triển không có MySQL,
 * và đây là phần mà sai một chút là tốn tiền API thật, lộ dữ liệu học viên,
 * hoặc mở đáp án của đề đang thi. Chạy: `npm run test:feynman-ai`.
 *
 * Nguyên tắc xuyên suốt: **chặn khi nghi ngờ** (fail closed). Thiếu trường,
 * trạng thái lạ, ngày giờ vô lý — đều trả về "không được phép", không đoán.
 *
 * File này KHÔNG import "server-only" vì bộ kiểm thử chạy bằng node thuần.
 * Bù lại nó không chứa bí mật nào: không khóa API, không chuỗi kết nối.
 */

// Đuôi ".ts" là cố ý — giống payment-rules.ts, để node thuần chạy được.
import { OFFERS, type Offer, type OfferCode } from "../payments/catalog.ts";

/* ------------------------------------------------------------------ */
/* 1. Múi giờ Việt Nam                                                  */
/* ------------------------------------------------------------------ */

/**
 * Việt Nam là UTC+7 quanh năm, không có giờ mùa hè, nên cộng thẳng offset là
 * đủ và không cần thư viện múi giờ.
 *
 * Vì sao phải bận tâm: giới hạn "1 lần chấm mỗi ngày" mà tính theo UTC thì mốc
 * sang ngày rơi vào 7 giờ sáng giờ Việt Nam. Học viên chấm lúc 6h sáng sẽ bị
 * báo "hôm nay đã chấm rồi" dù hôm qua mới là lần chấm đó.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Ngày theo lịch Việt Nam, dạng "YYYY-MM-DD". */
export function vietnamDayKey(at: Date): string {
  return new Date(at.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** Hai mốc thời gian có rơi vào cùng một ngày lịch Việt Nam không. */
export function isSameVietnamDay(a: Date, b: Date): boolean {
  return vietnamDayKey(a) === vietnamDayKey(b);
}

/* ------------------------------------------------------------------ */
/* 2. Quyền truy cập — ba phạm vi cùng tồn tại                          */
/* ------------------------------------------------------------------ */

export type AiGrantLike = {
  feature: string;
  scope: string;
  exerciseId: string | null;
  attemptId: string | null;
  status: string;
  startsAt: Date;
  /** null = vĩnh viễn */
  expiresAt: Date | null;
};

/** Một grant có đang có hiệu lực tại thời điểm `at` không. */
export function isAiGrantLive(grant: AiGrantLike, at: Date): boolean {
  if (grant.status !== "ACTIVE") return false;
  if (grant.startsAt.getTime() > at.getTime()) return false;
  if (grant.expiresAt !== null && grant.expiresAt.getTime() <= at.getTime()) {
    return false;
  }
  return true;
}

/**
 * Học viên có quyền dùng `feature` cho đúng lượt làm bài này không.
 *
 * Ba phạm vi cùng chạy song song và KHÔNG được chuyển đổi dữ liệu cũ:
 *
 * - `ALL`      — gói cũ, phủ mọi bài trong thời hạn
 * - `EXERCISE` — gói cũ, phủ mọi lượt làm của một bài
 * - `ATTEMPT`  — mô hình hiện tại, đúng một lượt làm bài
 *
 * Người đã trả 299.000đ cho gói `ALL` phải dùng hết thời hạn, nên nhánh `ALL`
 * và `EXERCISE` phải sống chung với nhánh `ATTEMPT` chứ không thay thế nó.
 */
export function decideAiAccess(input: {
  grants: AiGrantLike[];
  feature: string;
  exerciseId?: string | null;
  attemptId?: string | null;
  at: Date;
}): boolean {
  return input.grants.some((grant) => {
    if (grant.feature !== input.feature) return false;
    if (!isAiGrantLive(grant, input.at)) return false;

    if (grant.scope === "ALL") return true;

    if (grant.scope === "ATTEMPT") {
      // Grant theo lượt làm bài mà thiếu attemptId là dữ liệu hỏng → chặn
      return Boolean(input.attemptId && grant.attemptId === input.attemptId);
    }

    if (grant.scope === "EXERCISE") {
      return Boolean(input.exerciseId && grant.exerciseId === input.exerciseId);
    }

    // "NONE" (gói nạp lượt) và mọi scope lạ đều không mở gì
    return false;
  });
}

/* ------------------------------------------------------------------ */
/* 3. Nguyệt Thí — khóa kín cho tới khi cuộc thi kết thúc                */
/* ------------------------------------------------------------------ */

export type CompetitionLockReason =
  | "COMPETITION_IN_PROGRESS"
  | "COMPETITION_ENDS_AT_MISSING";

/**
 * Lượt làm bài thuộc Nguyệt Thí bị khóa CẢ BA: đáp án chi tiết, Feynman, và
 * toàn bộ AI — cho tới khi `endsAt` của cuộc thi trôi qua.
 *
 * Vì sao: thí sinh dự thi vào các thời điểm khác nhau trong cùng khung giờ.
 * Người thi sớm mà mở được Feynman sẽ thấy toàn bộ đáp án chuẩn và lời giải
 * giáo viên của đề mà người khác còn đang làm.
 *
 * Thiếu `endsAt` thì coi như CÒN khóa. Đây là chỗ bắt buộc phải fail closed:
 * đoán sai theo hướng mở là lộ đề của một kỳ thi thật.
 */
export function competitionLock(input: {
  /** null nếu lượt làm bài này không thuộc cuộc thi nào. */
  competitionEndsAt: Date | null | undefined;
  isCompetitionAttempt: boolean;
  at: Date;
}): { locked: boolean; reason: CompetitionLockReason | null } {
  if (!input.isCompetitionAttempt) return { locked: false, reason: null };

  if (!input.competitionEndsAt) {
    return { locked: true, reason: "COMPETITION_ENDS_AT_MISSING" };
  }

  if (input.competitionEndsAt.getTime() > input.at.getTime()) {
    return { locked: true, reason: "COMPETITION_IN_PROGRESS" };
  }

  return { locked: false, reason: null };
}

/* ------------------------------------------------------------------ */
/* 3b. Giữ chỗ lại sau khi hỏng                                         */
/* ------------------------------------------------------------------ */

/**
 * Sau bao lâu thì một bản ghi PENDING bị coi là chết.
 *
 * Tiến trình có thể bị giết giữa lúc gọi OpenAI — Hostinger khởi động lại khi
 * triển khai, và lệnh gọi dài nhất cũng chỉ tính bằng chục giây. Quá mốc này mà
 * vẫn PENDING thì không còn ai đang chạy nó nữa.
 */
export const STALE_PENDING_MS = 10 * 60 * 1000;

export type ExistingEvaluationLike = {
  id: string;
  /** PENDING | COMPLETED | FAILED */
  status: string;
  errorCode: string | null;
  updatedAt: Date;
};

export type ReservationPlan =
  | { action: "CREATE"; chargeWallet: boolean }
  | { action: "REUSE"; evaluationId: string; chargeWallet: boolean }
  | { action: "BLOCK"; reason: "ALREADY_GRADED" | "EVALUATION_IN_PROGRESS" };

/**
 * `FeynmanAiEvaluation.reviewId` là `@unique`, nên mỗi phiên Feynman chỉ có
 * đúng một hàng. Nếu chỉ dựa vào ràng buộc đó để chặn trùng thì một lần hỏng là
 * khóa vĩnh viễn: hàng FAILED vẫn nằm đấy, lần chấm sau đụng P2002 và bị báo
 * "đã chấm rồi" — trong khi học viên chưa từng nhận được kết quả nào.
 *
 * Hàm này quyết định dùng lại hàng cũ hay tạo hàng mới, và quan trọng hơn: có
 * trừ ví lần nữa hay không. Nguyên tắc là ví không bao giờ bị trừ hai lần cho
 * cùng một kết quả:
 *
 * - FAILED đã được hoàn lượt  → trừ lại, vì lượt đã trả về ví
 * - FAILED chưa được hoàn     → không trừ, lượt cũ vẫn đang bị giữ
 * - PENDING chết (mồ côi)     → không trừ, lượt đã trừ mà chẳng ai hoàn
 * - PENDING còn sống          → chặn, có request khác đang chạy thật
 * - COMPLETED                 → chặn, đây mới đúng nghĩa "đã chấm rồi"
 */
export function planReservation(input: {
  existing: ExistingEvaluationLike | null;
  /** Cùng luật với `shouldRefundQuota`, truyền vào để rules.ts không phụ thuộc errors.ts. */
  wasRefunded: (errorCode: string | null) => boolean;
  at: Date;
}): ReservationPlan {
  const { existing } = input;
  if (!existing) return { action: "CREATE", chargeWallet: true };

  if (existing.status === "COMPLETED") {
    return { action: "BLOCK", reason: "ALREADY_GRADED" };
  }

  if (existing.status === "PENDING") {
    const age = input.at.getTime() - existing.updatedAt.getTime();
    if (age < STALE_PENDING_MS) {
      return { action: "BLOCK", reason: "EVALUATION_IN_PROGRESS" };
    }
    // Mồ côi: lượt đã bị trừ lúc giữ chỗ và không có ai chạy nhánh hoàn lại.
    return { action: "REUSE", evaluationId: existing.id, chargeWallet: false };
  }

  // FAILED — và mọi trạng thái lạ, coi như hỏng để học viên còn chấm lại được.
  return {
    action: "REUSE",
    evaluationId: existing.id,
    chargeWallet: input.wasRefunded(existing.errorCode),
  };
}

/* ------------------------------------------------------------------ */
/* 4. Ví lượt AI — theo TÀI KHOẢN                                       */
/* ------------------------------------------------------------------ */

export type WalletLike = {
  grantedTotal: number;
  usedTotal: number;
};

/** Số lượt còn lại trong ví. Không bao giờ âm, kể cả khi dữ liệu lệch. */
export function walletRemaining(wallet: WalletLike): number {
  return Math.max(0, wallet.grantedTotal - wallet.usedTotal);
}

/**
 * Số lượt AI mà một gói cộng vào ví khi thanh toán thành công.
 *
 * Gói không khai `aiGradingCredits` thì cộng 0 — gói Reading cũ nằm ở nhóm này.
 */
export function creditsForOffer(code: OfferCode): number {
  const offer = OFFERS[code] as Offer;
  return offer.aiGradingCredits ?? 0;
}

/**
 * Số câu được hỏi AI trong mỗi lượt chấm, theo gói đã mở lượt làm bài đó.
 *
 * Full Test 10 câu, đề đơn 5 câu. Chênh lệch này là cố ý: phần hỏi đáp chiếm
 * phần lớn chi phí API, và gói 19K không gánh nổi 10 câu mà vẫn còn biên.
 */
export function chatLimitForOffer(code: OfferCode): number {
  const offer = OFFERS[code] as Offer;
  return offer.aiChatLimit ?? 0;
}

/* ------------------------------------------------------------------ */
/* 5. Giữ chỗ trước khi gọi API                                         */
/* ------------------------------------------------------------------ */

export type GradingDenial =
  | "FEATURE_DISABLED"
  | "NO_ACCESS"
  | "COMPETITION_LOCKED"
  | "DAILY_LIMIT_REACHED"
  | "QUOTA_EXHAUSTED"
  | "REVIEW_NOT_COMPLETED"
  | "ALREADY_GRADED";

export type GradingDecision =
  | { allowed: true }
  | { allowed: false; reason: GradingDenial };

/**
 * Có được gọi AI chấm lượt Feynman này không.
 *
 * Thứ tự kiểm tra là cố ý, đi từ rẻ và chắc chắn tới đắt và mơ hồ. Riêng hai
 * hàng rào cuối phải giữ đúng thứ tự này khi cài đặt ở tầng database:
 *
 *   1. nhịp ngày (theo lượt làm bài) — rẻ, và là lỗi hay gặp nhất
 *   2. ví lượt (theo tài khoản)
 *
 * Nếu bước 2 trượt thì PHẢI nhả lại bước 1. Không nhả thì học viên hết ví sẽ
 * mất luôn suất chấm của ngày hôm đó — nạp thêm tiền cũng phải chờ sang hôm
 * sau. Đây là loại lỗi rất khó thấy sau khi đã lên production.
 */
export function decideCanGrade(input: {
  featureEnabled: boolean;
  hasAccess: boolean;
  competitionLocked: boolean;
  reviewStatus: string;
  /** Lượt Feynman này đã có bản chấm AI chưa. */
  alreadyGraded: boolean;
  wallet: WalletLike;
  /** Lần chấm gần nhất của CHÍNH lượt làm bài này, null nếu chưa từng chấm. */
  lastGradedAt: Date | null;
  /**
   * Lần chấm này có phải trừ thêm một lượt không.
   *
   * `false` khi đang lấy lại một lần chấm hỏng mà lượt cũ vẫn đang bị giữ. Xét
   * ví trong trường hợp đó là chặn nhầm: lượt đã trừ rồi, ví về 0, và học viên
   * bị khóa khỏi chính lần chấm mà họ đã trả tiền.
   */
  requiresCredit?: boolean;
  at: Date;
}): GradingDecision {
  if (!input.featureEnabled) {
    return { allowed: false, reason: "FEATURE_DISABLED" };
  }
  if (!input.hasAccess) {
    return { allowed: false, reason: "NO_ACCESS" };
  }
  if (input.competitionLocked) {
    return { allowed: false, reason: "COMPETITION_LOCKED" };
  }
  if (input.reviewStatus !== "COMPLETED") {
    return { allowed: false, reason: "REVIEW_NOT_COMPLETED" };
  }
  if (input.alreadyGraded) {
    return { allowed: false, reason: "ALREADY_GRADED" };
  }
  if (
    input.lastGradedAt !== null &&
    isSameVietnamDay(input.lastGradedAt, input.at)
  ) {
    return { allowed: false, reason: "DAILY_LIMIT_REACHED" };
  }
  if (input.requiresCredit !== false && walletRemaining(input.wallet) <= 0) {
    return { allowed: false, reason: "QUOTA_EXHAUSTED" };
  }
  return { allowed: true };
}

/**
 * Hai lỗi quota cần thông báo khác nhau, vì cách xử lý của học viên khác nhau:
 * một bên mua thêm, một bên chờ hôm sau. Gộp chung sẽ khiến người hết ví ngồi
 * đợi vô ích, còn người đã chấm hôm nay thì mua thêm một cách vô nghĩa.
 */
export function messageForDenial(reason: GradingDenial): string {
  switch (reason) {
    case "FEATURE_DISABLED":
      return "Tính năng AI đang tạm tắt. Điểm số và Feynman vẫn dùng bình thường.";
    case "NO_ACCESS":
      return "Lượt làm bài này chưa được mở. Bạn cần mua gói cho lượt làm bài này.";
    case "COMPETITION_LOCKED":
      return "Đề đang trong kỳ Nguyệt Thí. Đáp án chi tiết, Feynman và AI sẽ mở sau khi kỳ thi kết thúc.";
    case "REVIEW_NOT_COMPLETED":
      return "Bạn cần hoàn thành phần tự giảng lại trước khi nhờ AI chấm.";
    case "ALREADY_GRADED":
      return "Lượt luyện này đã được AI chấm. Hãy luyện lại một lượt mới để được chấm tiếp.";
    case "DAILY_LIMIT_REACHED":
      return "Mỗi lượt làm bài chỉ nhờ AI chấm được một lần mỗi ngày. Mời bạn quay lại vào ngày mai.";
    case "QUOTA_EXHAUSTED":
      return "Ví lượt AI của bạn đã hết. Nạp thêm 10 lượt với gói 29.000đ để tiếp tục.";
  }
}

/* ------------------------------------------------------------------ */
/* 6. Hỏi AI                                                            */
/* ------------------------------------------------------------------ */

export type ChatDenial =
  | "FEATURE_DISABLED"
  | "NO_ACCESS"
  | "COMPETITION_LOCKED"
  | "CHAT_LIMIT_REACHED"
  | "QUESTION_TOO_SHORT"
  | "QUESTION_TOO_LONG"
  | "EVALUATION_NOT_READY";

export const QUESTION_MIN_CHARS = 3;
export const QUESTION_MAX_CHARS = 1000;

export function decideCanAsk(input: {
  featureEnabled: boolean;
  hasAccess: boolean;
  competitionLocked: boolean;
  evaluationStatus: string;
  questionUsed: number;
  questionLimit: number;
  question: string;
}): { allowed: true } | { allowed: false; reason: ChatDenial } {
  if (!input.featureEnabled) return { allowed: false, reason: "FEATURE_DISABLED" };
  if (!input.hasAccess) return { allowed: false, reason: "NO_ACCESS" };
  if (input.competitionLocked) {
    return { allowed: false, reason: "COMPETITION_LOCKED" };
  }
  if (input.evaluationStatus !== "COMPLETED") {
    return { allowed: false, reason: "EVALUATION_NOT_READY" };
  }

  const trimmed = input.question.trim();
  if (trimmed.length < QUESTION_MIN_CHARS) {
    return { allowed: false, reason: "QUESTION_TOO_SHORT" };
  }
  if (trimmed.length > QUESTION_MAX_CHARS) {
    return { allowed: false, reason: "QUESTION_TOO_LONG" };
  }

  if (input.questionUsed >= input.questionLimit) {
    return { allowed: false, reason: "CHAT_LIMIT_REACHED" };
  }

  return { allowed: true };
}

/* ------------------------------------------------------------------ */
/* 7. Chọn câu để luyện Feynman                                         */
/* ------------------------------------------------------------------ */

export const MAX_QUESTIONS_PER_RUN = 10;

export type PickDenial =
  | "EMPTY_SELECTION"
  | "TOO_MANY_QUESTIONS"
  | "DUPLICATE_QUESTION"
  | "UNKNOWN_QUESTION";

/**
 * Học viên tự tick câu muốn chữa, tối đa 10 câu mỗi lượt luyện.
 *
 * Tick câu ĐÚNG vẫn hợp lệ: nhiều học viên đoán mò trúng và muốn hiểu vì sao,
 * đó chính là thứ Feynman dùng để làm. Chỉ chặn câu không có thật trong đề.
 */
export function decideQuestionPick(input: {
  picked: string[];
  /** Toàn bộ mã câu có thật trong lượt làm bài này, ví dụ "p2:q14". */
  availableIds: string[];
}): { allowed: true; picked: string[] } | { allowed: false; reason: PickDenial } {
  if (input.picked.length === 0) {
    return { allowed: false, reason: "EMPTY_SELECTION" };
  }
  if (input.picked.length > MAX_QUESTIONS_PER_RUN) {
    return { allowed: false, reason: "TOO_MANY_QUESTIONS" };
  }
  if (new Set(input.picked).size !== input.picked.length) {
    return { allowed: false, reason: "DUPLICATE_QUESTION" };
  }

  const available = new Set(input.availableIds);
  if (input.picked.some((id) => !available.has(id))) {
    return { allowed: false, reason: "UNKNOWN_QUESTION" };
  }

  return { allowed: true, picked: input.picked };
}

/* ------------------------------------------------------------------ */
/* 8. Ngưỡng ĐẠT / KHÔNG ĐẠT                                            */
/* ------------------------------------------------------------------ */

export const PASS_THRESHOLD_PERCENT = 70;

export type Verdict = "DAT" | "KHONG_DAT";

/**
 * ĐẠT khi phần tự giảng lại tương đồng từ 70% trở lên với lời giải chuẩn,
 * xét theo Ý NGHĨA chứ không phải từ ngữ.
 *
 * Ngưỡng nằm ở đây chứ không nằm trong prompt: model chỉ trả về con số tương
 * đồng, còn việc con số đó có ĐẠT hay không là quyết định của hệ thống. Nhờ vậy
 * đổi ngưỡng không phải sửa prompt, và kết quả cũ vẫn tính lại được.
 *
 * Điểm ngoài dải 0–100 là dữ liệu hỏng → KHÔNG ĐẠT, không quy đổi liều.
 */
export function verdictFor(similarityPercent: number): Verdict {
  if (!Number.isFinite(similarityPercent)) return "KHONG_DAT";
  if (similarityPercent < 0 || similarityPercent > 100) return "KHONG_DAT";
  return similarityPercent >= PASS_THRESHOLD_PERCENT ? "DAT" : "KHONG_DAT";
}

/* ------------------------------------------------------------------ */
/* 9. Danh hiệu — chỉ lần hoàn thành ĐẦU TIÊN của một lượt làm bài       */
/* ------------------------------------------------------------------ */

/**
 * Feynman luyện lại không giới hạn, nên khóa sự kiện danh hiệu theo phiên luyện
 * sẽ cho phép cày: làm lại mỗi ngày là mỗi ngày có một sự kiện mới.
 *
 * Khóa theo lượt LÀM BÀI thì chỉ lần hoàn thành đầu tiên tính danh hiệu, các
 * lần sau là luyện tập thuần túy.
 */
export function feynmanAchievementEventKey(attemptId: string): string {
  return `FEYNMAN_COMPLETED:${attemptId}`;
}

export function shouldEmitFeynmanAchievement(input: {
  attemptId: string;
  /** Số phiên Feynman đã COMPLETED của lượt làm bài này, TRƯỚC phiên hiện tại. */
  completedRunsBefore: number;
}): boolean {
  return input.completedRunsBefore === 0;
}

/* ------------------------------------------------------------------ */
/* 10. Dữ liệu gửi sang OpenAI                                          */
/* ------------------------------------------------------------------ */

/**
 * Những khóa TUYỆT ĐỐI không được có trong payload gửi đi.
 *
 * Danh sách này là hàng rào cuối, không phải hàng rào duy nhất — tầng dựng
 * context phải tự chỉ lấy đúng trường cần. Nhưng có nó thì một lần thêm trường
 * ẩu vào object sẽ làm đỏ bộ kiểm thử thay vì âm thầm gửi email học viên đi.
 *
 * Mã câu dạng "p2:q14" KHÔNG nằm trong danh sách: đó là vị trí câu trong đề,
 * không phải định danh người dùng.
 */
export const FORBIDDEN_PAYLOAD_KEYS = [
  "email",
  "name",
  "fullName",
  "phone",
  "passwordHash",
  "candidateCode",
  "userId",
  "attemptId",
  "reviewId",
  "ip",
  "ipAddress",
  "userAgent",
  "webcam",
  "integrityStatus",
  "paymentOrderId",
  "apiKey",
  "databaseUrl",
] as const;

/**
 * Quét đệ quy payload, trả về đường dẫn của mọi khóa bị cấm tìm thấy.
 * Mảng rỗng nghĩa là sạch.
 */
export function findForbiddenKeys(payload: unknown, path = "$"): string[] {
  const forbidden = new Set<string>(FORBIDDEN_PAYLOAD_KEYS);
  const found: string[] = [];

  const walk = (node: unknown, here: string) => {
    if (node === null || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${here}[${i}]`));
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (forbidden.has(key)) found.push(`${here}.${key}`);
      walk(value, `${here}.${key}`);
    }
  };

  walk(payload, path);
  return found;
}

/* ------------------------------------------------------------------ */
/* 11. Nguồn lời giải                                                   */
/* ------------------------------------------------------------------ */

export type SourceBasis = "TEACHER_APPROVED" | "PASSAGE_DERIVED";

/**
 * Câu có lời giải giáo viên thì AI phải bám vào đó; câu không có thì AI tự dẫn
 * chứng từ passage nhưng vẫn phải tôn trọng đáp án chuẩn.
 *
 * Ưu tiên bản snapshot trên `FeynmanMistake` khi có, vì nó cố định lịch sử —
 * giáo viên sửa đề về sau không làm đổi lời giải mà học viên đã đọc.
 */
export function resolveSourceBasis(input: {
  /** Lời giải chụp lại lúc học viên tick câu này, nếu có. */
  snapshotExplanation: string | null | undefined;
  /** Lời giải hiện tại trong nội dung đề, nếu có. */
  liveExplanation: string | null | undefined;
}): { basis: SourceBasis; explanation: string | null } {
  const snapshot = input.snapshotExplanation?.trim();
  if (snapshot) {
    return { basis: "TEACHER_APPROVED", explanation: snapshot };
  }

  const live = input.liveExplanation?.trim();
  if (live) {
    return { basis: "TEACHER_APPROVED", explanation: live };
  }

  return { basis: "PASSAGE_DERIVED", explanation: null };
}

/* ------------------------------------------------------------------ */
/* 12. Sổ Sơ Hở — chưa đủ mẫu thì không kết luận                        */
/* ------------------------------------------------------------------ */

/**
 * Giữ đúng ngưỡng của `src/lib/ranks/weakness.ts`. KHÔNG viết bộ đếm thứ hai:
 * hai bộ đếm sẽ nói ngược nhau trên cùng một tài khoản, và học viên sẽ tin bộ
 * nào to tiếng hơn.
 */
export const WEAKNESS_MIN_SAMPLES = 20;

export type WeaknessRowLike = {
  questionType: string;
  samples: number;
  accuracyPercent: number;
};

/**
 * Lọc ra những dòng đủ mẫu để nói. Dưới ngưỡng thì bỏ hẳn khỏi payload — gửi
 * lên rồi dặn model "đừng kết luận" là cách chắc chắn để model vẫn kết luận.
 */
export function weaknessRowsForAi(rows: WeaknessRowLike[]): WeaknessRowLike[] {
  return rows.filter((row) => row.samples >= WEAKNESS_MIN_SAMPLES);
}

/**
 * Câu mà AI phải nói khi chưa đủ dữ liệu, thay vì đoán bừa một điểm yếu.
 * Đây cũng là điểm bán hàng: đánh giá dựa trên bằng chứng tích lũy.
 */
export const INSUFFICIENT_WEAKNESS_DATA_NOTE =
  "Chưa đủ dữ liệu để kết luận điểm yếu theo dạng câu hỏi. " +
  "Cần thêm bài làm để Sổ Sơ Hở đủ mẫu.";

export function hasEnoughWeaknessData(rows: WeaknessRowLike[]): boolean {
  return weaknessRowsForAi(rows).length > 0;
}
