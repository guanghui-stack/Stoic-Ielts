"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles, Wallet } from "lucide-react";
import { AiWaiting } from "@/components/ui/ai-waiting";
import {
  FeynmanAiEvaluation,
  type AiEvaluationView,
} from "./feynman-ai-evaluation";
import { FeynmanAiChat, type ChatTurn } from "./feynman-ai-chat";

/**
 * Khối AI trên trang chữa bài: nút nhờ chấm, kết quả, và khung hỏi đáp.
 *
 * Thành phần này KHÔNG tự quyết định được phép chấm hay không — máy chủ mới
 * quyết định. Nó chỉ ẩn nút khi đã biết chắc là không dùng được, để học viên
 * không bấm vào một thứ luôn báo lỗi.
 */

export function FeynmanAiPanel({
  reviewId,
  evaluation,
  turns,
  questionLimit,
  questionUsed,
  walletRemaining,
  reviewCompleted,
  topUpHref,
}: {
  reviewId: string;
  evaluation: AiEvaluationView | null;
  turns: ChatTurn[];
  questionLimit: number;
  questionUsed: number;
  walletRemaining: number;
  reviewCompleted: boolean;
  topUpHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Đã có bản chấm thì hiện kết quả, không hiện nút chấm nữa: một phiên chỉ
  // được chấm một lần, và nút bấm được nhưng luôn báo lỗi là một lời hứa suông.
  if (evaluation) {
    return (
      <>
        <FeynmanAiEvaluation data={evaluation} />
        <FeynmanAiChat
          evaluationId={evaluation.id}
          initialTurns={turns}
          questionLimit={questionLimit}
          questionUsed={questionUsed}
        />
      </>
    );
  }

  if (!reviewCompleted) {
    return (
      <section className="mt-8 rounded-stoic-lg border border-stoic-line bg-stoic-canvas px-6 py-5 shadow-stoic-1">
        <p className="flex items-start gap-2.5 text-sm leading-relaxed text-stoic-ink-muted">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-stoic-primary-deep" aria-hidden="true" />
          Hoàn thành phần tự giảng ở trên để mở bước AI đối chiếu.
        </p>
      </section>
    );
  }

  const grade = async () => {
    setBusy(true);
    setError(null);
    let refreshing = false;
    try {
      const response = await fetch("/api/feynman/ai/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });
      const data = await response.json();

      if (data.ok) {
        // Đọc lại từ máy chủ thay vì tự dựng kết quả ở đây: bản chấm còn kèm
        // nhãn câu và lịch sử hỏi đáp mà trang server đã biết cách lấy.
        refreshing = true;
        router.refresh();
        return;
      }
      setError(data.message ?? "Có lỗi xảy ra. Mời bạn thử lại.");
    } catch {
      setError("Không gọi được máy chủ. Bạn kiểm tra kết nối rồi thử lại nhé.");
    } finally {
      if (!refreshing) setBusy(false);
    }
  };

  const empty = walletRemaining <= 0;

  if (busy) {
    return (
      <section className="mt-8" aria-label="AI đang chấm phần tự giảng">
        <AiWaiting
          title="Đang chấm phần tự giảng"
          description="Bạn có thể giữ nguyên trang này; kết quả sẽ xuất hiện ngay khi việc đối chiếu hoàn tất."
          steps={[
            "Đọc phần tự giảng",
            "Đối chiếu lời giải và bằng chứng",
            "Chuẩn bị phản hồi",
          ]}
          activeStep={1}
        />
      </section>
    );
  }

  return (
    <section className="stoic-ai-panel mt-8 rounded-stoic-lg border border-stoic-primary/30 bg-stoic-primary-soft/50 p-6 shadow-stoic-1 sm:p-7">
      <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-stoic-primary-deep">
        <Sparkles className="h-3.5 w-3.5 text-stoic-primary-deep" aria-hidden="true" />
        Nhờ AI chấm phần tự giảng
      </p>
      <h2 className="mt-2.5 text-xl font-medium tracking-[-0.02em] text-stoic-ink md:text-2xl">
        Bạn giảng lại đã đúng bản chất chưa?
      </h2>
      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-stoic-ink-secondary">
        AI so phần bạn tự giảng với lời giải chuẩn theo ý nghĩa, chỉ ra chỗ còn
        thiếu và trích dẫn bằng chứng trong bài. Điểm Reading của bạn không thay
        đổi.
      </p>

      <p className="mt-4 flex items-center gap-2 text-sm text-stoic-ink-secondary">
        <Wallet className="h-4 w-4" aria-hidden="true" />
        Ví lượt AI: <strong className="tabular-nums text-stoic-ink">{walletRemaining}</strong> lượt
      </p>

      {error && <p className="mt-3 font-ui text-sm text-danger" role="alert">{error}</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        {empty ? (
          <Link
            href={topUpHref}
            className="inline-flex min-h-11 items-center justify-center rounded-stoic-pill border border-stoic-primary bg-stoic-primary px-6 py-2.5 text-sm font-semibold text-white shadow-stoic-1 transition-colors hover:border-stoic-primary-deep hover:bg-stoic-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
          >
            Nạp thêm lượt AI
          </Link>
        ) : (
          <button
            type="button"
            onClick={grade}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-stoic-pill border border-stoic-primary bg-stoic-primary px-6 py-2.5 text-sm font-semibold text-white shadow-stoic-1 transition-colors hover:border-stoic-primary-deep hover:bg-stoic-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35 disabled:cursor-wait disabled:opacity-50"
          >
            Nhờ AI chấm · 1 lượt
          </button>
        )}
      </div>

      <p className="mt-4 font-ui text-[0.8rem] leading-relaxed text-muted">
        Mỗi lượt làm bài nhờ chấm được một lần mỗi ngày. Chấm hỏng giữa chừng thì
        lượt của bạn được hoàn lại.
      </p>
    </section>
  );
}
