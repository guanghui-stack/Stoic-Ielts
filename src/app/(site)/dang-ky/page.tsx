import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { RegisterForm } from "@/components/auth-forms";
import { QuietWorldPanel } from "@/components/world/quiet-world-panel";

export const metadata: Metadata = {
  title: "Đăng ký tài khoản",
  description:
    "Tạo tài khoản học viên HỔ PHÙ · IELTS miễn phí — luyện tập 4 kỹ năng IELTS với đồng hồ thi thật và được giáo viên chấm chữa Writing.",
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/quan-tri" : "/hoc-vien");

  return (
    <QuietWorldPanel
      eyebrow="Miễn phí trọn đời"
      title="Tạo tài khoản học viên"
      lede="Một tài khoản — toàn bộ phòng luyện tập: đề Reading chấm tự động, đề Writing có giáo viên nhận xét và hồ sơ tiến độ của riêng bạn."
    >
      <RegisterForm />
    </QuietWorldPanel>
  );
}
