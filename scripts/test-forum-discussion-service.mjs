import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { db } from "../src/lib/db.ts";
import { context, Redirect } from "./fixtures/forum-action-context.mjs";

// Chạy action thật, chỉ thay phiên đăng nhập và navigation của Next trong test.
registerHooks({resolve(specifier, ctx, next) {
  if (["@/lib/session", "next/cache", "next/navigation"].includes(specifier)) return {url: new URL("./fixtures/forum-action-context.mjs", import.meta.url).href, shortCircuit: true};
  return next(specifier, ctx);
}});
process.env.ENABLE_ABLY_REALTIME = "false";
process.env.ENABLE_ABLY_CHAT = "false";
const {getQuestionDraft, questionReferenceForPost, getAttemptDiscussionLinks} = await import("../src/lib/forum/question-context.ts");
const {setHelpfulReply, setThreadFollow, listForumNotifications, markForumNotificationRead, enqueueForumReplyNotifications} = await import("../src/lib/forum/engagement.ts");
const {createQuestionPostAction} = await import("../src/lib/actions/forum-question.ts");
const {createComment, deleteOwnComment} = await import("../src/lib/forum/service.ts");
const {toggleCommentVisibilityAction} = await import("../src/lib/actions/admin-forum.ts");

const content = {passage: {title: "Source passage", paragraphs: ["Đoạn nguồn"]}, questionGroups: [{type: "TFNG", instruction: "Read", questions: [{id: "q1", prompt: "NỘI DUNG CÂU HỎI", answer: "SECRET_ANSWER", learning: {explanation: "SECRET_FEYNMAN"}}]}]};
let exercise = {id: "exercise", title: "Reading Practice 1 — Source passage", skill: "READING", readingType: "ACADEMIC", accessLevel: "RESTRICTED", published: true, competitionOnly: false, arenaOnly: false, content: JSON.stringify(content)};
let attempt = {id: "attempt", userId: "owner", status: "GRADED", submittedAt: new Date(), assemblyId: null, exercise, competitionAttempt: null};
let account = {id: "owner", active: true, role: "STUDENT", forumBannedAt: null};
let level = 1;
let grants = [];
let referenceRow;
let post = {id: "post", authorId: "owner", status: "VISIBLE", lockedAt: null, channel: {key: "bach-than", level: 1, locked: false}};
let comment = {id: "comment", postId: "post", authorId: "helper", status: "VISIBLE"};
let live = false;
let savedPost;
let saves = 0;
let helpful = null;
let follow = null;
let notificationUpdates = [];
let links = [];
const viewer = {id: "owner", level: 1, banned: false, isAdmin: false};

db.user.findUnique = async () => account;
db.userRank.findUnique = async () => ({currentLevel: level});
db.attempt.findFirst = async ({where, select}) => {
  assert(!select.answers && !select.scoreRaw && !select.feynmanReviews);
  return where.userId === attempt.userId && where.id === attempt.id ? attempt : null;
};
db.accessGrant.findMany = async ({where}) => {assert.equal(where.feature, "READING"); return grants;};
db.readingAssemblyItem.findMany = async () => [{exercise}, {exercise: {...exercise, id: "exercise-2"}}];
db.forumQuestionReference.findFirst = async ({where}) => {
  assert.equal(where.post.status, "VISIBLE");
  if (post.status !== "VISIBLE" || post.channel.level > (where.post.channel?.level.lte ?? 99)) return null;
  return referenceRow;
};
db.forumQuestionReference.findMany = async ({where}) => {assert.equal(where.post.authorId, "owner"); assert.equal(where.post.status, "VISIBLE"); return links;};
db.competition.findFirst = async () => live ? {id: "live"} : null;
db.forumChannel.findMany = async () => [{id: "channel", key: "bach-than", level: 1, name: "Cộng đồng", locked: false, _count: {posts: 0}}];
db.forumPost.count = async () => 0;
db.forumPost.create = async ({data}) => {saves++; savedPost = data; return {id: "created-post"};};
db.forumPost.findFirst = async ({where}) => post.status === "VISIBLE" && post.channel.level <= (where.channel?.level.lte ?? 99) ? post : null;
db.forumComment.findUnique = async () => comment;
db.$queryRaw = async () => [];
db.$transaction = async (fn) => fn(db);
db.forumHelpfulReply.upsert = async ({create}) => {helpful = create;};
db.forumHelpfulReply.deleteMany = async () => {helpful = null;};
db.forumThreadFollow.upsert = async ({create}) => {follow = create;};
db.forumNotification.updateMany = async (args) => {notificationUpdates.push(args); return {count: 1};};

