"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LogIn, UserRoundPlus } from "lucide-react";
import { loginAction, registerAction } from "@/lib/actions/auth";
import { Field, ErrorBanner, SubmitButton } from "@/components/ui";

/**
 * Nút Google dùng chung cho cả đăng nhập và đăng ký.
 *
 * Một route `/api/auth/google` phục vụ cả hai: chưa có tài khoản thì nó tạo,
 * có rồi thì vào thẳng. Nên hai trang chỉ khác nhau ở CHỮ trên nút, và tách
 * ra đây để không có ngày một bên được sửa còn bên kia bị quên.
 *
 * Là thẻ <a> chứ không phải nút gọi JavaScript: luồng OAuth là một chuỗi
 * chuyển trang thật của trình duyệt, và route cần đặt được cookie `state`
 * trước khi rời khỏi site.
 */
function GoogleAuthButton({ label }: { label: string }) {
  return (
    <>
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="font-ui text-xs uppercase tracking-[0.14em] text-muted">
          hoặc
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <a
        href="/api/auth/google"
        className="flex w-full items-center justify-center gap-3 border border-line-strong bg-paper px-4 py-3 font-ui text-sm font-semibold text-ink transition-colors hover:border-navy hover:bg-cream"
      >
        <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z" />
          <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z" />
          <path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C3 17.1 2.1 20.4 2.1 24s.9 6.9 2.4 9.9l7.3-5.7z" />
          <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.3 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z" />
        </svg>
        {label}
      </a>
    </>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <ErrorBanner message={state?.error} />
      <Field
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="ban@email.com"
      />
      <Field
        label="Mật khẩu"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="••••••••"
      />
      <SubmitButton disabled={pending} className="w-full">
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </SubmitButton>

      <GoogleAuthButton label="Đăng nhập với Google" />

      <p className="text-center font-ui text-sm text-ink-soft">
        Chưa có tài khoản?{" "}
        <Link
          href="/dang-ky"
          className="font-semibold text-navy underline decoration-gold decoration-2 underline-offset-4 hover:text-gold"
        >
          Đăng ký miễn phí
        </Link>
      </p>
      <p className="text-center font-ui text-xs text-muted">
        Quên mật khẩu? Liên hệ trung tâm qua hotline 0901 234 567 để được cấp lại.
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <ErrorBanner message={state?.error} />
      <Field
        label="Họ và tên"
        name="name"
        required
        autoComplete="name"
        placeholder="Nguyễn Văn A"
      />
      <Field
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="ban@email.com"
        hint="Email là tên đăng nhập và nơi nhận thông báo kết quả chấm bài."
      />
      <Field
        label="Mật khẩu"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="Tối thiểu 8 ký tự"
      />
      <Field
        label="Nhập lại mật khẩu"
        name="confirm"
        type="password"
        required
        autoComplete="new-password"
        placeholder="Nhập lại mật khẩu"
      />
      <SubmitButton disabled={pending} variant="gold" className="w-full">
        <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
        {pending ? "Đang tạo tài khoản…" : "Tạo tài khoản học viên"}
      </SubmitButton>

      <GoogleAuthButton label="Đăng ký với Google" />
      <p className="text-center font-ui text-sm text-ink-soft">
        Đã có tài khoản?{" "}
        <Link
          href="/dang-nhap"
          className="font-semibold text-navy underline decoration-gold decoration-2 underline-offset-4 hover:text-gold"
        >
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
