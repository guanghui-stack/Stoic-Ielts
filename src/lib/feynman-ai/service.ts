/**
 * Điều phối một lần chấm AI và một lượt hỏi đáp.
 *
 * Trách nhiệm của file này là THỨ TỰ, không phải luật. Mọi quyết định "có được
 * phép không" nằm ở `rules.ts` dạng hàm thuần có kiểm thử; ở đây chỉ lo lấy dữ
 * liệu, giữ chỗ, gọi API, và bảo đảm lượt đã giữ được nhả lại khi hỏng.
 *
 * Trình tự bắt buộc, và lý do của nó:
 *
 *   1. Đọc bối cảnh và hỏi `decideCanGrade()`
 *   2. GIỮ CHỖ trong một transaction (đánh dấu nhịp ngày + trừ ví)
 *   3. Gọi OpenAI  ← chỉ tới đây mới tốn tiền
 *   4. Thành công thì ghi kết quả; hỏng thì HOÀN lại thứ đã giữ ở bước 2
 *
 * Đảo bước 2 xuống sau bước 3 thì hai tab bấm cùng lúc sẽ gọi API hai lần và
 * chỉ trừ một lượt. Bỏ bước 4 thì một lần OpenAI sập là học viên mất lượt đã
 * mua mà không nhận được gì.
 */
import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hasActiveAccess } from "@/lib/access-grants";
import { loadRankFacts } from "@/lib/ranks/facts";
import { weaknessRows } from "@/lib/ranks/weakness";
import { readingContentForAttempt } from "@/lib/attempt-content";
import type { ReadingContent, ReadingPart } from "@/lib/exercise-content";
import { readFeynmanAiConfig, PROMPT_VERSION, SCHEMA_VERSION } from "./config.ts";
import {
  FeynmanAiError,
  sanitizeErrorMessage,
  shouldRefundQuota,
  type FeynmanAiErrorCode,
} from "./errors.ts";
import { estimateCostMicroUsd } from "./cost.ts";
import { callResponses, parseModelJson } from "./openai-client.ts";
import {
  CHAT_INSTRUCTIONS,
  CHAT_SCHEMA,
  EVALUATION_INSTRUCTIONS,
  EVALUATION_SCHEMA,
  parseChatOutput,
  parseEvaluationOutput,
} from "./prompts.ts";
import {
  buildChatPayload,
  buildEvaluationPayload,
  type EvaluationPayload,
  type MistakeInput,
} from "./context.ts";
import {
  competitionLock,
  decideCanAsk,
  decideCanGrade,
  messageForDenial,
  verdictFor,
  type GradingDenial,
} from "./rules.ts";

/* ------------------------------------------------------------------ */
/* 1. Kết quả trả về cho tầng API                                       */
/* ------------------------------------------------------------------ */

export type GradeResult =
  | { ok: true; evaluationId: string; verdict: string; similarityPercent: number }
  | { ok: false; code: FeynmanAiErrorCode | GradingDenial; message: string };

export type AskResult =
  | { ok: true; messageId: string; answer: string }
  | { ok: false; code: string; message: string; rejected?: boolean };

/* ------------------------------------------------------------------ */
/* 2. Đọc bối cảnh                                                      */
/* ------------------------------------------------------------------ */

/** Gom các part có chứa câu học viên đã tick. Part không liên quan thì bỏ. */
function partsFor(content: ReadingContent, partNumbers: Set<number>) {
  const parts: ReadingPart[] =
    content.parts ??
    (content.passage && content.questionGroups
      ? [{ passage: content.passage, questionGroups: content.questionGroups }]
      : []);

  return parts
    .map((part, index) => ({ part, partNumber: index + 1 }))
    .filter(({ partNumber }) => partNumbers.has(partNumber))
    .map(({ part, partNumber }) => ({
      partNumber,
      title: part.passage.title,
      paragraphs: part.passage.paragraphs,
    }));
}

