/**
 * Thí Bút — LUẬT THUẦN, không chạm database.
 *
 * Cửa khảo hạch ngắn để đổi Quân Công lấy quyền mở một đề hoặc một lượt
 * Feynman. Xem `docs/DAC-TA-DAU-TRUONG.md` mục 03.
 *
 * Câu ghi trên màn hình, và nó là lý do cả cơ chế này tồn tại:
 *
 *   "Không mua được binh thư, phải đánh mà đoạt lấy."
 *
 * BỐN RÀNG BUỘC XƯƠNG SỐNG:
 *
 * 1. **Quân Công mua LƯỢT KHẢO HẠCH, không mua món hàng.** Trượt thì mất Quân
 *    Công mà không có hàng. Đó chính là thứ ngăn tỷ giá giữa Xu và Quân Công
 *    xuất hiện. File này cố ý không import gì từ `payments/`.
 * 2. **Không dùng câu Reading.** Câu Reading không đứng một mình được: muốn hỏi
 *    thì phải đưa cả passage, tức cho không đúng cái đề mà người ta đáng lẽ
 *    phải đoạt lấy. Đường đó bế tắc về bản chất, không phải về kỹ thuật.
 * 3. **Đáp án KHÔNG BAO GIỜ rời máy chủ.** Xem `publicItem()`.
 * 4. **Trượt phải thành buổi học, không thành đồng xu mất trắng.** Chỉ rõ sai ở
 *    đâu, cho thử lại sau thời gian chờ với giá giảm.
 */

export const THI_BUT_RULE_VERSION = "2026-08-20-v1";

/**
 * Bốn dạng câu ngắn ĐỘC LẬP, không cần đoạn văn kèm theo.
 *
 * Dạng quan trọng nhất là `PARAPHRASE`, và không phải ngẫu nhiên: nhận diện
 * diễn đạt lại chính là kỹ năng lõi của IELTS Reading. True/False/Not Given và
 * Matching Headings về bản chất đều là bài toán paraphrase trá hình. Nên qua
 * được Thí Bút thật sự có nghĩa là sẵn sàng cho đề, mà không tốn một đề nào.
 */
export const THI_BUT_TYPES = [
  "PARAPHRASE",
  "VOCAB_IN_CONTEXT",
  "COLLOCATION",
  "SENTENCE_GRAMMAR",
] as const;
export type ThiButType = (typeof THI_BUT_TYPES)[number];

export const THI_BUT_TYPE_LABEL: Readonly<Record<ThiButType, string>> = {
  PARAPHRASE: "Nhận diện diễn đạt lại",
  VOCAB_IN_CONTEXT: "Từ vựng theo ngữ cảnh",
  COLLOCATION: "Kết hợp từ",
  SENTENCE_GRAMMAR: "Ngữ pháp câu",
};

export const THI_BUT_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type ThiButDifficulty = (typeof THI_BUT_DIFFICULTIES)[number];

/** Mục tiêu Thí Bút mở ra: một đề, hoặc một lượt chấm Feynman. */
export const THI_BUT_TARGETS = ["EXERCISE", "FEYNMAN"] as const;
export type ThiButTarget = (typeof THI_BUT_TARGETS)[number];

/* ===================== Số câu và ngưỡng qua ===================== */

/**
 * BỐN câu, cần đúng BA.
 *
 * Con số này tính ra chứ không đoán. Đặc tả mục 03 đòi "người vững qua khoảng
 * 90%, người chưa vững khoảng 20%". Xác suất nhị thức của các phương án:
 *
 *   số câu / ngưỡng    vững .85    khá .65    yếu .45    đoán bừa .25
 *   3 câu, cần 3         61.4%      27.5%       9.1%        1.6%
 *   4 câu, cần 3         89.0%      56.3%      24.1%        5.1%   <-- chọn
 *   4 câu, cần 4         52.2%      17.9%       4.1%        0.4%
 *   5 câu, cần 4         83.5%      42.8%      13.1%        1.6%
 *
 * Chỉ một phương án khớp cả hai đầu. Và nó cũng khoá được đường đoán bừa: chỉ
 * 5.1% qua được, so với 25% nếu chỉ hỏi một câu trắc nghiệm bốn lựa chọn.
 *
 * Đổi hai số này thì phải tính lại bảng trên, đừng chỉnh bằng cảm giác.
 */
export const ITEMS_PER_ATTEMPT = 4;
export const PASS_THRESHOLD = 3;

/** Thời lượng, đủ ngắn để không thành gánh nặng. */
export const TIME_LIMIT_SECONDS = 3 * 60;

/* ===================== Giá và thử lại ===================== */

