"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import {
  changePasswordAction,
  type AccountFormState,
} from "@/lib/actions/account";
import { Field, ErrorBanner, SubmitButton } from "@/components/ui";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    changePasswordAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-5">
      <ErrorBanner message={state?.error} />
      {state?.success && (
        <p
          role="status"
          className="border-l-4 border-success bg-success-pale px-4 py-3 font-ui text-sm text-success"
        >
          {state.success}
        </p>
      )}
      <Field
        label="Mật khẩu hiện tại"
        name="current"
        type="password"
        required
        autoComplete="current-password"
      />
      <Field
        label="Mật khẩu mới"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="Tối thiểu 8 ký tự"
      />
      <Field
        label="Nhập lại mật khẩu mới"
        name="confirm"
        type="password"
        required
        autoComplete="new-password"
      />
      <SubmitButton disabled={pending} variant="gold" className="motion-press w-full">
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        {pending ? "Đang lưu…" : "Đổi mật khẩu"}
      </SubmitButton>
    </form>
  );
}
