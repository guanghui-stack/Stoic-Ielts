import "server-only";
import { db } from "@/lib/db";
import { hasActiveAccess } from "@/lib/access-grants";
import { readingDisplayTitle } from "@/lib/reading/catalog";
import { readingContentForAttempt } from "@/lib/attempt-content";
import { normalizeReadingParts } from "@/lib/exercise-content";
import { viewerOf } from "@/lib/forum/service";
import { canAskFromAttempt, citationView, findQuestionSource, isForumReadingSource, parseQuestionContent, resolveAssemblyQuestion, type QuestionReferenceInput, type ForumQuestionReferenceView } from "@/lib/forum/question-rules";

type User = {id: string; role: string};
const exerciseSelect = {id: true, title: true, skill: true, readingType: true, published: true, accessLevel: true, competitionOnly: true, arenaOnly: true, content: true} as const;
type SourceExercise = {id: string; title: string; skill: string; readingType: string; published: boolean; accessLevel: string; competitionOnly: boolean; arenaOnly: boolean; content: string};

function exerciseHref(exercise: SourceExercise) {
  return `/luyen-tap/reading${exercise.readingType === "GENERAL" ? "/general" : ""}?bai=${encodeURIComponent(exercise.id)}#exercise-${encodeURIComponent(exercise.id)}`;
}

export type QuestionDiscussionLink = {askHref: string; threads: {href: string; title: string}[]};

/** Chỉ chủ lượt làm thấy đường đi từ kết quả; diễn đàn không nhận mã lượt làm. */
export async function getAttemptDiscussionLinks(user: User, attempt: {
  id: string; userId: string; status: string; submittedAt: Date | null;
  assemblyId: string | null; exercise: SourceExercise; competitionAttempt: {id: string} | null;
}): Promise<Record<string, QuestionDiscussionLink>> {
  if (!canAskFromAttempt(user.id, attempt) || attempt.competitionAttempt) return {};
  const exercises = attempt.assemblyId
    ? (await db.readingAssemblyItem.findMany({where: {assemblyId: attempt.assemblyId}, orderBy: {orderIndex: "asc"}, select: {exercise: {select: exerciseSelect}}})).map((item) => item.exercise)
    : [attempt.exercise];
  const sources = exercises.flatMap((exercise, itemIndex) => {
    if (!isForumReadingSource(exercise)) return [];
    const content = parseQuestionContent(exercise.content);
    return normalizeReadingParts(content).flatMap((part) => part.questionGroups.flatMap((group) => group.questions.flatMap((question) => {
      const source = findQuestionSource(content, question.id);
      return source ? [{exerciseId: exercise.id, questionId: question.id, sourceHash: source.sourceHash,
        attemptQuestionId: attempt.assemblyId ? `p${itemIndex + 1}:${question.id}` : question.id}] : [];
    })));
  });
  if (!sources.length) return {};
  const viewer = await viewerOf(user);
  const threads = await db.forumQuestionReference.findMany({
    where: {exerciseId: {in: exercises.map((exercise) => exercise.id)}, post: {authorId: user.id, status: "VISIBLE", ...(!viewer.isAdmin ? {channel: {level: {lte: viewer.level}}} : {})}},
    select: {exerciseId: true, questionId: true, sourceHash: true, post: {select: {id: true, title: true, channel: {select: {key: true}}}}},
    orderBy: {post: {createdAt: "desc"}}, take: 200,
  });
  return Object.fromEntries(sources.map((source) => [source.attemptQuestionId, {
    askHref: `/nghi-su-duong/hoi-tu-bai-lam?${new URLSearchParams({luot: attempt.id, cau: source.attemptQuestionId})}`,
    threads: threads.filter((row) => row.exerciseId === source.exerciseId && row.questionId === source.questionId && row.sourceHash === source.sourceHash)
      .slice(0, 3).map((row) => ({href: `/nghi-su-duong/${row.post.channel.key}/${row.post.id}`, title: row.post.title})),
  }]));
}

async function quoteAccess(user: User, exercise: SourceExercise) {
  if (!isForumReadingSource(exercise)) return false;
  if (user.role === "ADMIN" || exercise.accessLevel === "PUBLIC") return true;
  if (exercise.accessLevel !== "RESTRICTED") return false;
  // Không dùng quyền Feynman/lượt làm cũ để vượt quyền Reading; lỗi đọc quyền thì đóng.
  try { return await hasActiveAccess({userId: user.id, feature: "READING", exerciseId: exercise.id}); }
  catch { return false; }
}

