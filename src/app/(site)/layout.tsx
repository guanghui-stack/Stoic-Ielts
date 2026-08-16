import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WorldShell } from "@/components/world/world-shell";

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <WorldShell header={<SiteHeader />} footer={<SiteFooter />}>
      {/*
        Vân giấy gạo chỉ phủ khu vực trang thường. Nhóm route (exam) có
        layout riêng và cố ý không nhận lớp này: phòng thi Reading giữ nền
        trắng trung tính mô phỏng đề thi thật.
      */}
      <main className="paper-grain flex-1">{children}</main>
    </WorldShell>
  );
}
