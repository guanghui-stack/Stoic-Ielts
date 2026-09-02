"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";

/**
 * Hỏi đáp với AI về đúng bài vừa chữa.
 *
 * Số lượt còn lại hiện ngay cạnh ô nhập chứ không giấu trong menu: học viên
 * đang tiêu một thứ đã trả tiền, và biết mình còn bao nhiêu là điều kiện để
 * tiêu nó tử tế.
 */

export type ChatTurn = {
  id: string;
  question: string;
  answer: string;
  /** Câu ngoài phạm vi: hiện khác đi, và KHÔNG bị trừ lượt. */
  rejected?: boolean;
};

export function FeynmanAiChat({
  evaluationId,
  initialTurns,
  questionLimit,
  questionUsed,
}: {
  evaluationId: string;
  initialTurns: ChatTurn[];
  questionLimit: number;
  questionUsed: number;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>(initialTurns);
  const [used, setUsed] = useState(questionUsed);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, questionLimit - used);
  const canAsk = remaining > 0 && !busy && question.trim().length >= 3;

  const send = async () => {
    if (!canAsk) return;
    const asked = question.trim();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/feynman/ai/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluationId,
          question: asked,
          // Khóa chống bấm hai lần. Sinh MỘT lần cho MỘT câu hỏi: sinh lại khi
          // thử lại sẽ làm mất tác dụng chống trùng và tiêu thêm một lượt.
          requestKey: crypto.randomUUID(),
        }),
      });
      const data = await response.json();

      if (data.ok) {
        setTurns((prev) => [
          ...prev,
          { id: data.messageId, question: asked, answer: data.answer },
        ]);
        setUsed((n) => n + 1);
        setQuestion("");
        return;
      }

      // Ngoài phạm vi vẫn hiện thành một lượt trong khung chat để học viên
      // thấy mình đã hỏi gì, nhưng không cộng vào số lượt đã dùng.
      if (data.rejected) {
        setTurns((prev) => [
          ...prev,
          {
            id: `rejected-${Date.now()}`,
            question: asked,
            answer: data.message,
            rejected: true,
          },
        ]);
        setQuestion("");
        return;
      }

      setError(data.message ?? "Có lỗi xảy ra. Mời bạn thử lại.");
    } catch {
      setError("Không gửi được câu hỏi. Bạn kiểm tra kết nối rồi thử lại nhé.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 overflow-hidden rounded-stoic-lg border border-stoic-line bg-stoic-canvas shadow-stoic-1">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stoic-line bg-stoic-canvas-soft/65 px-6 py-4">
        <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-stoic-ink">
          <MessageCircle className="h-3.5 w-3.5 text-stoic-primary-deep" aria-hidden="true" />
          Hỏi thêm về bài này
        </p>
        <p className="text-sm text-stoic-ink-muted">
          Còn <strong className="tabular-nums text-stoic-ink">{remaining}</strong> /{" "}
          <span className="tabular-nums">{questionLimit}</span> câu
        </p>
      </header>

      <div className="px-6 py-5">
        {turns.length === 0 && (
          <p className="rounded-stoic-md border border-dashed border-stoic-line-strong bg-stoic-canvas-soft/55 px-4 py-4 text-[0.95rem] leading-relaxed text-stoic-ink-muted">
            Bạn hỏi được về đoạn văn, đáp án, hoặc chỗ mình còn chưa thông trong
            phần chữa bài vừa rồi.
          </p>
        )}

        <ul
          className="space-y-5"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Lịch sử hỏi đáp với AI về bài này"
        >
          {turns.map((turn) => (
            <li
              key={turn.id}
              className="rounded-stoic-md border border-stoic-line bg-stoic-canvas-soft/45 p-4"
            >
              <p className="text-[0.9rem] font-semibold leading-relaxed text-stoic-ink">
                {turn.question}
              </p>
              <p
                className={`mt-3 rounded-lg border-l-2 border-stoic-primary/55 pl-3 text-[0.95rem] leading-relaxed ${
                  turn.rejected ? "text-muted italic" : "text-ink-soft"
                }`}
              >
                {turn.answer}
              </p>
            </li>
          ))}
        </ul>

        {busy ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-5 rounded-stoic-md border border-stoic-primary/20 bg-stoic-primary-soft/35 px-4 py-3 text-sm leading-relaxed text-stoic-primary-deep"
          >
            Đang đọc câu hỏi và tìm bằng chứng trong bài…
          </div>
        ) : null}

        {remaining > 0 ? (
          <div className="mt-6">
            <textarea
              aria-label="Câu hỏi gửi AI về bài này"
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 1000))}
              rows={3}
              disabled={busy}
              placeholder="Ví dụ: vì sao đáp án câu 14 không phải NOT GIVEN?"
              className="w-full rounded-stoic-md border border-stoic-line-strong bg-stoic-canvas px-4 py-3 text-[0.95rem] leading-relaxed text-stoic-ink placeholder:text-stoic-ink-muted outline-none transition-colors focus:border-stoic-primary focus:ring-2 focus:ring-stoic-primary/20 disabled:opacity-60"
            />
            {error && (
              <p className="mt-2 font-ui text-sm text-danger" role="alert">{error}</p>
            )}
            <button
              type="button"
              onClick={send}
              disabled={!canAsk}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-stoic-pill border border-stoic-primary bg-stoic-primary px-5 py-2.5 text-sm font-semibold text-white shadow-stoic-1 transition-colors hover:border-stoic-primary-deep hover:bg-stoic-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {busy ? "Đang tìm câu trả lời…" : "Gửi câu hỏi"}
            </button>
          </div>
        ) : (
              <p className="mt-6 rounded-stoic-md border border-stoic-line bg-stoic-canvas-soft px-4 py-4 text-sm text-stoic-ink-muted">
            Bạn đã dùng hết số câu hỏi của lượt chấm này.
          </p>
        )}
      </div>
    </section>
  );
}
