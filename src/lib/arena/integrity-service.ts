import "server-only";
import { db } from "@/lib/db";
import {
  INTEGRITY_RULE_VERSION,
  abilityJump,
  impossiblyFast,
  rankCase,
  repeatedPairing,
  sameWrongAnswers,
  type Signal,
} from "@/lib/arena/integrity.ts";
import {
  normalizeReadingParts,
  type ReadingContent,
} from "@/lib/exercise-content";

/**
 * Liêm chính đấu trường — tầng chạm database.
 *
 * File này CHỈ mở hồ sơ cho người thật đọc. Nó không khoá ai, không gỡ Quân
 * Công của ai, không gắn danh hiệu nào. Ranh giới đó đã viết trong
 * `integrity.ts` và được giữ ở đây bằng một điều đơn giản: hàm duy nhất ghi dữ
 * liệu là `openIntegrityCase`, và nó chỉ ghi vào `ArenaIntegrityCase`.
 *
 * BA ĐIỀU CỐ Ý:
 *
 * 1. **Bot không bao giờ vào hồ sơ.** Bot đọc đề trong không giây, và bot với
 *    bot thì gặp nhau suốt. Để bot lọt vào là hàng chờ ngập rác trong một ngày,
 *    và người xét duyệt sẽ ngừng đọc.
 * 2. **Một trận chỉ mở một hồ sơ cho mỗi người.** Quyết toán có thể chạy lại
 *    (job quét, bấm lại, thử lại sau lỗi mạng), và ba hồ sơ giống hệt nhau
 *    trông như ba lần vi phạm.
 * 3. **Lỗi ở đây không bao giờ làm hỏng quyết toán.** Tầng gọi bọc try, và mọi
 *    thứ trong này đều nằm ngoài transaction tiền bạc.
 */

/* ===================== Quy đáp án chữ về số ===================== */

/**
 * `sameWrongAnswers` nhận số, mà đáp án Reading là chuỗi.
 *
 * Không đổi hàm thuần đó, vì nó đã có kiểm thử và điều nó thật sự đo là "hai
 * người có chọn CÙNG MỘT phương án sai không", tức là một phép so bằng. Ở đây
 * chỉ cần gán cho mỗi giá trị khác nhau một con số ổn định trong phạm vi một
 * câu: đáp án đúng là 0, các giá trị khác đánh số theo thứ tự gặp. Phép so bằng
 * giữ nguyên, và hàm thuần không phải biết gì về Reading.
 */
function normalizeAnswer(value: string | string[] | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const flat = Array.isArray(value) ? value.join("|") : value;
  const trimmed = flat.trim().toLowerCase();
  return trimmed === "" ? null : trimmed;
}

type ReadingAnswerMap = Record<string, string | string[]>;

function parseAnswers(json: string | null | undefined): ReadingAnswerMap {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as ReadingAnswerMap;
  } catch {
    return {};
  }
}

/** Đáp án đúng của từng câu, theo mã câu hỏi. */
function correctAnswersOf(contentJson: string): Map<string, string> {
  const out = new Map<string, string>();
  let content: ReadingContent;
  try {
    content = JSON.parse(contentJson) as ReadingContent;
  } catch {
    return out;
  }
  for (const part of normalizeReadingParts(content)) {
    for (const group of part.questionGroups) {
      for (const q of group.questions) {
        const key = normalizeAnswer(q.answer as string | string[]);
        if (key !== null) out.set(q.id, key);
      }
    }
  }
  return out;
}

function passageWordCount(contentJson: string): number {
  let content: ReadingContent;
  try {
    content = JSON.parse(contentJson) as ReadingContent;
  } catch {
    return 0;
  }
  let words = 0;
  for (const part of normalizeReadingParts(content)) {
    for (const para of part.passage.paragraphs) {
      words += para.trim().split(/\s+/).filter(Boolean).length;
    }
  }
  return words;
}

/* ===================== Dựng tín hiệu ===================== */

type SideData = {
  userId: string;
  isBot: boolean;
  attemptId: string | null;
  answers: ReadingAnswerMap;
  score: number | null;
  total: number | null;
  elapsedMs: number | null;
};