export async function getQuestionDraft(user: User, attemptId: string, questionId: string): Promise<
  {ok: true; value: {reference: QuestionReferenceInput; view: ForumQuestionReferenceView; defaultTitle: string; attemptQuestionNumber: string}} |
  {ok: false; error: string}
> {
  if (!attemptId || attemptId.length > 191 || !questionId || questionId.length > 220) return {ok: false, error: "Không tìm thấy câu hỏi."};
  const account = await db.user.findUnique({where: {id: user.id}, select: {active: true, role: true}});
  if (!account?.active) return {ok: false, error: "Vui lòng đăng nhập lại."};
  const attempt = await db.attempt.findFirst({
    where: {id: attemptId, userId: user.id},
    select: {userId: true, status: true, submittedAt: true, assemblyId: true, exercise: {select: exerciseSelect}, competitionAttempt: {select: {id: true}}},
  });
  if (!attempt || !canAskFromAttempt(user.id, attempt) || attempt.competitionAttempt) {
    return {ok: false, error: "Chỉ hỏi từ bài luyện Reading của bạn đã nộp. Đề thi riêng không chia sẻ lên diễn đàn."};
  }
  let exercise = attempt.exercise;
  let sourceQuestionId = questionId;
  if (attempt.assemblyId) {
    const items = await db.readingAssemblyItem.findMany({where: {assemblyId: attempt.assemblyId}, orderBy: {orderIndex: "asc"}, select: {exercise: {select: exerciseSelect}}});
    const source = resolveAssemblyQuestion(questionId, items.length);
    if (!source) return {ok: false, error: "Không tìm thấy câu hỏi trong đề ghép."};
    exercise = items[source.itemIndex].exercise;
    sourceQuestionId = source.questionId;
  }
  if (!isForumReadingSource(exercise)) return {ok: false, error: "Bài đọc này hiện không mở để liên kết lên diễn đàn."};
  const source = findQuestionSource(parseQuestionContent(exercise.content), sourceQuestionId);
  const attemptSource = findQuestionSource(await readingContentForAttempt(attempt), questionId);
  if (!source || !attemptSource || sourceQuestionId.length > 191) return {ok: false, error: "Câu hỏi không còn khớp với bài đọc. Hãy mở lại trang kết quả."};
  const passageTitle = readingDisplayTitle(source.passageTitle || exercise.title).slice(0, 200);
  const reference: QuestionReferenceInput = {exerciseId: exercise.id, questionId: sourceQuestionId, partIndex: source.partIndex, questionNumber: source.questionNumber, passageTitle, questionType: source.questionType, sourceHash: source.sourceHash};
  const metadata = {passageTitle, questionNumber: source.questionNumber, questionType: source.questionType, exerciseHref: exerciseHref(exercise)};
  return {ok: true, value: {reference, view: citationView(metadata, source.quote, await quoteAccess({...user, role: account.role}, exercise)), defaultTitle: `${passageTitle} · Câu ${source.questionNumber}`.slice(0, 160), attemptQuestionNumber: attemptSource.questionNumber}};
}

/** Quyền bài diễn đàn và quyền trích dẫn là hai lớp độc lập, đều kiểm ở máy chủ. */
export async function questionReferenceForPost(user: User, postId: string): Promise<ForumQuestionReferenceView | null> {
  const account = await db.user.findUnique({where: {id: user.id}, select: {active: true, role: true}});
  if (!account?.active) return null;
  const viewer = await viewerOf({id: user.id, role: account.role});
  const row = await db.forumQuestionReference.findFirst({
    where: {postId, post: {status: "VISIBLE", ...(!viewer.isAdmin ? {channel: {level: {lte: viewer.level}}} : {})}},
    include: {exercise: {select: exerciseSelect}},
  });
  if (!row) return null;
  const metadata = {passageTitle: row.passageTitle, questionNumber: row.questionNumber, questionType: row.questionType, exerciseHref: exerciseHref(row.exercise)};
  const source = isForumReadingSource(row.exercise) ? findQuestionSource(parseQuestionContent(row.exercise.content), row.questionId) : null;
  const valid = source && source.partIndex === row.partIndex && source.sourceHash === row.sourceHash;
  return citationView(metadata, valid ? source.quote : null, valid ? await quoteAccess({...user, role: account.role}, row.exercise) : false);
}
