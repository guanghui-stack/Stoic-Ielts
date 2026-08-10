"use client";

import { CheckCircle2, XCircle, Quote, Flag } from "lucide-react";
import { useState } from "react";

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

  return (
    <section className="mt-8 border border-line-strong bg-paper">
      <header
        className={`flex flex-wrap items-center justify-between gap-4 px-6 py-5 ${
          passed ? "bg-success-pale" : "bg-gold-pale"
        }`}
      >
        <p
          className={`flex items-center gap-2.5 font-ui text-sm font-semibold ${
            passed ? "text-success" : "text-navy-deep"
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
        <p className="font-ui text-sm text-ink-soft">
          Mức tương đồng với lời giải chuẩn:{" "}
          <strong className="text-ink">{data.similarityPercent}%</strong>
        </p>
      </header>

      <div className="px-6 py-6">
        {data.advice && (
          <dl className="grid gap-4 md:grid-cols-3">
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
              <li key={row.maCau} className="border-l-2 border-line-strong pl-5">
                <p className="font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink">
                  {data.labels[row.maCau] ?? row.maCau}
                  <span className="ml-3 font-normal normal-case tracking-normal text-muted">
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
                  <p className="mt-2 flex gap-2 border-l-2 border-gold bg-gold-pale px-4 py-2.5 text-[0.9rem] italic leading-relaxed text-ink-soft">
                    <Quote className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {row.trichDan}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <FeedbackForm evaluationId={data.id} />
      </div>
    </section>
  );
}

function AdviceCell({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-ui text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-soft">
        {value}
      </dd>
    </div>
  );
}

/** Báo sai: gửi một lần rồi khóa nút, vì bấm thêm cũng không tạo thêm dòng nào. */
function FeedbackForm({ evaluationId }: { evaluationId: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<string>(FEEDBACK_KINDS[0].value);
  const [note, setNote] = useState("");

  if (sent) {
    return (
      <p className="mt-7 border-t border-line pt-5 font-ui text-sm text-muted">
        Đã ghi nhận. Giáo viên sẽ xem lại bản chấm này.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-7 flex items-center gap-2 border-t border-line pt-5 font-ui text-sm text-muted hover:text-navy"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        Bản chấm này có chỗ chưa đúng
      </button>
    );
  }

  const submit = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/feynman/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluationId, kind, note }),
      });
      // Báo sai hỏng thì không có gì để học viên xử lý, và cũng không mất mát
      // gì của họ. Đóng form lại, không dựng thêm một thông báo lỗi.
      if (response.ok) setSent(true);
      else setOpen(false);
    } catch {
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-7 border-t border-line pt-5">
      <p className="font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink">
        Báo lỗi bản chấm
      </p>
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        className="mt-3 w-full border border-line-strong bg-paper px-4 py-2.5 font-ui text-sm text-ink focus:border-navy focus:outline-none"
      >
        {FEEDBACK_KINDS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 1000))}
        rows={3}
        placeholder="Mô tả ngắn chỗ chưa đúng (không bắt buộc)"
        className="mt-3 w-full border border-line-strong bg-paper px-4 py-3 font-body text-[0.95rem] text-ink placeholder:text-muted focus:border-navy focus:outline-none"
      />
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="border border-navy px-5 py-2 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-navy transition-colors hover:bg-navy hover:text-paper disabled:opacity-50"
        >
          {busy ? "Đang gửi..." : "Gửi báo lỗi"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-2 font-ui text-sm text-muted hover:text-ink"
        >
          Bỏ qua
        </button>
      </div>
    </div>
  );
}
