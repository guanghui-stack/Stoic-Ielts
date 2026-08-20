/**
 * Quân Công — LUẬT THUẦN, không chạm database.
 *
 * Tách khỏi `merit-service.ts` để kiểm thử được bằng node thuần
 * (`scripts/test-merit.ts`), đúng cách `payments/coins.ts` đang làm.
 *
 * BA ĐIỀU LÀ XƯƠNG SỐNG, đừng tự đổi. Xem `docs/DAC-TA-DAU-TRUONG.md` mục 00
 * và 01.
 *
 * 1. **Quân Công không bao giờ định giá một món hàng.** Nó chỉ mua đúng một
 *    thứ: một lượt Thí Bút. Ngay khi có một món hàng mang cả giá Xu lẫn giá
 *    Quân Công, tỷ giá giữa công sức và tiền thật xuất hiện, và rào chắn pháp
 *    lý giữa hai đồng tiền sụp.
 * 2. **Không có đường nào đổi Xu ra Quân Công hoặc ngược lại.** File này cố ý
 *    không import gì từ `payments/`. Nếu một ngày có người thêm import đó,
 *    `scripts/test-economy-invariants.ts` sẽ hỏng build.
 * 3. **Quân Công từ việc học trả theo NGÀY HỌC ĐẠT CHUẨN, không theo số đề
 *    hoàn thành.** Trả theo số đề nghĩa là ai mua nhiều đề thì kiếm nhiều Quân
 *    Công hơn, tức tiền mua được sản lượng, tức rào chắn sụp theo đường vòng.
 */

/** Bản luật. Đổi khi đổi mức thưởng, để dòng sổ cái cũ vẫn tra được luật lúc đó. */
export const MERIT_RULE_VERSION = "2026-08-20-v1";

/* ===================== Nguồn kiếm Quân Công ===================== */

/**
 * Số khởi điểm, lấy từ bảng ở đặc tả mục 01. Đây là số để hiệu chỉnh, không
 * phải kết luận.
 *
 * Ở P1 chỉ có đúng một nguồn sống: ngày học đạt chuẩn. Các nguồn còn lại khai
 * sẵn để P2 và P3 nối vào mà không phải mở lại cuộc thảo luận về con số.
 */
export const MERIT_EARN = {
  /** Một ngày học đạt chuẩn. Xem `qualifiedStudyDayKeys`. */
  STUDY_DAY: 5,
  /** Một lượt phục bàn Feynman hoàn tất. Thưởng cho việc chữa sai. */
  FEYNMAN_REVIEW: 10,
  /** Đạt một danh hiệu. Mức thật tra theo loại danh hiệu, xem đặc tả mục 07. */
  TITLE_MIN: 30,
  TITLE_MAX: 150,
  /** Vượt Vũ Môn. Tiền thưởng, KHÔNG được là nguồn thu nhập chính. */
  RANK_UP: 200,
} as const;

/**
 * Ngày học đạt chuẩn cần đủ CẢ HAI vế. Đặc tả mục 10.
 *
 * Vế thời gian một mình thì mở tab để đó là đủ, nên vế thứ hai mới là vế thật.
 */
export const QUALIFIED_DAY_MIN_SECONDS = 25 * 60;

/* ===================== Ví ===================== */

/**
 * Sao chép đúng hình dạng `CoinWallet`: hai tổng cộng dồn, số dư là hiệu.
 *
 * Giữ hai tổng thay vì một cột số dư vì cùng lý do sổ cái xu: một cột số dư bị
 * ghi đè sai thì không còn cách nào biết nó từng đúng ở đâu.
 */
export type MeritWalletLike = { earnedTotal: number; burnedTotal: number };

export function meritBalance(wallet: MeritWalletLike): number {
  return wallet.earnedTotal - wallet.burnedTotal;
}

/**
 * Sáu chiều của sổ cái. Số tiền LUÔN DƯƠNG, chiều nằm ở đây.
 *
 * `BURN` và `MINT` là cặp thay cho việc chuyển ví sang ví khi quyết toán trận:
 * Quân Công của người thua bị huỷ, Quân Công của người thắng do hệ thống phát
 * ra. Trải nghiệm y hệt, nhưng sổ cái không có giao dịch giữa hai người dùng,
 * nên hai tài khoản cày cho nhau thì tổng bằng không.
 */
export const MERIT_KINDS = [
  "EARN",
  "STAKE",
  "MINT",
  "BURN",
  "REFUND",
  "REVOKE",
] as const;
export type MeritKind = (typeof MERIT_KINDS)[number];

