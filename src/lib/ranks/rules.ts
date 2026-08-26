/**
 * Luật mở và vượt cửa ải — hàm thuần, không chạm database.
 *
 * Tách riêng khỏi engine vì một lý do rất thực tế: máy phát triển không có
 * MySQL, nên đây là tầng duy nhất kiểm chứng được bằng kiểm thử tự động. Mọi
 * quyết định "đã đủ điều kiện chưa" phải nằm ở đây; engine chỉ đọc dữ liệu,
 * gọi xuống đây, rồi ghi kết quả.
 *
 * Ranh giới quan trọng nhất trong cả hệ cấp bậc nằm ở file này:
 *
 *   GATE  đọc TOÀN BỘ lịch sử — trả lời "cửa ải đã hiện ra chưa".
 *   SUCCESS chỉ đọc sự kiện xảy ra SAU `startedAt` — trả lời "đã vượt chưa".
 *
 * Nếu success đọc cả lịch sử cũ, học viên sẽ tự thăng cấp ngay khoảnh khắc
 * bấm bắt đầu, và toàn bộ ý nghĩa của "phải chủ động khởi thí luyện" biến mất.
 */

import type {
  GateRuleKey,
  SuccessRuleKey,
  TrialDefinitionSeed,
} from "@/lib/ranks/catalog";
// Đường dẫn TƯƠNG ĐỐI chứ không phải alias `@/`: file này được `scripts/
// test-rank-rules.ts` chạy bằng node thuần, nơi không có bộ giải alias. Import
// kiểu (`import type`) thì bị xoá lúc biên dịch nên alias không sao, còn import
// giá trị như dòng này thì node phải giải thật.
import { experienceGate } from "../experience/experience.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Ba trụ và danh hiệu Đông phong, lấy nguyên mã từ catalog danh hiệu.
 *
 * Cố ý tham chiếu sang hệ Danh hiệu thay vì định nghĩa lại ngưỡng ba trụ ở
 * đây: hai hệ mà tự tính riêng thì sớm muộn sẽ nói hai con số khác nhau về
 * cùng một việc, và học viên là người chịu.
 */
export const PILLAR_TITLE_CODES = [
  "PRACTICE_02_LEARN_THE_WAY",
  "FEYNMAN_02_READ_CAREFULLY",
  "DISCIPLINE_03_WITHIN_HUMAN_POWER",
] as const;

export const EAST_WIND_TITLE_CODE = "COMPOSITE_01_EAST_WIND";

/* ===================== Dữ liệu đầu vào ===================== */

export type QuestionTypeStat = { correct: number; total: number };

export type RankAttemptFact = {
  id: string;
  exerciseId: string;
  band: number | null;
  elapsedSeconds: number | null;
  submittedAt: Date;
  questionTypeStats: Record<string, QuestionTypeStat>;
  partStats: Array<{ part: number; correct: number; total: number }>;
  isFullTest: boolean;
  /** validForAchievements && integrityStatus === CLEAR. Xem `facts.ts`. */
  valid: boolean;
};

export type QualifiedReviewFact = {
  id: string;
  source: "FEYNMAN" | "TRIAL_REFLECTION";
  questionType: string | null;
  completedAt: Date;
  /** Phục bàn "sâu": đủ cả ba trường bằng chứng, giải thích và quy tắc. */
  deep: boolean;
};

export type RankFacts = {
  now: Date;
  attempts: RankAttemptFact[];
  qualifiedReviews: QualifiedReviewFact[];
  studyDays: Array<{ dateKey: string; activeSeconds: number }>;
  earnedTitleCodes: Set<string>;
  /** Tiến độ ba trụ, để cửa 7 xét "hai trụ xong, trụ còn lại đạt 80%". */
  pillars: Array<{ code: string; percent: number }>;
  /** Token Hoa Dung đạo còn dùng được không. Chỉ cửa 4 quan tâm. */
  graceAvailable: number;
  /**
   * Kinh nghiệm tích luỹ. Tính ra từ chính `attempts`, `qualifiedReviews` và
   * `studyDays` ở trên, không lưu cột nào. Xem `lib/experience/experience.ts`.
   *
   * Trường này BẮT BUỘC chứ không tuỳ chọn, dù để tuỳ chọn thì tiện hơn: mặc
   * định 0 nghĩa là mọi cửa từ bậc 2 trở lên đều đóng, và nó đóng im lặng.
   * Bắt buộc thì TypeScript ép mọi nơi dựng facts phải nghĩ tới nó.
   */
  experience: number;
};

