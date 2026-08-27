"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { features } from "@/lib/features";
import {
  CARDINAL_TITLES,
  MAX_RANK_LEVEL,
  rankByLevel,
  trialFromLevel,
  type CardinalTitleCode,
} from "@/lib/ranks/catalog";
import { ensureUserRank, startTrial, syncTrialEligibility } from "@/lib/ranks/engine";
import { loadRankFacts } from "@/lib/ranks/facts";
import { evaluateTrialGate, evaluateTrialSuccess, validateReflection } from "@/lib/ranks/rules";
import { isValidReflectionSource } from "@/lib/ranks/reflection-reference";

/**
 * Server Action của hệ cấp bậc.
 *
 * Mọi hàm ở đây tự xác thực người dùng và tự kiểm tra cờ tính năng. Không dựa
 * vào việc giao diện đã ẩn nút: một action còn sống là một cửa vào, và người
 * biết gọi thẳng nó không đi qua giao diện bao giờ.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

function guard(): { ok: false; error: string } | null {
  if (!features.ranks) {
    return { ok: false, error: "Hệ cấp bậc chưa được mở." };
  }
  return null;
}

export async function startTrialAction(trialCode: string): Promise<ActionResult> {
  const blocked = guard();
  if (blocked) return blocked;

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập." };

  const result = await startTrial(user.id, trialCode);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/hoc-vien");
  revalidatePath("/hoc-vien/chien-dich");
  return { ok: true };
}

/**
 * Chọn một trong bốn hiệu ở bậc 8.
 *
 * Bốn hiệu cùng cấp và không tạo quyền lợi khác nhau, nên đây thuần túy là
 * việc tự nhận một cái tên. Vẫn kiểm tra ở máy chủ vì người chưa tới bậc 8
 * không được đặt trước.
 */
export async function chooseCardinalTitleAction(
  code: CardinalTitleCode,
): Promise<ActionResult> {
  const blocked = guard();
  if (blocked) return blocked;

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập." };

  if (!CARDINAL_TITLES.some((title) => title.code === code)) {
    return { ok: false, error: "Hiệu này không hợp lệ." };
  }

  const profile = await ensureUserRank(user.id);
  if (profile.currentLevel < 8) {
    return { ok: false, error: "Chỉ từ bậc Tứ phương tướng quân mới được chọn hiệu." };
  }

  await db.userRank.update({
    where: { userId: user.id },
    data: { cardinalTitleCode: code },
  });

  revalidatePath("/hoc-vien");
  return { ok: true };
}

/* ================================================================== */
/* Phục bàn miễn phí trong thí luyện                                   */
/* ================================================================== */

export type ReflectionState =
  | { error?: string; fieldErrors?: Record<string, string>; success?: string }
  | undefined;

/**
 * Ghi một lượt phục bàn miễn phí gắn với thí luyện đang chạy.
 *
 * Chỉ nhận khi thí luyện ở trạng thái ACTIVE. Viết trước khi bấm "Khởi thí
 * luyện" thì không tính — cùng một ranh giới startedAt mà cả engine tuân theo,
 * nếu không học viên có thể tích sẵn một tập phục bàn rồi bấm nút là vượt luôn.
 */