const user = {id: "owner", role: "STUDENT"};
let draft = await getQuestionDraft(user, "attempt", "q1");
assert(draft.ok);
assert.equal(draft.value.view.state, "locked");
assert(!JSON.stringify(draft).includes("NỘI DUNG CÂU HỎI"));
assert(!JSON.stringify(draft).includes("SECRET_"));
assert(!("attemptId" in draft.value.reference));
assert.equal((await getQuestionDraft({id: "intruder", role: "ADMIN"}, "attempt", "q1")).ok, false);
assert.equal((await getQuestionDraft(user, "attempt", "forged-q")).ok, false);
attempt.status = "IN_PROGRESS";
assert.equal((await getQuestionDraft(user, "attempt", "q1")).ok, false);
attempt.status = "GRADED";
attempt.competitionAttempt = {id: "competition"};
assert.equal((await getQuestionDraft(user, "attempt", "q1")).ok, false);
attempt.competitionAttempt = null;
exercise.arenaOnly = true;
assert.equal((await getQuestionDraft(user, "attempt", "q1")).ok, false);
exercise.arenaOnly = false;
attempt.assemblyId = "assembly";
draft = await getQuestionDraft(user, "attempt", "p2:q1");
assert(draft.ok);
assert.equal(draft.value.reference.exerciseId, "exercise-2");
assert.equal(draft.value.reference.questionId, "q1");
assert.equal(draft.value.attemptQuestionNumber, "2");
assert.equal(draft.value.reference.questionNumber, "1");
attempt.assemblyId = null;
draft = await getQuestionDraft(user, "attempt", "q1");
referenceRow = {...draft.value.reference, exercise};

const readingGrant = {feature: "READING", scope: "EXERCISE", exerciseId: "exercise", attemptId: null, status: "ACTIVE", startsAt: new Date(0), expiresAt: null};
for (const entry of [{...readingGrant, feature: "FEYNMAN"}, {...readingGrant, expiresAt: new Date(1)}, {...readingGrant, exerciseId: "other"}, {...readingGrant, status: "REVOKED"}]) {
  grants = [entry];
  assert.equal((await questionReferenceForPost(user, "post")).state, "locked");
}
grants = [readingGrant];
assert.equal((await questionReferenceForPost(user, "post")).state, "available");
assert(!JSON.stringify(await questionReferenceForPost(user, "post")).includes("SECRET_"));
exercise.content = JSON.stringify({...content, passage: {...content.passage, paragraphs: ["Đã thay đổi"]}});
assert.equal((await questionReferenceForPost(user, "post")).state, "missing");
exercise.content = JSON.stringify(content);
post.channel.level = 2;
assert.equal(await questionReferenceForPost(user, "post"), null);
post.channel.level = 1;
post.status = "HIDDEN";
assert.equal(await questionReferenceForPost(user, "post"), null);
post.status = "VISIBLE";
account.active = false;
assert.equal(await questionReferenceForPost(user, "post"), null);
assert((await setThreadFollow(viewer, "post", true)).error);
account.active = true;

links = [{exerciseId: "exercise", questionId: "q1", sourceHash: draft.value.reference.sourceHash, post: {id: "previous", title: "Câu hỏi trước", channel: {key: "bach-than"}}}];
const resultLinks = await getAttemptDiscussionLinks(user, attempt);
assert(resultLinks.q1.askHref.includes("luot=attempt&cau=q1"));
assert.equal(resultLinks.q1.threads[0].href, "/nghi-su-duong/bach-than/previous");
links[0].sourceHash = "stale";
assert.equal((await getAttemptDiscussionLinks(user, attempt)).q1.threads.length, 0);
assert.deepEqual(await getAttemptDiscussionLinks({id: "other", role: "ADMIN"}, attempt), {});

