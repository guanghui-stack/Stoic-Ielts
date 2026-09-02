"use client";

import { CheckCircle2, XCircle, Quote, Flag } from "lucide-react";
import { useId, useState } from "react";

/**
 * Hiển thị kết quả một lần AI chấm.
 *
 * Ba điều thành phần này cố tình KHÔNG làm:
 *  - không hiện điểm Reading (AI không đụng tới điểm số)
 *  - không hiện độ tin cậy như một con số riêng lẻ, vì học viên sẽ đọc nó thành
 *    "AI chắc chắn 82%" trong khi nó đo mức rõ ràng của bài viết
 *  - không cho sửa kết luận. Nút báo sai đẩy vào hàng đợi cho người thật xem.
 */

export type AiPerQuestion = {
  maCau: string;
  diem: number;
  datY: string;
  thieuY: string;
  trichDan: string;
};

export type AiEvaluationView = {
  id: string;
  verdict: "DAT" | "KHONG_DAT" | string;
  similarityPercent: number;
  perQuestion: AiPerQuestion[];
  advice: { diemManh: string; canSua: string; buocTiepTheo: string } | null;
  /** Nhãn hiển thị của từng mã câu, ví dụ "p2:q14" → "Câu 14". */
  labels: Record<string, string>;
};

const FEEDBACK_KINDS = [
  { value: "SAI_KET_LUAN", label: "Kết luận sai" },
  { value: "SAI_TRICH_DAN", label: "Trích dẫn không có trong bài" },
  { value: "KHONG_HIEU", label: "Nhận xét khó hiểu" },
  { value: "LOI_KHAC", label: "Lỗi khác" },
] as const;

