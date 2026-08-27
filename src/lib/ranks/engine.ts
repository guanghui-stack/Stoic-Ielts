import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  FIRST_RANK_CODE,
  GRACE_TOKEN,
  MAX_RANK_LEVEL,
  rankByLevel,
  trialFromLevel,
  type TrialDefinitionSeed,
} from "@/lib/ranks/catalog";
import { loadRankFacts } from "@/lib/ranks/facts";
import {
  evaluateTrialGate,
  evaluateTrialSuccess,
  weakestQuestionType,
  type RankFacts,
  type RuleResult,
} from "@/lib/ranks/rules";

/**
 * Bộ máy cấp bậc.
 *
 * Chạy bám theo hàng đợi AchievementEvent đã có thay vì dựng hàng đợi thứ hai.
 * Hai hàng đợi song song nghĩa là hai chỗ có thể kẹt, hai chỗ phải giám sát, và
 * hai bộ chỉ số nói khác nhau về cùng một lượt làm bài.
 *
 * Toàn bộ hàm ở đây IDEMPOTENT. Một sự kiện phát lại không thăng cấp hai lần,
 * không tạo hai lượt thí luyện, không cộng tiến độ hai lần.
 *
 * Điều bộ máy này KHÔNG bao giờ làm:
 *  - Không tự thăng cấp khi học viên chưa bấm "Khởi thí luyện".
 *  - Không hạ cấp. Không có đường nào dẫn tới việc giảm `currentLevel`.
 *  - Không tính sự kiện xảy ra trước `startedAt` cho việc vượt cửa ải.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/* ================================================================== */
/* Hồ sơ cấp bậc                                                       */
/* ================================================================== */

export async function ensureUserRank(userId: string) {
  const existing = await db.userRank.findUnique({ where: { userId } });
  if (existing) return existing;

  try {
    return await db.userRank.create({
      data: { userId, currentLevel: 1, currentRankCode: FIRST_RANK_CODE },
    });
  } catch (error) {
    // Hai yêu cầu cùng lúc cho một học viên mới: cái thua chỉ cần đọc lại.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const row = await db.userRank.findUnique({ where: { userId } });
      if (row) return row;
    }
    throw error;
  }
}

/* ================================================================== */
/* Trạng thái cửa ải kế tiếp                                           */
/* ================================================================== */

/**
 * Cập nhật trạng thái LOCKED/ELIGIBLE cho cửa ải kế tiếp.
 *
 * Chỉ đụng tới cửa ải đi ra từ cấp bậc hiện tại. Không bao giờ tự chuyển sang
 * ACTIVE — bước đó phải do học viên bấm nút, và đó là ranh giới cốt lõi của cả
 * hệ thống.
 */
export async function syncTrialEligibility(
  userId: string,
  facts: RankFacts,
  currentLevel: number,
): Promise<{ trial: TrialDefinitionSeed; gate: RuleResult } | null> {
  const trial = trialFromLevel(currentLevel);
  if (!trial) return null; // cấp 9 — không còn cửa ải nào

  const gate = evaluateTrialGate(trial, facts);

  const existing = await db.userTrial.findUnique({
    where: { userId_trialCode: { userId, trialCode: trial.code } },
  });

  // Đang làm dở hoặc đã vượt thì không đụng vào nữa.
  if (existing && (existing.status === "ACTIVE" || existing.status === "PASSED")) {
    return { trial, gate };
  }

  const status = gate.complete ? "ELIGIBLE" : "LOCKED";
  const data = {
    status,
    gateSnapshotJson: JSON.stringify(gate),
    eligibleAt: gate.complete ? (existing?.eligibleAt ?? new Date()) : null,
  };

  await db.userTrial.upsert({
    where: { userId_trialCode: { userId, trialCode: trial.code } },
    update: data,
    create: { userId, trialCode: trial.code, ...data },
  });

  return { trial, gate };
}

/* ================================================================== */
/* Thăng cấp                                                           */
/* ================================================================== */

/**
 * Giao dịch thăng cấp, có khóa lạc quan.
 *
 * `updateMany` với điều kiện `currentLevel = fromLevel` là chốt chặn: hai sự
 * kiện tới cùng lúc thì chỉ một cái thấy đúng cấp xuất phát và tăng được, cái
 * còn lại đếm được 0 dòng và dừng. Không có cách nào nhảy hai cấp một lúc.
 */