export type RuleProgress = { label: string; current: number; target: number };

export type RuleResult = {
  complete: boolean;
  progress: RuleProgress[];
  /** Câu giải thích hiển thị thẳng cho học viên. Luôn tiếng Việt. */
  explanation: string;
};

/* ===================== Tiện ích dùng chung ===================== */

/** Chỉ lượt hợp lệ mới được tính. Đây là hàng rào liêm chính, không phải bộ lọc tiện tay. */
function validAttempts(facts: RankFacts): RankAttemptFact[] {
  return facts.attempts.filter((a) => a.valid);
}

function after(list: { submittedAt?: Date; completedAt?: Date }[], since: Date) {
  return list.filter((x) => {
    const at = (x.submittedAt ?? x.completedAt) as Date | undefined;
    return at !== undefined && at.getTime() > since.getTime();
  });
}

function distinctCount<T>(items: T[], key: (item: T) => string): number {
  return new Set(items.map(key)).size;
}

function chronological<T extends { submittedAt: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
}

function done(progress: RuleProgress[], doneText: string, todoText: string): RuleResult {
  const complete = progress.every((p) => p.current >= p.target);
  return { complete, progress, explanation: complete ? doneText : todoText };
}

function num(config: Record<string, unknown>, key: string, fallback = 0): number {
  const v = config[key];
  return typeof v === "number" ? v : fallback;
}

/**
 * Dạng câu yếu nhất, chốt theo dữ liệu tại một thời điểm.
 *
 * Chỉ xếp hạng khi có đủ mẫu: hai câu sai trên hai câu làm không phải là điểm
 * yếu, chỉ là chưa đủ dữ liệu. Hòa thì lấy dạng có nhiều mẫu hơn, vì kết luận
 * trên mẫu lớn đáng tin hơn.
 */
export function weakestQuestionType(
  attempts: RankAttemptFact[],
  minSamples: number,
): { type: string; correct: number; total: number } | null {
  const totals = new Map<string, QuestionTypeStat>();
  for (const attempt of attempts) {
    for (const [type, stat] of Object.entries(attempt.questionTypeStats)) {
      const acc = totals.get(type) ?? { correct: 0, total: 0 };
      acc.correct += stat.correct;
      acc.total += stat.total;
      totals.set(type, acc);
    }
  }

  let best: { type: string; correct: number; total: number } | null = null;
  for (const [type, stat] of totals) {
    if (stat.total < minSamples) continue;
    const accuracy = stat.correct / stat.total;
    if (best === null) {
      best = { type, ...stat };
      continue;
    }
    const bestAccuracy = best.correct / best.total;
    if (accuracy < bestAccuracy || (accuracy === bestAccuracy && stat.total > best.total)) {
      best = { type, ...stat };
    }
  }
  return best;
}

/* ===================== Luật mở cửa ải ===================== */

