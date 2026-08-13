"use client";

import { useActionState, useState } from "react";
import { KeyRound, X } from "lucide-react";
import {
  resetUserPasswordAction,
  type AdminFormState,
} from "@/lib/actions/admin";
import { ErrorBanner, SubmitButton } from "@/components/ui";

export function ResetPasswordForm({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    resetUserPasswordAction,
    undefined
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Đặt lại mật khẩu cho ${userEmail}`}
        className="motion-press flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-ink-soft hover:border-navy hover:text-navy"
      >
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Đặt lại mật khẩu</span>
      </button>
    );
  }

  return (
    <div className="motion-panel-swap flex flex-col items-end gap-2">
      {state?.error && <ErrorBanner message={state.error} />}
      {state?.success && (
        <p className="border-l-4 border-success bg-success-pale px-3 py-1.5 font-ui text-xs text-success">
          {state.success}
        </p>
      )}
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="userId" value={userId} />
        <input
          type="text"
          name="newPassword"
          required
          minLength={8}
          placeholder="Mật khẩu mới (≥8 ký tự)"
          className="w-48 border border-line-strong bg-paper px-3 py-2 font-ui text-sm focus:border-navy focus:outline-none"
        />
        <SubmitButton disabled={pending} className="motion-press !px-4 !py-2">
          {pending ? "…" : "Đặt lại"}
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Đóng"
          className="motion-press flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-ink-soft hover:text-danger"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
