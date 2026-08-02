"use client";

import { useActionState, useState } from "react";
import { Eye } from "lucide-react";
import {
  savePublicProfileAction,
  type ProfileState,
} from "@/lib/actions/public-profile";

/**
 * Học viên tự quyết định có hiện tên mình ở Điện Danh Vọng không.
 * Mặc định là KHÔNG — công khai phải là lựa chọn chủ động.
 */
export function PublicProfileForm({
  displayName,
  allowHall,
}: {
  displayName: string;
  allowHall: boolean;
}) {
  const [enabled, setEnabled] = useState(allowHall);
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    savePublicProfileAction,
    undefined
  );

  return (
    <form action={formAction} className="mt-10 border border-line bg-paper p-7">
      <p className="label-caps flex items-center gap-2">
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        Hiển thị công khai
      </p>
      <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep">
        Bạn có muốn xuất hiện ở Điện Danh Vọng không?
      </h2>
      <p className="mt-3 max-w-2xl text-[0.94rem] leading-relaxed text-ink-soft">
        Không bật thì danh hiệu của bạn vẫn được tính vào tổng số, chỉ là không
        hiện tên. Email, điểm số và lịch sử học tập không bao giờ công khai —
        dù bạn có bật hay không.
      </p>

      <label className="mt-5 flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          name="allowHall"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-5 w-5 cursor-pointer accent-[#1e3a5f]"
        />
        <span className="font-ui text-sm text-ink">
          Hiện tên tôi ở Điện Danh Vọng
        </span>
      </label>

      <label className="mt-4 block max-w-sm">
        <span className="block font-ui text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink">
          Tên hiển thị
        </span>
        <input
          name="displayName"
          defaultValue={displayName}
          maxLength={40}
          placeholder="Tên hoặc biệt danh bạn muốn dùng"
          className="mt-1.5 w-full border border-line-strong bg-paper px-3 py-2.5 font-ui text-sm text-ink"
        />
        <span className="mt-1.5 block font-ui text-xs text-muted">
          Bạn có thể dùng biệt danh, không nhất thiết là tên thật.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex cursor-pointer items-center border border-navy px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-navy transition-colors hover:bg-navy hover:text-paper disabled:opacity-50"
      >
        {pending ? "Đang lưu…" : "Lưu lựa chọn"}
      </button>

      {state?.error && <p className="mt-3 font-ui text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="mt-3 font-ui text-sm text-success">{state.success}</p>}
    </form>
  );
}
