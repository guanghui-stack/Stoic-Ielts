"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { InboundMessage } from "ably";
import { useStudentRealtime } from "@/components/realtime/student-realtime-provider";
import { CHAT_REALTIME_EVENT, chatUserChannel, isChatMessageCreatedPayload } from "@/lib/chat/realtime-rules";
import { ARENA_INVITE_EVENT, isArenaInviteCreatedPayload } from "@/lib/arena/realtime-rules";
import { INBOX_UPDATED_EVENT } from "@/lib/student/quick-access";

export type ShortcutSignals = {
  /** Có tin nhắn chưa đọc. */
  hasUnread: boolean;
  /** Có chiến thư đấu trường đang chờ trả lời. */
  hasArenaInvite: boolean;
};

const NO_SIGNALS: ShortcutSignals = { hasUnread: false, hasArenaInvite: false };

/**
 * Hai chấm báo trên thanh lối tắt, lấy từ CÙNG một lần gọi.
 *
 * Chiến thư chỉ sống 90 giây nên nhịp hỏi định kỳ một mình là không đủ: kênh
 * riêng của học viên (đã mở sẵn cho chat) mang thêm sự kiện chiến thư, và nhận
 * được là hỏi lại ngay. Nhịp định kỳ vẫn giữ để website còn chạy đúng khi chưa
 * bật Ably, chỉ là chậm hơn.
 */
export function useShortcutSignals(userId: string, enabled: boolean): ShortcutSignals {
  const [signals, setSignals] = useState<ShortcutSignals>(NO_SIGNALS);
  const { client, connected } = useStudentRealtime();
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending = false;
    let stopped = false;

    const refresh = async () => {
      if (disposed || stopped || document.visibilityState !== "visible") return;
      if (controller) {
        pending = true;
        return;
      }
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 8_000);
      try {
        const response = await fetch("/api/students/shortcuts", { cache: "no-store", signal: controller.signal });
        if (response.status === 401 || response.status === 403) {
          stopped = true;
          if (!disposed) setSignals(NO_SIGNALS);
          return;
        }
        if (!response.ok) return;
        const result = await response.json();
        if (disposed) return;
        setSignals((current) => ({
          hasUnread: typeof result.hasUnread === "boolean" ? result.hasUnread : current.hasUnread,
          hasArenaInvite:
            typeof result.hasArenaInvite === "boolean" ? result.hasArenaInvite : current.hasArenaInvite,
        }));
      } catch {
        // Mất mạng không làm mất lối tắt; giữ tín hiệu cuối đã xác nhận.
      } finally {
        clearTimeout(timeout);
        controller = null;
        if (pending && !disposed) {
          pending = false;
          schedule();
        }
      }
    };
    const schedule = () => {
      if (disposed || timer) return;
      timer = setTimeout(() => {
        timer = null;
        void refresh();
      }, 200);
    };

    // Dùng kết nối Ably sitewide; không mở kết nối hay theo dõi presence mới.
    const channel = client?.channels.get(chatUserChannel(userId));
    const onMessage = (message: InboundMessage) => {
      if (isChatMessageCreatedPayload(message.data)) schedule();
    };
    const onInvite = (message: InboundMessage) => {
      if (isArenaInviteCreatedPayload(message.data)) schedule();
    };
    if (channel) {
      void channel.subscribe(CHAT_REALTIME_EVENT, onMessage).then(schedule).catch(() => undefined);
      void channel.subscribe(ARENA_INVITE_EVENT, onInvite).catch(() => undefined);
    }
    schedule();
    const interval = setInterval(schedule, connected ? 120_000 : 60_000);
    window.addEventListener("focus", schedule);
    window.addEventListener(INBOX_UPDATED_EVENT, schedule);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      disposed = true;
      controller?.abort();
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      channel?.unsubscribe(CHAT_REALTIME_EVENT, onMessage);
      channel?.unsubscribe(ARENA_INVITE_EVENT, onInvite);
      window.removeEventListener("focus", schedule);
      window.removeEventListener(INBOX_UPDATED_EVENT, schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [client, connected, enabled, pathname, userId]);

  return signals;
}
