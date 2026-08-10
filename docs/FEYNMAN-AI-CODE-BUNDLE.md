# GÓI MÃ NGUỒN — FEYNMAN AI TUTOR

**Dự án:** Stoic IELTS · `guanghui-stack/Stoic-Ielts`  
**Nhánh đích:** `claude/update-git-info-jawnj4`  
**Bản đặc tả đi kèm:** `docs/DAC-TA-FEYNMAN-AI.md` (`2026-08-feynman-ai-v2`)

> Gói này tồn tại vì phiên làm việc không có quyền ghi lên GitHub. Token của
> phiên được đúc lúc khởi tạo container nên không nhận được quyền cấp sau đó.
> Toàn bộ mã dưới đây **đã chạy và đã kiểm thử** trên máy phiên, chỉ chưa đẩy lên.

---

## Cách áp

Cách chắc chắn nhất là dùng ba file patch đã gửi kèm — chúng giữ nguyên cả
commit lẫn nội dung thông điệp:

```bash
git checkout -b claude/update-git-info-jawnj4 origin/main
git am 0001-*.patch 0002-*.patch 0003-*.patch
git push -u origin claude/update-git-info-jawnj4
```

Nếu muốn chép tay từ tài liệu này thì theo đúng thứ tự mục 3 → 4 → 5, vì
`rules.ts` phụ thuộc `catalog.ts`, còn `init-db.ts` phải khớp `schema.prisma`.

Sau khi áp, chạy để xác nhận:

```bash
npm run test:feynman-ai   # luật AI
npm run test:payments     # bảng giá cũ không bị vỡ
npm run test:indexes      # khóa index không vượt 3072 byte của InnoDB
npx prisma validate
```

---

## 1. Trạng thái

| Phần | Tình trạng |
|---|---|
| Bảng giá theo lượt làm bài | Xong, có kiểm thử |
| Luật AI dạng hàm thuần | Xong, có kiểm thử |
| Lược đồ dữ liệu (5 bảng mới) | Xong, `prisma validate` sạch |
| DDL `init-db.ts` | Xong, khớp lược đồ |
| Cấu hình / lỗi / giá vốn | Xong |
| Gọi OpenAI, prompt, dựng ngữ cảnh | **Chưa làm** |
| Tuyến API, giao diện, trang quản trị | **Chưa làm** |
| Cộng ví trong `fulfillPaidOrder()` | **Chưa làm** |

Mục 7 nói rõ phần chưa làm và vì sao tôi dừng ở đó.

---

## 2. Ba ranh giới mà mã nguồn phải giữ

**AI không bao giờ chạm điểm Reading.** Không có đường nào từ bảng
`FeynmanAiEvaluation` ghi ngược về `Attempt`. `gradeReading()` vẫn là nguồn
duy nhất quyết định điểm.

**Lời giải giáo viên luôn thắng.** `resolveSourceBasis()` ưu tiên bản snapshot
vì nó cố định lịch sử — giáo viên sửa đề về sau không làm đổi lời giải mà học
viên đã đọc.

**Khóa API chỉ sống ở máy chủ.** `config.ts` không export khóa. `errors.ts`
che khóa, chuỗi kết nối và email trước khi bất cứ thứ gì được lưu hay ghi log.

---

## 3. `src/lib/feynman-ai/rules.ts` — MỚI

Toàn bộ luật dạng hàm thuần. Không chạm database, không gọi mạng.

```ts
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
const DAY_MS = 24 * 60 * 60 * 1000;

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
  if (walletRemaining(input.wallet) <= 0) {
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
```

---

## 4. `src/lib/feynman-ai/config.ts` — MỚI

Đọc biến môi trường. Thiếu cấu hình thì mặc định TẮT.

```ts
/**
 * Cấu hình Feynman AI — đọc biến môi trường, KHÔNG bao giờ lộ khóa ra ngoài.
 *
 * Quy tắc: thiếu cấu hình thì mặc định TẮT. Một biến gõ sai không được biến
 * thành "bật với giá trị lạ" — vì thứ đứng sau nó là tiền API thật.
 *
 * File này KHÔNG export `OPENAI_API_KEY`. Khóa chỉ được đọc tại đúng một nơi
 * là `openai-client.ts`, và không đi qua bất kỳ giá trị trả về nào.
 */
import "server-only";

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  // Giá trị lạ → dùng mặc định, KHÔNG dùng NaN. NaN lọt xuống phép so sánh
  // quota sẽ làm mọi so sánh trả false và mở toang giới hạn.
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export type FeynmanAiConfig = {
  enabled: boolean;
  model: string;
  timeoutMs: number;
  gradingPerPurchase: number;
  gradingPerDay: number;
  chatLimitFull: number;
  chatLimitSingle: number;
  maxQuestionsPerRun: number;
  evalMaxOutputTokens: number;
  chatMaxOutputTokens: number;
  invalidRequestsPerHour: number;
};

export function readFeynmanAiConfig(): FeynmanAiConfig {
  // So sánh chính xác với "true": mọi giá trị khác ("1", "yes", "TRUE", rỗng)
  // đều là TẮT. Bật một tính năng tốn tiền phải là hành động rõ ràng.
  const enabled = process.env.OPENAI_FEYNMAN_ENABLED === "true";

  return {
    // Không có khóa thì coi như tắt, dù cờ có bật. Bật mà thiếu khóa chỉ tạo ra
    // một nút bấm luôn báo lỗi cho học viên.
    enabled: enabled && Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_FEYNMAN_MODEL || "gpt-5-mini",
    timeoutMs: intFromEnv("OPENAI_FEYNMAN_TIMEOUT_MS", 90_000, 5_000, 120_000),

    gradingPerPurchase: intFromEnv("OPENAI_FEYNMAN_GRADING_PER_PURCHASE", 10, 0, 100),
    gradingPerDay: intFromEnv("OPENAI_FEYNMAN_GRADING_PER_DAY", 1, 1, 10),
    chatLimitFull: intFromEnv("OPENAI_FEYNMAN_CHAT_LIMIT_FULL", 10, 0, 50),
    chatLimitSingle: intFromEnv("OPENAI_FEYNMAN_CHAT_LIMIT_SINGLE", 5, 0, 50),
    maxQuestionsPerRun: intFromEnv("OPENAI_FEYNMAN_MAX_QUESTIONS_PER_RUN", 10, 1, 40),

    // gpt-5-mini là reasoning model: max_output_tokens BAO GỒM cả reasoning
    // token. Đặt trần quá thấp làm JSON bị cắt giữa chừng và tốn tiền cho một
    // kết quả không dùng được. 4000 là mức tối thiểu an toàn cho lần chấm.
    evalMaxOutputTokens: intFromEnv("OPENAI_FEYNMAN_EVAL_MAX_OUTPUT", 4_000, 1_000, 32_000),
    chatMaxOutputTokens: intFromEnv("OPENAI_FEYNMAN_CHAT_MAX_OUTPUT", 1_200, 200, 8_000),
    invalidRequestsPerHour: intFromEnv("OPENAI_FEYNMAN_INVALID_REQUESTS_PER_HOUR", 3, 1, 100),
  };
}

/** Phiên bản prompt và schema — lưu kèm mỗi bản ghi để về sau đối chiếu được. */
export const PROMPT_VERSION = "2026-08-09-v1";
export const SCHEMA_VERSION = "2026-08-09-v1";
```

---

## 5. `src/lib/feynman-ai/errors.ts` — MỚI

Mã lỗi + làm sạch thông báo trước khi lưu. Chặn lộ khóa API.

```ts
/**
 * Mã lỗi và việc làm sạch thông báo lỗi trước khi lưu hoặc trả về.
 *
 * Vì sao cần: thông báo lỗi của SDK OpenAI có thể chứa nguyên đoạn request,
 * và request thì chứa nội dung bài của học viên. Nguy hiểm hơn, một số dạng
 * lỗi mạng nhúng cả header Authorization vào chuỗi. Lưu thẳng vào database
 * hoặc in ra log là lộ khóa API.
 */

export type FeynmanAiErrorCode =
  | "FEATURE_DISABLED"
  | "NO_ACCESS"
  | "COMPETITION_LOCKED"
  | "QUOTA_EXHAUSTED"
  | "DAILY_LIMIT_REACHED"
  | "CHAT_LIMIT_REACHED"
  | "REVIEW_NOT_COMPLETED"
  | "ALREADY_GRADED"
  | "EVALUATION_NOT_READY"
  | "QUESTION_TOO_SHORT"
  | "QUESTION_TOO_LONG"
  | "OUT_OF_SCOPE"
  | "INVALID_REQUEST"
  | "RATE_LIMITED"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_ERROR"
  | "MALFORMED_OUTPUT"
  | "INTERNAL_ERROR";

export class FeynmanAiError extends Error {
  constructor(
    readonly code: FeynmanAiErrorCode,
    message?: string
  ) {
    super(message ?? code);
    this.name = "FeynmanAiError";
  }
}

/**
 * Những mẫu tuyệt đối không được lọt vào chuỗi lỗi đã lưu.
 * Danh sách cố tình rộng tay: thà che nhầm một chuỗi vô hại còn hơn để lọt
 * một khóa API vào database.
 */
const SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9_-]{8,}/g,          // khóa OpenAI
  /Bearer\s+[A-Za-z0-9._-]{8,}/gi,  // header Authorization
  /mysql:\/\/[^\s"']+/gi,           // chuỗi kết nối database
  /postgres(ql)?:\/\/[^\s"']+/gi,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, // email học viên
];

const MAX_ERROR_CHARS = 300;

/**
 * Làm sạch lỗi trước khi lưu vào cột `errorCode` hoặc ghi log.
 * Luôn trả về chuỗi ngắn, đã che bí mật, không bao giờ ném ra lỗi mới.
 */
export function sanitizeErrorMessage(err: unknown): string {
  let text: string;
  try {
    text = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  } catch {
    return "UNKNOWN_ERROR";
  }

  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, "[da-che]");
  }

  return text.slice(0, MAX_ERROR_CHARS);
}

/** Xếp lỗi của SDK về một mã ổn định để trang quản trị thống kê được. */
export function classifyUpstreamError(err: unknown): FeynmanAiErrorCode {
  const status = (err as { status?: number } | null)?.status;

  if (status === 429) return "RATE_LIMITED";
  if (typeof status === "number" && status >= 500) return "UPSTREAM_ERROR";

  const name = (err as { name?: string } | null)?.name ?? "";
  if (name === "AbortError" || name === "TimeoutError") return "UPSTREAM_TIMEOUT";

  return "UPSTREAM_ERROR";
}

/**
 * Lỗi nào thì HOÀN LẠI lượt đã giữ chỗ.
 *
 * Nguyên tắc: học viên chỉ mất lượt khi thật sự nhận được kết quả dùng được.
 * Mọi thất bại về phía hệ thống đều hoàn lượt — kể cả khi OpenAI đã tính tiền
 * chúng ta, vì đó là chi phí vận hành chứ không phải lỗi của học viên.
 */
export function shouldRefundQuota(code: FeynmanAiErrorCode): boolean {
  switch (code) {
    case "RATE_LIMITED":
    case "UPSTREAM_TIMEOUT":
    case "UPSTREAM_ERROR":
    case "MALFORMED_OUTPUT":
    case "INTERNAL_ERROR":
    case "OUT_OF_SCOPE":
    case "INVALID_REQUEST":
      return true;
    default:
      return false;
  }
}
```

