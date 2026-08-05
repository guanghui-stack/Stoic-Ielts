"use client";

import { useActionState } from "react";
import { Ticket, Clock } from "lucide-react";
import {
  acceptQualificationAction,
  declineQualificationAction,
  type QualificationState,
} from "@/lib/actions/competition-qualification";
import { ErrorBanner, SubmitButton } from "@/components/ui";

/**
 * Thẻ vé mời dự thi tầng trên.
 *
 * Hiển thị rõ NGUỒN của vé — kỳ nào, hạng mấy — vì đây không phải phần thưởng
 * ngẫu nhiên mà là hệ quả của một kết quả cụ thể. Người học phải kiểm chứng
 * được vì sao mình có mặt ở đây.
 *
 * Hai nút nằm ở hai form riêng: chấp nhận và từ chối là hai hành động khác
 * hẳn nhau, gộp vào một form thì giá trị nút cuối cùng luôn thắng.
 */
export function QualificationCard({
  qualificationId,
  tierName,
  sourceName,
  sourceRank,
  route,
  status,
  expiresLabel,
}: {
  qualificationId: string;
  tierName: string;
  sourceName: string;
  sourceRank: number;
  route: string;
  status: string;
  expiresLabel: string;
}) {
  const [state, formAction, pending] = useActionState<QualificationState, FormData>(
    async (prev, formData) =>
      formData.get("intent") === "decline"
        ? declineQualificationAction(prev, formData)
        : acceptQualificationAction(prev, formData),
    undefined,
  );

  const pendingOffer = status === "OFFERED";

  return (
    <section
      aria-label="Vé mời dự thi"
      className={`border p-7 ${pendingOffer ? "border-gold bg-gold-pale" : "border-line bg-paper"}`}
    >
      <p className="label-caps flex items-center gap-2">
        <Ticket className="h-3.5 w-3.5" aria-hidden />
        Vé tuyển chọn
      </p>

      <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep">
        {status === "ACCEPTED"
          ? `Bạn là thí sinh của ${tierName}`
          : `Bạn được mời dự ${tierName}`}
      </h2>

      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        Vé này đến từ <strong>{sourceName}</strong>, nơi bạn xếp hạng{" "}
        <strong>{sourceRank}</strong>.
        {route === "CASCADE" &&
          " Ghế được nhường xuống khi người xếp trên không nhận."}
      </p>

      {pendingOffer && (
        <p className="mt-3 inline-flex items-center gap-2 font-ui text-sm text-ink-soft">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          Hạn trả lời: {expiresLabel}
        </p>
      )}

      {state?.error && (
        <div className="mt-4">
          <ErrorBanner message={state.error} />
        </div>
      )}
      {state?.success && (
        <p role="status" className="mt-4 font-ui text-sm text-jade-ink">
          {state.success}
        </p>
      )}

      {pendingOffer && (
        <div className="mt-5 flex flex-wrap gap-2">
          <form action={formAction}>
            <input type="hidden" name="qualificationId" value={qualificationId} />
            <input type="hidden" name="intent" value="accept" />
            <SubmitButton disabled={pending}>
              {pending ? "Đang xử lý..." : "Nhận vé"}
            </SubmitButton>
          </form>
          <form action={formAction}>
            <input type="hidden" name="qualificationId" value={qualificationId} />
            <input type="hidden" name="intent" value="decline" />
            <SubmitButton variant="outline" disabled={pending}>
              Từ chối
            </SubmitButton>
          </form>
        </div>
      )}

      {status === "EXPIRED" && (
        <p className="mt-4 font-ui text-sm text-muted">
          Vé đã hết hạn và ghế được chuyển cho người kế tiếp.
        </p>
      )}
      {status === "DECLINED" && (
        <p className="mt-4 font-ui text-sm text-muted">
          Bạn đã từ chối vé này.
        </p>
      )}
    </section>
  );
}