async function promoteAfterPassedRun(input: {
  userId: string;
  userTrialId: string;
  trialRunId: string;
  fromLevel: number;
  toLevel: number;
  rankCode: string;
  resultSnapshot: unknown;
}): Promise<boolean> {
  try {
    await db.$transaction(async (tx) => {
      const updated = await tx.userRank.updateMany({
        where: { userId: input.userId, currentLevel: input.fromLevel },
        data: {
          currentLevel: input.toLevel,
          currentRankCode: input.rankCode,
          promotedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new Error("RANK_CHANGED_CONCURRENTLY");

      const snapshot = JSON.stringify(input.resultSnapshot);
      await tx.trialRun.update({
        where: { id: input.trialRunId },
        data: { status: "PASSED", resultJson: snapshot, endedAt: new Date() },
      });
      await tx.userTrial.update({
        where: { id: input.userTrialId },
        data: {
          status: "PASSED",
          resultSnapshotJson: snapshot,
          completedAt: new Date(),
        },
      });
    });

    // Bố cáo toàn cõi. NGOÀI transaction và bọc try: một tin không lên bảng thì
    // thiếu một dòng, còn quay lui việc thăng cấp thì mất công của cả tháng.
    //
    // Ngưỡng cấp bậc và quyền riêng tư đều do `announceRankUp` kiểm, không kiểm
    // ở đây: gác cùng một luật ở hai nơi là cách chắc chắn để hai nơi lệch nhau.
    try {
      const { announceRankUp } = await import("@/lib/arena/bulletin-service");
      const { rankByLevel } = await import("@/lib/ranks/catalog");
      await announceRankUp({
        userId: input.userId,
        toLevel: input.toLevel,
        rankName: rankByLevel(input.toLevel)?.name ?? `cấp ${input.toLevel}`,
      });
    } catch (error) {
      console.error("[wobridges] Khong bo cao duoc tin thang cap:", error);
    }

    return true;
  } catch (error) {
    if (String(error).includes("RANK_CHANGED_CONCURRENTLY")) return false;
    throw error;
  }
}

/* ================================================================== */
/* Khoảng Thở Có Kỷ Luật                                           */
/* ================================================================== */

/**
 * Trả token nếu đã hết thời gian chờ. Gọi mỗi lần xét, rẻ và idempotent.
 */
async function refreshGraceToken(userId: string, now: Date): Promise<void> {
  const state = await db.userGraceState.findUnique({ where: { userId } });
  if (!state) {
    await db.userGraceState.create({
      data: { userId, tokenCode: GRACE_TOKEN.code, availableCount: GRACE_TOKEN.maxAvailable },
    });
    return;
  }
  if (state.availableCount >= GRACE_TOKEN.maxAvailable) return;
  if (!state.nextGrantAt || state.nextGrantAt > now) return;

  await db.userGraceState.update({
    where: { userId },
    data: {
      availableCount: GRACE_TOKEN.maxAvailable,
      lastGrantedAt: now,
      nextGrantAt: null,
    },
  });
}

/**
 * Ghi nhận đã tiêu một token. Chỉ gọi khi luật thật sự đã dùng tới nó.
 */
export async function consumeGraceToken(userId: string, now: Date): Promise<void> {
  await db.userGraceState.updateMany({
    where: { userId, availableCount: { gt: 0 } },
    data: {
      availableCount: { decrement: 1 },
      lastUsedAt: now,
      nextGrantAt: new Date(now.getTime() + GRACE_TOKEN.cooldownDays * DAY_MS),
    },
  });
}

/* ================================================================== */
/* Xử lý sự kiện                                                       */
/* ================================================================== */

/**
 * Điểm vào duy nhất từ hàng đợi danh hiệu.
 *
 * Không ném lỗi ra ngoài trong trường hợp thường: một lỗi xét cấp bậc không
 * được phép làm hỏng việc nộp bài hay nhận danh hiệu của học viên.
 */
export async function processRankEvent(event: {
  id: string;
  userId: string;
  type: string;
}): Promise<void> {
  const now = new Date();
  const profile = await ensureUserRank(event.userId);
  await refreshGraceToken(event.userId, now);

  const facts = await loadRankFacts(event.userId, { now });

  // Luôn cập nhật gate trước: cửa ải phải hiện ra được ngay cả khi học viên
  // chưa bao giờ bắt đầu thí luyện nào.
  const next = await syncTrialEligibility(event.userId, facts, profile.currentLevel);
  if (!next) return;

  const { trial } = next;
  if (profile.currentLevel >= MAX_RANK_LEVEL) return;

  const userTrial = await db.userTrial.findUnique({
    where: { userId_trialCode: { userId: event.userId, trialCode: trial.code } },
    include: {
      runs: { where: { status: "ACTIVE" }, orderBy: { runNumber: "desc" }, take: 1 },
    },
  });

  // Chưa bấm "Khởi thí luyện" thì không có gì để xét. Đây là chỗ hệ thống từ
  // chối thăng cấp tự động, dù dữ liệu đã thừa điều kiện.
  if (!userTrial || userTrial.status !== "ACTIVE") return;

  const run = userTrial.runs[0];
  if (!run || !userTrial.startedAt) return;

  // Chống lặp ở tầng dữ liệu: cùng một sự kiện phát lại chỉ ghi được một lần.
  try {
    await db.trialRunEvent.create({
      data: {
        userTrialId: userTrial.id,
        trialRunId: run.id,
        eventKey: `${run.id}:${event.id}`,
        type: event.type,
        sourceId: event.id,
        payloadJson: "{}",
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return; // đã xử lý sự kiện này cho lượt này rồi
    }
    throw error;
  }

  const snapshotConfig = safeParse(run.configSnapshotJson) ?? trial.successConfig;
  const result = evaluateTrialSuccess(trial, facts, userTrial.startedAt, snapshotConfig);

  await db.trialRun.update({
    where: { id: run.id },
    data: { progressJson: JSON.stringify(result) },
  });
  await db.userTrial.update({
    where: { id: userTrial.id },
    data: { progressJson: JSON.stringify(result), sourceEventId: event.id },
  });

  if (!result.complete) return;

  const toLevel = trial.toLevel;
  const target = rankByLevel(toLevel);
  if (!target) return;

  await promoteAfterPassedRun({
    userId: event.userId,
    userTrialId: userTrial.id,
    trialRunId: run.id,
    fromLevel: trial.fromLevel,
    toLevel,
    rankCode: target.code,
    resultSnapshot: result,
  });

  // Sau khi lên cấp, mở ngay trạng thái cửa ải kế tiếp để bản đồ không phải
  // chờ một sự kiện nữa mới cập nhật.
  await syncTrialEligibility(event.userId, facts, toLevel);
}

/* ================================================================== */
/* Khởi thí luyện                                                      */
/* ================================================================== */

export type StartTrialResult =
  | { ok: true; trialCode: string }
  | { ok: false; error: string };

/**
 * Thao tác chủ động của học viên. Đây là nơi duy nhất tạo ra một lượt ACTIVE.
 *
 * Chụp lại cấu hình tại thời điểm bắt đầu, gồm cả dạng câu yếu nhất cho cửa
 * cuối. Nhờ vậy sửa ngưỡng trong catalog về sau không đổi luật của người đang
 * đi giữa chừng, và người học không thể lách bằng cách để một dạng khác tụt
 * xuống thấp hơn.
 */
export async function startTrial(
  userId: string,
  trialCode: string,
): Promise<StartTrialResult> {
  const profile = await ensureUserRank(userId);
  const trial = trialFromLevel(profile.currentLevel);

  if (!trial || trial.code !== trialCode) {
    return { ok: false, error: "Cửa ải này không thuộc cấp bậc hiện tại của bạn." };
  }

  const now = new Date();
  const facts = await loadRankFacts(userId, { now });
  const gate = evaluateTrialGate(trial, facts);
  if (!gate.complete) return { ok: false, error: gate.explanation };

  const snapshotConfig: Record<string, unknown> = { ...trial.successConfig };
  if (trial.successRuleKey === "WEAKEST_TYPE_STREAK") {
    const minSamples =
      typeof trial.gateConfig.minSamples === "number" ? trial.gateConfig.minSamples : 20;
    const weakest = weakestQuestionType(
      facts.attempts.filter((a) => a.valid),
      minSamples,
    );
    if (!weakest) {
      return { ok: false, error: "Chưa đủ dữ liệu để chốt dạng câu yếu nhất của bạn." };
    }
    snapshotConfig.questionType = weakest.type;
  }

  try {
    await db.$transaction(async (tx) => {
      const userTrial = await tx.userTrial.upsert({
        where: { userId_trialCode: { userId, trialCode } },
        update: {
          status: "ACTIVE",
          gateSnapshotJson: JSON.stringify(gate),
          startedAt: now,
          progressJson: null,
        },
        create: {
          userId,
          trialCode,
          status: "ACTIVE",
          gateSnapshotJson: JSON.stringify(gate),
          eligibleAt: now,
          startedAt: now,
        },
      });

      // Bấm hai lần liên tiếp chỉ được một lượt ACTIVE: khóa duy nhất trên
      // (userTrialId, runNumber) khiến lần thứ hai va vào P2002 và bị bỏ.
      const runNumber =
        (await tx.trialRun.count({ where: { userTrialId: userTrial.id } })) + 1;
      await tx.trialRun.create({
        data: {
          userTrialId: userTrial.id,
          runNumber,
          configSnapshotJson: JSON.stringify(snapshotConfig),
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: true, trialCode }; // lượt đã được tạo bởi cú bấm trước
    }
    throw error;
  }

  return { ok: true, trialCode };
}

function safeParse(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}
