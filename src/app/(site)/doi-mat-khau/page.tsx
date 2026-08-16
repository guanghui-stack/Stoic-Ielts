import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { ChangePasswordForm } from "@/components/change-password-form";
import { QuietWorldPanel } from "@/components/world/quiet-world-panel";

export const metadata: Metadata = { title: "Đổi mật khẩu" };

export default async function ChangePasswordPage() {
  const user = await requireUser();
  const backHref = user.role === "ADMIN" ? "/quan-tri" : "/hoc-vien";

  return (
    <QuietWorldPanel eyebrow="Bảo mật tài khoản" title="Đổi mật khẩu">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-navy hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {user.role === "ADMIN" ? "Trang quản trị" : "Hồ sơ học tập"}
      </Link>
      <p className="mt-6 text-[0.95rem] leading-relaxed text-ink-soft">
        Tài khoản: <strong className="text-ink">{user.email}</strong>
      </p>
      <div className="mt-8">
        <ChangePasswordForm />
      </div>
    </QuietWorldPanel>
  );
}
