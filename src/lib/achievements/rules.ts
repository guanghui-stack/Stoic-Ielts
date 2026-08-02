/**
 * Xét điều kiện danh hiệu — HÀM THUẦN, nhận dữ liệu đã lấy sẵn.
 *
 * Tách khỏi phần truy vấn database vì hai lý do: kiểm thử được trên máy không
 * có MySQL, và vì đây là chỗ sai thì học viên hoặc bị cướp mất danh hiệu đã
 * xứng đáng, hoặc được trao danh hiệu chưa xứng đáng — cả hai đều làm hỏng
 * niềm tin vào toàn bộ hệ thống.
 *
 * Nguyên tắc chung: mọi hàm đều trả về TIẾN ĐỘ, không chỉ đạt/chưa đạt. Học
 * viên cần biết mình còn thiếu gì, chứ không phải nhìn một ô khóa im lặng.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Một lượt làm bài đã được chốt số liệu. */
export type AttemptFact = {
  id: string;
  exerciseId: string;
  /** null nghĩa là chưa quy đổi được band → không dùng cho danh hiệu. */
  band: number | null;
  submittedAt: Date;
  attemptNumber: number;
  isFullTest: boolean;
  valid: boolean;
};

export type StudyDayFact = { dateKey: string; activeSeconds: number };

export type FeynmanFact = {
  completedReviews: number;
  completedMistakes: number;
  /** Câu sai có ĐỦ bằng chứng + lời giải đã sửa + quy tắc rút ra. */
  fullFieldMistakes: number;
  teachBackLongCount: number;
  confidenceImprovedCount: number;
};

export type ProgressResult = {
  earned: boolean;
  percent: number;
  currentValue: number;
  targetValue: number;
  detail: Record<string, unknown>;
  /** Câu nhắc học viên còn thiếu gì — hiện thẳng lên thẻ danh hiệu. */
  hint: string;
};

export function progress(
  current: number,
  target: number,
  earned: boolean,
  detail: Record<string, unknown>,
  hint: string
): ProgressResult {
  const safeTarget = target > 0 ? target : 1;
  const percent = earned
    ? 100
    : Math.max(0, Math.min(99, Math.floor((current / safeTarget) * 100)));
  return { earned, percent, currentValue: current, targetValue: target, detail, hint };
}

/**
 * Lần làm HỢP LỆ ĐẦU TIÊN của mỗi đề.
 *
 * Cố định theo `attemptNumber` chứ không theo điểm cao nhất: nếu lấy điểm cao
 * nhất, học viên chỉ cần làm đi làm lại một đề tới khi may mắn trúng. Danh hiệu
 * khi đó đo độ kiên trì bấm lại, không đo khả năng đọc.
 */
