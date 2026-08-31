"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { InboundMessage, messageCallback } from "ably";
import { useStudentRealtime } from "@/components/realtime/student-realtime-provider";
import {
  CHAT_REALTIME_EVENT,
  CHAT_REALTIME_REFRESH_DEBOUNCE_MS,
  chatRefreshInterval,
  chatUserChannel,
  isChatMessageCreatedPayload,
  rememberRealtimeMessage,
} from "@/lib/chat/realtime-rules";

/**
 * Trang Đối Thoại chỉ gắn listener vào kết nối sitewide. Nó không được tạo
 * `new Realtime()` riêng, nếu không một tab ở đúng trang này sẽ tốn hai kết
 * nối và hiện hai Presence member cho cùng học viên.
 */
export function useRealtimeChat(input: {
  currentUserId: string;
  enabled: boolean;
}): void {
  const router = useRouter();
  const realtime = useStudentRealtime();
  const seenMessageIds = useRef(new Set<string>());

  useEffect(() => {
    const client = realtime.client;
    if (!input.enabled || !client) return;

    let disposed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = client.channels.get(chatUserChannel(input.currentUserId));
    const refreshSoon = () => {
      if (disposed || refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        if (!disposed && document.visibilityState === "visible") router.refresh();
      }, CHAT_REALTIME_REFRESH_DEBOUNCE_MS);
    };
    const onMessage: messageCallback<InboundMessage> = (message) => {
      if (!isChatMessageCreatedPayload(message.data)) return;
      if (
        !rememberRealtimeMessage(
          seenMessageIds.current,
          message.data.messageId,
        )
      ) {
        return;
      }
      refreshSoon();
    };

    void channel
      .subscribe(CHAT_REALTIME_EVENT, onMessage)
      .then(refreshSoon)
      .catch(() => undefined);
    return () => {
      disposed = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      channel.unsubscribe(CHAT_REALTIME_EVENT, onMessage);
    };
  }, [input.currentUserId, input.enabled, realtime.client, router]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = window.setInterval(
      refresh,
      chatRefreshInterval(
        input.enabled && realtime.enabled,
        realtime.connected,
      ),
    );
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [input.enabled, realtime.connected, realtime.enabled, router]);
}