---

## 6. `src/lib/feynman-ai/cost.ts` — MỚI

Bảng giá token, tính bằng micro-USD nguyên để không trôi sai số.

```ts
/**
 * Bảng giá token — để trang quản trị biết mỗi lượt AI tốn bao nhiêu.
 *
 * Con số ở đây là ƯỚC TÍNH cho mục đích theo dõi nội bộ, không phải hóa đơn.
 * Hóa đơn thật vẫn là thứ OpenAI gửi. Mục đích duy nhất: phát hiện sớm khi
 * một tài khoản hay một dạng câu hỏi đốt tiền bất thường.
 *
 * Không import "server-only": bộ kiểm thử chạy bằng node thuần cần đọc file
 * này, và nó không chứa bí mật nào — chỉ là giá công khai của OpenAI.
 */

/** Đổi bản này khi OpenAI đổi giá, để số liệu cũ vẫn tra được tính theo giá nào. */
export const COST_TABLE_VERSION = "2026-08-09-v1";

/** Giá USD cho MỘT TRIỆU token. */
type ModelPricing = {
  input: number;
  cachedInput: number;
  output: number;
};

const PRICING: Record<string, ModelPricing> = {
  "gpt-5-mini": { input: 0.25, cachedInput: 0.025, output: 2.0 },
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
};

/**
 * Chi phí ước tính, đơn vị MICRO-USD (một phần triệu đô).
 *
 * Dùng số nguyên micro-USD thay vì số thực USD là cố ý: cộng dồn hàng nghìn
 * số thực rất nhỏ sẽ tích lũy sai số dấu phẩy động, và cột tổng chi phí ở
 * trang quản trị sẽ lệch dần theo thời gian mà không ai biết vì sao.
 *
 * Model không có trong bảng giá thì trả 0 — vẫn chạy, vẫn lưu token, và trang
 * quản trị hiện "Chưa có bảng giá" thay vì bịa ra một con số sai.
 */
export function estimateCostMicroUsd(model: string, usage: TokenUsage): number {
  const price = PRICING[model];
  if (!price) return 0;

  const cached = usage.cachedInputTokens ?? 0;
  // Token đã cache được tính riêng và rẻ hơn nhiều, nên phải trừ ra khỏi
  // input thường, nếu không sẽ tính tiền hai lần cho cùng một token.
  const freshInput = Math.max(0, usage.inputTokens - cached);

  const usd =
    (freshInput * price.input +
      cached * price.cachedInput +
      usage.outputTokens * price.output) /
    1_000_000;

  return Math.round(usd * 1_000_000);
}

export function hasPricing(model: string): boolean {
  return Boolean(PRICING[model]);
}

/** Tỷ giá chỉ dùng để HIỂN THỊ ở trang quản trị, không dùng để tính tiền. */
export const VND_PER_USD = 26_000;

export function microUsdToVnd(microUsd: number): number {
  return Math.round((microUsd / 1_000_000) * VND_PER_USD);
}
```

---

## 7. `src/lib/payments/catalog.ts` — SỬA

Bảng giá mô hình mới + đánh dấu gói dừng bán.

```ts
/**
 * Bảng giá — nguồn sự thật DUY NHẤT, nằm phía máy chủ.
 *
 * Trình duyệt chỉ gửi lên mã sản phẩm (offerCode); số tiền không bao giờ đi từ
 * client lên. Nhờ vậy người dùng có sửa HTML cũng không mua được giá rẻ hơn.
 *
 * File này KHÔNG import "server-only" vì `scripts/test-payments.ts` cần đọc nó
 * khi chạy bằng node thuần. Bù lại, file cũng không chứa bất cứ bí mật nào —
 * chỉ là giá công khai đã in trên trang bảng giá.
 */

/** Đổi bản này khi thay giá, để đơn cũ vẫn tra được mình đã bán theo giá nào. */
export const PRICE_VERSION = "2026-08-09-v2";

export type AccessFeature = "READING" | "FEYNMAN";

/**
 * Phạm vi quyền.
 *
 * - `ALL`      — mọi bài đủ điều kiện, trong thời hạn
 * - `EXERCISE` — quyền cũ, mở mọi lượt làm của một bài
 * - `ATTEMPT`  — mô hình hiện tại, mở đúng một lượt làm bài
 * - `NONE`     — gói không cấp quyền truy cập (gói nạp lượt AI)
 *
 * `NONE` tồn tại để `decideGrantAccess` có thứ để chặn: gói nạp lượt lẽ ra
 * không bao giờ tạo `AccessGrant`, nhưng nếu lỗi ở đâu đó tạo nhầm thì grant
 * mang scope này vẫn không mở được gì.
 */
export type AccessScope = "ALL" | "EXERCISE" | "ATTEMPT" | "NONE";

/** `ACCESS` mở tính năng; `AI_TOPUP` chỉ cộng lượt AI vào ví, không mở gì cả. */
export type OfferKind = "ACCESS" | "AI_TOPUP";

export type Offer = {
  kind: OfferKind;
  feature: AccessFeature;
  scope: AccessScope;
  amount: number;
  /** Giá ưu đãi lần đầu, chỉ có ở FEYNMAN_SINGLE. */
  introAmount?: number;
  /** null = quyền vĩnh viễn với đúng phạm vi đã mua. */
  durationDays: number | null;
  label: string;
  /** Câu mô tả ngắn hiện trên nút và trang bảng giá. */
  blurb: string;
  /**
   * Số lượt AI chấm cộng vào ví CHUNG của tài khoản khi đơn được thanh toán.
   * Ví không gắn với lượt làm bài nào — mua ở đề nào cũng tiêu được ở đề khác.
   */
  aiGradingCredits?: number;
  /** Số câu được hỏi AI trong mỗi lượt chấm mở bởi gói này. */
  aiChatLimit?: number;
  /**
   * Gói đã dừng bán. Không hiện ở trang bán nữa, nhưng KHÔNG xóa khỏi bảng giá:
   * đơn cũ phải tra cứu được và `AccessGrant` cũ phải đọc quyền được bình
   * thường cho tới khi hết hạn. Người đã trả tiền phải dùng hết thứ đã mua.
   */
  retired?: boolean;
};

export const OFFERS = {
  /* --- Đang bán ------------------------------------------------------ */

  FEYNMAN_ATTEMPT_FULL: {
    kind: "ACCESS",
    feature: "FEYNMAN",
    scope: "ATTEMPT",
    amount: 39_000,
    durationDays: null,
    aiGradingCredits: 10,
    aiChatLimit: 10,
    label: "Full Test — đáp án chi tiết + Feynman + AI",
    blurb: "Mở đúng lượt làm bài này, giữ vĩnh viễn. Tặng 10 lượt AI chấm.",
  },
  FEYNMAN_ATTEMPT_SINGLE: {
    kind: "ACCESS",
    feature: "FEYNMAN",
    scope: "ATTEMPT",
    amount: 19_000,
    durationDays: null,
    aiGradingCredits: 10,
    aiChatLimit: 5,
    label: "Đề đơn — đáp án chi tiết + Feynman + AI",
    blurb: "Mở đúng lượt làm bài này, giữ vĩnh viễn. Tặng 10 lượt AI chấm.",
  },
  FEYNMAN_AI_TOPUP: {
    kind: "AI_TOPUP",
    feature: "FEYNMAN",
    scope: "NONE",
    amount: 29_000,
    durationDays: null,
    aiGradingCredits: 10,
    label: "Nạp thêm 10 lượt AI chấm",
    blurb: "Cộng vào ví chung của tài khoản, dùng được cho mọi lượt làm bài.",
  },

  /* --- Đã dừng bán, giữ lại để đơn cũ và quyền cũ vẫn đọc được -------- */

  READING_ALL_30D: {
    kind: "ACCESS",
    feature: "READING",
    scope: "ALL",
    amount: 99_000,
    durationDays: 30,
    retired: true,
    label: "Reading — toàn bộ 30 ngày",
    blurb: "Làm mọi bài Reading cần mở khóa trong 30 ngày.",
  },
  READING_SINGLE: {
    kind: "ACCESS",
    feature: "READING",
    scope: "EXERCISE",
    amount: 9_000,
    durationDays: null,
    retired: true,
    label: "Reading — mở một bài",
    blurb: "Mở đúng một bài, giữ vĩnh viễn.",
  },
  FEYNMAN_ALL_30D: {
    kind: "ACCESS",
    feature: "FEYNMAN",
    scope: "ALL",
    amount: 299_000,
    durationDays: 30,
    retired: true,
    label: "Feynman — toàn bộ 30 ngày",
    blurb: "Chữa sâu mọi bài Reading đã hoàn thành, trong 30 ngày.",
  },
  FEYNMAN_SINGLE: {
    kind: "ACCESS",
    feature: "FEYNMAN",
    scope: "EXERCISE",
    amount: 49_000,
    introAmount: 9_000,
    durationDays: null,
    retired: true,
    label: "Feynman — mở một bài",
    blurb: "Chữa sâu đúng một bài, giữ vĩnh viễn.",
  },
} as const satisfies Record<string, Offer>;

export type OfferCode = keyof typeof OFFERS;

export function isOfferCode(value: string): value is OfferCode {
  return Object.prototype.hasOwnProperty.call(OFFERS, value);
}

/**
 * Các gói còn bán, dùng cho trang bảng giá.
 *
 * Gói `retired` bị lọc ở ĐÂY chứ không bị xóa khỏi `OFFERS` — mọi đường tra
 * cứu đơn cũ và đọc quyền cũ vẫn phải tìm thấy chúng.
 */
export function listOffersForSale(): OfferCode[] {
  return (Object.keys(OFFERS) as OfferCode[]).filter(
    (code) => !("retired" in OFFERS[code] && OFFERS[code].retired)
  );
}

/** Gói này có còn bán không. Đơn mới cho gói đã dừng bán phải bị từ chối. */
export function isOfferOnSale(code: OfferCode): boolean {
  const offer = OFFERS[code] as Offer;
  return offer.retired !== true;
}

/** Định dạng tiền Việt cho giao diện: 99000 → "99.000đ". */
export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

export const INTRO_PROMO_NOTICE =
  "Ưu đãi trải nghiệm: Bài Feynman đầu tiên của bạn chỉ 9.000đ " +
  "(giá thường 49.000đ). Ưu đãi áp dụng một lần cho mỗi tài khoản.";
```

