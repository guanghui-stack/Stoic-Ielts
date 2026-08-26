import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/auth-forms";
import { QuietWorldPanel } from "@/components/world/quiet-world-panel";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập STOIC · IELTS để tiếp tục luyện Reading, xem tiến bộ và giữ nhịp học của bạn.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/quan-tri" : "/hoc-vien");

  return (
    <QuietWorldPanel
      eyebrow="Quay về điều đang làm"
      title="Đăng nhập"
      lede="Tiếp tục từ đúng nơi bạn đã dừng. Bài làm, dữ liệu tiến bộ và những điều cần rèn vẫn được giữ trong hồ sơ của bạn."
    >
      <LoginForm />
    </QuietWorldPanel>
  );
}
