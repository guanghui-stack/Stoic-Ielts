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
    <section className="mt-8 border border-line-strong bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <p className="flex items-center gap-2 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Hỏi thêm về bài này
        </p>
        <p className="font-ui text-sm text-muted">
          Còn <strong className="text-ink">{remaining}</strong> / {questionLimit} câu
        </p>
      </header>

      <div className="px-6 py-5">
        {turns.length === 0 && (
          <p className="text-[0.95rem] leading-relaxed text-muted">
            Bạn hỏi được về đoạn văn, đáp án, hoặc chỗ mình còn chưa thông trong
            phần chữa bài vừa rồi.
          </p>
        )}

        <ul className="space-y-5">
          {turns.map((turn) => (
            <li key={turn.id}>
              <p className="font-ui text-[0.9rem] font-semibold text-navy-deep">
                {turn.question}
              </p>
              <p
                className={`mt-2 text-[0.95rem] leading-relaxed ${
                  turn.rejected ? "text-muted italic" : "text-ink-soft"
                }`}
              >
                {turn.answer}
              </p>
            </li>
          ))}
        </ul>

        {remaining > 0 ? (
          <div className="mt-6">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 1000))}
              rows={3}
              disabled={busy}
              placeholder="Ví dụ: vì sao đáp án câu 14 không phải NOT GIVEN?"
              className="w-full border border-line-strong bg-paper px-4 py-3 font-body text-[0.95rem] leading-relaxed text-ink placeholder:text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:opacity-60"
            />
            {error && (
              <p className="mt-2 font-ui text-sm text-danger">{error}</p>
            )}
            <button
              type="button"
              onClick={send}
              disabled={!canAsk}
              className="mt-3 inline-flex items-center gap-2 border border-navy px-5 py-2.5 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-navy transition-colors hover:bg-navy hover:text-paper disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {busy ? "Đang hỏi..." : "Gửi câu hỏi"}
            </button>
          </div>
        ) : (
          <p className="mt-6 border-t border-line pt-5 font-ui text-sm text-muted">
            Bạn đã dùng hết số câu hỏi của lượt chấm này.
          </p>
        )}
      </div>
    </section>
  );
}
