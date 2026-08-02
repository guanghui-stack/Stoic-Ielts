import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập tài khoản học viên STOIC-IELTS để vào phòng luyện tập 4 kỹ năng.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/quan-tri" : "/hoc-vien");

  return (
    <section className="mx-auto max-w-md px-6 py-16 md:py-20">
      <p className="label-caps text-center">Khu vực học viên</p>
      <h1 className="mt-3 text-center font-display text-4xl font-bold text-navy-deep">
        Đăng nhập
      </h1>
      <div className="rule-gold mx-auto mt-5" />
      <p className="mt-5 text-center text-[0.98rem] leading-relaxed text-ink-soft">
        Tiếp tục hành trình luyện tập của bạn — mọi bài làm và kết quả đều được
        lưu trong hồ sơ học tập.
      </p>
      <div className="mt-10 border border-line bg-paper p-8 shadow-card">
        <LoginForm />
      </div>
    </section>
  );
}