/**
 * Giá một lượt, tính bằng Quân Công.
 *
 * Suy ngược từ câu hỏi duy nhất mà đặc tả mục 10 bảo phải bắt đầu: **bao nhiêu
 * giờ học thật thì đổi được một đề?** Mục tiêu là 2 tới 3 ngày học đều đặn. Một
 * ngày học đạt chuẩn trả 5 Quân Công, nên một lượt đầu tốn 12.
 *
 * Đừng bắt đầu từ "một đề đáng bao nhiêu Quân Công". Bắt đầu từ số ngày.
 */
export const BASE_COST = 12;

/**
 * Trượt thì lượt sau rẻ hơn, nhưng có sàn.
 *
 * Giảm giá là để biến thất bại thành buổi học chứ không thành đồng xu mất
 * trắng. Sàn tồn tại để việc trượt liên tục không trở thành đường rẻ nhất: nếu
 * giá tiến về 0 thì cách tối ưu là cố tình trượt vài lần rồi mới làm thật.
 */
export const RETRY_DISCOUNT = 0.6;
export const MIN_COST = 4;

/** Thời gian chờ sau khi trượt. Đủ để nguội đầu, không đủ để thành hình phạt. */
export const RETRY_COOLDOWN_MINUTES = 30;

/**
 * Giá của lượt thứ `attemptIndex` (đếm từ 0).
 *
 * Chuỗi: 12, 7, 4, 4, 4... Luôn là số nguyên, và không bao giờ xuống dưới sàn.
 */
export function costOfAttempt(attemptIndex: number): number {
  if (attemptIndex <= 0) return BASE_COST;
  const raw = Math.round(BASE_COST * RETRY_DISCOUNT ** attemptIndex);
  return Math.max(MIN_COST, raw);
}

export type RetryGate =
  | { canRetry: true; cost: number }
  | { canRetry: false; reason: "COOLDOWN"; secondsLeft: number; cost: number };

/**
 * Được thử lại chưa, và lượt tới tốn bao nhiêu.
 *
 * `lastFailedAt` là `null` khi chưa trượt lần nào, khi đó không có thời gian
 * chờ nào cả.
 */
export function retryGate(input: {
  now: Date;
  lastFailedAt: Date | null;
  previousAttempts: number;
}): RetryGate {
  const cost = costOfAttempt(input.previousAttempts);
  if (!input.lastFailedAt) return { canRetry: true, cost };

  const readyAt =
    input.lastFailedAt.getTime() + RETRY_COOLDOWN_MINUTES * 60 * 1000;
  const msLeft = readyAt - input.now.getTime();
  if (msLeft <= 0) return { canRetry: true, cost };

  return {
    canRetry: false,
    reason: "COOLDOWN",
    secondsLeft: Math.ceil(msLeft / 1000),
    cost,
  };
}

/* ===================== Chọn câu ===================== */

export type ItemPoolEntry = {
  id: string;
  type: ThiButType;
  difficulty: ThiButDifficulty;
};

/**
 * Chọn `ITEMS_PER_ATTEMPT` câu cho một lượt.
 *
 * Hai luật, theo thứ tự ưu tiên:
 *
 * 1. **Tránh câu đã gặp.** Một học viên làm khoảng 30 lượt trong đời, tức gặp
 *    120 câu. Kho 400 tới 500 câu là đủ để hiếm khi lặp, nhưng chỉ khi việc
 *    chọn thật sự tránh.
 * 2. **Trải đều dạng câu.** Bốn câu cùng một dạng thì lượt đó chỉ đo được một
 *    kỹ năng, và người giỏi ba dạng còn lại vẫn trượt vì lý do không liên quan
 *    tới mức sẵn sàng của họ.
 *
 * `pickIndex` là hàm chọn ngẫu nhiên, truyền từ ngoài vào để kiểm thử được:
 * bài kiểm thử truyền hàm tất định, máy chủ thật truyền hàm ngẫu nhiên.
 */
export function selectItems(
  pool: readonly ItemPoolEntry[],
  seenIds: ReadonlySet<string>,
  pickIndex: (max: number) => number,
): ItemPoolEntry[] {
  const fresh = pool.filter((i) => !seenIds.has(i.id));
  // Hết câu mới thì quay lại dùng cả kho, chứ không trả về ít hơn 4 câu: một
  // lượt 2 câu sẽ lệch hẳn xác suất mà ngưỡng qua dựa vào.
  const source = fresh.length >= ITEMS_PER_ATTEMPT ? fresh : pool;

  const byType = new Map<ThiButType, ItemPoolEntry[]>();
  for (const item of source) {
    const list = byType.get(item.type) ?? [];
    list.push(item);
    byType.set(item.type, list);
  }

  const chosen: ItemPoolEntry[] = [];
  // Vòng đầu lấy mỗi dạng một câu, vòng sau lấp chỗ trống từ phần còn lại.
  const types = THI_BUT_TYPES.filter((t) => (byType.get(t)?.length ?? 0) > 0);
  for (const type of types) {
    if (chosen.length >= ITEMS_PER_ATTEMPT) break;
    const list = byType.get(type) as ItemPoolEntry[];
    const idx = pickIndex(list.length);
    chosen.push(list.splice(idx, 1)[0]);
  }

  const rest = [...byType.values()].flat();
  while (chosen.length < ITEMS_PER_ATTEMPT && rest.length > 0) {
    const idx = pickIndex(rest.length);
    chosen.push(rest.splice(idx, 1)[0]);
  }

  return chosen;
}

