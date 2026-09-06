import assert from "node:assert/strict";
import { claimChatFocus, quoteChatDraft, incomingChats, openChatWindow, showChatDock, validChatId, type DockInboxItem } from "../src/lib/chat/dock-rules.ts";

for (const path of ["/lam-bai/a", "/lam-bai/a?x=1", "/hoc-vien/thi-but/reading/a", "/hoc-vien/thi-luyen", "/xem-thu-cbt", "/quan-tri", "/thanh-toan/abc"]) {
  assert.equal(showChatDock(path), false, path);
}
for (const path of ["/", "/nghi-su-duong", "/hoc-vien/bai-lam/finished", "/hoc-vien/bai-lam/finished/doi-chieu", "/luyen-tap/reading", "/hoc-vien/tin-nhan", "/hoc-vien/dau-truong"]) {
  assert.equal(showChatDock(path), true, path);
}
assert.equal(validChatId("../private"), false);
const item: DockInboxItem = { id: "chat", other: { id: "friend", name: "Friend", avatarSrc: null }, unread: true, incomingMessageId: "m1" };
const seen = new Map<string, string>();
assert.deepEqual(incomingChats([item], seen), ["chat"]);
assert.deepEqual(incomingChats([item], seen), [], "polling and duplicate realtime do not reopen a closed chat");
assert.deepEqual(incomingChats([{ ...item, incomingMessageId: "m2", unread: false }], seen), []);
assert.deepEqual(incomingChats([{ ...item, incomingMessageId: "m3" }], seen), ["chat"]);
const minimized = [{ id: "chat", minimized: true }];
assert.deepEqual(openChatWindow(minimized, "chat"), minimized, "incoming preserves minimize");
assert.deepEqual(openChatWindow(minimized, "chat", true), [{ id: "chat", minimized: false }]);
const many = ["a", "b", "c", "d"].reduce((windows, id) => openChatWindow(windows, id, true), minimized);
assert.deepEqual(many.map((window) => window.id), ["d", "c", "b"]);
assert.deepEqual(openChatWindow(many, "new-incoming"), many, "incoming never evicts an open draft");
assert.deepEqual(openChatWindow([{ id: "typing", minimized: false }], "incoming").map((window) => window.id), ["typing", "incoming"], "incoming never displaces the active mobile window");
assert.deepEqual(openChatWindow(many, "invalid/id"), many);
const appliedFocus = new Map<string, number>();
assert.equal(claimChatFocus(appliedFocus, "chat", undefined), false, "incoming opens never request focus");
assert.equal(claimChatFocus(appliedFocus, "chat", 1), true, "manual open requests focus");
assert.equal(claimChatFocus(appliedFocus, "chat", 1), false, "reopening after close or resize cannot replay old focus");
assert.equal(claimChatFocus(appliedFocus, "chat", 2), true, "manual open after exam pause can focus again");
assert.equal(claimChatFocus(appliedFocus, "chat", 1), false, "stale request is never replayed");
assert.deepEqual(quoteChatDraft("First line\nSecond line", "Existing draft"), { value: "> First line\n> Second line\n\nExisting draft" });
const longDraft = "x".repeat(1990);
assert("error" in quoteChatDraft("A long quotation", longDraft), "quote refuses instead of silently truncating a long draft");
assert.equal(longDraft.length, 1990);
console.log("Chat dock: route boundaries, incoming deduplication and window controls passed.");
