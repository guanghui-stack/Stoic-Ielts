"use client";

import { useActionState } from "react";
import { Check, Gavel, ShieldAlert } from "lucide-react";
import {
  awardManualTitleAction,
  resolveIntegrityCaseAction,
  type IntegrityActionState,
} from "@/lib/actions/arena-integrity";

/**
 * Một hồ sơ liêm chính, dựng cho người xét duyệt đọc.
 *
 * BỐN ĐIỀU CỐ Ý TRONG CÁCH TRÌNH BÀY:
 *
 * 1. **Con số hiện trước, kết luận không có.** Mỗi tín hiệu nói ra số liệu của
 *    nó. Màn hình này không viết chữ "gian lận" ở đâu cả, vì nó không biết.
 * 2. **Hai nút đóng hồ sơ ngang hàng nhau.** "Không có gì" không phải là lựa
 *    chọn phụ. Đa số hồ sơ sẽ đóng bằng nút đó, và giao diện phải nói vậy.
 * 3. **Gắn danh hiệu là biểu mẫu RIÊNG, ở dưới, và phải mở ra mới thấy.** Không
 *    ai gắn nhầm một lời buộc tội công khai bằng một cú bấm lạc tay.
 * 4. **Màu không bao giờ là tín hiệu duy nhất.** Mỗi mức độ tin đều có chữ.
 */

type SignalView = {
  code: string;
  strength: "HIGH" | "MEDIUM";
  detail: string;
};

const SIGNAL_LABEL: Record<string, string> = {
  SAME_WRONG_ANSWERS: "Trùng đáp án sai",
  IMPOSSIBLY_FAST: "Nhanh bất khả thi",
  ABILITY_JUMP: "Đột biến năng lực",
  REPEATED_PAIRING: "Lặp cặp đấu",
};

const MANUAL_TITLES = [
  {
    code: "ARENA_M01_NGUY_TAO_QUAN_CONG",
    name: "Ngụy Tạo Quân Công",
    hint: "Công trạng ghi trong sổ mà chiến trường chưa từng thấy mặt.",
  },
  {
    code: "ARENA_M02_NOI_UNG_NGOAI_HOP",
    name: "Nội Ứng Ngoại Hợp",
    hint: "Hai bên giao tranh mà cùng một lòng, thắng bại định trước.",
  },
] as const;

function Notice({ state }: { state: IntegrityActionState }) {
  if (state?.error) {
    return (
      <p className="mt-3 border border-danger bg-danger-pale px-4 py-2.5 font-ui text-[0.88rem] text-danger">
        {state.error}
      </p>
    );
  }
  if (state?.success) {
    return (
      <p className="mt-3 border border-success bg-success-pale px-4 py-2.5 font-ui text-[0.88rem] text-success">
        {state.success}
      </p>
    );
  }
  return null;
}

