import { showStudentQuickAccess } from "../student/quick-access.ts";
import { MESSAGE_MAX } from "./rules.ts";

export const OPEN_CHAT_EVENT = "stoic:open-chat";
export const CHAT_DOCK_LIMIT = 3;
export const validChatId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,191}$/.test(value);

export const showChatDock = showStudentQuickAccess;

export type DockInboxItem = {
  id: string;
  other: { id: string; name: string; avatarSrc: string | null };
  incomingMessageId: string | null;
  unread: boolean;
};
export type DockWindow = { id: string; minimized: boolean };

/** Yêu cầu focus chỉ dùng một lần, kể cả khi cửa sổ bị gỡ rồi tự mở lại. */
export function claimChatFocus(applied: Map<string, number>, id: string, request: number | undefined): boolean {
  if (!request || (applied.get(id) ?? 0) >= request) return false;
  applied.set(id, request);
  return true;
}

/** Không được cắt bản nháp của học viên chỉ để chèn thêm trích dẫn. */
export function quoteChatDraft(body: string, draft: string): { value: string } | { error: string } {
  const value = `> ${body.slice(0, 300).replace(/\n/g, "\n> ")}\n\n${draft}`;
  return value.length <= MESSAGE_MAX
    ? { value }
    : { error: "Bản nháp gần đầy. Hãy rút gọn nội dung trước khi thêm trích dẫn." };
}

/** A dismissed/minimized message must not reopen on every polling response. */
export function incomingChats(items: DockInboxItem[], seen: Map<string, string>): string[] {
  const incoming: string[] = [];
  for (const item of items) {
    if (!item.incomingMessageId) continue;
    if (item.unread && seen.get(item.id) !== item.incomingMessageId) incoming.push(item.id);
    seen.set(item.id, item.incomingMessageId);
  }
  while (seen.size > 200) seen.delete(seen.keys().next().value!);
  return incoming;
}

export function openChatWindow(windows: DockWindow[], id: string, explicit = false): DockWindow[] {
  if (!validChatId(id)) return windows;
  const existing = windows.find((item) => item.id === id);
  // Incoming replies keep a deliberately minimized window minimized.
  if (existing && !explicit) return windows;
  if (!explicit) return windows.length >= CHAT_DOCK_LIMIT ? windows : [...windows, { id, minimized: false }];
  const next = [{ id, minimized: false }, ...windows.filter((item) => item.id !== id)];
  return next.slice(0, CHAT_DOCK_LIMIT);
}