const form = new FormData();
for (const [key, value] of Object.entries({attemptId: "attempt", questionId: "q1", sourceHash: draft.value.reference.sourceHash, channelKey: "bach-than", title: "Tôi chưa rõ cách đọc câu một", body: "Mình chưa phân biệt được ý của câu hỏi này.", reasoning: "Mình đã thử đối chiếu từ khóa.", exerciseId: "forged", passageTitle: "forged", quote: "SECRET_FEYNMAN"})) form.set(key, value);
await assert.rejects(createQuestionPostAction(undefined, form), (error) => error instanceof Redirect && error.path === "/nghi-su-duong/bach-than/created-post");
assert.equal(saves, 1);
assert.equal(savedPost.questionReference.create.exerciseId, "exercise");
assert(!JSON.stringify(savedPost).includes("SECRET_"));
assert(!JSON.stringify(savedPost).includes('"attemptId"'));
assert.equal(savedPost.follows.create.following, true);
assert(context.paths.includes("/hoc-vien/bai-lam/attempt"));
form.set("sourceHash", "outdated");
assert((await createQuestionPostAction(undefined, form)).error.includes("thay đổi"));
assert.equal(saves, 1);
form.set("sourceHash", draft.value.reference.sourceHash);
context.user = {id: "intruder", role: "STUDENT"};
assert((await createQuestionPostAction(undefined, form)).error);
assert.equal(saves, 1);
context.user = user;

assert((await setHelpfulReply(viewer, "post", "comment")).success);
assert.deepEqual(helpful, {postId: "post", commentId: "comment"});
assert((await setHelpfulReply(viewer, "post", "")).success);
assert.equal(helpful, null);
for (const alteration of [{authorId: "owner"}, {postId: "other"}, {status: "HIDDEN"}, {status: "DELETED"}]) {
  const original = comment;
  comment = {...comment, ...alteration};
  assert((await setHelpfulReply(viewer, "post", "comment")).error);
  comment = original;
}
post.authorId = "other";
account.role = "ADMIN";
assert((await setHelpfulReply({...viewer, isAdmin: true}, "post", "comment")).error, "Admin không đánh dấu thay người hỏi");
account.role = "STUDENT";
post.authorId = "owner";
for (const alteration of [{lockedAt: new Date()}, {status: "HIDDEN"}, {channel: {...post.channel, level: 3}}, {channel: {...post.channel, locked: true}}]) {
  const original = post;
  post = {...post, ...alteration};
  assert((await setHelpfulReply(viewer, "post", "comment")).error);
  post = original;
}
live = true;
assert((await setHelpfulReply(viewer, "post", "comment")).error);
live = false;
account.forumBannedAt = new Date();
assert((await setHelpfulReply(viewer, "post", "comment")).error);
assert((await setThreadFollow(viewer, "post", false)).success, "Vẫn tắt thông báo được khi bị hạn chế viết");
assert.equal(follow.following, false);
account.forumBannedAt = null;
post.channel.level = 3;
assert((await setThreadFollow(viewer, "post", true)).error);
post.channel.level = 1;

db.forumNotification.findMany = async ({where, select}) => {
  assert.equal(where.userId, "owner");
  assert.equal(where.comment.status, "VISIBLE");
  assert.equal(where.post.status, "VISIBLE");
  assert.equal(where.post.channel.level.lte, 1);
  assert.deepEqual(where.post.follows.none, {userId: "owner", following: false});
  assert(!select.comment && !select.post.select.body);
  return [];
};
assert.deepEqual(await listForumNotifications(viewer), []);
notificationUpdates = [];
await markForumNotificationRead(viewer, "notice", "old-comment");
assert.equal(notificationUpdates[0].where.commentId, "old-comment", "Không nuốt thông báo mới");
assert.equal(notificationUpdates[0].where.userId, "owner");

let queued = [];
const tx = {
  forumThreadFollow: {findMany: async () => [{userId: "actor", following: true}, {userId: "helper", following: true}, {userId: "muted", following: false}, {userId: "inactive", following: true}]},
  forumComment: {findFirst: async () => ({authorId: "helper"})},
  user: {findMany: async ({where}) => {assert(where.active); assert(where.OR.some((item) => item.rankProfile?.currentLevel.gte === 2)); return [{id: "helper"}];}},
  forumNotification: {createMany: async ({data}) => {queued = data;}, updateMany: async () => ({count: 1})},
};
await enqueueForumReplyNotifications(tx, {postId: "post", commentId: "new", actorId: "actor", parentId: "parent", level: 2});
assert.equal(queued.length, 1);
assert.equal(queued[0].kind, "DIRECT_REPLY");
assert.equal(queued[0].userId, "helper");
assert.deepEqual(Object.keys(queued[0]).sort(), ["commentId", "kind", "postId", "updatedAt", "userId"]);