export function firstValidAttempts(attempts: AttemptFact[]): AttemptFact[] {
  const byExercise = new Map<string, AttemptFact>();
  for (const a of [...attempts].sort((x, y) => x.attemptNumber - y.attemptNumber)) {
    if (!a.valid || a.band === null) continue;
    if (!byExercise.has(a.exerciseId)) byExercise.set(a.exerciseId, a);
  }
  return [...byExercise.values()].sort(
    (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()
  );
}

/* ------------------------------------------------------------------ */

export type UniqueFirstConfig = {
  distinctExercises: number;
  minBandEach?: number;
  minAverageBand?: number;
};

/** Làm được N đề KHÁC NHAU, mỗi đề đạt mức tối thiểu ngay lần đầu. */
export function evalUniqueFirstAttempts(
  attempts: AttemptFact[],
  config: UniqueFirstConfig
): ProgressResult {
  const firsts = firstValidAttempts(attempts);
  const qualified = config.minBandEach
    ? firsts.filter((a) => (a.band as number) >= (config.minBandEach as number))
    : firsts;

  const average =
    qualified.length > 0
      ? qualified.reduce((s, a) => s + (a.band as number), 0) / qualified.length
      : 0;

  const enough = qualified.length >= config.distinctExercises;
  const averageOk =
    config.minAverageBand === undefined || average >= config.minAverageBand;

  const missing = Math.max(0, config.distinctExercises - qualified.length);
  const hint = enough
    ? averageOk
      ? "Đã đạt."
      : `Đủ số đề rồi, nhưng trung bình đang ${average.toFixed(1)} — cần từ ${config.minAverageBand}.`
    : `Còn ${missing} đề nữa${config.minBandEach ? `, mỗi đề cần từ band ${config.minBandEach}` : ""}.`;

  return progress(
    qualified.length,
    config.distinctExercises,
    enough && averageOk,
    { qualified: qualified.length, average: Number(average.toFixed(2)) },
    hint
  );
}

/* ------------------------------------------------------------------ */

export type RollingConfig = {
  windowDays: number;
  distinctExercises: number;
  minFullTests?: number;
  minAverageBand?: number;
};

/** N đề khác nhau trong một khoảng thời gian trượt. */
export function evalRollingAttempts(
  attempts: AttemptFact[],
  config: RollingConfig,
  now: Date
): ProgressResult {
  const from = new Date(now.getTime() - config.windowDays * DAY_MS);
  const inWindow = firstValidAttempts(attempts).filter(
    (a) => a.submittedAt >= from && a.submittedAt <= now
  );
  const fullTests = inWindow.filter((a) => a.isFullTest).length;
  const average =
    inWindow.length > 0
      ? inWindow.reduce((s, a) => s + (a.band as number), 0) / inWindow.length
      : 0;

  const earned =
    inWindow.length >= config.distinctExercises &&
    fullTests >= (config.minFullTests ?? 0) &&
    average >= (config.minAverageBand ?? 0);

  const parts: string[] = [];
  if (inWindow.length < config.distinctExercises) {
    parts.push(`còn ${config.distinctExercises - inWindow.length} đề`);
  }
  if (config.minFullTests && fullTests < config.minFullTests) {
    parts.push(`còn ${config.minFullTests - fullTests} đề Full Test`);
  }
  if (config.minAverageBand && average < config.minAverageBand) {
    parts.push(`trung bình cần từ ${config.minAverageBand} (đang ${average.toFixed(1)})`);
  }

  return progress(
    inWindow.length,
    config.distinctExercises,
    earned,
    { inWindow: inWindow.length, fullTests, average: Number(average.toFixed(2)) },
    earned ? "Đã đạt." : `Trong ${config.windowDays} ngày gần nhất: ${parts.join(", ")}.`
  );
}

/* ------------------------------------------------------------------ */

export type FeynmanConfig = {
  completedReviews: number;
  completedMistakes?: number;
  requireFullFields?: boolean;
  minTeachBackCount?: number;
  confidenceImprovedRatio?: number;
};

export function evalFeynmanTotals(
  facts: FeynmanFact,
  config: FeynmanConfig
): ProgressResult {
  const checks: Array<{ ok: boolean; text: string }> = [
    {
      ok: facts.completedReviews >= config.completedReviews,
      text: `còn ${config.completedReviews - facts.completedReviews} phiên chữa bài`,
    },
  ];
  if (config.completedMistakes !== undefined) {
    checks.push({
      ok: facts.completedMistakes >= config.completedMistakes,
      text: `còn ${config.completedMistakes - facts.completedMistakes} câu cần sửa`,
    });
  }
  if (config.requireFullFields) {
    checks.push({
      ok:
        config.completedMistakes !== undefined &&
        facts.fullFieldMistakes >= config.completedMistakes,
      text: "một số câu còn thiếu bằng chứng hoặc quy tắc rút ra",
    });
  }
  if (config.minTeachBackCount !== undefined) {
    checks.push({
      ok: facts.teachBackLongCount >= config.minTeachBackCount,
      text: `còn ${config.minTeachBackCount - facts.teachBackLongCount} bài giảng lại đủ dài`,
    });
  }
  if (config.confidenceImprovedRatio !== undefined) {
    const ratio =
      facts.completedReviews > 0
        ? facts.confidenceImprovedCount / facts.completedReviews
        : 0;
    checks.push({
      ok: ratio >= config.confidenceImprovedRatio,
      text: `mức tự tin mới tăng ở ${Math.round(ratio * 100)}% phiên, cần ${Math.round(config.confidenceImprovedRatio * 100)}%`,
    });
  }

  const earned = checks.every((c) => c.ok);
  const pending = checks.filter((c) => !c.ok).map((c) => c.text);
  return progress(
    facts.completedReviews,
    config.completedReviews,
    earned,
    { ...facts },
    earned ? "Đã đạt." : `Còn thiếu: ${pending.join("; ")}.`
  );
}

/* ------------------------------------------------------------------ */

export type ActiveTimeConfig = {
  windowDays: number;
  activeDays: number;
  minMinutes: number;
  minOutputs?: number;
  minDistinctExercises?: number;
  minFeynmanReviews?: number;
};

/** Một ngày được tính là "học thật" khi có tối thiểu 10 phút hoạt động. */
export const ACTIVE_DAY_MIN_SECONDS = 600;

export function evalActiveTimeWindow(
  days: StudyDayFact[],
  extras: { distinctExercises: number; feynmanReviews: number; outputs: number },
  config: ActiveTimeConfig,
  now: Date
): ProgressResult {
  const fromKey = dateKeyOf(new Date(now.getTime() - config.windowDays * DAY_MS));
  const toKey = dateKeyOf(now);
  const inWindow = days.filter((d) => d.dateKey >= fromKey && d.dateKey <= toKey);

  const activeDays = inWindow.filter(
    (d) => d.activeSeconds >= ACTIVE_DAY_MIN_SECONDS
  ).length;
  const totalMinutes = Math.floor(
    inWindow.reduce((s, d) => s + d.activeSeconds, 0) / 60
  );

  const checks: Array<{ ok: boolean; text: string }> = [
    { ok: activeDays >= config.activeDays, text: `còn ${config.activeDays - activeDays} ngày học thật` },
    { ok: totalMinutes >= config.minMinutes, text: `còn ${config.minMinutes - totalMinutes} phút` },
  ];
  if (config.minOutputs !== undefined) {
    checks.push({
      ok: extras.outputs >= config.minOutputs,
      text: `còn ${config.minOutputs - extras.outputs} bài nộp hoặc phiên chữa bài`,
    });
  }
  if (config.minDistinctExercises !== undefined) {
    checks.push({
      ok: extras.distinctExercises >= config.minDistinctExercises,
      text: `còn ${config.minDistinctExercises - extras.distinctExercises} đề khác nhau`,
    });
  }
  if (config.minFeynmanReviews !== undefined) {
    checks.push({
      ok: extras.feynmanReviews >= config.minFeynmanReviews,
      text: `còn ${config.minFeynmanReviews - extras.feynmanReviews} phiên chữa bài`,
    });
  }

  const earned = checks.every((c) => c.ok);
  return progress(
    activeDays,
    config.activeDays,
    earned,
    { activeDays, totalMinutes, ...extras },
    earned
      ? "Đã đạt."
      : `Trong ${config.windowDays} ngày gần nhất: ${checks.filter((c) => !c.ok).map((c) => c.text).join(", ")}.`
  );
}

/** Ngày theo múi giờ Việt Nam, dạng YYYY-MM-DD. */
export function dateKeyOf(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/* ------------------------------------------------------------------ */

/** Đạt đủ cả ba trụ. Xét theo danh hiệu ĐÃ TRAO, không theo việc học viên có
 *  đang trang bị danh hiệu đó hay không. */
export function evalCompositeTitles(
  earnedCodes: Set<string>,
  config: { pillars: string[] }
): ProgressResult {
  const have = config.pillars.filter((code) => earnedCodes.has(code));
  const missing = config.pillars.filter((code) => !earnedCodes.has(code));
  return progress(
    have.length,
    config.pillars.length,
    have.length === config.pillars.length,
    { have, missing },
    missing.length === 0 ? "Đã đạt." : `Còn thiếu ${missing.length}/3 trụ.`
  );
}

/** Đã có 2/3 trụ và trụ còn lại đi được ít nhất X phần trăm. */
export function evalNearComposite(
  earnedCodes: Set<string>,
  pillarPercent: Map<string, number>,
  config: { pillars: string[]; earnedPillars: number; remainingPercent: number }
): ProgressResult {
  const have = config.pillars.filter((code) => earnedCodes.has(code));
  const rest = config.pillars.filter((code) => !earnedCodes.has(code));

  // Đã đủ cả ba trụ thì mốc "gần đích" này không còn ý nghĩa nữa
  if (have.length >= config.pillars.length) {
    return progress(1, 1, false, { reason: "ALREADY_COMPLETE" }, "Bạn đã vượt qua mốc này.");
  }

  const bestRest = Math.max(0, ...rest.map((code) => pillarPercent.get(code) ?? 0));
  const earned =
    have.length >= config.earnedPillars && bestRest >= config.remainingPercent;

  return progress(
    have.length * 100 + bestRest,
    config.earnedPillars * 100 + config.remainingPercent,
    earned,
    { have, bestRestPercent: bestRest },
    earned
      ? "Đã đạt."
      : `Đang có ${have.length}/3 trụ; trụ gần nhất đi được ${bestRest}% (cần ${config.remainingPercent}%).`
  );
}

/* ------------------------------------------------------------------ */

export type RecoveryConfig = {
  phase: "LOW" | "RISE";
  fullTests: number;
  belowBand?: number;
  minBand?: number;
  noBandBelow?: number;
  windowDays: number;
};

/**
 * Chuỗi sa sút → phục hồi.
 *
 * Giai đoạn LOW là danh hiệu RIÊNG TƯ: nó tồn tại để có cái mà vượt qua, không
 * phải để bêu tên. Giai đoạn RISE chỉ xét những lượt làm SAU chuỗi sa sút —
 * nếu không, một học viên giỏi có một tuần tệ sẽ tự nhiên "phục hồi" bằng
 * chính những bài đã làm tốt từ trước.
 */
export function evalRecoveryChain(
  attempts: AttemptFact[],
  config: RecoveryConfig
): ProgressResult {
  const fullTests = firstValidAttempts(attempts).filter((a) => a.isFullTest);

  const low = findLowWindow(fullTests, {
    count: config.fullTests,
    belowBand: config.belowBand ?? 3.0,
    windowDays: config.windowDays,
  });

  if (config.phase === "LOW") {
    return progress(
      low?.length ?? 0,
      config.fullTests,
      Boolean(low),
      { lowAttemptIds: low?.map((a) => a.id) ?? [] },
      low ? "Đã ghi nhận." : "Mốc này chỉ xuất hiện khi bạn gặp giai đoạn khó khăn."
    );
  }

  if (!low) {
    return progress(0, config.fullTests, false, { reason: "LOW_PHASE_NOT_EARNED" },
      "Mốc này chỉ mở sau giai đoạn cảnh tỉnh.");
  }

  const lowEnd = low[low.length - 1].submittedAt.getTime();
  const deadline = lowEnd + config.windowDays * DAY_MS;
  const after = fullTests.filter(
    (a) => a.submittedAt.getTime() > lowEnd && a.submittedAt.getTime() <= deadline
  );

  let streak: AttemptFact[] = [];
  for (const attempt of after) {
    const band = attempt.band as number;
    if (band >= (config.minBand ?? 7.0)) {
      // Không cho tính hai lần cùng một đề — phải là hai đề KHÁC NHAU
      if (streak.some((s) => s.exerciseId === attempt.exerciseId)) continue;
      streak.push(attempt);
      if (streak.length >= config.fullTests) break;
    } else if (band < (config.noBandBelow ?? 6.0)) {
      streak = []; // tụt lại quá sâu thì chuỗi phục hồi đứt
    }
  }

  const earned = streak.length >= config.fullTests;
  return progress(
    streak.length,
    config.fullTests,
    earned,
    { recoveryAttemptIds: streak.map((a) => a.id) },
    earned
      ? "Đã đạt."
      : `Còn ${config.fullTests - streak.length} bài Full Test đạt từ ${config.minBand ?? 7.0}.`
  );
}

/** Tìm cửa sổ có đủ N bài Full Test dưới ngưỡng, trên các đề KHÁC NHAU. */
function findLowWindow(
  attempts: AttemptFact[],
  config: { count: number; belowBand: number; windowDays: number }
): AttemptFact[] | null {
  const lows = attempts.filter((a) => (a.band as number) < config.belowBand);
  for (let i = 0; i <= lows.length - config.count; i++) {
    const slice: AttemptFact[] = [];
    const seen = new Set<string>();
    for (let j = i; j < lows.length; j++) {
      if (seen.has(lows[j].exerciseId)) continue;
      if (
        lows[j].submittedAt.getTime() - lows[i].submittedAt.getTime() >
        config.windowDays * DAY_MS
      ) {
        break;
      }
      seen.add(lows[j].exerciseId);
      slice.push(lows[j]);
      if (slice.length >= config.count) return slice;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */

export type CollectionItemFact = {
  exerciseId: string;
  /** Các lượt hợp lệ của học viên với đề này, đã sắp theo thời gian. */
  attempts: AttemptFact[];
  feynmanCompleted: boolean;
};

/** Làm mọi đề trong bộ ít nhất hai lần, cách nhau đủ lâu, lần sau không tệ đi. */
export function evalCollectionAttemptCount(
  items: CollectionItemFact[],
  config: {
    minCollectionItems: number;
    attemptsPerExercise: number;
    minimumGapHours: number;
    maxBandDrop: number;
  }
): ProgressResult {
  if (items.length < config.minCollectionItems) {
    return progress(0, config.minCollectionItems, false, { reason: "COLLECTION_NOT_READY" },
      "Bộ đề chưa đủ bài để mở mốc này.");
  }

  let done = 0;
  const detail: Record<string, unknown> = {};
  for (const item of items) {
    const rows = item.attempts.filter((a) => a.valid && a.band !== null);
    const first = rows[0];
    const second = first
      ? rows.find(
          (a) =>
            a.submittedAt.getTime() - first.submittedAt.getTime() >=
            config.minimumGapHours * 3600_000
        )
      : undefined;
    const ok = Boolean(
      first &&
        second &&
        (second.band as number) >= (first.band as number) - config.maxBandDrop
    );
    if (ok) done++;
    detail[item.exerciseId] = {
      firstBand: first?.band ?? null,
      secondBand: second?.band ?? null,
      ok,
    };
  }

  const earned = done === items.length;
  return progress(
    done,
    items.length,
    earned,
    detail,
    earned
      ? "Đã đạt."
      : `Còn ${items.length - done} bài cần làm lại sau ít nhất ${config.minimumGapHours} giờ.`
  );
}

/** Mọi đề trong bộ đạt band tối thiểu ngay lần đầu. */
export function evalCollectionMinFirstBand(
  items: CollectionItemFact[],
  config: {
    minCollectionItems: number;
    minBandEach: number;
    requireFeynmanComplete?: boolean;
    minActiveDays?: number;
  },
  extras: { activeDays: number }
): ProgressResult {
  if (items.length < config.minCollectionItems) {
    return progress(0, config.minCollectionItems, false, { reason: "COLLECTION_NOT_READY" },
      "Bộ đề chưa đủ bài để mở mốc này.");
  }

  let done = 0;
  for (const item of items) {
    const first = item.attempts.find((a) => a.valid && a.band !== null);
    const bandOk = Boolean(first && (first.band as number) >= config.minBandEach);
    const feynmanOk = !config.requireFeynmanComplete || item.feynmanCompleted;
    if (bandOk && feynmanOk) done++;
  }

  const daysOk =
    config.minActiveDays === undefined || extras.activeDays >= config.minActiveDays;
  const earned = done === items.length && daysOk;

  const hints: string[] = [];
  if (done < items.length) {
    hints.push(`còn ${items.length - done} bài cần đạt từ band ${config.minBandEach} ngay lần đầu`);
  }
  if (!daysOk) {
    hints.push(`còn ${(config.minActiveDays ?? 0) - extras.activeDays} ngày học thật`);
  }

  return progress(done, items.length, earned, { done, total: items.length, ...extras },
    earned ? "Đã đạt." : `Còn thiếu: ${hints.join(", ")}.`);
}

/** Chữa bài Feynman trọn vẹn cho mọi đề trong bộ. */
export function evalCollectionFeynmanComplete(
  items: CollectionItemFact[],
  config: { minCollectionItems: number }
): ProgressResult {
  if (items.length < config.minCollectionItems) {
    return progress(0, config.minCollectionItems, false, { reason: "COLLECTION_NOT_READY" },
      "Bộ đề chưa đủ bài để mở mốc này.");
  }
  const done = items.filter((i) => i.feynmanCompleted).length;
  const earned = done === items.length;
  return progress(done, items.length, earned, { done, total: items.length },
    earned ? "Đã đạt." : `Còn ${items.length - done} bài chưa chữa xong.`);
}