export function IntegrityCaseCard({
  item,
}: {
  item: {
    id: string;
    createdAt: string;
    priority: number;
    duelId: string | null;
    signals: SignalView[];
    subject: { id: string; name: string | null; email: string };
    peer: { id: string; name: string | null; email: string } | null;
  };
}) {
  const [resolveState, resolveAction, resolving] = useActionState<
    IntegrityActionState,
    FormData
  >(resolveIntegrityCaseAction, undefined);
  const [titleState, titleAction, titling] = useActionState<
    IntegrityActionState,
    FormData
  >(awardManualTitleAction, undefined);

  return (
    <article className="border border-line bg-paper p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold text-navy-deep">
            {item.subject.name ?? item.subject.email}
          </p>
          <p className="font-ui text-xs text-muted">{item.subject.email}</p>
        </div>
        <div className="text-right">
          <p className="label-caps">Thứ tự đọc</p>
          <p className="font-display text-xl font-bold tabular-nums text-navy-deep">
            {item.priority.toFixed(2)}
          </p>
        </div>
      </div>

      {item.peer ? (
        <p className="mt-2 font-ui text-[0.85rem] text-ink-soft">
          Đối thủ trong trận: {item.peer.name ?? item.peer.email}
        </p>
      ) : null}
      <p className="mt-1 font-ui text-xs text-muted">
        Mở lúc {item.createdAt}
        {item.duelId ? ` · trận ${item.duelId}` : ""}
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {item.signals.map((signal, index) => (
          <li key={index} className="border border-line bg-cream-deep px-4 py-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-ui text-[0.82rem] font-semibold text-ink">
                {SIGNAL_LABEL[signal.code] ?? signal.code}
              </span>
              {/* Chữ chứ không chỉ màu: đọc bằng máy đọc màn hình vẫn đủ nghĩa. */}
              <span className="border border-line-strong px-2 py-0.5 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-ink-soft">
                {signal.strength === "HIGH" ? "Độ tin cao" : "Độ tin trung bình"}
              </span>
            </div>
            <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink-soft">
              {signal.detail}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-l-4 border-gold bg-cream-deep px-5 py-3.5 text-[0.9rem] leading-relaxed text-ink-soft">
        Những con số trên là MẪU BẤT THƯỜNG, không phải bằng chứng. Chúng chỉ dùng
        để xếp thứ tự hồ sơ. Trước khi kết luận, hãy mở lại bài làm của cả hai bên
        và tự đọc.
      </p>

      <form action={resolveAction} className="mt-5">
        <input type="hidden" name="caseId" value={item.id} />
        <label className="block">
          <span className="font-ui text-[0.8rem] font-semibold text-ink">
            Kết luận của người xét duyệt
          </span>
          <textarea
            name="note"
            rows={2}
            placeholder="Bắt buộc, kể cả khi kết luận là không có gì. Ghi cái bạn đã tự kiểm tra."
            className="mt-2 w-full border border-line-strong bg-paper px-4 py-2.5 font-ui text-[0.92rem] text-ink placeholder:text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            name="verdict"
            value="CLEARED"
            disabled={resolving}
            className="inline-flex cursor-pointer items-center gap-2 border border-navy bg-navy px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-navy-deep disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Xem xong, không có gì
          </button>
          <button
            type="submit"
            name="verdict"
            value="CONFIRMED"
            disabled={resolving}
            className="inline-flex cursor-pointer items-center gap-2 border border-line-strong px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
          >
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            Có vi phạm
          </button>
        </div>
        <Notice state={resolveState} />
      </form>

      <details className="mt-5 border-t border-line pt-4">
        <summary className="cursor-pointer font-ui text-[0.8rem] font-semibold text-ink-soft">
          Gắn danh hiệu người xử cho học viên này
        </summary>
        <form action={titleAction} className="mt-4">
          <input type="hidden" name="userId" value={item.subject.id} />
          <fieldset>
            <legend className="font-ui text-[0.8rem] font-semibold text-ink">
              Chọn danh hiệu
            </legend>
            <div className="mt-2 flex flex-col gap-2">
              {MANUAL_TITLES.map((title, index) => (
                <label
                  key={title.code}
                  className="flex items-start gap-2.5 border border-line px-3.5 py-2"
                >
                  <input
                    type="radio"
                    name="code"
                    value={title.code}
                    defaultChecked={index === 0}
                    className="mt-1"
                  />
                  <span className="flex-1">
                    <span className="font-ui text-[0.9rem] font-semibold text-ink">
                      {title.name}
                    </span>
                    <span className="mt-0.5 block font-ui text-xs text-muted">
                      {title.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-4 block">
            <span className="font-ui text-[0.8rem] font-semibold text-ink">
              Bằng chứng
            </span>
            <textarea
              name="evidence"
              rows={3}
              placeholder="Bạn đã tự kiểm tra gì, và thấy gì. Người đọc lại sau sáu tháng phải hiểu được."
              className="mt-2 w-full border border-line-strong bg-paper px-4 py-2.5 font-ui text-[0.92rem] text-ink placeholder:text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </label>

          <button
            type="submit"
            disabled={titling}
            className="mt-4 inline-flex cursor-pointer items-center gap-2 border border-danger bg-danger px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-danger-deep disabled:opacity-50"
          >
            <Gavel className="h-4 w-4" aria-hidden="true" />
            Gắn danh hiệu
          </button>
          <p className="mt-2 font-ui text-xs text-muted">
            Danh hiệu này không bao giờ lên bảng công cộng. Nó nằm trên hồ sơ, và
            gỡ được.
          </p>
          <Notice state={titleState} />
        </form>
      </details>
    </article>
  );
}