/** Lời giải hiện tại của một câu, tra theo mã câu trong nội dung đề. */
function liveExplanationOf(
  content: ReadingContent,
  questionId: string
): string | null {
  const parts: ReadingPart[] =
    content.parts ??
    (content.passage && content.questionGroups
      ? [{ passage: content.passage, questionGroups: content.questionGroups }]
      : []);

  for (const part of parts) {
    for (const group of part.questionGroups) {
      for (const question of group.questions) {
        if (question.id !== questionId) continue;
        const note = question.learning;
        if (!note) return null;
        return note.explanation?.trim() || null;
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 3. Chấm                                                              */
/* ------------------------------------------------------------------ */

export async function gradeFeynmanReview(input: {
  userId: string;
  reviewId: string;
  at?: Date;
}): Promise<GradeResult> {
  const at = input.at ?? new Date();
  const config = readFeynmanAiConfig();

  const review = await db.feynmanReview.findUnique({
    where: { id: input.reviewId },
    include: {
      mistakes: { orderBy: { sortOrder: "asc" } },
      aiEvaluation: { select: { id: true } },
      attempt: {
        select: {
          id: true,
          userId: true,
          exerciseId: true,
          band: true,
          assemblyId: true,
          exercise: { select: { title: true, content: true } },
          competitionAttempt: {
            select: { entry: { select: { competition: { select: { endAt: true } } } } },
          },
        },
      },
    },
  });

  // Không phải phiên của mình thì trả về đúng như khi không tồn tại — không
  // xác nhận giúp người lạ rằng có một phiên với mã đó.
  if (!review || review.userId !== input.userId) {
    return { ok: false, code: "INVALID_REQUEST", message: "Khong tim thay phien." };
  }

  const attempt = review.attempt;
  const lock = competitionLock({
    competitionEndsAt:
      attempt.competitionAttempt?.entry.competition.endAt ?? null,
    isCompetitionAttempt: Boolean(attempt.competitionAttempt),
    at,
  });

  const [access, wallet, state] = await Promise.all([
    hasActiveAccess({
      userId: input.userId,
      feature: "FEYNMAN",
      exerciseId: attempt.exerciseId,
      attemptId: attempt.id,
    }),
    db.feynmanAiBudget.findUnique({ where: { userId: input.userId } }),
    db.feynmanAiAttemptState.findUnique({ where: { attemptId: attempt.id } }),
  ]);

  const decision = decideCanGrade({
    featureEnabled: config.enabled,
    hasAccess: access,
    competitionLocked: lock.locked,
    reviewStatus: review.status,
    alreadyGraded: Boolean(review.aiEvaluation),
    wallet: wallet ?? { grantedTotal: 0, usedTotal: 0 },
    lastGradedAt: state?.lastGradedOn ?? null,
    at,
  });
  if (!decision.allowed) {
    return {
      ok: false,
      code: decision.reason,
      message: messageForDenial(decision.reason),
    };
  }

  /* --- Bước 2: giữ chỗ ------------------------------------------- */

  let evaluationId: string;
  try {
    evaluationId = await reserveGradingSlot({
      userId: input.userId,
      attemptId: attempt.id,
      reviewId: review.id,
      questionLimit: config.chatLimitFull,
      at,
    });
  } catch (error) {
    // Ràng buộc unique nổ nghĩa là một request song song đã giữ trước.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        code: "ALREADY_GRADED",
        message: messageForDenial("ALREADY_GRADED"),
      };
    }
    throw error;
  }

  /* --- Bước 3: gọi API ------------------------------------------- */

  try {
    const content = await readingContentForAttempt({
      assemblyId: attempt.assemblyId,
      exercise: { content: attempt.exercise.content },
    });

    const facts = await loadRankFacts(input.userId, { now: at });
    const rows = weaknessRows(facts.attempts, at).map((row) => ({
      questionType: row.questionType,
      samples: row.total,
      accuracyPercent: Math.round(row.accuracy * 100),
    }));

    const mistakes: MistakeInput[] = review.mistakes.map((m) => ({
      questionId: m.questionId,
      numberLabel: m.numberLabel,
      questionType: m.questionType,
      partNumber: m.partNumber,
      prompt: m.prompt,
      userAnswer: m.userAnswer,
      correctAnswer: m.correctAnswer,
      modelExplanation: m.modelExplanation,
      liveExplanation: liveExplanationOf(content, m.questionId),
      evidenceParagraph: m.modelEvidenceParagraph ?? m.evidenceParagraph,
      revisedExplanation: m.revisedExplanation,
      lessonRule: m.lessonRule,
    }));

    const payload = buildEvaluationPayload({
      exerciseTitle: attempt.exercise.title,
      passages: partsFor(content, new Set(mistakes.map((m) => m.partNumber))),
      mistakes,
      finalTeachBack: review.finalTeachBack,
      finalRule: review.finalRule,
      confusingPoint: review.confusingPoint,
      currentBand: attempt.band ?? null,
      targetBand: null,
      weaknessRows: rows,
    });

    const called = await callResponses({
      instructions: EVALUATION_INSTRUCTIONS,
      input: JSON.stringify(payload),
      format: { name: "danh_gia_feynman", schema: EVALUATION_SCHEMA },
      maxOutputTokens: config.evalMaxOutputTokens,
    });

    const parsed = parseEvaluationOutput(parseModelJson(called.text));
    if (!parsed) throw new FeynmanAiError("MALFORMED_OUTPUT", "Sai cau truc");

    const verdict = verdictFor(parsed.diemTuongDong);

    await db.feynmanAiEvaluation.update({
      where: { id: evaluationId },
      data: {
        status: "COMPLETED",
        verdict,
        similarityPercent: parsed.diemTuongDong,
        confidence: parsed.doTinCay,
        reasonJson: JSON.stringify(parsed.tungCau),
        overallAdviceJson: JSON.stringify(parsed.nhanXetChung),
        currentBandSnapshot: attempt.band ?? null,
        weaknessSnapshotJson: JSON.stringify(rows),
        model: config.model,
        promptVersion: PROMPT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        inputTokens: called.inputTokens,
        outputTokens: called.outputTokens,
        cachedInputTokens: called.cachedInputTokens,
        estimatedCostMicroUsd: estimateCostMicroUsd(config.model, called),
        latencyMs: called.latencyMs,
        openaiRequestId: called.requestId,
      },
    });

    return {
      ok: true,
      evaluationId,
      verdict,
      similarityPercent: parsed.diemTuongDong,
    };
  } catch (error) {
    /* --- Bước 4: hoàn lại --------------------------------------- */
    const code =
      error instanceof FeynmanAiError ? error.code : "INTERNAL_ERROR";
    await failEvaluation({
      evaluationId,
      userId: input.userId,
      attemptId: attempt.id,
      code,
      detail: sanitizeErrorMessage(error),
    });
    return { ok: false, code, message: userMessageFor(code) };
  }
}

/**
 * Giữ chỗ: đánh dấu nhịp ngày, trừ ví, tạo bản ghi PENDING — một lần, không tách.
 *
 * `updateMany` kèm điều kiện `usedTotal < grantedTotal` là thứ chặn race thật
 * sự: hai request song song cùng đọc thấy ví còn 1 lượt, nhưng chỉ một cái
 * `updateMany` khớp điều kiện và trả về count 1. Đọc rồi ghi sẽ cho cả hai đi.
 */
async function reserveGradingSlot(input: {
  userId: string;
  attemptId: string;
  reviewId: string;
  questionLimit: number;
  at: Date;
}): Promise<string> {
  return db.$transaction(
    async (tx) => {
      // So một cột với một cột khác cần "field reference" của Prisma. Viết
      // `usedTotal: { lt: 999 }` rồi tự kiểm trong mã sẽ mở lại đúng lỗ hổng
      // race mà transaction này sinh ra để bịt.
      const spent = await tx.feynmanAiBudget.updateMany({
        where: {
          userId: input.userId,
          usedTotal: { lt: db.feynmanAiBudget.fields.grantedTotal },
        },
        data: { usedTotal: { increment: 1 } },
      });
      if (spent.count === 0) {
        throw new FeynmanAiError("QUOTA_EXHAUSTED", messageForDenial("QUOTA_EXHAUSTED"));
      }

      await tx.feynmanAiAttemptState.upsert({
        where: { attemptId: input.attemptId },
        create: {
          attemptId: input.attemptId,
          lastGradedOn: input.at,
          gradedCount: 1,
        },
        update: {
          lastGradedOn: input.at,
          gradedCount: { increment: 1 },
        },
      });

      // reviewId là @unique: request thứ hai đụng P2002 và bị chặn ở đây.
      const evaluation = await tx.feynmanAiEvaluation.create({
        data: {
          userId: input.userId,
          reviewId: input.reviewId,
          status: "PENDING",
          questionLimit: input.questionLimit,
        },
        select: { id: true },
      });

      return evaluation.id;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * Ghi nhận thất bại và hoàn lại thứ đã giữ.
 *
 * Nhịp ngày luôn được nhả, kể cả với lỗi do người dùng: không nhả thì một lần
 * bấm hỏng khóa mất suất chấm của cả ngày hôm đó. Ví thì chỉ hoàn với lỗi hệ
 * thống, theo `shouldRefundQuota()`.
 */
async function failEvaluation(input: {
  evaluationId: string;
  userId: string;
  attemptId: string;
  code: FeynmanAiErrorCode;
  detail: string;
}): Promise<void> {
  try {
    await db.$transaction(async (tx) => {
      await tx.feynmanAiEvaluation.update({
        where: { id: input.evaluationId },
        data: { status: "FAILED", errorCode: input.code },
      });

      await tx.feynmanAiAttemptState.updateMany({
        where: { attemptId: input.attemptId },
        data: { lastGradedOn: null, gradedCount: { decrement: 1 } },
      });

      if (shouldRefundQuota(input.code)) {
        await tx.feynmanAiBudget.updateMany({
          where: { userId: input.userId, usedTotal: { gt: 0 } },
          data: { usedTotal: { decrement: 1 } },
        });
      }
    });
  } catch (error) {
    // Hoàn lượt hỏng là lỗi phải có người xem, nhưng không được che mất lỗi
    // gốc đã đưa chúng ta tới đây.
    console.error(
      "[feynman-ai] Khong hoan duoc luot:",
      sanitizeErrorMessage(error)
    );
  }
}

/* ------------------------------------------------------------------ */
/* 4. Hỏi đáp                                                           */
/* ------------------------------------------------------------------ */

export async function askAboutEvaluation(input: {
  userId: string;
  evaluationId: string;
  question: string;
  /** Khóa chống bấm hai lần, do trình duyệt sinh. */
  requestKey: string;
  at?: Date;
}): Promise<AskResult> {
  const at = input.at ?? new Date();
  const config = readFeynmanAiConfig();

  const evaluation = await db.feynmanAiEvaluation.findUnique({
    where: { id: input.evaluationId },
    include: {
      review: {
        select: {
          attemptId: true,
          attempt: {
            select: {
              id: true,
              exerciseId: true,
              competitionAttempt: {
                select: {
                  entry: { select: { competition: { select: { endAt: true } } } },
                },
              },
            },
          },
        },
      },
      messages: {
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "asc" },
        select: { question: true, answer: true },
      },
    },
  });

  if (!evaluation || evaluation.userId !== input.userId) {
    return { ok: false, code: "INVALID_REQUEST", message: "Khong tim thay ban cham." };
  }

  const attempt = evaluation.review.attempt;
  const lock = competitionLock({
    competitionEndsAt:
      attempt.competitionAttempt?.entry.competition.endAt ?? null,
    isCompetitionAttempt: Boolean(attempt.competitionAttempt),
    at,
  });

  const access = await hasActiveAccess({
    userId: input.userId,
    feature: "FEYNMAN",
    exerciseId: attempt.exerciseId,
    attemptId: attempt.id,
  });

  const decision = decideCanAsk({
    featureEnabled: config.enabled,
    hasAccess: access,
    competitionLocked: lock.locked,
    evaluationStatus: evaluation.status,
    questionUsed: evaluation.questionUsed,
    questionLimit: evaluation.questionLimit,
    question: input.question,
  });
  if (!decision.allowed) {
    return { ok: false, code: decision.reason, message: userMessageFor(decision.reason) };
  }

  // Giữ chỗ bằng chính bản ghi tin nhắn: requestKey là @unique nên hai cú bấm
  // cùng một khóa chỉ tạo được một dòng, và chỉ một cái gọi API.
  let messageId: string;
  try {
    const created = await db.$transaction(
      async (tx) => {
        const bumped = await tx.feynmanAiEvaluation.updateMany({
          where: {
            id: input.evaluationId,
            questionUsed: { lt: evaluation.questionLimit },
          },
          data: { questionUsed: { increment: 1 } },
        });
        if (bumped.count === 0) {
          throw new FeynmanAiError("CHAT_LIMIT_REACHED", "Het luot hoi");
        }

        return tx.feynmanAiMessage.create({
          data: {
            evaluationId: input.evaluationId,
            userId: input.userId,
            requestKey: input.requestKey,
            status: "PENDING",
            question: input.question.trim(),
          },
          select: { id: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    messageId = created.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, code: "INVALID_REQUEST", message: "Cau hoi nay da duoc gui." };
    }
    if (error instanceof FeynmanAiError) {
      return { ok: false, code: error.code, message: userMessageFor(error.code) };
    }
    throw error;
  }

  try {
    const context = rebuildEvaluationPayload(evaluation.weaknessSnapshotJson);
    const payload = buildChatPayload({
      evaluation: context,
      ketLuan: {
        verdict: evaluation.verdict ?? "KHONG_DAT",
        diemTuongDong: evaluation.similarityPercent ?? 0,
      },
      lichSu: evaluation.messages.map((m) => ({
        hoi: m.question,
        dap: m.answer ?? "",
      })),
      cauHoi: input.question,
    });

    const called = await callResponses({
      instructions: CHAT_INSTRUCTIONS,
      input: JSON.stringify(payload),
      format: { name: "tra_loi_feynman", schema: CHAT_SCHEMA },
      maxOutputTokens: config.chatMaxOutputTokens,
    });

    const parsed = parseChatOutput(parseModelJson(called.text));
    if (!parsed) throw new FeynmanAiError("MALFORMED_OUTPUT", "Sai cau truc");

    const usage = {
      model: config.model,
      promptVersion: PROMPT_VERSION,
      inputTokens: called.inputTokens,
      outputTokens: called.outputTokens,
      cachedInputTokens: called.cachedInputTokens,
      estimatedCostMicroUsd: estimateCostMicroUsd(config.model, called),
      latencyMs: called.latencyMs,
      openaiRequestId: called.requestId,
    };

    // Câu ngoài phạm vi KHÔNG trừ lượt: học viên hỏi lạc đề một lần không nên
    // mất một lượt đã trả tiền. Vẫn lưu lại để trang quản trị thấy xu hướng.
    if (!parsed.trongPhamVi) {
      await db.$transaction(async (tx) => {
        await tx.feynmanAiMessage.update({
          where: { id: messageId },
          data: {
            status: "REJECTED",
            rejectReason: "OUT_OF_SCOPE",
            answer: parsed.lyDoTuChoi,
            ...usage,
          },
        });
        await tx.feynmanAiEvaluation.updateMany({
          where: { id: input.evaluationId, questionUsed: { gt: 0 } },
          data: { questionUsed: { decrement: 1 } },
        });
      });
      return {
        ok: false,
        code: "OUT_OF_SCOPE",
        rejected: true,
        message:
          parsed.lyDoTuChoi ||
          "Cau hoi nay nam ngoai pham vi bai doc va phan chua bai.",
      };
    }

    await db.feynmanAiMessage.update({
      where: { id: messageId },
      data: { status: "COMPLETED", answer: parsed.traLoi, ...usage },
    });

    return { ok: true, messageId, answer: parsed.traLoi };
  } catch (error) {
    const code = error instanceof FeynmanAiError ? error.code : "INTERNAL_ERROR";
    try {
      await db.$transaction(async (tx) => {
        await tx.feynmanAiMessage.update({
          where: { id: messageId },
          data: { status: "FAILED", errorCode: code },
        });
        if (shouldRefundQuota(code)) {
          await tx.feynmanAiEvaluation.updateMany({
            where: { id: input.evaluationId, questionUsed: { gt: 0 } },
            data: { questionUsed: { decrement: 1 } },
          });
        }
      });
    } catch (inner) {
      console.error(
        "[feynman-ai] Khong hoan duoc luot hoi:",
        sanitizeErrorMessage(inner)
      );
    }
    return { ok: false, code, message: userMessageFor(code) };
  }
}

/**
 * Dựng lại bối cảnh tối thiểu cho lượt hỏi đáp.
 *
 * Cố tình KHÔNG đọc lại toàn bộ đề: câu hỏi bám vào phần chữa bài, và gửi lại
 * cả ba passage cho mỗi câu hỏi sẽ nhân chi phí lên nhiều lần mà gần như không
 * làm câu trả lời tốt hơn.
 */
function rebuildEvaluationPayload(weaknessJson: string | null): EvaluationPayload {
  let soHo: EvaluationPayload["hocLuc"]["soHo"] = [];
  if (weaknessJson) {
    try {
      const rows = JSON.parse(weaknessJson);
      if (Array.isArray(rows)) {
        soHo = rows.map((row: Record<string, unknown>) => ({
          dangCau: String(row.questionType ?? ""),
          soMau: Number(row.samples ?? 0),
          tyLeDung: Number(row.accuracyPercent ?? 0),
        }));
      }
    } catch {
      soHo = [];
    }
  }

  return {
    deBai: "",
    doanVan: [],
    cacCau: [],
    tongKet: { tuGiangChung: null, quyTacChung: null, diemConLan: null },
    hocLuc: { bandHienTai: null, bandMucTieu: null, soHo, ghiChu: null },
  };
}

/* ------------------------------------------------------------------ */
/* 5. Thông báo cho học viên                                            */
/* ------------------------------------------------------------------ */

/** Lỗi kỹ thuật không bao giờ hiện nguyên văn cho học viên. */
export function userMessageFor(code: string): string {
  switch (code) {
    case "RATE_LIMITED":
      return "Hệ thống đang bận. Bạn thử lại sau một phút nhé — lượt của bạn chưa bị trừ.";
    case "UPSTREAM_TIMEOUT":
      return "Lần chấm này quá lâu nên đã dừng. Lượt của bạn chưa bị trừ, mời bạn thử lại.";
    case "UPSTREAM_ERROR":
    case "MALFORMED_OUTPUT":
    case "INTERNAL_ERROR":
      return "Có lỗi khi chấm. Lượt của bạn chưa bị trừ, mời bạn thử lại.";
    case "OUT_OF_SCOPE":
      return "Câu hỏi này nằm ngoài phạm vi bài đọc và phần chữa bài.";
    case "CHAT_LIMIT_REACHED":
      return "Bạn đã dùng hết số câu hỏi của lượt chấm này.";
    case "EVALUATION_NOT_READY":
      return "Bản chấm chưa sẵn sàng. Bạn cần nhờ AI chấm trước khi hỏi.";
    case "QUESTION_TOO_SHORT":
      return "Câu hỏi quá ngắn. Bạn viết rõ hơn một chút nhé.";
    case "QUESTION_TOO_LONG":
      return "Câu hỏi quá dài. Bạn rút gọn lại dưới 1000 ký tự nhé.";
    case "FEATURE_DISABLED":
    case "NO_ACCESS":
    case "COMPETITION_LOCKED":
    case "DAILY_LIMIT_REACHED":
    case "QUOTA_EXHAUSTED":
    case "REVIEW_NOT_COMPLETED":
    case "ALREADY_GRADED":
      return messageForDenial(code as GradingDenial);
    default:
      return "Có lỗi xảy ra. Mời bạn thử lại.";
  }
}