export function evaluateGate(
  ruleKey: GateRuleKey,
  config: Record<string, unknown>,
  facts: RankFacts,
): RuleResult {
  const valid = validAttempts(facts);

  switch (ruleKey) {
    case "NONE":
      return { complete: true, progress: [], explanation: "Cửa ải này luôn mở." };

    case "DISTINCT_ATTEMPTS": {
      const target = num(config, "distinctExercises");
      const current = distinctCount(valid, (a) => a.exerciseId);
      return done(
        [{ label: "Đề khác nhau đã làm", current, target }],
        "Đã đủ số đề để mở cửa ải.",
        `Cần làm đủ ${target} đề khác nhau, hiện có ${current}.`,
      );
    }

    case "ATTEMPTS_AND_REVIEWS": {
      const attemptTarget = num(config, "validAttempts");
      const reviewTarget = num(config, "qualifiedReviews");
      return done(
        [
          { label: "Bài hợp lệ", current: valid.length, target: attemptTarget },
          {
            label: "Lượt phục bàn đạt chuẩn",
            current: facts.qualifiedReviews.length,
            target: reviewTarget,
          },
        ],
        "Đã đủ bài và phục bàn để mở cửa ải.",
        `Cần ${attemptTarget} bài hợp lệ và ${reviewTarget} lượt phục bàn.`,
      );
    }

    case "BAND_ATTEMPTS_IN_WINDOW": {
      const minBand = num(config, "minBand");
      const target = num(config, "count");
      const windowDays = num(config, "windowDays");
      const from = facts.now.getTime() - windowDays * DAY_MS;
      const current = valid.filter(
        (a) => a.submittedAt.getTime() >= from && (a.band ?? 0) >= minBand,
      ).length;
      return done(
        [{ label: `Bài đạt band ${minBand} trong ${windowDays} ngày`, current, target }],
        "Phong độ gần đây đã đủ để mở cửa ải.",
        `Cần ${target} bài đạt band ${minBand} trong ${windowDays} ngày gần nhất, hiện có ${current}.`,
      );
    }

    case "FULL_TESTS_COMPLETED": {
      const target = num(config, "count");
      const current = valid.filter((a) => a.isFullTest).length;
      return done(
        [{ label: "Full Test đã hoàn thành", current, target }],
        "Đã có Full Test để mở cửa ải.",
        `Cần hoàn thành ${target} Full Test, hiện có ${current}.`,
      );
    }

    case "REVIEWS_ACROSS_TYPES": {
      const reviewTarget = num(config, "qualifiedReviews");
      const typeTarget = num(config, "distinctQuestionTypes");
      const types = distinctCount(
        facts.qualifiedReviews.filter((r) => r.questionType !== null),
        (r) => r.questionType as string,
      );
      return done(
        [
          {
            label: "Lượt phản tư",
            current: facts.qualifiedReviews.length,
            target: reviewTarget,
          },
          { label: "Dạng câu đã chữa", current: types, target: typeTarget },
        ],
        "Phản tư đã trải đủ dạng câu để mở chặng tiếp theo.",
        `Cần ${reviewTarget} lượt phản tư thuộc ít nhất ${typeTarget} dạng câu.`,
      );
    }

    case "TITLE_OR_PILLARS": {
      // Hai đường vào tương đương: có danh hiệu Đông phong, HOẶC đủ trụ.
      // Cố ý không bắt buộc danh hiệu — Danh hiệu và Cấp bậc là hai trục độc lập.
      const pillarsTarget = num(config, "pillarsComplete");
      const remaining = num(config, "remainingPillarPercent");
      const hasTitle = facts.earnedTitleCodes.has(EAST_WIND_TITLE_CODE);
      // Trụ đã được TRAO danh hiệu tính là 100%, kể cả khi bảng tiến độ chưa
      // kịp cập nhật — bản ghi đã trao mới là sự thật cuối cùng.
      const percentOf = (code: string) =>
        facts.earnedTitleCodes.has(code)
          ? 100
          : (facts.pillars.find((p) => p.code === code)?.percent ?? 0);
      const pillars = PILLAR_TITLE_CODES.map((code) => ({
        code,
        percent: percentOf(code),
      }));
      const complete = pillars.filter((p) => p.percent >= 100).length;
      const others = pillars.filter((p) => p.percent < 100);
      const othersOk = others.every((p) => p.percent >= remaining);
      const viaPillars = complete >= pillarsTarget && othersOk;

      if (hasTitle || viaPillars) {
        return {
          complete: true,
          progress: [{ label: "Trụ đã hoàn thành", current: complete, target: pillarsTarget }],
          explanation: hasTitle
            ? "Đã có danh hiệu Đông phong nên cửa ải mở."
            : "Ba trụ đã đủ để mở cửa ải.",
        };
      }
      return {
        complete: false,
        progress: [{ label: "Trụ đã hoàn thành", current: complete, target: pillarsTarget }],
        explanation: `Cần danh hiệu Đông phong, hoặc ${pillarsTarget} trụ hoàn thành và trụ còn lại đạt ${remaining}%.`,
      };
    }

    case "WEAKEST_TYPE_SAMPLE": {
      const target = num(config, "minSamples");
      const weakest = weakestQuestionType(valid, target);
      const current = weakest?.total ?? 0;
      return done(
        [{ label: "Số câu của dạng yếu nhất", current, target }],
        `Đã đủ dữ liệu để chốt dạng câu yếu nhất.`,
        `Cần ít nhất ${target} câu của một dạng để kết luận đâu là điểm yếu, hiện nhiều nhất là ${current}.`,
      );
    }

    default:
      return {
        complete: false,
        progress: [],
        explanation: "Luật mở cửa ải chưa được cài đặt.",
      };
  }
}

