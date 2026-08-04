"use client";

import { useActionState } from "react";
import { Lock, Swords, Hourglass } from "lucide-react";
import { startTrialAction } from "@/lib/actions/ranks";
import { TrialProgress } from "@/components/ranks/trial-progress";
import { ErrorBanner, SubmitButton } from "@/components/ui";
import type { RuleProgress } from "@/lib/ranks/rules";

/**
 * Thẻ cửa ải: điều kiện mở, và nút Khởi thí luyện.
 *
 * Nút này là ranh giới quan trọng nhất của cả hệ cấp bậc, nên nó phải là một
 * hành động rõ ràng chứ không phải thứ tự xảy ra. Người học phải hiểu mình
 * đang cam kết điều gì TRƯỚC khi bấm — vì từ giây đó engine mới bắt đầu đếm,
 * và mọi bài đã làm trước đó không được tính nữa.
 */

export type TrialGateCardProps = {
  trialCode: string;
  trialName: string;
  estimate: string;
  status: string;
  gateComplete: boolean;
  gateExplanation: string;
  gateProgress: RuleProgress[];
};

export function TrialGateCard({
  trialCode,
  trialName,
  estimate,
  status,
  gateComplete,
  gateExplanation,
  gateProgress,
}: TrialGateCardProps) {
  const [state, formAction, pending] = useActionState<
    { error?: string } | undefined,
    FormData
  >(async (_prev, formData) => {
    const result = await startTrialAction(String(formData.get("trialCode") ?? ""));
    return result.ok ? undefined : { error: result.error };
  }, undefined);

  if (status === "ACTIVE") {
    return (
      <section
        aria-label="Trạng thái cửa ải"
        className="border border-azure bg-azure-pale p-7"
      >
        <p className="label-caps flex items-center gap-2">
          <Hourglass className="h-3.5 w-3.5" aria-hidden />
          Đang thí luyện
        </p>
        <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep">
          {trialName}
        </h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
          Từ lúc bạn khởi thí luyện, engine chỉ tính những bài làm và lượt phục
          bàn mới. Cứ làm bài như bình thường, tiến độ bên dưới tự cập nhật.
        </p>
      </section>
    );
  }

  if (!gateComplete) {
    return (
      <section
        aria-label="Điều kiện mở cửa ải"
        className="border border-line bg-cream-deep p-7"
      >
        <p className="label-caps flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Cửa ải chưa mở
        </p>
        <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep">
          {trialName}
        </h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
          {gateExplanation}
        </p>
        <div className="mt-5">
          <TrialProgress items={gateProgress} />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Cửa ải đã mở"
      className="border border-gold bg-gold-pale p-7"
    >
      <p className="label-caps flex items-center gap-2">
        <Swords className="h-3.5 w-3.5" aria-hidden />
        Cửa ải đã mở
      </p>
      <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep">
        {trialName}
      </h2>

      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        Bạn đã đủ điều kiện bước vào. Thời gian ước lượng: <strong>{estimate}</strong>.
      </p>

      <p className="mt-3 max-w-2xl border-l-4 border-gold bg-cream px-4 py-3 text-sm leading-relaxed text-ink-soft">
        Lưu ý trước khi bắt đầu: chỉ những bài làm và lượt phục bàn <strong>sau
        khi bấm nút</strong> mới được tính cho cửa ải này. Những gì bạn đã làm
        trước đó dùng để mở cửa, không dùng để vượt cửa.
      </p>

      {state?.error && (
        <div className="mt-4">
          <ErrorBanner message={state.error} />
        </div>
      )}

      <form action={formAction} className="mt-5">
        <input type="hidden" name="trialCode" value={trialCode} />
        <SubmitButton disabled={pending}>
          {pending ? "Đang khởi..." : "Khởi thí luyện"}
        </SubmitButton>
      </form>
    </section>
  );
}
