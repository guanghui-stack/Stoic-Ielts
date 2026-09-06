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
        <span className="font-ui text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
          hoặc tiếp tục với
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <a
        href="/api/auth/google"
        className="motion-press flex w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-paper px-4 py-3 font-ui text-sm font-semibold text-ink transition-colors hover:border-navy hover:bg-cream"
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

function AuthBrandMark() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-paper shadow-lift">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gold text-navy" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-gold" />
      </span>
    </div>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-5" aria-busy={pending}>
      <div className="mb-7 text-center">
        <AuthBrandMark />
        <p className="label-caps mt-6">Quay về điều đang làm</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-navy-deep">Đăng nhập</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
          Tiếp tục rèn luyện với sự bình tĩnh, rõ ràng và một bước tiến có chủ đích.
        </p>
      </div>

      <div className="space-y-4">
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
      </div>

      <div className="flex justify-end">
        <p className="font-ui text-xs text-muted">
          Quên mật khẩu? Liên hệ trung tâm qua hotline 0917 920 345 hoặc
          info@stoic-ielts.online.
        </p>
      </div>

      <div className="rounded-xl">
        <ErrorBanner message={state?.error} />
      </div>

      <SubmitButton
        disabled={pending}
        className="motion-press w-full rounded-xl border-0 bg-gradient-to-b from-navy to-navy-deep py-3 text-paper shadow-lift hover:brightness-110"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {pending ? "Đang đăng nhập…" : "Bắt đầu"}
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
      <SubmitButton disabled={pending} variant="gold" className="motion-press w-full">
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