/* ===================== Luật vượt cửa ải ===================== */

/**
 * `startedAt` là mốc cứng. Mọi lượt làm bài và phục bàn có trước mốc này đều
 * bị bỏ qua, kể cả khi chúng thừa sức đáp ứng ngưỡng.
 */
export function evaluateSuccess(
  ruleKey: SuccessRuleKey,
  config: Record<string, unknown>,
  facts: RankFacts,
  startedAt: Date,
): RuleResult {
  const attempts = chronological(
    after(validAttempts(facts), startedAt) as RankAttemptFact[],
  );
  const reviews = after(facts.qualifiedReviews, startedAt) as QualifiedReviewFact[];

  switch (ruleKey) {
    case "GRADED_PLUS_REVIEW": {
      const attemptTarget = num(config, "attempts");
      const reviewTarget = num(config, "qualifiedReviews");
      return done(
        [
          { label: "Bài đã chấm", current: attempts.length, target: attemptTarget },
          { label: "Lượt phục bàn", current: reviews.length, target: reviewTarget },
        ],
        "Đã vượt cửa ải.",
        `Từ lúc khởi thí luyện, cần ${attemptTarget} bài được chấm và ${reviewTarget} lượt phục bàn.`,
      );
    }

    case "DISTINCT_BAND_WITH_REVIEWS": {
      const exerciseTarget = num(config, "distinctExercises");
      const minBand = num(config, "minBand");
      const reviewTarget = num(config, "qualifiedReviews");
      const qualifying = attempts.filter((a) => (a.band ?? 0) >= minBand);
      const current = distinctCount(qualifying, (a) => a.exerciseId);
      return done(
        [
          { label: `Đề khác nhau đạt band ${minBand}`, current, target: exerciseTarget },
          { label: "Lượt phục bàn", current: reviews.length, target: reviewTarget },
        ],
        "Đã vượt cửa ải.",
        `Cần ${exerciseTarget} đề khác nhau đạt band ${minBand} và ${reviewTarget} lượt phục bàn.`,
      );
    }

    case "TIMED_ACCURACY_RUN": {
      // Một lượt duy nhất phải đạt ĐỒNG THỜI mọi điều kiện. Sàn thời gian tối
      // thiểu là để phân biệt đọc nhanh với đoán bừa.
      const minQuestions = num(config, "minQuestions");
      const maxMinutes = num(config, "maxMinutes");
      const minMinutes = num(config, "minMinutes");
      const minAccuracy = num(config, "minAccuracy");

      const passed = attempts.some((a) => {
        const totals = Object.values(a.questionTypeStats);
        const total = totals.reduce((s, t) => s + t.total, 0);
        const correct = totals.reduce((s, t) => s + t.correct, 0);
        const minutes = (a.elapsedSeconds ?? 0) / 60;
        return (
          total >= minQuestions &&
          minutes <= maxMinutes &&
          minutes >= minMinutes &&
          total > 0 &&
          correct / total >= minAccuracy
        );
      });

      return {
        complete: passed,
        progress: [{ label: "Lượt đạt chuẩn", current: passed ? 1 : 0, target: 1 }],
        explanation: passed
          ? "Đã có một lượt đạt cả ba điều kiện."
          : `Cần một lượt từ ${minQuestions} câu, làm trong ${minMinutes}-${maxMinutes} phút, đúng từ ${Math.round(minAccuracy * 100)}%.`,
      };
    }

    case "CONSECUTIVE_BAND_STREAK": {
      const target = num(config, "consecutive");
      const minBand = num(config, "minBand");
      const windowDays = num(config, "windowDays");
      const from = facts.now.getTime() - windowDays * DAY_MS;
      const inWindow = attempts.filter((a) => a.submittedAt.getTime() >= from);

      // Hoa Dung đạo tha MỘT lần đứt chuỗi, và chỉ khi token còn. Nó không
      // biến lượt dưới ngưỡng thành lượt đạt — lượt đó vẫn không được đếm.
      let streak = 0;
      let best = 0;
      let graceLeft = Math.min(facts.graceAvailable, 1);
      for (const attempt of inWindow) {
        if ((attempt.band ?? 0) >= minBand) {
          streak += 1;
          best = Math.max(best, streak);
        } else if (graceLeft > 0) {
          graceLeft -= 1;
        } else {
          streak = 0;
        }
      }

      return done(
        [{ label: `Lượt liên tiếp đạt band ${minBand}`, current: best, target }],
        "Đã giữ được phong độ đủ dài.",
        `Cần ${target} lượt liên tiếp đạt band ${minBand} trong ${windowDays} ngày, hiện chuỗi dài nhất là ${best}.`,
      );
    }

    case "FULL_TEST_WITH_FLOOR": {
      const minBand = num(config, "minBand");
      const floor = num(config, "minWeakestPartAccuracy");
      const passed = attempts.some((a) => {
        if (!a.isFullTest || (a.band ?? 0) < minBand) return false;
        if (a.partStats.length === 0) return false;
        // Sàn cho phần YẾU NHẤT: không cho dồn hết thời gian vào phần dễ.
        return a.partStats.every((p) => p.total > 0 && p.correct / p.total >= floor);
      });
      return {
        complete: passed,
        progress: [{ label: "Full Test đạt chuẩn", current: passed ? 1 : 0, target: 1 }],
        explanation: passed
          ? "Đã có Full Test đạt band và không bỏ rơi phần nào."
          : `Cần một Full Test từ band ${minBand}, và phần yếu nhất vẫn đúng từ ${Math.round(floor * 100)}%.`,
      };
    }

    case "SPACED_DEEP_REVIEWS": {
      const target = num(config, "deepReviews");
      const typeTarget = num(config, "distinctQuestionTypes");
      const minDaysApart = num(config, "minDaysApart");

      // Đếm theo NGÀY khác nhau: ba lượt chữa dồn trong một buổi là ba lần đọc
      // lại, ba lượt cách ngày mới là ba lần nhớ lại.
      const deep = reviews
        .filter((r) => r.deep)
        .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());

      let counted = 0;
      let lastAt: number | null = null;
      const types = new Set<string>();
      for (const review of deep) {
        const at = review.completedAt.getTime();
        if (lastAt !== null && at - lastAt < minDaysApart * DAY_MS) continue;
        counted += 1;
        lastAt = at;
        if (review.questionType) types.add(review.questionType);
      }

      return done(
        [
          { label: "Lượt phục bàn sâu cách ngày", current: counted, target },
          { label: "Dạng câu khác nhau", current: types.size, target: typeTarget },
        ],
        "Đã phục bàn đủ sâu và đủ rộng.",
        `Cần ${target} lượt phục bàn sâu thuộc ${typeTarget} dạng câu, mỗi lượt cách nhau ít nhất ${minDaysApart} ngày.`,
      );
    }

    case "COMPOSITE_CAMPAIGN": {
      const windowDays = num(config, "windowDays");
      const fullTestMinBand = num(config, "fullTestMinBand");
      const deepTarget = num(config, "deepReviews");
      const studyTarget = num(config, "studyDays");
      const from = facts.now.getTime() - windowDays * DAY_MS;

      const fullTests = attempts.filter(
        (a) =>
          a.submittedAt.getTime() >= from &&
          a.isFullTest &&
          (a.band ?? 0) >= fullTestMinBand,
      ).length;
      const deep = reviews.filter(
        (r) => r.deep && r.completedAt.getTime() >= from,
      ).length;
      // StudyDay đã là "ngày học thật" (>= 600 giây) do tầng dưới quyết định.
      const days = facts.studyDays.filter(
        (d) => new Date(`${d.dateKey}T00:00:00Z`).getTime() >= from,
      ).length;

      return done(
        [
          { label: `Full Test từ band ${fullTestMinBand}`, current: fullTests, target: 1 },
          { label: "Lượt phục bàn sâu", current: deep, target: deepTarget },
          { label: "Ngày học thật", current: days, target: studyTarget },
        ],
        "Đã đủ cả ba trụ trong chiến dịch dài.",
        `Trong ${windowDays} ngày cần: 1 Full Test từ band ${fullTestMinBand}, ${deepTarget} lượt phục bàn sâu và ${studyTarget} ngày học thật.`,
      );
    }

    case "WEAKEST_TYPE_STREAK": {
      const target = num(config, "correctStreak");
      const exerciseTarget = num(config, "minDistinctExercises");
      const snapshotType = typeof config.questionType === "string" ? config.questionType : null;

      if (!snapshotType) {
        return {
          complete: false,
          progress: [],
          explanation: "Chưa chốt được dạng câu yếu nhất cho cửa ải này.",
        };
      }

      // Xấp xỉ có chủ ý: dữ liệu chỉ lưu tổng đúng/tổng câu theo dạng cho mỗi
      // lượt, không lưu thứ tự từng câu. Nên một lượt làm đúng TRỌN dạng đó mới
      // được cộng vào chuỗi; sai dù một câu là chuỗi đặt lại. Cách này nghiêm
      // hơn luật gốc chứ không dễ hơn, nên không ai được thăng cấp oan.
      let streak = 0;
      let best = 0;
      const exercises = new Set<string>();
      for (const attempt of attempts) {
        const stat = attempt.questionTypeStats[snapshotType];
        if (!stat || stat.total === 0) continue;
        if (stat.correct === stat.total) {
          streak += stat.total;
          exercises.add(attempt.exerciseId);
          best = Math.max(best, streak);
        } else {
          streak = 0;
          exercises.clear();
        }
      }

      return done(
        [
          { label: "Câu đúng liên tiếp", current: best, target },
          { label: "Đề khác nhau trong chuỗi", current: exercises.size, target: exerciseTarget },
        ],
        "Đã sửa dứt điểm dạng câu yếu nhất.",
        `Cần ${target} câu đúng liên tiếp của dạng "${snapshotType}", trải trên ${exerciseTarget} đề khác nhau. Sai một câu là chuỗi đặt lại.`,
      );
    }

    default:
      return {
        complete: false,
        progress: [],
        explanation: "Luật vượt cửa ải chưa được cài đặt.",
      };
  }
}

