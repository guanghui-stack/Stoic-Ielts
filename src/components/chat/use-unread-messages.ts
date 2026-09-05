"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { InboundMessage } from "ably";
import { useStudentRealtime } from "@/components/realtime/student-realtime-provider";
import { CHAT_REALTIME_EVENT, chatUserChannel, isChatMessageCreatedPayload } from "@/lib/chat/realtime-rules";
import { INBOX_UPDATED_EVENT } from "@/lib/student/quick-access";

export function useUnreadMessages(userId: string, enabled: boolean): boolean {
  const [hasUnread, setHasUnread] = useState(false);
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
          if (!disposed) setHasUnread(false);
          return;
        }
        if (!response.ok) return;
        const result = await response.json();
        if (!disposed && typeof result.hasUnread === "boolean") setHasUnread(result.hasUnread);
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
    if (channel) {
      void channel.subscribe(CHAT_REALTIME_EVENT, onMessage).then(schedule).catch(() => undefined);
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
      window.removeEventListener("focus", schedule);
      window.removeEventListener(INBOX_UPDATED_EVENT, schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [client, connected, enabled, pathname, userId]);

  return hasUnread;
}