/** Tín hiệu 1: hai người cùng sai một kiểu. Đây là tín hiệu của một CẶP. */
function pairWrongAnswerSignal(
  a: SideData,
  b: SideData,
  correct: Map<string, string>,
): Signal | null {
  if (correct.size === 0) return null;

  const items: { a: number | null; b: number | null; correct: number }[] = [];
  for (const [qid, right] of correct) {
    // Bảng mã riêng cho từng câu: đúng là 0, mỗi giá trị sai gặp lần đầu lấy số
    // tiếp theo. Chỉ cần ổn định trong phạm vi một câu.
    const codes = new Map<string, number>([[right, 0]]);
    const codeOf = (value: string | null): number | null => {
      if (value === null) return null;
      const existing = codes.get(value);
      if (existing !== undefined) return existing;
      const next = codes.size;
      codes.set(value, next);
      return next;
    };
    items.push({
      a: codeOf(normalizeAnswer(a.answers[qid])),
      b: codeOf(normalizeAnswer(b.answers[qid])),
      correct: 0,
    });
  }
  return sameWrongAnswers({ items });
}

/** Tín hiệu 3: so người ta với chính họ, không so với người khác. */
async function abilityJumpSignal(userId: string): Promise<Signal | null> {
  const duelSides = await db.duelSide.findMany({
    where: { userId, attemptId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { attemptId: true },
  });
  const duelAttemptIds = duelSides
    .map((s) => s.attemptId)
    .filter((id): id is string => id !== null);
  if (duelAttemptIds.length < 3) return null;

  const duelAttempts = await db.attempt.findMany({
    where: { id: { in: duelAttemptIds }, scoreTotal: { gt: 0 } },
    select: { scoreRaw: true, scoreTotal: true },
  });
  const practiceAttempts = await db.attempt.findMany({
    where: {
      userId,
      id: { notIn: duelAttemptIds },
      scoreTotal: { gt: 0 },
      scoreRaw: { not: null },
    },
    orderBy: { submittedAt: "desc" },
    take: 20,
    select: { scoreRaw: true, scoreTotal: true },
  });
  // Không có nền luyện tập thì không có gì để so. Người mới hoàn toàn không
  // phải là người đáng ngờ.
  if (duelAttempts.length < 3 || practiceAttempts.length < 3) return null;

  const mean = (rows: { scoreRaw: number | null; scoreTotal: number | null }[]) =>
    rows.reduce((sum, r) => sum + (r.scoreRaw ?? 0) / (r.scoreTotal ?? 1), 0) /
    rows.length;

  return abilityJump({
    practiceAccuracy: mean(practiceAttempts),
    duelAccuracy: mean(duelAttempts),
    duelsCounted: duelAttempts.length,
  });
}

const PAIRING_WINDOW_DAYS = 30;

/** Tín hiệu 4: một cặp gặp nhau quá nhiều, kèm mẫu thắng luân phiên. */
async function repeatedPairingSignal(
  aId: string,
  bId: string,
  now: Date,
): Promise<Signal | null> {
  const since = new Date(now.getTime() - PAIRING_WINDOW_DAYS * 86_400_000);
  const duels = await db.duel.findMany({
    where: {
      status: "SETTLED",
      settledAt: { gte: since },
      sides: { some: { userId: aId } },
      AND: [{ sides: { some: { userId: bId } } }],
    },
    orderBy: { settledAt: "asc" },
    select: { winnerId: true },
    take: 100,
  });
  if (duels.length === 0) return null;

  return repeatedPairing({
    meetings: duels.length,
    windowDays: PAIRING_WINDOW_DAYS,
    outcomes: duels.map((d) => d.winnerId === aId),
  });
}

/* ===================== Mở hồ sơ ===================== */

export type ScanResult = {
  /** Mã người được mở hồ sơ. Rỗng là chuyện thường gặp nhất. */
  opened: string[];
};

/**
 * Quét một trận vừa quyết toán.
 *
 * Gọi SAU `settleDuel`, ngoài transaction, và tầng gọi bọc try. Hàm này không
 * bao giờ ném lỗi ra ngoài vì một lý do dữ liệu: đề hỏng, đáp án thiếu, bài làm
 * mất, tất cả đều trả về "không có gì" chứ không làm hỏng trận đã xong.
 */
export async function scanDuelForIntegrity(input: {
  duelId: string;
  now?: Date;
}): Promise<ScanResult> {
  const now = input.now ?? new Date();

  const duel = await db.duel.findUnique({
    where: { id: input.duelId },
    select: {
      id: true,
      exercise: { select: { content: true } },
      sides: {
        select: {
          userId: true,
          attemptId: true,
          score: true,
          elapsedMs: true,
          user: { select: { isBot: true } },
        },
      },
    },
  });
  if (!duel || duel.sides.length !== 2) return { opened: [] };

  // Bot không bao giờ vào hồ sơ, và trận có bot cũng không: mọi tín hiệu ở đây
  // đo hành vi con người, còn bot thì theo định nghĩa là hành vi máy.
  if (duel.sides.some((s) => s.user.isBot)) return { opened: [] };

  const attemptIds = duel.sides
    .map((s) => s.attemptId)
    .filter((id): id is string => id !== null);
  const attempts = await db.attempt.findMany({
    where: { id: { in: attemptIds } },
    select: { id: true, answers: true, scoreRaw: true, scoreTotal: true },
  });
  const attemptById = new Map(attempts.map((a) => [a.id, a]));

  const sides: SideData[] = duel.sides.map((s) => {
    const attempt = s.attemptId ? attemptById.get(s.attemptId) : undefined;
    return {
      userId: s.userId,
      isBot: s.user.isBot,
      attemptId: s.attemptId,
      answers: parseAnswers(attempt?.answers),
      score: attempt?.scoreRaw ?? s.score,
      total: attempt?.scoreTotal ?? null,
      elapsedMs: s.elapsedMs,
    };
  });

  const correct = correctAnswersOf(duel.exercise.content);
  const words = passageWordCount(duel.exercise.content);

  // Hai tín hiệu của CẶP: cả hai bên cùng nhận.
  const shared: Signal[] = [];
  const wrongSignal = pairWrongAnswerSignal(sides[0], sides[1], correct);
  if (wrongSignal) shared.push(wrongSignal);
  const pairingSignal = await repeatedPairingSignal(
    sides[0].userId,
    sides[1].userId,
    now,
  );
  if (pairingSignal) shared.push(pairingSignal);

  const opened: string[] = [];
  for (const side of sides) {
    const peer = sides.find((s) => s.userId !== side.userId);
    const signals: Signal[] = [...shared];

    if (side.elapsedMs !== null && side.score !== null && side.total !== null) {
      const fast = impossiblyFast({
        passageWords: words,
        elapsedMs: side.elapsedMs,
        score: side.score,
        total: side.total,
      });
      if (fast) signals.push(fast);
    }

    const jump = await abilityJumpSignal(side.userId);
    if (jump) signals.push(jump);

    const ranking = rankCase(signals);
    if (!ranking.worthReviewing) continue;

    const created = await openIntegrityCase({
      userId: side.userId,
      peerId: peer?.userId ?? null,
      duelId: duel.id,
      signals,
      priority: ranking.priority,
    });
    if (created) opened.push(side.userId);
  }

  return { opened };
}

/**
 * Ghi một hồ sơ. Hàm DUY NHẤT trong toàn hệ liêm chính đấu trường có quyền ghi.
 *
 * Trả `false` khi trận này đã có hồ sơ đang mở cho người này. Quyết toán chạy
 * lại là chuyện bình thường, và ba hồ sơ giống hệt nhau trông như ba lần vi
 * phạm với người xét duyệt.
 */
export async function openIntegrityCase(input: {
  userId: string;
  peerId: string | null;
  duelId: string | null;
  signals: readonly Signal[];
  priority: number;
}): Promise<boolean> {
  if (input.signals.length === 0) return false;

  if (input.duelId) {
    const existing = await db.arenaIntegrityCase.findFirst({
      where: { userId: input.userId, duelId: input.duelId, status: "OPEN" },
      select: { id: true },
    });
    if (existing) return false;
  }

  await db.arenaIntegrityCase.create({
    data: {
      userId: input.userId,
      peerId: input.peerId,
      duelId: input.duelId,
      signalsJson: JSON.stringify(input.signals),
      priority: input.priority,
      status: "OPEN",
      integrityPolicyVersion: INTEGRITY_RULE_VERSION,
    },
  });
  return true;
}

/* ===================== Hàng chờ người xét duyệt ===================== */

export type IntegrityCaseRow = {
  id: string;
  createdAt: Date;
  priority: number;
  status: string;
  duelId: string | null;
  signals: Signal[];
  subject: { id: string; name: string | null; email: string };
  peer: { id: string; name: string | null; email: string } | null;
  resolvedAt: Date | null;
  resolveNote: string | null;
  resolvedBy: { name: string | null; email: string } | null;
};

function parseSignals(json: string): Signal[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? (parsed as Signal[]) : [];
  } catch {
    return [];
  }
}

