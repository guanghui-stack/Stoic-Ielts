/**
 * Ghép ba passage rời thành một đề Full Test — HÀM THUẦN, không chạm database.
 *
 * Vì sao cần ghép: đề một passage chỉ có 12–18 câu, nên MỘT câu đúng/sai đã
 * làm lệch khoảng nửa band. Phân biệt band 8.0 với 8.5 trên đề ngắn gần như là
 * chuyện may rủi — không đủ vững để trao danh hiệu hiếm, càng không đủ vững để
 * trao giải tiền mặt. Đề 40 câu khiến mỗi câu chỉ nhích rất nhẹ.
 *
 * Hai chế độ, và sự khác nhau giữa chúng là điều quan trọng nhất ở file này:
 *
 *   AUTO   — hệ thống chọn, cân bằng độ khó, ưu tiên bài chưa từng làm.
 *            ĐƯỢC tính vào danh hiệu và điều kiện dự thi.
 *   MANUAL — học viên tự tick ba bài mình muốn.
 *            CHỈ để luyện tập; có điểm và band tham khảo nhưng KHÔNG tính.
 *
 * Nếu để học viên tự chọn mà vẫn tính danh hiệu, họ sẽ nhanh chóng học được
 * mẹo: gom ba passage dễ, hoặc gom ba passage đã làm rồi. Band vọt lên trong
 * khi năng lực không đổi, và danh hiệu "band ≥8.0 mọi đề" rốt cuộc trao cho
 * người biết chọn đề chứ không phải người đọc giỏi.
 */

export type AssemblyMode = "AUTO" | "MANUAL";

/** Ba tầng độ khó, xếp theo thứ tự của đề thi thật: dễ dần → khó dần. */
export const DIFFICULTY_TIERS = ["EASY", "MEDIUM", "HARD"] as const;
export type DifficultyTier = (typeof DIFFICULTY_TIERS)[number] | "UNKNOWN";

/** Đề Reading thật: 3 passage, 40 câu, 60 phút. */
export const PASSAGES_PER_TEST = 3;
export const TARGET_QUESTIONS = 40;
export const FULL_TEST_MINUTES = 60;

export type PassageCandidate = {
  exerciseId: string;
  title: string;
  questionCount: number;
  tier: DifficultyTier;
  /** PUBLIC | RESTRICTED */
  accessLevel: string;
  /** Học viên đã có quyền Reading cho bài này chưa. */
  owned: boolean;
  /** Đã làm bài này bao nhiêu lượt hợp lệ. */
  attemptCount: number;
  achievementEligible: boolean;
  competitionOnly: boolean;
  published: boolean;
  /** Thứ tự ổn định để kết quả ghép không đổi giữa các lần tải trang. */
  sortKey: string;
};

/**
 * Passage có được phép đưa vào kho ghép không.
 *
 * Đề Nguyệt Thí bị loại tuyệt đối: nếu học viên luyện trước bằng chính đề thi
 * thì cuộc thi mất hết ý nghĩa.
 */
export function isAssemblable(candidate: PassageCandidate): boolean {
  if (!candidate.published) return false;
  if (candidate.competitionOnly) return false;
  return candidate.questionCount > 0;
}

/** Passage đủ tư cách nằm trong một đề ghép TÍNH DANH HIỆU. */
export function isAutoAssemblable(candidate: PassageCandidate): boolean {
  return isAssemblable(candidate) && candidate.achievementEligible;
}

export type AssemblyPlan = {
  mode: AssemblyMode;
  parts: PassageCandidate[];
  totalQuestions: number;
  durationMinutes: number;
  /** Kết quả đề này có được tính vào danh hiệu không. */
  countsForAchievements: boolean;
  /** Các bài học viên còn phải mua trước khi bắt đầu. */
  missingAccess: PassageCandidate[];
};

export type AssemblyFailure = {
  ok: false;
  reason:
    | "NOT_ENOUGH_PASSAGES"
    | "NEED_EXACTLY_THREE"
    | "DUPLICATE_PASSAGE"
    | "PASSAGE_NOT_ALLOWED";
  detail?: string;
};

export type AssemblyResult = ({ ok: true } & AssemblyPlan) | AssemblyFailure;

function finish(
  mode: AssemblyMode,
  parts: PassageCandidate[]
): { ok: true } & AssemblyPlan {
  return {
    ok: true,
    mode,
    parts,
    totalQuestions: parts.reduce((sum, p) => sum + p.questionCount, 0),
    // Luôn 60 phút như đề thi thật, KHÔNG cộng dồn thời lượng từng passage:
    // cộng dồn sẽ ra 65–70 phút và làm hỏng cảm giác áp lực thời gian thật.
    durationMinutes: FULL_TEST_MINUTES,
    // Chỉ đề do hệ thống chọn mới được tính — xem phần đầu file.
    countsForAchievements: mode === "AUTO",
    missingAccess: parts.filter(
      (p) => p.accessLevel === "RESTRICTED" && !p.owned
    ),
  };
}

/**
 * Chế độ TỰ CHỌN: học viên tick đúng ba bài.
 * Thoải mái chọn bài đã làm rồi — đây là luyện tập, không phải thi.
 */
