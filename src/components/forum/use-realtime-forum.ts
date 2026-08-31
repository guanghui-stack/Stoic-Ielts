"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { InboundMessage, messageCallback } from "ably";
import { useStudentRealtime } from "@/components/realtime/student-realtime-provider";
import {
  FORUM_COMMENT_CREATED_EVENT,
  FORUM_POST_CREATED_EVENT,
  FORUM_REALTIME_FALLBACK_REFRESH_MS,
  FORUM_REALTIME_REFRESH_DEBOUNCE_MS,
  forumLevelChannel,
  rememberForumRealtimeEvent,
} from "@/lib/forum/realtime-rules";

export function useRealtimeForum(levels: number[]) {
  const router = useRouter();
  const realtime = useStudentRealtime();
  const seenEvents = useRef(new Set<string>());
  const levelKey = levels.join(",");
  const safeLevels = useMemo(
    () =>
      [...new Set(levels)]
        .filter((level) => Number.isInteger(level) && level >= 1 && level <= 9)
        .sort((a, b) => a - b),
    // Chuỗi ổn định giúp tránh gắn lại listener chỉ vì Server Component dựng
    // ra một array mới có cùng các bậc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [levelKey],
  );

  useEffect(() => {
    const client = realtime.client;
    if (!client || safeLevels.length === 0) return;
    let disposed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const subscriptions: Array<{
      channel: ReturnType<typeof client.channels.get>;
      eventName: string;
      callback: messageCallback<InboundMessage>;
    }> = [];

    const refreshSoon = () => {
      if (disposed || refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        if (!disposed && document.visibilityState === "visible") router.refresh();
      }, FORUM_REALTIME_REFRESH_DEBOUNCE_MS);
    };

    for (const level of safeLevels) {
      const channel = client.channels.get(forumLevelChannel(level));
      for (const eventName of [
        FORUM_POST_CREATED_EVENT,
        FORUM_COMMENT_CREATED_EVENT,
      ]) {
        const callback: messageCallback<InboundMessage> = (message) => {
          if (
            rememberForumRealtimeEvent(
              seenEvents.current,
              eventName,
              message.data,
            )
          ) {
            refreshSoon();
          }
        };
        subscriptions.push({ channel, eventName, callback });
        void channel.subscribe(eventName, callback).catch(() => undefined);
      }
    }

    return () => {
      disposed = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      for (const subscription of subscriptions) {
        subscription.channel.unsubscribe(
          subscription.eventName,
          subscription.callback,
        );
      }
    };
  }, [realtime.client, router, safeLevels]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = window.setInterval(
      refresh,
      FORUM_REALTIME_FALLBACK_REFRESH_MS,
    );
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
}

export function ForumRealtimeBridge({ levels }: { levels: number[] }) {
  useRealtimeForum(levels);
  return null;
}