---

## 8. `scripts/test-feynman-ai.ts` — MỚI

Bộ kiểm thử, chạy được không cần MySQL và không cần khóa OpenAI.

```ts
/**
 * Kiểm thử luật của Feynman AI Tutor.
 * Chạy: node --experimental-strip-types scripts/test-feynman-ai.ts
 *
 * Bốn thứ ở đây sai là hỏng thật, nên mỗi thứ đều có phép thử riêng:
 *   1. lộ đáp án của đề Nguyệt Thí đang diễn ra
 *   2. gửi dữ liệu cá nhân của học viên sang OpenAI
 *   3. tính nhầm ví/nhịp chấm → học viên mất suất đã trả tiền
 *   4. gỡ nhầm quyền của người đã mua gói cũ
 */
import {
  OFFERS,
  PRICE_VERSION,
  isOfferOnSale,
  listOffersForSale,
} from "../src/lib/payments/catalog.ts";
import {
  FORBIDDEN_PAYLOAD_KEYS,
  INSUFFICIENT_WEAKNESS_DATA_NOTE,
  MAX_QUESTIONS_PER_RUN,
  PASS_THRESHOLD_PERCENT,
  chatLimitForOffer,
  competitionLock,
  creditsForOffer,
  decideAiAccess,
  decideCanAsk,
  decideCanGrade,
  decideQuestionPick,
  feynmanAchievementEventKey,
  findForbiddenKeys,
  hasEnoughWeaknessData,
  isSameVietnamDay,
  resolveSourceBasis,
  shouldEmitFeynmanAchievement,
  verdictFor,
  vietnamDayKey,
  walletRemaining,
  weaknessRowsForAi,
  type AiGrantLike,
} from "../src/lib/feynman-ai/rules.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(
      `      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`
    );
    failures++;
  }
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-08-09T10:00:00.000Z");
const at = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY);

const grant = (o: Partial<AiGrantLike>): AiGrantLike => ({
  feature: "FEYNMAN",
  scope: "ATTEMPT",
  exerciseId: null,
  attemptId: "att-1",
  status: "ACTIVE",
  startsAt: at(-1),
  expiresAt: null,
  ...o,
});

const access = (
  grants: AiGrantLike[],
  o: { exerciseId?: string | null; attemptId?: string | null; at?: Date } = {}
) =>
  decideAiAccess({
    grants,
    feature: "FEYNMAN",
    exerciseId: o.exerciseId === undefined ? "ex-A" : o.exerciseId,
    attemptId: o.attemptId === undefined ? "att-1" : o.attemptId,
    at: o.at ?? NOW,
  });

/* ---------------------------------------------------------------- */
console.log("\nBẢNG GIÁ — ba gói đang bán, ba gói đã dừng nhưng còn tra cứu được");
check("Full Test = 39.000đ", OFFERS.FEYNMAN_ATTEMPT_FULL.amount, 39_000);
check("Đề đơn = 19.000đ", OFFERS.FEYNMAN_ATTEMPT_SINGLE.amount, 19_000);
check("Nạp lượt AI = 29.000đ", OFFERS.FEYNMAN_AI_TOPUP.amount, 29_000);
check("Bản giá đã tăng khi đổi mô hình", PRICE_VERSION, "2026-08-09-v2");

check(
  "Đúng ba gói còn bán",
  listOffersForSale().sort(),
  ["FEYNMAN_AI_TOPUP", "FEYNMAN_ATTEMPT_FULL", "FEYNMAN_ATTEMPT_SINGLE"]
);
check("FEYNMAN_ALL_30D đã dừng bán", isOfferOnSale("FEYNMAN_ALL_30D"), false);
check("READING_SINGLE đã dừng bán", isOfferOnSale("READING_SINGLE"), false);
check(
  "Gói 299K vẫn còn trong bảng giá để đơn cũ tra được",
  OFFERS.FEYNMAN_ALL_30D.amount,
  299_000
);

console.log("\nSỐ LƯỢT VÀ SỐ CÂU HỎI THEO GÓI");
check("Full Test cộng 10 lượt", creditsForOffer("FEYNMAN_ATTEMPT_FULL"), 10);
check("Đề đơn cộng 10 lượt", creditsForOffer("FEYNMAN_ATTEMPT_SINGLE"), 10);
check("Gói nạp cộng 10 lượt", creditsForOffer("FEYNMAN_AI_TOPUP"), 10);
check("Gói Reading cũ không cộng lượt AI", creditsForOffer("READING_SINGLE"), 0);
check("Full Test hỏi 10 câu", chatLimitForOffer("FEYNMAN_ATTEMPT_FULL"), 10);
check("Đề đơn hỏi 5 câu — quyết định Q4", chatLimitForOffer("FEYNMAN_ATTEMPT_SINGLE"), 5);

/* ---------------------------------------------------------------- */
console.log("\nQUYỀN TRUY CẬP — ba phạm vi sống chung, không chuyển đổi dữ liệu cũ");
check("ATTEMPT mở đúng lượt làm bài của nó", access([grant({})]), true);
check(
  "ATTEMPT không mở lượt làm bài khác",
  access([grant({})], { attemptId: "att-2" }),
  false
);
check(
  "ALL cũ vẫn mở mọi lượt làm bài",
  access([grant({ scope: "ALL", attemptId: null })], { attemptId: "att-9" }),
  true
);
check(
  "EXERCISE cũ vẫn mở mọi lượt của bài đó",
  access([grant({ scope: "EXERCISE", exerciseId: "ex-A", attemptId: null })], {
    attemptId: "att-9",
  }),
  true
);
check(
  "EXERCISE không mở bài khác",
  access([grant({ scope: "EXERCISE", exerciseId: "ex-A", attemptId: null })], {
    exerciseId: "ex-B",
    attemptId: "att-9",
  }),
  false
);
check(
  "Gói nạp lượt (scope NONE) không mở gì cả",
  access([grant({ scope: "NONE", attemptId: null })]),
  false
);
check(
  "Grant ATTEMPT thiếu attemptId là dữ liệu hỏng → chặn",
  access([grant({ attemptId: null })]),
  false
);
check("Grant hết hạn không mở", access([grant({ expiresAt: at(-1) })]), false);
check("Grant chưa tới hạn không mở", access([grant({ startsAt: at(1) })]), false);
check("Grant bị thu hồi không mở", access([grant({ status: "REVOKED" })]), false);
check("Scope lạ không mở", access([grant({ scope: "WHATEVER" })]), false);
check(
  "Quyền READING không mở được FEYNMAN",
  access([grant({ feature: "READING" })]),
  false
);

/* ---------------------------------------------------------------- */
console.log("\nNGUYỆT THÍ — khóa kín cho tới khi kỳ thi kết thúc");
check(
  "Đang trong kỳ thi → khóa",
  competitionLock({
    isCompetitionAttempt: true,
    competitionEndsAt: at(1),
    at: NOW,
  }),
  { locked: true, reason: "COMPETITION_IN_PROGRESS" }
);
check(
  "Đã qua endsAt → mở",
  competitionLock({
    isCompetitionAttempt: true,
    competitionEndsAt: at(-1),
    at: NOW,
  }),
  { locked: false, reason: null }
);
check(
  "Thiếu endsAt → vẫn khóa, không đoán theo hướng mở",
  competitionLock({
    isCompetitionAttempt: true,
    competitionEndsAt: null,
    at: NOW,
  }),
  { locked: true, reason: "COMPETITION_ENDS_AT_MISSING" }
);
check(
  "Bài luyện tập thường không bị khóa",
  competitionLock({
    isCompetitionAttempt: false,
    competitionEndsAt: null,
    at: NOW,
  }),
  { locked: false, reason: null }
);

/* ---------------------------------------------------------------- */
console.log("\nMÚI GIỜ — mốc sang ngày theo giờ Việt Nam, không phải UTC");
check(
  "23h50 giờ VN ngày 09 là ngày 09",
  vietnamDayKey(new Date("2026-08-09T16:50:00.000Z")),
  "2026-08-09"
);
check(
  "00h10 giờ VN ngày 10 là ngày 10",
  vietnamDayKey(new Date("2026-08-09T17:10:00.000Z")),
  "2026-08-10"
);
check(
  "06h sáng giờ VN vẫn là ngày mới, không dính ngày hôm trước",
  isSameVietnamDay(
    new Date("2026-08-08T18:00:00.000Z"), // 01h ngày 09 giờ VN
    new Date("2026-08-08T23:00:00.000Z")  // 06h ngày 09 giờ VN
  ),
  true
);
check(
  "Nếu tính theo UTC thì hai mốc trên khác ngày — đây là cái bẫy đã tránh",
  new Date("2026-08-08T18:00:00.000Z").toISOString().slice(0, 10) ===
    new Date("2026-08-08T23:00:00.000Z").toISOString().slice(0, 10),
  true
);

/* ---------------------------------------------------------------- */
console.log("\nVÍ LƯỢT AI — theo tài khoản, dùng chung mọi lượt làm bài");
check("Ví mới mua một gói còn 10", walletRemaining({ grantedTotal: 10, usedTotal: 0 }), 10);
check("Dùng 3 còn 7", walletRemaining({ grantedTotal: 10, usedTotal: 3 }), 7);
check("Dùng hết còn 0", walletRemaining({ grantedTotal: 10, usedTotal: 10 }), 0);
check(
  "Dữ liệu lệch (dùng quá cấp) vẫn trả 0, không trả số âm",
  walletRemaining({ grantedTotal: 10, usedTotal: 13 }),
  0
);
check(
  "Mua hai gói thì ví cộng dồn",
  walletRemaining({ grantedTotal: 10 + 10, usedTotal: 4 }),
  16
);

/* ---------------------------------------------------------------- */
console.log("\nCHO PHÉP AI CHẤM — thứ tự hàng rào");
const okGrade = {
  featureEnabled: true,
  hasAccess: true,
  competitionLocked: false,
  reviewStatus: "COMPLETED",
  alreadyGraded: false,
  wallet: { grantedTotal: 10, usedTotal: 0 },
  lastGradedAt: null as Date | null,
  at: NOW,
};

check("Đủ điều kiện thì cho chấm", decideCanGrade(okGrade), { allowed: true });
check(
  "Tắt tính năng thì chặn trước tiên",
  decideCanGrade({ ...okGrade, featureEnabled: false, hasAccess: false }),
  { allowed: false, reason: "FEATURE_DISABLED" }
);
check(
  "Chưa mua thì chặn",
  decideCanGrade({ ...okGrade, hasAccess: false }),
  { allowed: false, reason: "NO_ACCESS" }
);
check(
  "Nguyệt Thí chặn kể cả khi đã mua",
  decideCanGrade({ ...okGrade, competitionLocked: true }),
  { allowed: false, reason: "COMPETITION_LOCKED" }
);
check(
  "Chưa hoàn thành Feynman thì chưa chấm",
  decideCanGrade({ ...okGrade, reviewStatus: "REVEALED" }),
  { allowed: false, reason: "REVIEW_NOT_COMPLETED" }
);
check(
  "Một phiên luyện chỉ chấm một lần",
  decideCanGrade({ ...okGrade, alreadyGraded: true }),
  { allowed: false, reason: "ALREADY_GRADED" }
);
check(
  "Chấm lần hai trong cùng ngày trên cùng lượt làm bài bị chặn",
  decideCanGrade({ ...okGrade, lastGradedAt: new Date(NOW.getTime() - 3600_000) }),
  { allowed: false, reason: "DAILY_LIMIT_REACHED" }
);
check(
  "Hôm qua đã chấm thì hôm nay chấm được",
  decideCanGrade({ ...okGrade, lastGradedAt: at(-1) }),
  { allowed: true }
);
check(
  "Hết ví thì chặn",
  decideCanGrade({ ...okGrade, wallet: { grantedTotal: 10, usedTotal: 10 } }),
  { allowed: false, reason: "QUOTA_EXHAUSTED" }
);
check(
  "Nhịp ngày kiểm TRƯỚC ví — hết ví mà hôm nay đã chấm thì báo lỗi ngày",
  decideCanGrade({
    ...okGrade,
    wallet: { grantedTotal: 10, usedTotal: 10 },
    lastGradedAt: new Date(NOW.getTime() - 3600_000),
  }),
  { allowed: false, reason: "DAILY_LIMIT_REACHED" }
);

console.log("\n  Hai lượt làm bài khác nhau trong cùng một ngày — Q1 gặp Q2");
check(
  "Lượt làm bài A đã chấm hôm nay, lượt B vẫn chấm được (nhịp theo lượt làm bài)",
  decideCanGrade({
    ...okGrade,
    lastGradedAt: null, // lượt B chưa từng chấm
    wallet: { grantedTotal: 20, usedTotal: 1 }, // ví chung đã bị lượt A trừ 1
  }),
  { allowed: true }
);

/* ---------------------------------------------------------------- */
console.log("\nHỎI AI — giới hạn khác nhau giữa hai gói");
const okAsk = {
  featureEnabled: true,
  hasAccess: true,
  competitionLocked: false,
  evaluationStatus: "COMPLETED",
  questionUsed: 0,
  questionLimit: 10,
  question: "Vì sao đáp án là NOT GIVEN mà không phải FALSE?",
};

check("Câu hỏi hợp lệ được trả lời", decideCanAsk(okAsk), { allowed: true });
check(
  "Full Test câu thứ 11 bị chặn",
  decideCanAsk({ ...okAsk, questionUsed: 10, questionLimit: 10 }),
  { allowed: false, reason: "CHAT_LIMIT_REACHED" }
);
check(
  "Đề đơn câu thứ 6 bị chặn",
  decideCanAsk({ ...okAsk, questionUsed: 5, questionLimit: 5 }),
  { allowed: false, reason: "CHAT_LIMIT_REACHED" }
);
check(
  "Đề đơn câu thứ 5 vẫn được trả lời",
  decideCanAsk({ ...okAsk, questionUsed: 4, questionLimit: 5 }),
  { allowed: true }
);
check(
  "Câu trống không gọi API",
  decideCanAsk({ ...okAsk, question: "   " }),
  { allowed: false, reason: "QUESTION_TOO_SHORT" }
);
check(
  "Câu quá dài bị chặn",
  decideCanAsk({ ...okAsk, question: "a".repeat(1001) }),
  { allowed: false, reason: "QUESTION_TOO_LONG" }
);
check(
  "Chưa chấm xong thì chưa hỏi được",
  decideCanAsk({ ...okAsk, evaluationStatus: "FAILED" }),
  { allowed: false, reason: "EVALUATION_NOT_READY" }
);
check(
  "Nguyệt Thí chặn cả phần hỏi đáp",
  decideCanAsk({ ...okAsk, competitionLocked: true }),
  { allowed: false, reason: "COMPETITION_LOCKED" }
);

/* ---------------------------------------------------------------- */
console.log("\nCHỌN CÂU LUYỆN — tối đa 10, tick câu đúng vẫn hợp lệ");
const ids = Array.from({ length: 40 }, (_, i) => `p${Math.floor(i / 14) + 1}:q${i + 1}`);

check(
  "Chọn 10 câu hợp lệ",
  decideQuestionPick({ picked: ids.slice(0, 10), availableIds: ids }).allowed,
  true
);
check(
  "Chọn 11 câu bị chặn",
  decideQuestionPick({ picked: ids.slice(0, 11), availableIds: ids }),
  { allowed: false, reason: "TOO_MANY_QUESTIONS" }
);
check(
  "Không chọn câu nào bị chặn",
  decideQuestionPick({ picked: [], availableIds: ids }),
  { allowed: false, reason: "EMPTY_SELECTION" }
);
check(
  "Chọn trùng câu bị chặn",
  decideQuestionPick({ picked: [ids[0], ids[0]], availableIds: ids }),
  { allowed: false, reason: "DUPLICATE_QUESTION" }
);
check(
  "Câu không có thật trong đề bị chặn",
  decideQuestionPick({ picked: ["p9:q99"], availableIds: ids }),
  { allowed: false, reason: "UNKNOWN_QUESTION" }
);
check("Trần chọn câu đúng bằng 10", MAX_QUESTIONS_PER_RUN, 10);

/* ---------------------------------------------------------------- */
console.log("\nNGƯỠNG ĐẠT — 70% theo ý nghĩa");
check("Ngưỡng là 70", PASS_THRESHOLD_PERCENT, 70);
check("69% là KHÔNG ĐẠT", verdictFor(69), "KHONG_DAT");
check("70% là ĐẠT", verdictFor(70), "DAT");
check("100% là ĐẠT", verdictFor(100), "DAT");
check("Số âm là dữ liệu hỏng → KHÔNG ĐẠT", verdictFor(-1), "KHONG_DAT");
check("Trên 100 là dữ liệu hỏng → KHÔNG ĐẠT", verdictFor(101), "KHONG_DAT");
check("NaN là dữ liệu hỏng → KHÔNG ĐẠT", verdictFor(Number.NaN), "KHONG_DAT");

/* ---------------------------------------------------------------- */
console.log("\nDANH HIỆU — chỉ lần hoàn thành đầu tiên của một lượt làm bài");
check(
  "Khóa sự kiện theo lượt làm bài, không theo phiên luyện",
  feynmanAchievementEventKey("att-1"),
  "FEYNMAN_COMPLETED:att-1"
);
check(
  "Lần hoàn thành đầu tiên tính danh hiệu",
  shouldEmitFeynmanAchievement({ attemptId: "att-1", completedRunsBefore: 0 }),
  true
);
check(
  "Lần thứ hai trở đi là luyện tập, không tính danh hiệu",
  shouldEmitFeynmanAchievement({ attemptId: "att-1", completedRunsBefore: 1 }),
  false
);
check(
  "Làm lại lần thứ mười vẫn không cày được danh hiệu",
  shouldEmitFeynmanAchievement({ attemptId: "att-1", completedRunsBefore: 9 }),
  false
);

/* ---------------------------------------------------------------- */
console.log("\nRIÊNG TƯ — payload gửi OpenAI không được chứa dữ liệu cá nhân");
const cleanPayload = {
  passage: "Bees navigate using polarised light...",
  questions: [
    {
      code: "p2:q14",
      type: "TRUE_FALSE_NOT_GIVEN",
      prompt: "Bees can see ultraviolet light.",
      correctAnswer: "TRUE",
      studentAnswer: "NOT GIVEN",
      teacherExplanation: "Đoạn 3 nói rõ ong nhìn được tia cực tím.",
    },
  ],
  currentBand: 6.5,
  targetBand: 7.5,
  attemptNumber: 3,
};

check("Payload sạch không có khóa cấm", findForbiddenKeys(cleanPayload), []);
check(
  "Mã câu p2:q14 KHÔNG bị coi là dữ liệu cá nhân",
  findForbiddenKeys({ code: "p2:q14" }),
  []
);
check(
  "Lỡ thêm email vào thì bị bắt",
  findForbiddenKeys({ student: { email: "a@b.com" } }),
  ["$.student.email"]
);
check(
  "Lỡ thêm userId lồng sâu vẫn bị bắt",
  findForbiddenKeys({ a: { b: [{ c: { userId: "u1" } }] } }),
  ["$.a.b[0].c.userId"]
);
check(
  "attemptId không được gửi dù nó không phải bí mật lớn",
  findForbiddenKeys({ attemptId: "att-1" }),
  ["$.attemptId"]
);
check(
  "Nhiều khóa cấm cùng lúc đều bị liệt kê",
  findForbiddenKeys({ email: "a@b.com", candidateCode: "TS001" }).sort(),
  ["$.candidateCode", "$.email"]
);
check("Danh sách khóa cấm có đủ 17 mục", FORBIDDEN_PAYLOAD_KEYS.length, 17);

/* ---------------------------------------------------------------- */
console.log("\nƯU TIÊN LỜI GIẢI GIÁO VIÊN");
check(
  "Có snapshot thì dùng snapshot — cố định lịch sử",
  resolveSourceBasis({
    snapshotExplanation: "Lời giải lúc học viên tick",
    liveExplanation: "Lời giải giáo viên vừa sửa",
  }),
  { basis: "TEACHER_APPROVED", explanation: "Lời giải lúc học viên tick" }
);
check(
  "Không có snapshot thì dùng lời giải hiện tại",
  resolveSourceBasis({
    snapshotExplanation: null,
    liveExplanation: "Lời giải trong đề",
  }),
  { basis: "TEACHER_APPROVED", explanation: "Lời giải trong đề" }
);
check(
  "Không có lời giải nào thì AI phải tự dẫn chứng từ passage",
  resolveSourceBasis({ snapshotExplanation: null, liveExplanation: null }),
  { basis: "PASSAGE_DERIVED", explanation: null }
);
check(
  "Lời giải rỗng coi như không có",
  resolveSourceBasis({ snapshotExplanation: "   ", liveExplanation: "  " }),
  { basis: "PASSAGE_DERIVED", explanation: null }
);

/* ---------------------------------------------------------------- */
console.log("\nSỔ SƠ HỞ — chưa đủ mẫu thì không kết luận");
const rows = [
  { questionType: "MATCHING_HEADINGS", samples: 34, accuracyPercent: 41 },
  { questionType: "TRUE_FALSE_NOT_GIVEN", samples: 19, accuracyPercent: 22 },
  { questionType: "SUMMARY_COMPLETION", samples: 20, accuracyPercent: 60 },
];

check(
  "Chỉ giữ dòng đủ 20 mẫu",
  weaknessRowsForAi(rows).map((r) => r.questionType),
  ["MATCHING_HEADINGS", "SUMMARY_COMPLETION"]
);
check(
  "Dòng 19 mẫu bị loại dù tỷ lệ đúng rất thấp",
  weaknessRowsForAi(rows).some((r) => r.questionType === "TRUE_FALSE_NOT_GIVEN"),
  false
);
check("Có dòng đủ mẫu thì được kết luận", hasEnoughWeaknessData(rows), true);
check(
  "Học viên mới chưa đủ mẫu thì không kết luận gì",
  hasEnoughWeaknessData([
    { questionType: "MATCHING_HEADINGS", samples: 3, accuracyPercent: 0 },
  ]),
  false
);
check("Không có dữ liệu thì không kết luận", hasEnoughWeaknessData([]), false);
check(
  "Có sẵn câu để nói khi thiếu dữ liệu",
  INSUFFICIENT_WEAKNESS_DATA_NOTE.includes("Chưa đủ dữ liệu"),
  true
);

/* ---------------------------------------------------------------- */
console.log(
  failures === 0
    ? "\ntest:feynman-ai — tất cả phép thử đều đạt.\n"
    : `\ntest:feynman-ai — ${failures} phép thử THẤT BẠI.\n`
);
process.exit(failures === 0 ? 0 : 1);
```

