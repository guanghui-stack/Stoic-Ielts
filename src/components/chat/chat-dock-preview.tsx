"use client";

import { useState } from "react";
import { ChatDock, requestChatWindow, type ChatDockTransport } from "./chat-dock";
import type { ChatConversation } from "./chat-workspace";
import { INBOX_UPDATED_EVENT } from "@/lib/student/quick-access";

function previewTransport() {
  let sequence = 0;
  let paused = false;
  let failSend = false;
  let reads = 0;
  const unseen = new Set<string>();
  const messages = (name: string, id: string): ChatConversation => ({
    id, friendshipState: "FRIENDS", canSend: true,
    other: { id: `student-${id}`, name, avatarSrc: null },
    messages: [
      { id: `${id}-1`, senderId: `student-${id}`, senderName: name, body: "Chào bạn! Mình vừa làm xong bài Reading hôm nay 👋", createdAt: "2026-09-06T09:00:00.000Z" },
      { id: `${id}-2`, senderId: "preview-student", senderName: "Bạn", body: "Mình cũng vừa nộp bài. Bạn thấy phần nào khó nhất?", createdAt: "2026-09-06T09:01:00.000Z" },
      { id: `${id}-3`, senderId: `student-${id}`, senderName: name, body: "Phần True / False / Not Given. Mình muốn trao đổi cách phân biệt False và Not Given.", createdAt: "2026-09-06T09:02:00.000Z" },
    ],
  });
  const conversations = new Map([messages("Minh Anh", "minh-anh"), messages("Hoàng Nam", "hoang-nam"), messages("Khánh Linh", "khanh-linh")].map((item) => [item.id, item]));
  const changed = () => window.dispatchEvent(new Event(INBOX_UPDATED_EVENT));
  const transport: ChatDockTransport = {
    fetch: async (input) => {
      if (paused) return Response.json({ paused: true });
      const id = new URL(String(input), "http://localhost").searchParams.get("conversation");
      if (id) return Response.json({ conversation: conversations.get(id) });
      return Response.json({ inbox: [...conversations.values()].map((conversation) => ({
        id: conversation.id, other: conversation.other, unread: unseen.has(conversation.id),
        incomingMessageId: conversation.messages.findLast((message) => message.senderId !== "preview-student")?.id ?? null,
      })), paused: false });
    },
    send: async (id, body) => {
      if (failSend) return { error: "Mô phỏng mất mạng. Nội dung bạn đang soạn được giữ lại." };
      const messageId = `sent-${++sequence}`;
      conversations.get(id)?.messages.push({ id: messageId, senderId: "preview-student", senderName: "Bạn", body, createdAt: new Date().toISOString() });
      return { messageId };
    },
    read: async (id) => { reads++; unseen.delete(id); return { success: true }; },
  };
  return {
    transport,
    receive(id: string) {
      const conversation = conversations.get(id)!;
      conversation.messages.push({ id: `incoming-${++sequence}`, senderId: conversation.other.id, senderName: conversation.other.name,
        body: `Bạn có rảnh trao đổi một chút không? (Tin mới ${sequence})`, createdAt: new Date().toISOString() });
      unseen.add(id); changed();
    },
    pause(value: boolean) { paused = value; changed(); },
    fail(value: boolean) { failSend = value; },
    reads: () => reads,
  };
}

export function ChatDockPreview() {
  const [demo] = useState(previewTransport);
  const [paused, setPaused] = useState(false);
  const [fails, setFails] = useState(false);
  const [reads, setReads] = useState(0);
  const button = "min-h-11 rounded-xl border border-stoic-line bg-white px-4 py-2 text-sm font-medium hover:border-stoic-primary focus-visible:outline-2 focus-visible:outline-stoic-primary";
  return <>
    <div className="mx-auto max-w-4xl px-6 py-16 font-ui">
      <p className="text-xs font-semibold uppercase tracking-widest text-stoic-primary">Bản xem thử · Chat học viên</p>
      <h1 className="mt-4 text-3xl font-semibold text-stoic-ink">Cuộc trò chuyện luôn ở bên bạn.</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-stoic-muted">Cửa sổ chat xuất hiện ở góc màn hình khi có tin mới. Thu nhỏ để tiếp tục đọc, mở lại khi cần trả lời. Dữ liệu trên trang này là minh họa và không gửi đến học viên thật.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button className={button} onClick={() => requestChatWindow("minh-anh")}>Nhắn tin cho Minh Anh</button>
        <button className={button} onClick={() => demo.receive("minh-anh")}>Nhận tin từ Minh Anh</button>
        <button className={button} onClick={() => demo.receive("hoang-nam")}>Nhận tin từ Hoàng Nam</button>
        <button className={button} onClick={() => demo.receive("khanh-linh")}>Nhận tin từ Khánh Linh</button>
      </div>
      <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl bg-stoic-canvas-soft p-6">
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={paused} onChange={(event) => { setPaused(event.target.checked); demo.pause(event.target.checked); }} />Mô phỏng đang làm bài</label>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={fails} onChange={(event) => { setFails(event.target.checked); demo.fail(event.target.checked); }} />Mô phỏng gửi tin thất bại</label>
        <label htmlFor="preview-focus" className="text-sm">Ô ghi chú để thử tin mới không giành con trỏ</label>
        <input id="preview-focus" className="w-full rounded-lg border border-stoic-line bg-white p-3 text-sm" placeholder="Bạn có thể tiếp tục gõ ở đây…" />
        <button className={button} onClick={() => setTimeout(() => demo.receive("minh-anh"), 3000)}>Nhận tin sau 3 giây</button>
        <button className={button} onClick={() => setReads(demo.reads())}>Kiểm tra số lần đọc: {reads}</button>
      </div>
    </div>
    <ChatDock userId="preview-student" transport={demo.transport} />
  </>;
}