/* ===================== Phục bàn miễn phí ===================== */

/**
 * Bốn trường tối thiểu của một TrialReflection, theo đặc tả §4.3.
 *
 * Đây là đường phục bàn KHÔNG MẤT TIỀN. Nó tồn tại để mọi cửa ải có yêu cầu
 * chữa bài đều đi qua được mà không phải mua Feynman — nếu chỗ này lỏng lẻo
 * thì hoặc học viên viết một chữ cho xong và cấp bậc mất giá trị, hoặc nó
 * khắt khe tới mức người ta bỏ tiền mua cho nhanh, và cả hai đều phá vỡ lời
 * hứa "không trả tiền để mạnh hơn".
 *
 * Ngưỡng ký tự cố tình đặt thấp: đủ để chặn "abc" và khoảng trắng, không đủ
 * để ép người học viết văn. Chất lượng thật do giáo viên duyệt sau, không do
 * máy đếm chữ quyết định.
 */
export const REFLECTION_MIN_LENGTH = {
  evidenceText: 10,
  explanation: 20,
  lessonRule: 15,
} as const;

export type ReflectionInput = {
  evidenceText: string;
  explanation: string;
  lessonRule: string;
};

export type ReflectionCheck = {
  valid: boolean;
  /** Lỗi theo từng trường, để giao diện chỉ đúng ô cần sửa. */
  errors: Partial<Record<keyof ReflectionInput, string>>;
};