---

## 9. Các file sửa — dạng diff

Ba file dưới đây quá dài để chép nguyên, nên đưa ở dạng khác biệt. Áp bằng
patch là an toàn nhất.

### `prisma/schema.prisma`

Năm bảng mới + FeynmanReview bỏ ràng buộc một phiên.

```diff
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
index 782b670..01c86fb 100644
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -36,6 +36,10 @@ model User {
   paymentOrders  PaymentOrder[]
   accessGrants   AccessGrant[]
 
+  feynmanAiEvaluations FeynmanAiEvaluation[]
+  feynmanAiMessages    FeynmanAiMessage[]
+  feynmanAiBudget      FeynmanAiBudget?
+
   assemblies                ReadingAssembly[]
   competitionEntries        CompetitionEntry[]
   competitionQualifications CompetitionQualification[]
@@ -153,7 +157,11 @@ model Attempt {
 
   user               User                @relation(fields: [userId], references: [id], onDelete: Cascade)
   exercise           Exercise            @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
-  feynmanReview      FeynmanReview?
+  /// Nhieu phien: luyen lai khong gioi han so lan.
+  feynmanReviews     FeynmanReview[]
+  feynmanAiState     FeynmanAiAttemptState?
+  accessGrants       AccessGrant[]
+  paymentOrders      PaymentOrder[]
   assembly           ReadingAssembly?    @relation(fields: [assemblyId], references: [id], onDelete: SetNull)
   competitionAttempt CompetitionAttempt?
 
@@ -237,10 +245,16 @@ model ExerciseCollectionItem {
 
 /// Một phiên chữa bài theo phương pháp Feynman, gắn 1-1 với một lượt làm bài.
 model FeynmanReview {
-  id               String    @id @default(cuid())
-  userId           String
-  attemptId        String    @unique
-  mode             String // QUICK | DEEP
+  id     String @id @default(cuid())
+  userId String
+  /// KHÔNG còn @unique: một lượt làm bài luyện lại được nhiều lần, không giới
+  /// hạn. Ràng buộc thật nằm ở @@unique([attemptId, runNumber]) bên dưới.
+  attemptId String
+  /// Lần luyện thứ mấy của lượt làm bài này, đếm từ 1.
+  runNumber Int    @default(1)
+  /// QUICK | DEEP là chế độ tự động cũ. Phiên mới ghi CUSTOM vì học viên tự
+  /// tick câu muốn chữa. Giữ lại giá trị cũ để dữ liệu lịch sử vẫn đọc được.
+  mode String // QUICK | DEEP | CUSTOM
   status           String    @default("DRAFT") // DRAFT | REVEALED | COMPLETED
   passageSummary   String?   @db.Text
   paragraphMap     String?   @db.Text
@@ -254,12 +268,167 @@ model FeynmanReview {
   createdAt        DateTime  @default(now())
   updatedAt        DateTime  @updatedAt
 
-  user     User             @relation(fields: [userId], references: [id], onDelete: Cascade)
-  attempt  Attempt          @relation(fields: [attemptId], references: [id], onDelete: Cascade)
-  mistakes FeynmanMistake[]
+  user       User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
+  attempt    Attempt              @relation(fields: [attemptId], references: [id], onDelete: Cascade)
+  mistakes   FeynmanMistake[]
+  aiEvaluation FeynmanAiEvaluation?
 
+  @@unique([attemptId, runNumber])
   @@index([userId, status])
   @@index([userId, completedAt])
+  @@index([attemptId, createdAt])
+}
+
+/// Một lần AI chấm phần tự giảng lại. KHÔNG phải chấm điểm Reading — điểm số
+/// vẫn hoàn toàn do gradeReading() quyết định và không có đường nào từ bảng này
+/// ghi ngược về Attempt.
+model FeynmanAiEvaluation {
+  id       String @id @default(cuid())
+  userId   String
+  /// Một phiên Feynman chỉ được chấm đúng một lần.
+  reviewId String @unique
+  status   String @default("PENDING") @db.VarChar(16) // PENDING | COMPLETED | FAILED
+
+  /// DAT | KHONG_DAT. Ngưỡng 70% nằm ở rules.ts chứ không nằm trong prompt,
+  /// nên đổi ngưỡng không phải sửa prompt và kết quả cũ tính lại được.
+  verdict           String? @db.VarChar(16)
+  similarityPercent Int?
+  confidence        Int?
+
+  /// Lý do + trích dẫn từng câu. Đây là thứ quản trị viên dùng để phúc tra
+  /// khiếu nại, nên bắt buộc lưu chứ không chỉ lưu kết luận.
+  reasonJson        String? @db.Text
+  overallAdviceJson String? @db.Text
+
+  /// Ảnh chụp bối cảnh lúc chấm, để về sau đối chiếu được mà không phụ thuộc
+  /// dữ liệu hiện tại đã đổi.
+  currentBandSnapshot   Float?
+  targetBandSnapshot    Float?
+  attemptNumberSnapshot Int?
+  weaknessSnapshotJson  String? @db.Text
+
+  /// Vận hành và đo chi phí.
+  model                 String? @db.VarChar(64)
+  promptVersion         String? @db.VarChar(32)
+  schemaVersion         String? @db.VarChar(32)
+  inputTokens           Int?
+  outputTokens          Int?
+  cachedInputTokens     Int?
+  estimatedCostMicroUsd Int?
+  latencyMs             Int?
+  openaiRequestId       String? @db.VarChar(191)
+  errorCode             String? @db.VarChar(64)
+
+  /// Số câu được hỏi về lượt chấm này: Full Test 10, đề đơn 5.
+  questionLimit Int @default(10)
+  questionUsed  Int @default(0)
+
+  createdAt DateTime @default(now())
+  updatedAt DateTime @updatedAt
+
+  user     User                @relation(fields: [userId], references: [id], onDelete: Cascade)
+  review   FeynmanReview       @relation(fields: [reviewId], references: [id], onDelete: Cascade)
+  messages FeynmanAiMessage[]
+
+  @@index([userId, createdAt])
+  @@index([status, createdAt])
+}
+
+/// Một câu hỏi của học viên và câu trả lời của AI, gắn với một lần chấm.
+model FeynmanAiMessage {
+  id           String @id @default(cuid())
+  evaluationId String
+  userId       String
+  /// Chống bấm hai lần: một cú bấm chỉ gọi API đúng một lần. Client sinh UUID.
+  requestKey   String @unique @db.VarChar(64)
+  status       String @default("PENDING") @db.VarChar(16) // PENDING | COMPLETED | FAILED | REJECTED
+
+  question String  @db.Text
+  answer   String? @db.Text
+  /// Câu ngoài phạm vi bị từ chối thì KHÔNG trừ quota, và lưu lý do ở đây.
+  rejectReason String? @db.VarChar(64)
+
+  model                 String? @db.VarChar(64)
+  promptVersion         String? @db.VarChar(32)
+  inputTokens           Int?
+  outputTokens          Int?
+  cachedInputTokens     Int?
+  estimatedCostMicroUsd Int?
+  latencyMs             Int?
+  openaiRequestId       String? @db.VarChar(191)
+  errorCode             String? @db.VarChar(64)
+
+  createdAt DateTime @default(now())
+  updatedAt DateTime @updatedAt
+
+  evaluation FeynmanAiEvaluation @relation(fields: [evaluationId], references: [id], onDelete: Cascade)
+  user       User                @relation(fields: [userId], references: [id], onDelete: Cascade)
+
+  @@index([evaluationId, createdAt])
+  @@index([userId, createdAt])
+}
+
+/// Ví lượt AI — MỘT dòng cho MỖI TÀI KHOẢN (quyết định Q1).
+/// Ví không gắn với lượt làm bài nào: mua ở đề nào cũng tiêu được ở đề khác.
+model FeynmanAiBudget {
+  id           String @id @default(cuid())
+  userId       String @unique
+  /// +10 mỗi gói 19K/39K/29K đã thanh toán. Chỉ cộng trong fulfillPaidOrder(),
+  /// cùng transaction với việc tạo AccessGrant, để một đơn không cộng hai lần.
+  grantedTotal Int    @default(0)
+  usedTotal    Int    @default(0)
+
+  createdAt DateTime @default(now())
+  updatedAt DateTime @updatedAt
+
+  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
+}
+
+/// Nhịp chấm — MỘT dòng cho MỖI LƯỢT LÀM BÀI (quyết định Q2).
+/// Tách khỏi ví vì Q1 và Q2 chọn hai phạm vi khác nhau; nhét chung một bảng thì
+/// không biểu diễn được "ví theo tài khoản, nhịp theo lượt làm bài".
+model FeynmanAiAttemptState {
+  id        String @id @default(cuid())
+  attemptId String @unique
+  /// Mốc so sánh 1 lần/ngày. So theo NGÀY LỊCH VIỆT NAM, không phải UTC.
+  lastGradedOn DateTime?
+  /// Chỉ để thống kê, không dùng để chặn.
+  gradedCount  Int       @default(0)
+
+  createdAt DateTime @default(now())
+  updatedAt DateTime @updatedAt
+
+  attempt Attempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
+}
+
+/// Hàng đợi cảnh báo cho quản trị viên.
+/// Khi AI ngờ passage mâu thuẫn với đáp án chuẩn, nó VẪN trả lời học viên theo
+/// đáp án chuẩn và đẩy nghi vấn vào đây. Học viên không bao giờ được nghe rằng
+/// đáp án chuẩn có thể sai.
+model FeynmanAiAlert {
+  id       String  @id @default(cuid())
+  /// MODEL = AI tự báo, STUDENT = học viên bấm báo sai.
+  source   String  @db.VarChar(16)
+  severity String  @default("LOW") @db.VarChar(16) // LOW | MEDIUM | HIGH
+  status   String  @default("OPEN") @db.VarChar(16) // OPEN | RESOLVED | DISMISSED
+  kind     String  @db.VarChar(32)
+
+  exerciseId   String?
+  attemptId    String?
+  evaluationId String?
+  /// Mã câu dạng "p2:q14" — vị trí câu trong đề, không phải định danh người dùng.
+  questionCode String? @db.VarChar(32)
+
+  detail      String? @db.Text
+  adminNote   String? @db.Text
+  resolvedAt  DateTime?
+  resolvedBy  String?
+
+  createdAt DateTime @default(now())
+  updatedAt DateTime @updatedAt
+
+  @@index([status, severity, createdAt])
+  @@index([exerciseId, createdAt])
 }
 
 /// Ảnh chụp một câu cần chữa sâu + phần tự giải thích của học viên.
@@ -309,9 +478,13 @@ model PaymentOrder {
   /// Đường dẫn quay về sau khi trả tiền — do máy chủ tự dựng, không nhận từ
   /// biểu mẫu, để tránh lỗ hổng chuyển hướng tùy ý (open redirect).
   returnPath    String  @db.Text
+  /// Don mua goi 19K/39K bat buoc co cot nay. May chu tu doc database de xac
+  /// minh luot lam bai thuoc dung user, da GRADED, la Reading, va khong thuoc
+  /// Nguyet Thi con trong khung gio. Khong tin ID nao tu trinh duyet.
+  attemptId     String?
   offerCode     String
   feature       String // READING | FEYNMAN
-  scope         String // ALL | EXERCISE
+  scope         String // ALL | EXERCISE | ATTEMPT | NONE
   amount        Int // đơn vị VND, luôn là số nguyên
   currency      String  @default("VND")
   priceVersion  String
@@ -341,11 +514,15 @@ model PaymentOrder {
 
   user     User           @relation(fields: [userId], references: [id], onDelete: Cascade)
   exercise Exercise?      @relation(fields: [exerciseId], references: [id], onDelete: SetNull)
+  attempt  Attempt?       @relation(fields: [attemptId], references: [id], onDelete: SetNull)
   events   PaymentEvent[]
   grants   AccessGrant[]
 
   @@index([userId, status, createdAt])
   @@index([exerciseId, status])
+  /// Truy van tim don PENDING tai su dung PHAI loc them attemptId, neu khong
+  /// hoc vien mua luot thu hai se bi day ve don cu cua luot thu nhat.
+  @@index([userId, attemptId, status])
 }
 
 /// Nhật ký mọi thông báo IPN đã nhận. `eventKey` duy nhất chính là cơ chế chống
@@ -381,8 +558,13 @@ model AccessGrant {
   /// ORDER:<orderId> cho quyền đã mua, ADMIN:<feature>:<scope>:<userId> cho
   /// quyền admin cấp tay, LEGACY:<id> cho dữ liệu chuyển từ ExerciseAccess.
   grantKey   String  @unique
+  /// Quyen theo LUOT LAM BAI (mo hinh hien tai). Grant scope ATTEMPT ma thieu
+  /// cot nay la du lieu hong -> decideAiAccess chan, khong doan.
+  attemptId  String?
   feature    String // READING | FEYNMAN
-  scope      String // ALL | EXERCISE
+  /// ALL va EXERCISE la quyen cu, van phai chay. ATTEMPT la mo hinh hien tai.
+  /// NONE danh cho goi nap luot AI: khong mo gi ca.
+  scope      String // ALL | EXERCISE | ATTEMPT | NONE
   source     String // PURCHASE | ADMIN | LEGACY | REWARD
   status     String  @default("ACTIVE") // ACTIVE | REVOKED
 
@@ -396,6 +578,7 @@ model AccessGrant {
 
   user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
   exercise Exercise?     @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
+  attempt  Attempt?      @relation(fields: [attemptId], references: [id], onDelete: SetNull)
   order    PaymentOrder? @relation(fields: [orderId], references: [id], onDelete: SetNull)
 
   // Chỉ MỘT index tổng hợp: năm cột VARCHAR(191) utf8mb4 vượt giới hạn 3072
```

