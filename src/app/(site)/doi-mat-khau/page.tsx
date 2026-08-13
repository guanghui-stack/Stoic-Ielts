import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { ChangePasswordForm } from "@/components/change-password-form";

export const metadata: Metadata = { title: "Đổi mật khẩu" };

export default async function ChangePasswordPage() {
  const user = await requireUser();
  const backHref = user.role === "ADMIN" ? "/quan-tri" : "/hoc-vien";

  return (
    <section className="motion-page-entry mx-auto max-w-md px-6 py-16 md:py-20">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-navy hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {user.role === "ADMIN" ? "Trang quản trị" : "Hồ sơ học tập"}
      </Link>
      <p className="label-caps mt-8 text-center">Bảo mật tài khoản</p>
      <h1 className="mt-3 text-center font-display text-4xl font-bold text-navy-deep">
        Đổi mật khẩu
      </h1>
      <div className="rule-gold mx-auto mt-5" />
      <p className="mt-5 text-center text-[0.95rem] leading-relaxed text-ink-soft">
        Tài khoản: <strong className="text-ink">{user.email}</strong>
      </p>
      <div className="mt-10 border border-line bg-paper p-8 shadow-card">
        <ChangePasswordForm />
      </div>
    </section>
  );
}