/**
 * Hàng chờ, cái đáng ngờ nhất trước.
 *
 * Xếp theo `priority` chứ không theo thời gian: người xét duyệt có hạn thời
 * gian, và đọc theo thứ tự thời gian nghĩa là hồ sơ nặng nhất nằm cuối hàng.
 */
export async function listIntegrityCases(input?: {
  status?: string;
  take?: number;
}): Promise<IntegrityCaseRow[]> {
  const rows = await db.arenaIntegrityCase.findMany({
    where: input?.status ? { status: input.status } : undefined,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: input?.take ?? 50,
    select: {
      id: true,
      createdAt: true,
      priority: true,
      status: true,
      duelId: true,
      peerId: true,
      signalsJson: true,
      resolvedAt: true,
      resolveNote: true,
      user: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { name: true, email: true } },
    },
  });

  const peerIds = rows
    .map((r) => r.peerId)
    .filter((id): id is string => id !== null);
  const peers = peerIds.length
    ? await db.user.findMany({
        where: { id: { in: peerIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const peerById = new Map(peers.map((p) => [p.id, p]));

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    priority: r.priority,
    status: r.status,
    duelId: r.duelId,
    signals: parseSignals(r.signalsJson),
    subject: r.user,
    peer: r.peerId ? (peerById.get(r.peerId) ?? null) : null,
    resolvedAt: r.resolvedAt,
    resolveNote: r.resolveNote,
    resolvedBy: r.resolvedBy,
  }));
}

