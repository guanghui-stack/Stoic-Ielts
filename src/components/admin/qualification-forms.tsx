"use client";

import { useActionState } from "react";
import {
  attachSourceAction,
  detachSourceAction,
  generateOffersAction,
  expireOffersAction,
  type AdminQualState,
} from "@/lib/actions/admin-qualification";
import { ErrorBanner, SubmitButton } from "@/components/ui";

/**
 * Biểu mẫu quản trị nguồn tuyển chọn.
 *
 * Đặc tả §11.4 cấm tuyệt đối nút "thêm thí sinh tùy ý", nên ở đây KHÔNG có ô
 * nhập userId hay email nào. Quản trị viên chỉ chọn được kỳ nguồn; ai vào
 * được là do kết quả thi quyết định.
 */

function Feedback({ state }: { state: AdminQualState }) {
  if (!state) return null;
  return (
    <div className="mt-3">
      {state.error && <ErrorBanner message={state.error} />}
      {state.success && (
        <p role="status" className="font-ui text-sm text-jade-ink">
          {state.success}
        </p>
      )}
    </div>
  );
}

export function AttachSourceForm({
  targetId,
  options,
}: {
  targetId: string;
  options: Array<{ id: string; name: string; seasonKey: string; finalized: boolean }>;
}) {
  const [state, formAction, pending] = useActionState<AdminQualState, FormData>(
    attachSourceAction,
    undefined,
  );

  if (options.length === 0) {
    return (
      <p className="font-ui text-sm text-muted">
        Không còn kỳ nào phù hợp để gắn làm nguồn.
      </p>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="targetId" value={targetId} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="grow">
          <span className="font-ui text-sm font-medium text-navy-deep">Kỳ nguồn</span>
          <select
            name="sourceId"
            required
            className="mt-1 w-full border border-line bg-paper px-3 py-2 font-ui text-sm text-ink focus:border-navy focus:outline-none"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} · {option.seasonKey}
                {option.finalized ? "" : " (chưa chốt)"}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton disabled={pending}>Gắn làm nguồn</SubmitButton>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function DetachSourceForm({
  targetId,
  sourceId,
}: {
  targetId: string;
  sourceId: string;
}) {
  const [state, formAction, pending] = useActionState<AdminQualState, FormData>(
    detachSourceAction,
    undefined,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="sourceId" value={sourceId} />
      <SubmitButton variant="outline" disabled={pending}>
        Gỡ
      </SubmitButton>
      <Feedback state={state} />
    </form>
  );
}

export function GenerateOffersForm({
  targetId,
  ready,
  blockedReason,
}: {
  targetId: string;
  ready: boolean;
  blockedReason: string | null;
}) {
  const [state, formAction, pending] = useActionState<AdminQualState, FormData>(
    generateOffersAction,
    undefined,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="targetId" value={targetId} />
      {/*
        Nút bị vô hiệu khi kỳ nguồn chưa chốt xong. Sinh vé lúc thứ hạng còn
        có thể đổi nghĩa là sẽ phải thu hồi vé đã gửi — việc không nên xảy ra.
      */}
      <SubmitButton disabled={pending || !ready}>
        {pending ? "Đang sinh vé..." : "Sinh vé tuyển chọn"}
      </SubmitButton>
      {!ready && blockedReason && (
        <p className="mt-2 font-ui text-sm text-muted">{blockedReason}</p>
      )}
      <Feedback state={state} />
    </form>
  );
}

export function ExpireOffersForm({ targetId }: { targetId: string }) {
  const [state, formAction, pending] = useActionState<AdminQualState, FormData>(
    expireOffersAction,
    undefined,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="targetId" value={targetId} />
      <SubmitButton variant="outline" disabled={pending}>
        Đánh dấu vé quá hạn
      </SubmitButton>
      <Feedback state={state} />
    </form>
  );
}
