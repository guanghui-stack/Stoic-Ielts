"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ShieldAlert, WifiOff } from "lucide-react";
import { useIntegrityMonitor, type IntegrityClientEvent } from "./use-integrity-monitor";
import { ExamWatermark } from "./exam-watermark";

/**
 * Vỏ bọc phòng thi Nguyệt Thí.
 *
 * Ba việc: theo dõi hành vi, giữ nhịp tim với máy chủ, và thi hành lệnh máy chủ
 * trả về. Nó KHÔNG tự quyết định gì — mọi con số hiển thị đều do máy chủ gửi.
 *
 * Chỉ bọc quanh bài thi Nguyệt Thí. Bài luyện tập thường không đi qua đây, nên
 * trải nghiệm luyện tập hằng ngày không đổi.
 */

const HEARTBEAT_MS = 5_000;
/** Gom sự kiện rồi gửi theo lô, để một cơn Alt+Tab liên tục không tạo bão yêu cầu. */
const FLUSH_MS = 2_000;

type ServerCommand = "NONE" | "WARN" | "FORCE_SUBMIT";

export function CompetitionIntegrityGuard({
  sessionToken,
  candidateCode,
  sessionSuffix,
  initialStrikes,
  maxStrikes,
  children,
}: {
  sessionToken: string;
  candidateCode: string;
  sessionSuffix: string;
  initialStrikes: number;
  maxStrikes: number;
  children: React.ReactNode;
}) {
  const [strikes, setStrikes] = useState(initialStrikes);
  const [warning, setWarning] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const queue = useRef<IntegrityClientEvent[]>([]);
  const sequence = useRef(0);
  const submitted = useRef(false);

  const authHeaders = useCallback(
    () => ({
      "content-type": "application/json",
      authorization: `Bearer ${sessionToken}`,
    }),
    [sessionToken]
  );

  /**
   * Máy chủ ra lệnh nộp bài.
   *
   * Chỉ tải lại trang: việc chấm bài đã do máy chủ làm xong trước khi trả lệnh
   * này về. Client không được phép tự chấm hay tự quyết kết quả.
   */
  const obeyForceSubmit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    window.location.reload();
  }, []);

  const applyCommand = useCallback(
    (command: ServerCommand, strikeCount: number) => {
      setStrikes(strikeCount);
      if (command === "FORCE_SUBMIT") {
        obeyForceSubmit();
        return;
      }
      if (command === "WARN") {
        setWarning(
          `Hệ thống ghi nhận ${strikeCount}/${maxStrikes} lần rời khỏi màn hình thi hoặc thao tác bị cấm. Đủ ${maxStrikes} lần, bài sẽ được nộp tự động và chuyển sang rà soát.`
        );
      }
    },
    [maxStrikes, obeyForceSubmit]
  );

  /** Đẩy hàng đợi sự kiện lên máy chủ. */
  const flush = useCallback(async () => {
    if (queue.current.length === 0 || submitted.current) return;
    const batch = queue.current;
    queue.current = [];
    sequence.current += 1;

    try {
      const response = await fetch("/api/competition/session/events", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ sequence: sequence.current, events: batch }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { command: ServerCommand; strikeCount: number };
      applyCommand(data.command, data.strikeCount);
    } catch {
      // Mất mạng: trả sự kiện về đầu hàng đợi để gửi lại khi có mạng. Khóa chống
      // trùng ở máy chủ bảo đảm gửi lại không bị đếm hai lần.
      queue.current = [...batch, ...queue.current];
    }
  }, [authHeaders, applyCommand]);

  const report = useCallback((event: IntegrityClientEvent) => {
    queue.current.push(event);
    if (event.type === "NETWORK_OFFLINE") setOffline(true);
    if (event.type === "NETWORK_ONLINE") setOffline(false);
  }, []);

  useIntegrityMonitor(report);

  // Đẩy hàng đợi theo chu kỳ
  useEffect(() => {
    const id = setInterval(() => {
      void flush();
    }, FLUSH_MS);
    return () => clearInterval(id);
  }, [flush]);

  // Nhịp tim
  useEffect(() => {
    let stopped = false;

    const beat = async () => {
      if (stopped || submitted.current) return;
      try {
        const response = await fetch("/api/competition/session/heartbeat", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({}),
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          command: ServerCommand;
          strikeCount: number;
        };
        setOffline(false);
        applyCommand(data.command, data.strikeCount);
      } catch {
        // Không thấy máy chủ: chỉ báo cho thí sinh biết. Đồng hồ vẫn chạy ở máy
        // chủ, và bài vẫn được chốt đúng giờ dù máy này có mạng lại hay không.
        setOffline(true);
      }
    };

    void beat();
    const id = setInterval(() => void beat(), HEARTBEAT_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [authHeaders, applyCommand]);

  return (
    <>
      <ExamWatermark candidateCode={candidateCode} sessionSuffix={sessionSuffix} />

      {offline && (
        <div className="fixed inset-x-0 top-0 z-[95] bg-navy-deep px-4 py-2 text-center font-ui text-sm text-paper">
          <span className="inline-flex items-center gap-2">
            <WifiOff className="h-4 w-4" aria-hidden="true" />
            Mất kết nối. Đồng hồ vẫn chạy — bạn có 15 phút để vào lại trên đúng máy này.
          </span>
        </div>
      )}

      {warning && !submitting && (
        <div
          role="alert"
          className="fixed inset-x-0 bottom-0 z-[95] border-t-4 border-gold bg-paper px-6 py-4 shadow-lift"
        >
          <div className="mx-auto flex max-w-3xl items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-ui text-sm leading-relaxed text-ink">{warning}</p>
              <p className="mt-1 font-ui text-xs text-muted">
                Cảnh báo {strikes}/{maxStrikes}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWarning(null)}
              className="shrink-0 cursor-pointer border border-line px-3 py-1.5 font-ui text-xs font-semibold text-ink-soft transition-colors hover:border-navy hover:text-navy"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {submitting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-deep/95 px-6">
          <div className="max-w-md text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-gold" aria-hidden="true" />
            <p className="mt-5 font-display text-xl font-bold text-paper">
              Bài thi đã được nộp tự động
            </p>
            <p className="mt-3 font-ui text-sm leading-relaxed text-cream/85">
              Bài làm gần nhất của bạn đã được lưu và chấm. Hồ sơ chuyển sang bước rà
              soát — đây chưa phải kết luận vi phạm. Bạn sẽ nhận được thông báo và có
              24 giờ để giải trình nếu cần.
            </p>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
