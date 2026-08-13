"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";

/**
 * Trang kết quả tự cập nhật sau khi học viên trả tiền.
 *
 * Cần polling vì tiền vào là do máy chủ SePay báo sang máy chủ mình (IPN) —
 * trình duyệt của học viên không biết việc đó, và cũng KHÔNG được phép quyết
 * định. Hỏi lại máy chủ là cách trung thực duy nhất.
 */

const POLL_MS = 2_000;
const MAX_POLLS = 30; // ~60 giây

type Presentation = {
  tone: "wait" | "good" | "bad" | "review";
  title: string;
  detail: string;
};

const PRESENTATION: Record<string, Presentation> = {
  PENDING: {
    tone: "wait",
    title: "Đang xác nhận thanh toán…",
    detail:
      "Ngân hàng thường báo về trong vòng vài chục giây. Bạn có thể để yên trang này.",
  },
  PAID: {
    tone: "good",
    title: "Thanh toán thành công",
    detail: "Quyền học đã được mở cho tài khoản của bạn.",
  },
  CANCELLED: {
    tone: "bad",
    title: "Bạn đã hủy thanh toán",
    detail: "Không có khoản tiền nào bị trừ. Bạn có thể mua lại bất cứ lúc nào.",
  },
  FAILED: {
    tone: "bad",
    title: "Giao dịch chưa hoàn tất",
    detail: "Chưa có quyền nào được mở. Vui lòng thử lại.",
  },
  EXPIRED: {
    tone: "bad",
    title: "Đơn hàng đã quá hạn",
    detail: "Đơn chờ quá lâu nên đã đóng. Bấm mua lại để tạo đơn mới.",
  },
  REQUIRES_REVIEW: {
    tone: "review",
    title: "Giao dịch cần được đối soát",
    detail:
      "Thông tin thanh toán có điểm chưa khớp nên hệ thống tạm giữ lại. Vui lòng gửi mã đơn bên dưới cho trung tâm để được xử lý.",
  },
  VOIDED: {
    tone: "bad",
    title: "Giao dịch đã bị hủy",
    detail: "Quyền liên quan tới đơn này đã được thu hồi.",
  },
  REFUNDED: {
    tone: "bad",
    title: "Đơn hàng đã được hoàn tiền",
    detail: "Quyền liên quan tới đơn này đã được thu hồi.",
  },
};

const TONE_CLASS = {
  wait: "border-line-strong bg-cream-deep text-ink",
  good: "border-success bg-success-pale text-success",
  bad: "border-danger bg-danger-pale text-danger",
  review: "border-gold bg-gold-pale text-ink",
} as const;

export function PaymentStatusPoller({
  invoiceNumber,
  initialStatus,
  initialReturnPath,
}: {
  invoiceNumber: string;
  initialStatus: string;
  initialReturnPath: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [returnPath, setReturnPath] = useState(initialReturnPath);
  const [checking, setChecking] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const pollsRef = useRef(0);

  const fetchStatus = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`/api/payments/orders/${invoiceNumber}/status`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        status: string;
        returnPath: string | null;
      };
      setStatus(data.status);
      setReturnPath(data.returnPath);
      return data.status;
    } catch {
      return null; // mạng chập chờn — cứ thử lại ở nhịp sau
    }
  }, [invoiceNumber]);

  useEffect(() => {
    if (status !== "PENDING") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (cancelled) return;
      const next = await fetchStatus();
      if (cancelled) return;
      pollsRef.current += 1;
      if (next && next !== "PENDING") return;
      if (pollsRef.current >= MAX_POLLS) {
        setGaveUp(true);
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    };

    timer = setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [status, fetchStatus]);

  const view = PRESENTATION[status] ?? {
    tone: "review" as const,
    title: "Trạng thái chưa xác định",
    detail: "Vui lòng gửi mã đơn bên dưới cho trung tâm để được kiểm tra.",
  };

  const onManualCheck = async () => {
    setChecking(true);
    pollsRef.current = 0;
    setGaveUp(false);
    await fetchStatus();
    setChecking(false);
  };

  return (
    <div className="mt-8">
      <div
        key={status}
        className={`motion-status-enter flex items-start gap-3 border-l-4 px-6 py-5 ${TONE_CLASS[view.tone]}`}
      >
        {view.tone === "wait" ? (
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
        ) : view.tone === "good" ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        ) : view.tone === "review" ? (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
        ) : (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        )}
        <div>
          <p className="font-ui text-base font-semibold">{view.title}</p>
          <p className="mt-1.5 font-ui text-sm leading-relaxed opacity-90">
            {view.detail}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {status === "PAID" && (
          <Link
            href={returnPath ?? "/hoc-vien"}
            className="inline-flex items-center gap-2 border border-navy bg-navy px-7 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-paper transition-colors hover:bg-navy-deep"
          >
            Vào học ngay
          </Link>
        )}

        {status === "PENDING" && (
          <button
            type="button"
            onClick={onManualCheck}
            disabled={checking}
            className="motion-press inline-flex cursor-pointer items-center gap-2 border border-navy px-7 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-navy hover:bg-navy hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${checking ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {checking ? "Đang kiểm tra…" : "Kiểm tra lại"}
          </button>
        )}

        {(status === "CANCELLED" || status === "FAILED" || status === "EXPIRED") && (
          <Link
            href="/thanh-toan"
            className="inline-flex items-center gap-2 border border-navy px-7 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-navy transition-colors hover:bg-navy hover:text-paper"
          >
            Xem bảng giá
          </Link>
        )}

        <Link
          href="/hoc-vien"
          className="font-ui text-sm font-semibold text-navy underline-offset-4 hover:text-gold hover:underline"
        >
          Về hồ sơ học tập
        </Link>
      </div>

      {gaveUp && status === "PENDING" && (
        <p className="mt-5 border-l-4 border-gold bg-gold-pale px-5 py-4 font-ui text-sm leading-relaxed text-ink">
          Đã chờ hơn một phút mà chưa thấy báo về. Nếu tài khoản của bạn đã bị
          trừ tiền, hãy gửi mã đơn <strong>{invoiceNumber}</strong> cho trung tâm
          — quyền sẽ được mở sau khi đối soát. Tiền không bị mất.
        </p>
      )}
    </div>
  );
}