export function planManualAssembly(
  candidates: PassageCandidate[],
  selectedIds: string[]
): AssemblyResult {
  if (selectedIds.length !== PASSAGES_PER_TEST) {
    return { ok: false, reason: "NEED_EXACTLY_THREE" };
  }
  if (new Set(selectedIds).size !== selectedIds.length) {
    return { ok: false, reason: "DUPLICATE_PASSAGE" };
  }

  const parts: PassageCandidate[] = [];
  for (const id of selectedIds) {
    const found = candidates.find((c) => c.exerciseId === id);
    if (!found || !isAssemblable(found)) {
      return { ok: false, reason: "PASSAGE_NOT_ALLOWED", detail: id };
    }
    parts.push(found);
  }
  return finish("MANUAL", parts);
}

/** Ưu tiên chọn: chưa làm bao giờ > làm ít lần hơn > tên ổn định. */
function freshnessOrder(a: PassageCandidate, b: PassageCandidate): number {
  if (a.attemptCount !== b.attemptCount) return a.attemptCount - b.attemptCount;
  return a.sortKey.localeCompare(b.sortKey);
}

/**
 * Chế độ TỰ ĐỘNG: hệ thống chọn ba passage.
 *
 * Ba tiêu chí, theo đúng thứ tự ưu tiên:
 *   1. Bài CHƯA TỪNG LÀM được ưu tiên tuyệt đối. Ghép lại bài học viên đã
 *      thuộc đáp án thì band thu được là band giả.
 *   2. Mỗi tầng độ khó một bài, xếp dễ → khó như đề thi thật.
 *   3. Trong các tổ hợp còn lại, chọn tổ hợp có tổng số câu GẦN 40 NHẤT.
 */
export function planAutoAssembly(
  candidates: PassageCandidate[]
): AssemblyResult {
  const pool = candidates.filter(isAutoAssemblable);
  if (pool.length < PASSAGES_PER_TEST) {
    return {
      ok: false,
      reason: "NOT_ENOUGH_PASSAGES",
      detail: `${pool.length}/${PASSAGES_PER_TEST}`,
    };
  }

  // Ưu tiên nhóm bài chưa làm; chỉ khi không đủ ba bài mới lấy thêm bài cũ.
  const fresh = pool.filter((c) => c.attemptCount === 0).sort(freshnessOrder);
  const used = pool.filter((c) => c.attemptCount > 0).sort(freshnessOrder);
  const ordered = [...fresh, ...used];
  const working =
    fresh.length >= PASSAGES_PER_TEST ? fresh : ordered.slice(0, Math.max(PASSAGES_PER_TEST, 12));

  const best = chooseBestTrio(working);
  if (!best) {
    return {
      ok: false,
      reason: "NOT_ENOUGH_PASSAGES",
      detail: `${working.length}/${PASSAGES_PER_TEST}`,
    };
  }
  return finish("AUTO", best);
}

/** Điểm phạt: càng thấp càng tốt. */
function trioScore(trio: PassageCandidate[]): number {
  const total = trio.reduce((sum, p) => sum + p.questionCount, 0);
  const distinctTiers = new Set(
    trio.map((p) => p.tier).filter((t) => t !== "UNKNOWN")
  ).size;
  const alreadyDone = trio.reduce((sum, p) => sum + Math.min(p.attemptCount, 3), 0);

  // Trọng số cố ý chênh lệch lớn: đã làm rồi là điều tệ nhất, kế đó là lệch độ
  // khó, cuối cùng mới tới sai số về số câu.
  return alreadyDone * 100 + (PASSAGES_PER_TEST - distinctTiers) * 20 + Math.abs(total - TARGET_QUESTIONS);
}

/** Xếp theo trình tự đề thi thật: dễ trước, khó sau. */
const TIER_ORDER: Record<DifficultyTier, number> = {
  EASY: 0,
  MEDIUM: 1,
  HARD: 2,
  UNKNOWN: 3,
};

function chooseBestTrio(pool: PassageCandidate[]): PassageCandidate[] | null {
  let best: { trio: PassageCandidate[]; score: number } | null = null;

  // Kho đề luôn nhỏ (hàng chục bài) nên duyệt hết tổ hợp là đủ nhanh và cho
  // kết quả TỐI ƯU THẬT, thay vì chọn tham lam rồi lệch.
  for (let i = 0; i < pool.length - 2; i++) {
    for (let j = i + 1; j < pool.length - 1; j++) {
      for (let k = j + 1; k < pool.length; k++) {
        const trio = [pool[i], pool[j], pool[k]];
        const score = trioScore(trio);
        if (!best || score < best.score) best = { trio, score };
      }
    }
  }
  if (!best) return null;

  return [...best.trio].sort(
    (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.sortKey.localeCompare(b.sortKey)
  );
}

/**
 * Học viên còn thiếu quyền gì để bắt đầu đề ghép này.
 * Passage công khai thì miễn phí; passage khóa phải mua đúng bài đó.
 */
export function accessGapOf(plan: AssemblyPlan): {
  ready: boolean;
  missingIds: string[];
} {
  return {
    ready: plan.missingAccess.length === 0,
    missingIds: plan.missingAccess.map((p) => p.exerciseId),
  };
}