// Mô phỏng trạng thái bị tab khác đổi ngay trước transaction. Chạy service
// thật để bắt việc chỉ kiểm quyền ở trước lúc ghi, không chỉ kiểm hàm thuần.
let lockedPost = false;
let beforeTransaction = () => {};
let createdComments = 0;
let removedHelpful = 0;
let postCountChanges = 0;
db.$transaction = async (fn) => {
  lockedPost = false;
  beforeTransaction();
  return fn(db);
};
db.$queryRaw = async (strings) => {
  if (strings.join("").includes("ForumPost")) lockedPost = true;
  else assert(lockedPost, "Khóa bài trước khi khóa phản hồi");
  return [];
};
db.forumPost.findUnique = async () => structuredClone(post);
db.forumPost.update = async () => {assert(lockedPost); postCountChanges++;};
db.forumComment.count = async () => 0;
db.forumComment.create = async () => {assert(lockedPost); createdComments++; return {id: "created-comment"};};
db.forumThreadFollow.findMany = async () => [];
db.forumComment.findFirst = async () => null;
db.forumComment.updateMany = async ({where, data}) => {
  assert(lockedPost, "Gỡ/ẩn phải giữ khóa bài để không đụng đánh dấu hữu ích");
  if (comment.status !== where.status) return {count: 0};
  comment.status = data.status;
  return {count: 1};
};
db.forumHelpfulReply.deleteMany = async () => {assert(lockedPost); removedHelpful++; helpful = null;};
const replyInput = {viewer, postId: "post", parentId: null, body: "Một phản hồi hợp lệ"};
beforeTransaction = () => {post.status = "HIDDEN";};
assert.equal((await createComment(replyInput)).ok, false);
assert.equal(createdComments, 0);
post.status = "VISIBLE";
beforeTransaction = () => {post.lockedAt = new Date();};
assert.equal((await createComment(replyInput)).ok, false);
assert.equal(createdComments, 0);
post.lockedAt = null;
beforeTransaction = () => {comment.status = "DELETED";};
assert.equal((await createComment({...replyInput, parentId: "comment"})).ok, false);
assert.equal(createdComments, 0);
comment.status = "VISIBLE";
beforeTransaction = () => {};
assert.equal((await createComment(replyInput)).ok, true);
assert.equal(createdComments, 1);
assert.equal(postCountChanges, 1);

comment = {...comment, createdAt: new Date(), post: {channel: {key: "bach-than"}}};
helpful = {postId: "post", commentId: "comment"};
assert.equal((await deleteOwnComment({viewer: {...viewer, id: "helper"}, commentId: "comment"})).ok, true);
assert.equal(comment.status, "DELETED");
assert.equal(helpful, null);
assert.equal(removedHelpful, 1);
assert.equal(postCountChanges, 2);
// Lần gỡ lặp lại không trừ số lượng; người lạ không được tra mã bài đã gỡ.
assert.equal((await deleteOwnComment({viewer: {...viewer, id: "helper"}, commentId: "comment"})).ok, true);
assert.equal(postCountChanges, 2);
assert.equal((await deleteOwnComment({viewer, commentId: "comment"})).ok, false);
comment.status = "VISIBLE";
helpful = {postId: "post", commentId: "comment"};
context.user = {id: "admin", role: "ADMIN"};
await toggleCommentVisibilityAction("comment");
assert.equal(comment.status, "HIDDEN");
assert.equal(helpful, null);
assert.equal(removedHelpful, 2);
await toggleCommentVisibilityAction("comment");
assert.equal(comment.status, "VISIBLE");
assert.equal(helpful, null, "Hiện lại không tự xác nhận phản hồi hữu ích");
comment.status = "DELETED";
await toggleCommentVisibilityAction("comment");
assert.equal(comment.status, "DELETED", "Không hồi sinh lời tác giả đã gỡ");
context.user = user;
await db.$disconnect();
console.log("test:forum-discussion-service — đạt: action đăng/trả lời/gỡ/ẩn, quyền đọc/viết, trích dẫn, liên kết hai chiều và thông báo; database được giả lập.");
