import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { RegisterForm } from "@/components/auth-forms";
import { QuietWorldPanel } from "@/components/world/quiet-world-panel";

export const metadata: Metadata = {
  title: "Đăng ký tài khoản",
  description:
    "Tạo tài khoản STOIC · IELTS miễn phí để luyện Reading trong điều kiện thật, theo dõi tiến bộ và xây một nhịp học bền vững.",
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/quan-tri" : "/hoc-vien");

  return (
    <QuietWorldPanel
      eyebrow="Bắt đầu từ điều bạn kiểm soát"
      title="Tạo tài khoản học viên"
      lede="Một tài khoản để làm Reading trong điều kiện thật, nhìn lại dữ liệu của chính mình và chọn đúng việc cần làm tiếp theo."
    >
      <RegisterForm />
    </QuietWorldPanel>
  );
}