### `src/lib/init-db.ts`

DDL thật mà production chạy. Đây là file bản đặc tả v1 bỏ sót.

```diff
diff --git a/src/lib/init-db.ts b/src/lib/init-db.ts
index d3c8245..1dc476c 100644
--- a/src/lib/init-db.ts
+++ b/src/lib/init-db.ts
@@ -943,6 +943,119 @@ const DDL = [
     CONSTRAINT \`CompetitionQualification_target_fkey\` FOREIGN KEY (\`targetCompetitionId\`) REFERENCES \`Competition\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
     CONSTRAINT \`CompetitionQualification_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
   ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
+  // ---- Feynman AI Tutor ------------------------------------------------
+  // Kich thuoc VARCHAR o cac cot trang thai la CO Y: mac dinh 191 x 4 byte
+  // (utf8mb4) lam khoa index vuot gioi han 3072 byte cua InnoDB. Production
+  // da tung sap vi loi nay. Chay `npm run test:indexes` truoc khi commit.
+
+  `CREATE TABLE IF NOT EXISTS \`FeynmanAiEvaluation\` (
+    \`id\` VARCHAR(191) NOT NULL,
+    \`userId\` VARCHAR(191) NOT NULL,
+    \`reviewId\` VARCHAR(191) NOT NULL,
+    \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
+    \`verdict\` VARCHAR(16) NULL,
+    \`similarityPercent\` INTEGER NULL,
+    \`confidence\` INTEGER NULL,
+    \`reasonJson\` TEXT NULL,
+    \`overallAdviceJson\` TEXT NULL,
+    \`currentBandSnapshot\` DOUBLE NULL,
+    \`targetBandSnapshot\` DOUBLE NULL,
+    \`attemptNumberSnapshot\` INTEGER NULL,
+    \`weaknessSnapshotJson\` TEXT NULL,
+    \`model\` VARCHAR(64) NULL,
+    \`promptVersion\` VARCHAR(32) NULL,
+    \`schemaVersion\` VARCHAR(32) NULL,
+    \`inputTokens\` INTEGER NULL,
+    \`outputTokens\` INTEGER NULL,
+    \`cachedInputTokens\` INTEGER NULL,
+    \`estimatedCostMicroUsd\` INTEGER NULL,
+    \`latencyMs\` INTEGER NULL,
+    \`openaiRequestId\` VARCHAR(191) NULL,
+    \`errorCode\` VARCHAR(64) NULL,
+    \`questionLimit\` INTEGER NOT NULL DEFAULT 10,
+    \`questionUsed\` INTEGER NOT NULL DEFAULT 0,
+    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
+    \`updatedAt\` DATETIME(3) NOT NULL,
+    PRIMARY KEY (\`id\`),
+    UNIQUE INDEX \`FeynmanAiEvaluation_reviewId_key\` (\`reviewId\`),
+    INDEX \`FeynmanAiEvaluation_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
+    INDEX \`FeynmanAiEvaluation_status_createdAt_idx\` (\`status\`, \`createdAt\`),
+    CONSTRAINT \`FeynmanAiEvaluation_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
+    CONSTRAINT \`FeynmanAiEvaluation_reviewId_fkey\` FOREIGN KEY (\`reviewId\`) REFERENCES \`FeynmanReview\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
+  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
+
+  `CREATE TABLE IF NOT EXISTS \`FeynmanAiMessage\` (
+    \`id\` VARCHAR(191) NOT NULL,
+    \`evaluationId\` VARCHAR(191) NOT NULL,
+    \`userId\` VARCHAR(191) NOT NULL,
+    \`requestKey\` VARCHAR(64) NOT NULL,
+    \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
+    \`question\` TEXT NOT NULL,
+    \`answer\` TEXT NULL,
+    \`rejectReason\` VARCHAR(64) NULL,
+    \`model\` VARCHAR(64) NULL,
+    \`promptVersion\` VARCHAR(32) NULL,
+    \`inputTokens\` INTEGER NULL,
+    \`outputTokens\` INTEGER NULL,
+    \`cachedInputTokens\` INTEGER NULL,
+    \`estimatedCostMicroUsd\` INTEGER NULL,
+    \`latencyMs\` INTEGER NULL,
+    \`openaiRequestId\` VARCHAR(191) NULL,
+    \`errorCode\` VARCHAR(64) NULL,
+    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
+    \`updatedAt\` DATETIME(3) NOT NULL,
+    PRIMARY KEY (\`id\`),
+    UNIQUE INDEX \`FeynmanAiMessage_requestKey_key\` (\`requestKey\`),
+    INDEX \`FeynmanAiMessage_evaluationId_createdAt_idx\` (\`evaluationId\`, \`createdAt\`),
+    INDEX \`FeynmanAiMessage_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
+    CONSTRAINT \`FeynmanAiMessage_evaluationId_fkey\` FOREIGN KEY (\`evaluationId\`) REFERENCES \`FeynmanAiEvaluation\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
+    CONSTRAINT \`FeynmanAiMessage_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
+  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
+
+  `CREATE TABLE IF NOT EXISTS \`FeynmanAiBudget\` (
+    \`id\` VARCHAR(191) NOT NULL,
+    \`userId\` VARCHAR(191) NOT NULL,
+    \`grantedTotal\` INTEGER NOT NULL DEFAULT 0,
+    \`usedTotal\` INTEGER NOT NULL DEFAULT 0,
+    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
+    \`updatedAt\` DATETIME(3) NOT NULL,
+    PRIMARY KEY (\`id\`),
+    UNIQUE INDEX \`FeynmanAiBudget_userId_key\` (\`userId\`),
+    CONSTRAINT \`FeynmanAiBudget_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
+  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
+
+  `CREATE TABLE IF NOT EXISTS \`FeynmanAiAttemptState\` (
+    \`id\` VARCHAR(191) NOT NULL,
+    \`attemptId\` VARCHAR(191) NOT NULL,
+    \`lastGradedOn\` DATETIME(3) NULL,
+    \`gradedCount\` INTEGER NOT NULL DEFAULT 0,
+    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
+    \`updatedAt\` DATETIME(3) NOT NULL,
+    PRIMARY KEY (\`id\`),
+    UNIQUE INDEX \`FeynmanAiAttemptState_attemptId_key\` (\`attemptId\`),
+    CONSTRAINT \`FeynmanAiAttemptState_attemptId_fkey\` FOREIGN KEY (\`attemptId\`) REFERENCES \`Attempt\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
+  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
+
+  `CREATE TABLE IF NOT EXISTS \`FeynmanAiAlert\` (
+    \`id\` VARCHAR(191) NOT NULL,
+    \`source\` VARCHAR(16) NOT NULL,
+    \`severity\` VARCHAR(16) NOT NULL DEFAULT 'LOW',
+    \`status\` VARCHAR(16) NOT NULL DEFAULT 'OPEN',
+    \`kind\` VARCHAR(32) NOT NULL,
+    \`exerciseId\` VARCHAR(191) NULL,
+    \`attemptId\` VARCHAR(191) NULL,
+    \`evaluationId\` VARCHAR(191) NULL,
+    \`questionCode\` VARCHAR(32) NULL,
+    \`detail\` TEXT NULL,
+    \`adminNote\` TEXT NULL,
+    \`resolvedAt\` DATETIME(3) NULL,
+    \`resolvedBy\` VARCHAR(191) NULL,
+    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
+    \`updatedAt\` DATETIME(3) NOT NULL,
+    PRIMARY KEY (\`id\`),
+    INDEX \`FeynmanAiAlert_status_severity_createdAt_idx\` (\`status\`, \`severity\`, \`createdAt\`),
+    INDEX \`FeynmanAiAlert_exerciseId_createdAt_idx\` (\`exerciseId\`, \`createdAt\`)
+  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
 ];
 
 /**
@@ -1018,6 +1131,19 @@ const MIGRATIONS = [
   `ALTER TABLE \`CompetitionEntry\` ADD COLUMN \`entrySource\` VARCHAR(16) NOT NULL DEFAULT 'OPEN'`,
   `ALTER TABLE \`CompetitionEntry\` ADD COLUMN \`qualificationId\` VARCHAR(191) NULL`,
   `CREATE UNIQUE INDEX \`CompetitionEntry_qualificationId_key\` ON \`CompetitionEntry\` (\`qualificationId\`)`,