/**
 * Đóng một hồ sơ.
 *
 * `note` BẮT BUỘC cho CẢ HAI kết luận, kể cả khi kết luận là không có gì. Lý do:
 * khi có khiếu nại về sau, câu hỏi luôn là "lần trước đã xem và kết luận gì", và
 * một hồ sơ đóng không lời không trả lời được câu đó.
 *
 * Đóng hồ sơ KHÔNG gắn danh hiệu nào. Gắn danh hiệu là một hành động riêng, có
 * nút riêng, và ghi tên người bấm riêng. Gộp hai việc là cách chắc chắn nhất để
 * một cú bấm nhầm thành một lời buộc tội.
 */
export async function resolveIntegrityCase(input: {
  caseId: string;
  reviewerId: string;
  verdict: "CLEARED" | "CONFIRMED";
  note: string;
}): Promise<boolean> {
  if (!input.note.trim()) {
    throw new Error("[arena] Đóng hồ sơ liêm chính bắt buộc phải ghi kết luận.");
  }

  const result = await db.arenaIntegrityCase.updateMany({
    where: { id: input.caseId, status: "OPEN" },
    data: {
      status: input.verdict,
      resolvedById: input.reviewerId,
      resolvedAt: new Date(),
      resolveNote: input.note.trim(),
    },
  });
  return result.count > 0;
}

/** Số hồ sơ đang chờ, cho huy hiệu trên thanh điều hướng quản trị. */
export async function countOpenIntegrityCases(): Promise<number> {
  return db.arenaIntegrityCase.count({ where: { status: "OPEN" } });
}
