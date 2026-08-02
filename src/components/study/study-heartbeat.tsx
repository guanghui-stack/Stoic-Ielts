"use client";

import { useEffect, useRef } from "react";

/**
 * Gửi nhịp báo "đang học thật" về máy chủ.
 *
 * Chỉ gửi khi tab ĐANG HIỂN THỊ và có tương tác trong 90 giây gần nhất. Để tab
 * chạy nền hoặc mở rồi đi làm việc khác thì không được tính — nếu tính, danh
 * hiệu kỷ luật sẽ đo được ai quên tắt trình duyệt chứ không đo ai chăm học.
 *
 * Không hiển thị gì cả. Việc đếm giờ nên vô hình với người học.
 */

const PING_MS = 60_000;
const IDLE_MS = 90_000;

export function StudyHeartbeat({
  kind,
}: {
  kind: "READING" | "FEYNMAN" | "DASHBOARD";
}) {
  // Mỗi lần mở tab là một phiên riêng — máy chủ dựa vào đây để chỉ cho một tab
  // được cộng giờ. Sinh mã và đọc đồng hồ đều nằm TRONG effect: hàm dựng giao
  // diện phải cho cùng kết quả với cùng đầu vào, không được đọc thứ luôn đổi.
  const sessionIdRef = useRef<string | null>(null);
  const lastInteraction = useRef(0);

  useEffect(() => {
    if (sessionIdRef.current === null) {
      sessionIdRef.current = crypto.randomUUID();
    }
    const sessionId = sessionIdRef.current;
    lastInteraction.current = Date.now();

    const touch = () => {
      lastInteraction.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    for (const name of events) {
      window.addEventListener(name, touch, { passive: true });
    }

    const send = async () => {
      const active =
        document.visibilityState === "visible" &&
        Date.now() - lastInteraction.current <= IDLE_MS;
      if (!active) return;
      try {
        await fetch("/api/study/heartbeat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, kind }),
          keepalive: true,
        });
      } catch {
        /* mất mạng thoáng qua — nhịp sau tính bù, tối đa 60 giây */
      }
    };

    const timer = window.setInterval(send, PING_MS);
    // Nhịp đầu tiên chỉ để nhận chỗ, chưa cộng giờ
    void send();

    return () => {
      window.clearInterval(timer);
      for (const name of events) window.removeEventListener(name, touch);
    };
  }, [kind]);

  return null;
}
