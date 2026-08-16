import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/auth-forms";
import { QuietWorldPanel } from "@/components/world/quiet-world-panel";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập tài khoản học viên HỔ PHÙ · IELTS để vào phòng luyện tập 4 kỹ năng.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/quan-tri" : "/hoc-vien");

  return (
    <QuietWorldPanel
      eyebrow="Khu vực học viên"
      title="Đăng nhập"
      lede="Tiếp tục hành trình luyện tập của bạn — mọi bài làm và kết quả đều được lưu trong hồ sơ học tập."
    >
      <LoginForm />
    </QuietWorldPanel>
  );
}