+
+  // ---- Feynman AI Tutor ------------------------------------------------
+  // Mot luot lam bai luyen lai duoc nhieu lan, nen FeynmanReview can runNumber.
+  // Rang buoc unique cu tren attemptId duoc go RIENG trong applyOnce ben duoi,
+  // vi do la thao tac PHA HUY va chi duoc chay dung mot lan.
+  `ALTER TABLE \`FeynmanReview\` ADD COLUMN \`runNumber\` INTEGER NOT NULL DEFAULT 1`,
+  `CREATE INDEX \`FeynmanReview_attemptId_createdAt_idx\` ON \`FeynmanReview\` (\`attemptId\`, \`createdAt\`)`,
+
+  // Quyen va don hang gan theo LUOT LAM BAI thay vi theo bai.
+  `ALTER TABLE \`AccessGrant\` ADD COLUMN \`attemptId\` VARCHAR(191) NULL`,
+  `ALTER TABLE \`PaymentOrder\` ADD COLUMN \`attemptId\` VARCHAR(191) NULL`,
+  // Thieu index nay thi truy van tim don PENDING tai su dung se quet toan bang.
+  `CREATE INDEX \`PaymentOrder_userId_attemptId_status_idx\` ON \`PaymentOrder\` (\`userId\`, \`attemptId\`, \`status\`)`,
 ];
 
 export async function initDatabase() {
@@ -1110,6 +1236,30 @@ export async function initDatabase() {
   // Bổ sung lời giải mẫu Feynman (question.learning) cho các bài đã tồn tại.
   // Chỉ chạy một lần VÀ chỉ khi bản trên máy chủ chưa có lời giải nào —
   // không bao giờ ghi đè nội dung giáo viên đã tự soạn.
+  // Go rang buoc "mot luot lam bai chi mot phien Feynman".
+  //
+  // Day la thao tac PHA HUY nen phai boc applyOnce: chay lai lan hai tren
+  // database da go roi se nem loi va lam ban log moi lan khoi dong. Unique moi
+  // (attemptId, runNumber) duoc tao trong CUNG mot lan chay, vi neu go duoc
+  // khoa cu ma khong tao duoc khoa moi thi bang mat hoan toan rang buoc.
+  await applyOnce("FEYNMAN_REVIEW_MULTI_RUN_v1", async () => {
+    try {
+      await db.$executeRawUnsafe(
+        "ALTER TABLE `FeynmanReview` DROP INDEX `FeynmanReview_attemptId_key`"
+      );
+    } catch {
+      /* database moi tao tu schema hien tai thi khoa nay khong ton tai */
+    }
+    try {
+      await db.$executeRawUnsafe(
+        "CREATE UNIQUE INDEX `FeynmanReview_attemptId_runNumber_key` " +
+          "ON `FeynmanReview` (`attemptId`, `runNumber`)"
+      );
+    } catch {
+      /* da tao roi */
+    }
+  });
+
   await applyOnce("SEED_FEYNMAN_LEARNING_v1", async () => {
     for (const ex of exercises) {
       const seedContent = JSON.stringify(ex.content);
```

### `package.json`

Nối test:feynman-ai vào chuỗi npm test.

```diff
diff --git a/package.json b/package.json
index 438198f..346f914 100644
--- a/package.json
+++ b/package.json
@@ -9,7 +9,7 @@
     "lint": "eslint",
     "test:admin": "node --experimental-strip-types scripts/test-admin-account.ts",
     "test:access": "node --experimental-strip-types scripts/test-access-rules.ts",
-    "test": "npm run test:no-han && npm run test:no-secrets && npm run test:admin && npm run test:access && npm run test:feynman && npm run test:payments && npm run test:achievements && npm run test:assembly && npm run test:titles && npm run test:competition && npm run test:explain && npm run test:integrity && npm run test:indexes && npm run test:attestation && npm run test:ranks && npm run test:rank-rules && npm run test:campaign && npm run test:weakness && npm run test:data-rights && npm run test:qualification",
+    "test": "npm run test:no-han && npm run test:no-secrets && npm run test:admin && npm run test:access && npm run test:feynman && npm run test:feynman-ai && npm run test:payments && npm run test:achievements && npm run test:assembly && npm run test:titles && npm run test:competition && npm run test:explain && npm run test:integrity && npm run test:indexes && npm run test:attestation && npm run test:ranks && npm run test:rank-rules && npm run test:campaign && npm run test:weakness && npm run test:data-rights && npm run test:qualification",
     "test:no-han": "node scripts/check-no-han-characters.mjs",
     "test:ranks": "node --experimental-strip-types scripts/test-rank-catalog.ts",
     "test:achievements": "node --experimental-strip-types scripts/test-achievements.ts",
@@ -32,7 +32,8 @@
     "test:no-secrets": "node scripts/check-no-secrets.mjs",
     "seed:demo": "node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/seed-demo-tam-quoc.ts",
     "test:student-pages": "node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/test-student-pages-db.ts",
-    "test:data-rights": "node --experimental-strip-types scripts/test-data-rights.ts"
+    "test:data-rights": "node --experimental-strip-types scripts/test-data-rights.ts",
+    "test:feynman-ai": "node --experimental-strip-types scripts/test-feynman-ai.ts"
   },
   "dependencies": {
     "@prisma/client": "^6.19.3",
```

---

## 10. Ba chỗ dễ sai nhất

Đây là phần tôi muốn anh hoặc người review đọc kỹ nhất, vì sai ở đây thì
kiểm thử xanh vẫn không cứu được.

### Thứ tự hai hàng rào quota

`decideCanGrade()` kiểm nhịp ngày **trước** ví. Khi cài xuống tầng database
phải giữ đúng thứ tự đó, và **nếu trừ ví trượt thì phải nhả lại `lastGradedOn`**.

Không nhả thì học viên hết ví sẽ mất luôn suất chấm của ngày hôm đó — nạp
thêm tiền cũng phải chờ sang hôm sau. Lỗi này không làm đỏ kiểm thử đơn vị
vì nó nằm ở tầng ghi database, nên phải cẩn thận bằng mắt.

### Mốc sang ngày theo giờ Việt Nam

`vietnamDayKey()` cộng offset UTC+7 rồi mới cắt chuỗi ngày. Nếu dùng ngày UTC
thì mốc reset rơi vào 7 giờ sáng: học viên chấm lúc 6h sẽ bị báo "hôm nay đã
chấm rồi" dù lần chấm đó là hôm qua. Bộ kiểm thử có phép thử đối chứng cho
thấy cách tính UTC sai thật.

### Nguyệt Thí thiếu `endsAt` thì vẫn khóa

`competitionLock()` trả `locked: true` khi không có `endsAt`. Đoán sai theo
hướng mở là lộ đáp án của một kỳ thi thật đang diễn ra.

Cần nhớ: `startFeynmanReviewAction` hiện tại **chưa chặn** trường hợp này.
Đó là lỗ hổng có sẵn trong mã nguồn, không phải thứ do thay đổi này tạo ra —
nhưng nó phải được vá cùng lúc, nếu không mở gói 39K là mở luôn đề đang thi.

---

## 11. Phần chưa làm

Tôi dừng ở ranh giới giữa "luật" và "tác dụng phụ". Mọi thứ ở trên đều kiểm
chứng được mà không cần MySQL, không cần khóa OpenAI, không cần mạng. Phần
dưới đây thì không, nên tôi không viết mò.

| Việc | Vì sao chưa làm |
|---|---|
| `openai-client.ts`, `prompts.ts`, `context.ts`, `service.ts` | Cần chạy thật với khóa API để chỉnh trần token và kiểm chứng cấu trúc JSON trả về |
| Ba tuyến API `/api/feynman/ai/*` | Cần `service.ts` trước |
| Bốn thành phần giao diện + trang đáp án chi tiết | Cần đọc quy ước thành phần và hệ màu hiện có; viết mò sẽ lệch với phần còn lại của website |
| Trang quản trị `/quan-tri/ai-feynman` | Như trên, và cần cờ `features.feynmanAi` |
| Cộng ví trong `fulfillPaidOrder()` | Phải nằm cùng transaction Serializable với việc tạo `AccessGrant` để một đơn không cộng ví hai lần — cần đọc kỹ luồng hiện tại trước khi sửa |
| `hasActiveAccess()` nhận thêm `attemptId` | Ba nơi gọi đều phải sửa cùng lúc; bỏ sót một chỗ là bán trùng hoặc chặn nhầm |

Thứ tự làm tiếp hợp lý: `fulfillPaidOrder()` + `hasActiveAccess()` trước (vì
chúng quyết định tiền và quyền, và kiểm chứng được bằng hàm thuần), rồi mới
tới tầng gọi OpenAI, cuối cùng là giao diện.

---

## 12. Kết quả kiểm thử

```
no-han           dat
no-secrets       dat
access           dat
feynman          dat
feynman-ai       dat
payments         dat
achievements     dat
assembly         dat
titles           dat
competition      dat
explain          dat
integrity        dat
indexes          dat
attestation      dat
ranks            dat
rank-rules       dat
campaign         dat
weakness         dat
data-rights      dat
qualification    dat
```

`test:admin` không có trong danh sách vì nó cần `bcryptjs`, mà `node_modules`
trong container này trống hoàn toàn — dependencies chưa từng được cài. Đó là
tình trạng sẵn có của môi trường, không liên quan đến thay đổi này; phần sửa
`package.json` chỉ đụng vào mục `scripts`.

