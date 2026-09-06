import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { db } from "../src/lib/db.ts";
import { context } from "./fixtures/chat-dock-context.mjs";
registerHooks({ resolve(specifier, ctx, next) {
  if (specifier === "@/lib/session") return { url: new URL("./fixtures/chat-dock-context.mjs", import.meta.url).href, shortCircuit: true };
  return next(specifier, ctx);
} });
process.env.ENABLE_ABLY_REALTIME = "false";
process.env.ENABLE_ABLY_CHAT = "false";
const { GET } = await import("../src/app/api/students/chat/route.ts");
const { readDockMessageAction, sendDockMessageAction, openChatAction } = await import("../src/lib/actions/chat-dock.ts");
const { markConversationRead } = await import("../src/lib/chat/service.ts");
const viewer = { id: "viewer", name: "Viewer", role: "STUDENT", active: true, isBot: false };
const other = { ...viewer, id: "friend", name: "Friend", avatarUrl: null, uploadedAvatar: null };
const time = new Date("2026-09-06T10:00:00Z");
let paused = false;
let updates = [];
let reads = 0;
let conversation = { id: "chat", participantAId: "viewer", participantBId: "friend", participantA: viewer, participantB: other, participantAReadAt: null, participantBReadAt: null, messages: [] };
db.attempt.findFirst = async ({ where }) => { assert.equal(where.userId, "viewer"); assert.equal(where.status, "IN_PROGRESS"); assert(where.deadlineAt.gt instanceof Date); return paused ? { id: "attempt" } : null; };
db.user.findUnique = async ({ where }) => where.id === "viewer" ? viewer : other;
db.directConversation.findUnique = async () => { reads++; return conversation; };
db.directConversation.findMany = async ({ where, select, take }) => {
  reads++;
  assert.deepEqual(where.OR, [{ participantAId: "viewer" }, { participantBId: "viewer" }]);
  assert.equal(where.participantB.active, true); assert.equal(take, 50);
  assert(!select.messages.select.body, "sitewide response must not load message text");
  return [{ ...conversation, messages: [{ id: "incoming", createdAt: time }] }];
};
db.directMessage.findFirst = async ({ where }) => where.id === "incoming" && where.conversationId === "chat" && where.senderId.not === "viewer" ? { createdAt: time } : null;
db.directConversation.updateMany = async (args) => { updates.push(args); return { count: 1 }; };
db.friendship.findUnique = async () => ({ status: "ACCEPTED", userAId: "friend", userBId: "viewer", requestedById: "viewer" });
// Hạn mức tin nhắn cho người chưa kết bạn đếm bằng groupBy — xem `chat/rules.ts`.
// Luật hạn mức được kiểm riêng ở `test:chat`; ở đây chỉ cần truy vấn đúng hình dạng.
db.directMessage.groupBy = async ({ where }) => { assert.equal(where.conversationId, "chat"); return []; };
const request = (query = "") => new Request(`http://localhost/api/students/chat${query}`);

context.user = null;
assert.equal((await GET(request())).status, 401);
context.user = { ...viewer, role: "ADMIN" };
assert.equal((await GET(request())).status, 403);
context.user = viewer;
paused = true;
assert.deepEqual(await (await GET(request())).json(), { paused: true });
assert.deepEqual(await (await GET(request("?conversation=chat"))).json(), { paused: true });
assert.equal((await sendDockMessageAction("chat", "Hello")).paused, true);
assert.equal((await openChatAction("friend")).paused, true);
assert.equal((await readDockMessageAction("chat", "incoming")).paused, true);
assert.equal(reads, 0, "active exam never reads conversations");
paused = false;
assert.equal((await GET(request("?conversation=../private"))).status, 400);
const inbox = await (await GET(request())).json();
assert.equal(inbox.inbox[0].unread, true);
assert(!JSON.stringify(inbox).includes("body"));
assert.equal((await GET(request("?conversation=chat"))).status, 200);
conversation = { ...conversation, participantAId: "stranger" };
assert.equal((await GET(request("?conversation=chat"))).status, 404);
assert.equal((await markConversationRead("viewer", "chat", "incoming")).ok, false);
assert.equal(updates.length, 0);
conversation = { ...conversation, participantAId: "viewer" };
assert.equal((await readDockMessageAction("chat", "other-chat-message")).error, "Không tìm thấy tin nhắn này.");
assert.equal(updates.length, 0);
assert.equal((await readDockMessageAction("chat", "incoming")).success, true);
assert.deepEqual(updates[0].data, { participantAReadAt: time });
assert.deepEqual(updates[0].where.OR, [{ participantAReadAt: null }, { participantAReadAt: { lt: time } }], "late acknowledgements cannot move read time backwards");
assert.equal((await sendDockMessageAction("chat", {})).error, "Nội dung tin nhắn không hợp lệ.");

console.log("Chat dock service: auth, exam suspension, privacy, membership and bounded read acknowledgements passed.");
