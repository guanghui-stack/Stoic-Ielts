"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Wallet } from "lucide-react";
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
      <section className="mt-8 border border-line bg-paper px-6 py-5">
        <p className="font-ui text-sm text-muted">
          Hoàn thành phần tự giảng lại ở trên, rồi bạn nhờ AI chấm được.
        </p>
      </section>
    );
  }

  const grade = async () => {
    setBusy(true);
    setError(null);
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
        router.refresh();
        return;
      }
      setError(data.message ?? "Có lỗi xảy ra. Mời bạn thử lại.");
    } catch {
      setError("Không gọi được máy chủ. Bạn kiểm tra kết nối rồi thử lại nhé.");
    } finally {
      setBusy(false);
    }
  };

  const empty = walletRemaining <= 0;

  return (
    <section className="mt-8 border border-gold bg-gold-pale p-7">
      <p className="flex items-center gap-2 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Nhờ AI chấm phần tự giảng
      </p>
      <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep md:text-2xl">
        Bạn giảng lại đã đúng bản chất chưa?
      </h2>
      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        AI so phần bạn tự giảng với lời giải chuẩn theo ý nghĩa, chỉ ra chỗ còn
        thiếu và trích dẫn bằng chứng trong bài. Điểm Reading của bạn không thay
        đổi.
      </p>

      <p className="mt-4 flex items-center gap-2 font-ui text-sm text-ink-soft">
        <Wallet className="h-4 w-4" aria-hidden="true" />
        Ví lượt AI: <strong className="text-ink">{walletRemaining}</strong> lượt
      </p>

      {error && <p className="mt-3 font-ui text-sm text-danger">{error}</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        {empty ? (
          <a
            href={topUpHref}
            className="border border-navy bg-navy px-6 py-3 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-paper transition-opacity hover:opacity-90"
          >
            Nạp thêm lượt AI
          </a>
        ) : (
          <button
            type="button"
            onClick={grade}
            disabled={busy}
            className="border border-navy bg-navy px-6 py-3 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "AI đang chấm..." : "Nhờ AI chấm (1 lượt)"}
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
