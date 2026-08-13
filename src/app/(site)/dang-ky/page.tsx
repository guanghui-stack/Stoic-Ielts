import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { RegisterForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Đăng ký tài khoản",
  description:
    "Tạo tài khoản học viên HỔ PHÙ · IELTS miễn phí — luyện tập 4 kỹ năng IELTS với đồng hồ thi thật và được giáo viên chấm chữa Writing.",
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/quan-tri" : "/hoc-vien");

  return (
    <section className="motion-page-entry mx-auto max-w-md px-6 py-16 md:py-20">
      <p className="label-caps text-center">Miễn phí trọn đời</p>
      <h1 className="mt-3 text-center font-display text-4xl font-bold text-navy-deep">
        Tạo tài khoản học viên
      </h1>
      <div className="rule-gold mx-auto mt-5" />
      <p className="mt-5 text-center text-[0.98rem] leading-relaxed text-ink-soft">
        Một tài khoản — toàn bộ phòng luyện tập: đề Reading chấm tự động, đề
        Writing có giáo viên nhận xét và hồ sơ tiến độ của riêng bạn.
      </p>
      <div className="mt-10 border border-line bg-paper p-8 shadow-card">
        <RegisterForm />
      </div>
    </section>
  );
}