/* ===================== Bóc đáp án ===================== */

export type StoredItem = {
  id: string;
  type: ThiButType;
  difficulty: ThiButDifficulty;
  prompt: string;
  options: string[];
  /** Chỉ số của phương án đúng. KHÔNG BAO GIỜ rời máy chủ. */
  answerIndex: number;
  /** Lời giải, chỉ gửi xuống SAU khi đã chấm. */
  explanation: string;
};

export type PublicItem = {
  id: string;
  type: ThiButType;
  typeLabel: string;
  prompt: string;
  options: string[];
};

/**
 * Bản gửi xuống máy khách. Không có `answerIndex`, không có `explanation`.
 *
 * Đây là bản sao của bẫy đã ghi ở đặc tả mục 03 cho `Exercise.content`: nếu
 * máy chủ gửi nguyên bản ghi xuống để render, nó vừa phát không cả đáp án.
 * Khác biệt duy nhất là ở đây đáp án nằm ở một cột riêng chứ không lẫn trong
 * một khối JSON, nên việc bóc là hiển nhiên. Vẫn phải làm, và vẫn phải có
 * kiểm thử gác, vì "hiển nhiên" là lý do người ta bỏ qua.
 */
export function publicItem(item: StoredItem): PublicItem {
  return {
    id: item.id,
    type: item.type,
    typeLabel: THI_BUT_TYPE_LABEL[item.type],
    prompt: item.prompt,
    options: item.options,
  };
}

/* ===================== Chấm ===================== */

export type GradedItem = {
  itemId: string;
  correct: boolean;
  chosenIndex: number | null;
  answerIndex: number;
  explanation: string;
};

export type ThiButResult = {
  passed: boolean;
  correctCount: number;
  total: number;
  threshold: number;
  items: GradedItem[];
};

/**
 * Chấm một lượt. Máy khách chỉ gửi lựa chọn, không bao giờ gửi điểm.
 *
 * Câu bỏ trống tính là sai chứ không bị loại khỏi tổng: nếu bỏ trống làm giảm
 * mẫu số thì bỏ trống ba câu rồi làm đúng một câu sẽ thành 100%.
 */
export function gradeAttempt(
  items: readonly StoredItem[],
  answers: Readonly<Record<string, number | null | undefined>>,
): ThiButResult {
  const graded: GradedItem[] = items.map((item) => {
    const chosen = answers[item.id];
    const chosenIndex = typeof chosen === "number" ? chosen : null;
    return {
      itemId: item.id,
      correct: chosenIndex === item.answerIndex,
      chosenIndex,
      answerIndex: item.answerIndex,
      explanation: item.explanation,
    };
  });

  const correctCount = graded.filter((g) => g.correct).length;
  return {
    passed: correctCount >= PASS_THRESHOLD,
    correctCount,
    total: items.length,
    threshold: PASS_THRESHOLD,
    items: graded,
  };
}

/* ===================== Trạng thái kho câu ===================== */

/**
 * Câu chỉ được phát cho học viên sau khi CÓ NGƯỜI DUYỆT.
 *
 * Lý do ở đặc tả mục 03: một câu sai đáp án sẽ lấy mất Quân Công của người ngay
 * thẳng, và không tái lập được để xử tranh chấp. AI là xưởng sản xuất ngoại
 * tuyến, không phải nguồn phát hành.
 */
export const ITEM_STATUSES = ["DRAFT", "PUBLISHED", "RETIRED"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** Kho đủ dùng chưa. 400 câu là mức đặc tả mục 03 chốt. */
export const TARGET_POOL_SIZE = 400;

export function poolHealth(publishedCount: number): {
  ready: boolean;
  publishedCount: number;
  target: number;
  percent: number;
} {
  return {
    // Đủ cho một lượt là chạy được, nhưng chưa "đủ để hiếm khi lặp".
    ready: publishedCount >= ITEMS_PER_ATTEMPT,
    publishedCount,
    target: TARGET_POOL_SIZE,
    percent: Math.min(100, Math.round((publishedCount / TARGET_POOL_SIZE) * 100)),
  };
}