export function FeynmanAiEvaluation({ data }: { data: AiEvaluationView }) {
  const passed = data.verdict === "DAT";
  const hasAdvice = Boolean(
    data.advice &&
      [data.advice.diemManh, data.advice.canSua, data.advice.buocTiepTheo].some(
        (value) => value.trim().length > 0
      )
  );
  const hasDetails = hasAdvice || data.perQuestion.length > 0;

  return (
    <section className="mt-8 overflow-hidden rounded-stoic-lg border border-stoic-line bg-stoic-canvas shadow-stoic-1">
      <header
        className={`flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5 ${
          passed
            ? "border-success/15 bg-success-pale"
            : "border-stoic-primary/15 bg-stoic-primary-soft/55"
        }`}
      >
        <p
          className={`flex items-center gap-2.5 text-sm font-semibold ${
            passed ? "text-success" : "text-stoic-primary-deep"
          }`}
        >
          {passed ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          {passed
            ? "Bạn đã giảng lại đúng bản chất"
            : "Phần giảng lại còn thiếu ý"}
        </p>
        <p className="text-sm text-stoic-ink-secondary">
          Mức tương đồng với lời giải chuẩn:{" "}
          <strong className="tabular-nums text-ink">{data.similarityPercent}%</strong>
        </p>
      </header>

      <div className="px-6 py-6">
        {hasAdvice && data.advice && (
          <dl className="grid gap-3 md:grid-cols-3">
            <AdviceCell label="Bạn đã nắm được" value={data.advice.diemManh} />
            <AdviceCell label="Cần sửa" value={data.advice.canSua} />
            <AdviceCell
              label="Việc nên làm ở bài sau"
              value={data.advice.buocTiepTheo}
            />
          </dl>
        )}

        {data.perQuestion.length > 0 && (
          <ul className="mt-7 space-y-5">
            {data.perQuestion.map((row) => (
              <li
                key={row.maCau}
                className="rounded-stoic-md border border-stoic-line bg-stoic-canvas-soft/55 px-5 py-4"
              >
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-stoic-ink">
                  {data.labels[row.maCau] ?? row.maCau}
                  <span className="ml-3 font-normal tabular-nums normal-case tracking-normal text-muted">
                    {row.diem}%
                  </span>
                </p>

                {row.datY && (
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                    <strong className="text-success">Đúng: </strong>
                    {row.datY}
                  </p>
                )}
                {row.thieuY && (
                  <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-soft">
                    <strong className="text-danger">Còn thiếu: </strong>
                    {row.thieuY}
                  </p>
                )}
                {row.trichDan && (
                  <p className="mt-2 flex gap-2 rounded-r-lg border-l-2 border-stoic-primary bg-stoic-primary-soft px-4 py-2.5 text-[0.9rem] italic leading-relaxed text-ink-soft">
                    <Quote className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {row.trichDan}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {!hasDetails ? (
          <p className="rounded-stoic-md border border-stoic-line bg-stoic-canvas-soft px-4 py-4 text-sm leading-relaxed text-stoic-ink-muted" role="status">
            Kết luận đã được lưu, nhưng phần phân tích chi tiết chưa tải đủ. Bạn
            vẫn có thể hỏi AI về bài này ở khung bên dưới.
          </p>
        ) : null}

        <FeedbackForm evaluationId={data.id} />
      </div>
    </section>
  );
}

function AdviceCell({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="rounded-stoic-md border border-stoic-line bg-stoic-canvas-soft px-4 py-4">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-stoic-ink-muted">
        {label}
      </dt>
      <dd className="mt-1.5 text-[0.92rem] leading-relaxed text-stoic-ink-secondary">
        {value}
      </dd>
    </div>
  );
}

/** Báo sai: gửi một lần rồi khóa nút, vì bấm thêm cũng không tạo thêm dòng nào. */
function FeedbackForm({ evaluationId }: { evaluationId: string }) {
  const formId = useId();
  const kindId = `${formId}-kind`;
  const noteId = `${formId}-note`;
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<string>(FEEDBACK_KINDS[0].value);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <p
        className="mt-7 rounded-stoic-md border border-stoic-line bg-stoic-canvas-soft px-4 py-4 text-sm text-stoic-ink-muted"
        role="status"
        aria-live="polite"
      >
        Đã ghi nhận. Giáo viên sẽ xem lại bản chấm này.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded="false"
        aria-controls={formId}
        className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-stoic-pill px-3 py-2 text-sm font-semibold text-stoic-ink-muted transition-colors hover:bg-stoic-canvas-soft hover:text-stoic-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        Bản chấm này có chỗ chưa đúng
      </button>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/feynman/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluationId, kind, note }),
      });
      if (response.ok) setSent(true);
      else setError("Chưa gửi được báo lỗi. Bạn thử lại sau ít phút nhé.");
    } catch {
      setError("Mất kết nối khi gửi. Bạn kiểm tra mạng rồi thử lại nhé.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      id={formId}
      className="mt-7 rounded-stoic-md border border-stoic-line bg-stoic-canvas-soft px-4 py-5"
    >
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-stoic-ink">
        Báo lỗi bản chấm
      </p>
      <label
        htmlFor={kindId}
        className="mt-3 block text-xs font-semibold text-stoic-ink-secondary"
      >
        Loại lỗi
      </label>
      <select
        id={kindId}
        autoFocus
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        className="mt-1.5 min-h-11 w-full rounded-stoic-md border border-stoic-line-strong bg-stoic-canvas px-4 py-2.5 text-sm text-stoic-ink outline-none transition-colors focus:border-stoic-primary focus:ring-2 focus:ring-stoic-primary/20"
      >
        {FEEDBACK_KINDS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <label
        htmlFor={noteId}
        className="mt-3 block text-xs font-semibold text-stoic-ink-secondary"
      >
        Mô tả thêm <span className="font-normal text-stoic-ink-muted">(không bắt buộc)</span>
      </label>
      <textarea
        id={noteId}
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 1000))}
        rows={3}
        placeholder="Mô tả ngắn chỗ chưa đúng"
        className="mt-1.5 w-full rounded-stoic-md border border-stoic-line-strong bg-stoic-canvas px-4 py-3 text-[0.95rem] text-stoic-ink placeholder:text-stoic-ink-muted outline-none transition-colors focus:border-stoic-primary focus:ring-2 focus:ring-stoic-primary/20"
      />
      {error ? (
        <p className="mt-3 text-sm text-stoic-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center rounded-stoic-pill border border-stoic-primary bg-stoic-canvas px-5 py-2.5 text-sm font-semibold text-stoic-primary-deep transition-colors hover:bg-stoic-primary-soft/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary/35 disabled:opacity-50"
        >
          {busy ? "Đang gửi..." : "Gửi báo lỗi"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(false);
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-stoic-pill px-4 py-2 text-sm font-semibold text-stoic-ink-muted transition-colors hover:bg-stoic-canvas hover:text-stoic-ink"
        >
          Bỏ qua
        </button>
      </div>
    </div>
  );
}