export async function submitTrialReflectionAction(
  _prev: ReflectionState,
  formData: FormData,
): Promise<ReflectionState> {
  const blocked = guard();
  if (blocked) return { error: blocked.error };

  const user = await getCurrentUser();
  if (!user) return { error: "Bạn cần đăng nhập." };

  const trialCode = String(formData.get("trialCode") ?? "");
  const input = {
    evidenceText: String(formData.get("evidenceText") ?? ""),
    explanation: String(formData.get("explanation") ?? ""),
    lessonRule: String(formData.get("lessonRule") ?? ""),
  };

  const check = validateReflection(input);
  if (!check.valid) {
    return {
      error: "Còn thiếu thông tin, xem lại các ô bên dưới.",
      fieldErrors: check.errors as Record<string, string>,
    };
  }

  const userTrial = await db.userTrial.findUnique({
    where: { userId_trialCode: { userId: user.id, trialCode } },
    select: { id: true, status: true },
  });

  if (!userTrial || userTrial.status !== "ACTIVE") {
    return { error: "Cửa ải này chưa được khởi, hoặc đã kết thúc." };
  }

  const questionType = String(formData.get("questionType") ?? "").trim();
  const sourceAttemptId = String(formData.get("sourceAttemptId") ?? "").trim();
  const sourceQuestionId = String(formData.get("sourceQuestionId") ?? "").trim();

  if (sourceAttemptId || sourceQuestionId) {
    if (!sourceAttemptId || !sourceQuestionId) {
      return { error: "Thiếu tham chiếu câu sai, hãy chọn lại câu cần phục bàn." };
    }
    const validSource = await isValidReflectionSource({
      userId: user.id,
      attemptId: sourceAttemptId,
      questionId: sourceQuestionId,
    });
    if (!validSource) {
      return { error: "Câu tham chiếu không hợp lệ hoặc không thuộc bài của bạn." };
    }
  }

  await db.trialReflection.create({
    data: {
      userId: user.id,
      userTrialId: userTrial.id,
      questionType: questionType || null,
      sourceAttemptId: sourceAttemptId || null,
      sourceQuestionId: sourceQuestionId || null,
      evidenceText: input.evidenceText.trim(),
      explanation: input.explanation.trim(),
      lessonRule: input.lessonRule.trim(),
    },
  });

  revalidatePath(`/hoc-vien/thi-luyen/${trialCode}`);
  return { success: "Đã ghi lượt phục bàn. Tiến độ cửa ải sẽ cập nhật ở lượt xét tiếp theo." };
}

/* ================================================================== */
/* Dữ liệu cho giao diện                                               */
/* ================================================================== */

export type RankView = {
  level: number;
  rankName: string;
  era: string;
  bandAnchor: string;
  cardinalTitleCode: string | null;
  /** "Đang trấn thủ" hay "Nhàn cư" — không phải trạng thái bị phạt. */
  active: boolean;
  nextTrial: {
    code: string;
    name: string;
    featuredGeneralCode: string;
    estimate: string;
    status: string;
    gate: ReturnType<typeof evaluateTrialGate>;
    progress: ReturnType<typeof evaluateTrialSuccess> | null;
  } | null;
};

/** Ngưỡng "Nhàn cư": 30 ngày không có hoạt động học nào. */
const IDLE_DAYS = 30;

export async function getRankView(userId: string): Promise<RankView | null> {
  if (!features.ranks) return null;

  const now = new Date();
  const profile = await ensureUserRank(userId);
  const rank = rankByLevel(profile.currentLevel);
  if (!rank) return null;

  const facts = await loadRankFacts(userId, { now });
  await syncTrialEligibility(userId, facts, profile.currentLevel);

  const lastActivity = facts.attempts.at(-1)?.submittedAt ?? profile.promotedAt;
  const active =
    now.getTime() - lastActivity.getTime() < IDLE_DAYS * 24 * 60 * 60 * 1000;

  const base = {
    level: profile.currentLevel,
    rankName: rank.name,
    era: rank.era,
    bandAnchor: rank.bandAnchor,
    cardinalTitleCode: profile.cardinalTitleCode,
    active,
  };

  const trial = trialFromLevel(profile.currentLevel);
  if (!trial || profile.currentLevel >= MAX_RANK_LEVEL) {
    return { ...base, nextTrial: null };
  }

  const userTrial = await db.userTrial.findUnique({
    where: { userId_trialCode: { userId, trialCode: trial.code } },
  });

  const gate = evaluateTrialGate(trial, facts);
  const progress =
    userTrial?.status === "ACTIVE" && userTrial.startedAt
      ? evaluateTrialSuccess(trial, facts, userTrial.startedAt)
      : null;

  return {
    ...base,
    nextTrial: {
      code: trial.code,
      name: trial.name,
      featuredGeneralCode: trial.featuredGeneralCode,
      estimate: trial.estimate,
      status: userTrial?.status ?? "LOCKED",
      gate,
      progress,
    },
  };
}