/** Chiều nào cộng vào `earnedTotal`, chiều nào cộng vào `burnedTotal`. */
export function meritKindDirection(kind: MeritKind): "credit" | "debit" {
  switch (kind) {
    case "EARN":
    case "MINT":
    case "REFUND":
      return "credit";
    case "STAKE":
    case "BURN":
    case "REVOKE":
      return "debit";
  }
}

export function isMeritKind(value: string): value is MeritKind {
  return (MERIT_KINDS as readonly string[]).includes(value);
}

/* ===================== Ngày học đạt chuẩn ===================== */

export type StudyDayFact = { dateKey: string; activeSeconds: number };

/**
 * Một việc đã hoàn thành trong ngày. Ở P1 là bài đã nộp hoặc phục bàn đã xong;
 * P3 thêm trận đã đánh trọn.
 *
 * `dateKey` phải tính theo giờ Việt Nam ở tầng gọi, không phải ở đây: hàm này
 * cố ý không biết gì về múi giờ để còn kiểm thử được.
 */
export type CompletedWorkFact = { dateKey: string };

/**
 * Ngày nào đạt chuẩn. Đủ CẢ HAI vế mới tính.
 *
 * Ranh giới thật nằm ở CÓ NỘP hay không, không nằm ở bài mới hay bài cũ. Làm
 * lại một đề cũ rồi nộp thì vẫn là học, và giao diện phải nói rõ điều đó, nếu
 * không người dùng sẽ đọc thành làm lại đề cũ là vô ích.
 */
export function qualifiedStudyDayKeys(
  studyDays: readonly StudyDayFact[],
  completedWork: readonly CompletedWorkFact[],
): string[] {
  const daysWithWork = new Set(completedWork.map((w) => w.dateKey));
  return studyDays
    .filter(
      (d) =>
        d.activeSeconds >= QUALIFIED_DAY_MIN_SECONDS && daysWithWork.has(d.dateKey),
    )
    .map((d) => d.dateKey)
    .sort();
}

/**
 * Câu hiện cho người dùng TRONG LÚC họ học, không phải cuối ngày.
 *
 * Trả về dữ liệu chứ không trả chuỗi, để nơi hiển thị tự dựng câu và tầng luật
 * này không phải biết gì về giao diện.
 */
export function todayProgress(input: {
  activeSeconds: number;
  hasCompletedWork: boolean;
}): {
  minutesDone: number;
  minutesNeeded: number;
  timeMet: boolean;
  workMet: boolean;
  qualified: boolean;
} {
  const timeMet = input.activeSeconds >= QUALIFIED_DAY_MIN_SECONDS;
  return {
    minutesDone: Math.floor(input.activeSeconds / 60),
    minutesNeeded: QUALIFIED_DAY_MIN_SECONDS / 60,
    timeMet,
    workMet: input.hasCompletedWork,
    qualified: timeMet && input.hasCompletedWork,
  };
}

/* ===================== Khoá chống ghi hai lần ===================== */

/**
 * Khoá đặt ở tầng database chứ không ở tầng logic, đúng cách `TOPUP:<orderId>`
 * đang làm. Hai cú bấm nhanh hoặc một job chạy lại thì dòng thứ hai bị chặn
 * bởi ràng buộc duy nhất, không phải bởi một câu `if` nào đó có thể quên.
 */
export function studyDayLedgerKey(userId: string, dateKey: string): string {
  return `MERIT:STUDY:${userId}:${dateKey}`;
}

export function reviewLedgerKey(reviewId: string): string {
  return `MERIT:REVIEW:${reviewId}`;
}

export function titleLedgerKey(userId: string, titleCode: string): string {
  return `MERIT:TITLE:${userId}:${titleCode}`;
}

export function rankUpLedgerKey(userId: string, level: number): string {
  return `MERIT:RANKUP:${userId}:${level}`;
}

/* ===================== Tiêu Quân Công ===================== */

export type MeritSpendDecision =
  | { ok: true; cost: number; balanceAfter: number }
  | { ok: false; reason: "INSUFFICIENT"; cost: number; missing: number };

/**
 * Quyết định duy nhất mà Quân Công được phép tham gia: có đủ để mua một lượt
 * Thí Bút không.
 *
 * Cố ý KHÔNG nhận tham số "món hàng". Nếu chữ ký hàm này một ngày nào đó có
 * `exerciseId` hoặc `offerCode`, thì luật xương sống số 1 đã bị phá.
 */
export function decideThiButPurchase(input: {
  wallet: MeritWalletLike;
  cost: number;
}): MeritSpendDecision {
  const balance = meritBalance(input.wallet);
  if (balance < input.cost) {
    return {
      ok: false,
      reason: "INSUFFICIENT",
      cost: input.cost,
      missing: input.cost - balance,
    };
  }
  return { ok: true, cost: input.cost, balanceAfter: balance - input.cost };
}

export function formatMerit(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} quân công`;
}
