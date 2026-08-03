"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Theo dõi hành vi trong phòng thi và báo về máy chủ.
 *
 * PHẠM VI CỦA LỚP NÀY: nó chỉ CHẶN và BÁO CÁO. Nó không quyết định gì — số
 * strike, cảnh báo và lệnh nộp bài đều do máy chủ trả về. Người thi hoàn toàn
 * có thể tắt JavaScript hoặc sửa mã trong công cụ nhà phát triển; khi đó lớp
 * này im lặng, nhưng máy chủ vẫn giữ đồng hồ và vẫn chốt bài đúng giờ.
 *
 * Lớp chặn thật là Safe Exam Browser ở tầng hệ điều hành: khóa chuyển ứng dụng,
 * chặn Print Screen, cấm mở trình duyệt khác. Lớp JavaScript này chỉ bổ sung
 * phần SEB không thấy được — ví dụ thao tác copy ngay bên trong trang.
 *
 * KHÔNG dùng `user-select: none` cho passage: học viên vẫn phải bôi chọn được
 * để tô màu và ghi chú, đó là công cụ làm bài thật sự. Chặn ở tầng sự kiện thay
 * vì tước bỏ khả năng chọn văn bản.
 */

export type IntegrityClientEvent = {
  type: string;
  occurredAt: string;
  durationMs?: number;
  details?: Record<string, unknown>;
};

/** Các phím tắt bị cấm trong phòng thi. */
function isProhibitedShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  const mod = event.ctrlKey || event.metaKey;

  // Sao chép, cắt, in, lưu, xem mã nguồn
  if (mod && ["c", "x", "p", "s", "u"].includes(key)) return true;
  // Công cụ nhà phát triển
  if (key === "f12") return true;
  if (mod && event.shiftKey && ["i", "j", "c"].includes(key)) return true;
  // Chụp màn hình trên macOS — SEB chặn ở tầng hệ điều hành, đây chỉ là ghi nhận
  if (mod && event.shiftKey && ["3", "4", "5"].includes(key)) return true;

  return false;
}

export function useIntegrityMonitor(
  report: (event: IntegrityClientEvent) => void,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;

  // Giữ hàm báo cáo trong ref để việc nó đổi định danh giữa các lần render
  // không gỡ ra gắn lại toàn bộ trình nghe — làm vậy sẽ để lọt sự kiện đúng
  // vào khoảnh khắc gỡ/gắn.
  const reportRef = useRef(report);
  useEffect(() => {
    reportRef.current = report;
  }, [report]);

  const emit = useCallback((event: Omit<IntegrityClientEvent, "occurredAt">) => {
    // `new Date()` nằm trong callback chứ không phải thân component: đọc đồng hồ
    // lúc render là hành vi không thuần và bị quy tắc lint chặn.
    reportRef.current({ ...event, occurredAt: new Date().toISOString() });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const hiddenAt = { current: null as number | null };

    const block = (type: string) => (event: Event) => {
      event.preventDefault();
      emit({ type });
    };
    const onCopy = block("COPY_ATTEMPT");
    const onCut = block("CUT_ATTEMPT");
    const onContextMenu = block("CONTEXT_MENU");

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isProhibitedShortcut(event)) return;
      event.preventDefault();
      emit({ type: "PROHIBITED_SHORTCUT", details: { key: event.key } });
    };

    // Rời khỏi màn hình thi: đo THỜI LƯỢNG chứ không chỉ đếm số lần. Liếc sang
    // cửa sổ khác nửa giây khác hẳn với rời đi ba phút, và chính sách phạt theo
    // tổng thời gian rời đi.
    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt.current = performance.now();
        return;
      }
      if (hiddenAt.current === null) return;
      emit({
        type: "VISIBILITY_LOSS",
        durationMs: Math.round(performance.now() - hiddenAt.current),
      });
      hiddenAt.current = null;
    };

    const onBlur = () => {
      if (hiddenAt.current === null) hiddenAt.current = performance.now();
    };
    const onFocus = () => {
      if (hiddenAt.current === null) return;
      emit({
        type: "WINDOW_BLUR",
        durationMs: Math.round(performance.now() - hiddenAt.current),
      });
      hiddenAt.current = null;
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) emit({ type: "FULLSCREEN_EXIT" });
    };

    const onOffline = () => emit({ type: "NETWORK_OFFLINE" });
    const onOnline = () => emit({ type: "NETWORK_ONLINE" });

    // Dùng capture để bắt trước mọi trình nghe khác trong trang.
    document.addEventListener("copy", onCopy, true);
    document.addEventListener("cut", onCut, true);
    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("visibilitychange", onVisibilityChange, true);
    document.addEventListener("fullscreenchange", onFullscreenChange, true);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("cut", onCut, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("visibilitychange", onVisibilityChange, true);
      document.removeEventListener("fullscreenchange", onFullscreenChange, true);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled, emit]);
}
