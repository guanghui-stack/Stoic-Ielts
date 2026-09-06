import assert from "node:assert/strict";
import { canAskFromAttempt, citationView, findQuestionSource, isForumReadingSource, parseQuestionContent, resolveAssemblyQuestion } from "../src/lib/forum/question-rules.ts";
import { canMarkReplyHelpful, notificationRecipients } from "../src/lib/forum/engagement-rules.ts";
import { gradeReading, type ReadingContent, type QuestionType } from "../src/lib/exercise-content.ts";

const types: QuestionType[] = ["TFNG", "MC", "MC_MULTI", "GAP", "MATCH_HEADINGS", "MATCH_INFO", "MATCH_FEATURES", "MATCH_ENDINGS"];
const content: ReadingContent = {parts: [{passage: {title: "Bài đọc mẫu", paragraphs: ["Đoạn A", "Đoạn B"]}, questionGroups: types.map((type) => ({
  type, instruction: "Hướng dẫn", options: ["Nhóm một", "Nhóm hai"], wordLimit: "ONE_WORD", boxTitle: "Tiêu đề", reuseOptions: false,
  questions: [{id: type, prompt: `Câu hỏi ${type}`, paragraph: "B", options: ["Lựa chọn một", "Lựa chọn hai"], answer: type === "MC_MULTI" ? ["A", "B"] : "A", altAnswers: ["ĐÁP ÁN KHÁC RIÊNG TƯ"], learning: {explanation: "FEYNMAN RIÊNG TƯ", evidenceText: "BẰNG CHỨNG TRẢ PHÍ"}}],
}))}]};
const graded = gradeReading(content, {});
for (const detail of graded.detail) {
  const source = findQuestionSource(content, detail.id);
  assert(source, `Phải tìm được ${detail.id}`);
  assert.equal(source.questionNumber.replace("–", "-"), detail.numberLabel.replace("–", "-"));
  const serialized = JSON.stringify(source.quote);
  for (const secret of ["answer", "learning", "altAnswers", "RIÊNG TƯ", "TRẢ PHÍ", "userAnswer", "score"]) assert(!serialized.includes(secret), secret);
}
assert.equal(findQuestionSource(content, "MC_MULTI")?.questionNumber, "3–4");
assert.equal(findQuestionSource(content, "MATCH_HEADINGS")?.quote.paragraphText, "Đoạn B");
assert.equal(findQuestionSource(content, "GAP")?.quote.paragraphText, "");
assert.equal(findQuestionSource(content, "MATCH_INFO")?.quote.reuseOptions, false);
assert.equal(findQuestionSource(content, "không tồn tại"), null);
assert.equal(findQuestionSource({...content, parts: [content.parts![0], content.parts![0]]}, "TFNG"), null);
assert.equal(findQuestionSource(parseQuestionContent("JSON hỏng"), "TFNG"), null);
assert.deepEqual(parseQuestionContent("null"), {});
const malformed = JSON.parse(JSON.stringify(content));
malformed.parts[0].questionGroups[0].questions[0].options = ["TRUE", {answer: "SECRET"}];
malformed.parts[0].questionGroups[0].questions[0].prompt = {learning: "SECRET"};
assert(!JSON.stringify(findQuestionSource(malformed, "TFNG")?.quote).includes("SECRET"));
const renumbered = structuredClone(content);
renumbered.parts![0].questionGroups[0].questions.unshift({id: "inserted", prompt: "Câu mới", answer: "A"});
assert.notEqual(findQuestionSource(renumbered, "GAP")?.sourceHash, findQuestionSource(content, "GAP")?.sourceHash);

const oldSource = findQuestionSource(content, "TFNG")!;
const changed = structuredClone(content);
changed.parts![0].questionGroups[0].questions[0].learning = {explanation: "Lời giải mới"};
assert.equal(findQuestionSource(changed, "TFNG")?.sourceHash, oldSource.sourceHash, "Sửa lời giải không làm hỏng tham chiếu câu hỏi");
changed.parts![0].passage.paragraphs[0] = "Nội dung nguồn khác";
assert.notEqual(findQuestionSource(changed, "TFNG")?.sourceHash, oldSource.sourceHash);

const metadata = {passageTitle: "Bài đọc", questionNumber: "1", questionType: "TFNG", exerciseHref: "/luyen-tap/reading?bai=1"};
assert.equal(citationView(metadata, oldSource.quote, true).state, "available");
const locked = citationView(metadata, oldSource.quote, false);
assert.equal(locked.state, "locked");
assert(!("quote" in locked));
assert(!JSON.stringify(locked).includes("Câu hỏi TFNG"));
assert.equal(citationView(metadata, null, true).state, "missing");

const attempt = {userId: "owner", status: "GRADED", submittedAt: new Date()};
assert(canAskFromAttempt("owner", attempt));
assert(canAskFromAttempt("owner", {...attempt, status: "SUBMITTED"}));
assert(!canAskFromAttempt("other", attempt));
for (const status of ["IN_PROGRESS", "DELETED", "", "READY"]) assert(!canAskFromAttempt("owner", {...attempt, status}));
assert(!canAskFromAttempt("owner", {...attempt, submittedAt: null}));
const exercise = {skill: "READING", published: true, competitionOnly: false, arenaOnly: false};
assert(isForumReadingSource(exercise));
assert(!isForumReadingSource({...exercise, competitionOnly: true}));
assert(!isForumReadingSource({...exercise, arenaOnly: true}));
assert(!isForumReadingSource({...exercise, published: false}));
assert(!isForumReadingSource({...exercise, skill: "WRITING"}));
assert.deepEqual(resolveAssemblyQuestion("p2:q1", 3), {itemIndex: 1, questionId: "q1"});
assert.deepEqual(resolveAssemblyQuestion("p1:custom:id", 3), {itemIndex: 0, questionId: "custom:id"});
for (const id of ["p0:q1", "p4:q1", "p01:q1", "p-1:q1", "q1", "p1:"]) assert.equal(resolveAssemblyQuestion(id, 3), null);

const mark = {viewerId: "owner", postAuthorId: "owner", postId: "post", postVisible: true, canWrite: true, comment: {postId: "post", authorId: "helper", status: "VISIBLE"}};
assert(canMarkReplyHelpful(mark));
for (const altered of [{viewerId: "admin"}, {postVisible: false}, {canWrite: false}, {comment: null}, {comment: {...mark.comment, authorId: "owner"}}, {comment: {...mark.comment, postId: "other"}}, {comment: {...mark.comment, status: "HIDDEN"}}, {comment: {...mark.comment, status: "DELETED"}}]) assert(!canMarkReplyHelpful({...mark, ...altered}));
assert.deepEqual(notificationRecipients("actor", "direct", [{userId: "actor", following: true}, {userId: "follower", following: true}, {userId: "direct", following: true}, {userId: "muted", following: false}]), [{userId: "follower", kind: "THREAD_COMMENT"}, {userId: "direct", kind: "DIRECT_REPLY"}]);
assert.deepEqual(notificationRecipients("actor", "muted", [{userId: "muted", following: false}]), []);
assert.deepEqual(notificationRecipients("actor", "actor", []), []);
assert.deepEqual(notificationRecipients("actor", "direct", []), [{userId: "direct", kind: "DIRECT_REPLY"}]);
assert.deepEqual(notificationRecipients("actor", null, []), []);
console.log("test:forum-discussions — đạt: 8 dạng câu, số câu, riêng tư, đề ghép, quyền đánh dấu và phạm vi thông báo.");