const REFLECTION_LABELS: Record<keyof ReflectionInput, string> = {
  evidenceText: "Vị trí bằng chứng trong bài",
  explanation: "Vì sao đáp án cũ sai",
  lessonRule: "Quy tắc rút ra cho bài sau",
};

export function validateReflection(input: ReflectionInput): ReflectionCheck {
  const errors: ReflectionCheck["errors"] = {};

  for (const key of Object.keys(REFLECTION_MIN_LENGTH) as Array<
    keyof ReflectionInput
  >) {
    const value = (input[key] ?? "").trim();
    const min = REFLECTION_MIN_LENGTH[key];
    if (value.length === 0) {
      errors[key] = `${REFLECTION_LABELS[key]} chưa được điền.`;
    } else if (value.length < min) {
      errors[key] = `${REFLECTION_LABELS[key]} cần ít nhất ${min} ký tự.`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/* ===================== Hàm tiện dụng cho engine ===================== */

/**
 * Cửa ải mở khi CẢ HAI cùng đạt: luật năng lực của chính nó, VÀ ngưỡng kinh
 * nghiệm của bậc mà nó dẫn tới.
 *
 * Vì sao cộng thêm chứ không phải một `gateRuleKey` mới: mỗi cửa ải có đúng một
 * `gateRuleKey`. Nếu kinh nghiệm thành một khoá mới thì nó THAY THẾ luật năng
 * lực chứ không cộng vào, và cửa ải mất đi thứ nó vốn dùng để đo.
 *
 * Ngưỡng suy ra từ `trial.toLevel` chứ không phải một cột riêng: bậc đã nằm sẵn
 * trong định nghĩa cửa ải, nên thêm cột là thêm một chỗ nữa để lệch.
 *
 * Nhắc lại ràng buộc ở `experience.ts`: kinh nghiệm chỉ ĐỊNH NHỊP. Nếu có ai
 * báo "tôi đủ điều kiện mà cửa không mở vì thiếu kinh nghiệm" thì bảng ngưỡng
 * sai, không phải người đó sai.
 */
export function evaluateTrialGate(
  trial: TrialDefinitionSeed,
  facts: RankFacts,
): RuleResult {
  const base = evaluateGate(trial.gateRuleKey, trial.gateConfig, facts);
  const exp = experienceGate(trial.toLevel, facts.experience);

  if (exp.target <= 0) return base;

  const progress: RuleProgress[] = [
    ...base.progress,
    { label: "Kinh nghiệm", current: exp.current, target: exp.target },
  ];

  if (base.complete && exp.complete) {
    return { complete: true, progress, explanation: base.explanation };
  }
  if (!exp.complete) {
    const missing = exp.target - exp.current;
    return {
      complete: false,
      progress,
      explanation: base.complete
        ? `Điều kiện năng lực đã đủ. Còn thiếu ${missing} kinh nghiệm, tích luỹ bằng cách làm bài, phục bàn và học đều mỗi ngày.`
        : `${base.explanation} Ngoài ra còn thiếu ${missing} kinh nghiệm.`,
    };
  }
  return { complete: false, progress, explanation: base.explanation };
}

export function evaluateTrialSuccess(
  trial: TrialDefinitionSeed,
  facts: RankFacts,
  startedAt: Date,
  /** Cấu hình đã chụp lúc bắt đầu, gồm cả dạng câu yếu nhất đã chốt. */
  snapshotConfig?: Record<string, unknown>,
): RuleResult {
  return evaluateSuccess(
    trial.successRuleKey,
    snapshotConfig ?? trial.successConfig,
    facts,
    startedAt,
  );
}
