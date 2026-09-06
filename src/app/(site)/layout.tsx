import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WorldShell } from "@/components/world/world-shell";
import { StudentQuickAccess } from "@/components/student/student-quick-access";
import { getCurrentUser } from "@/lib/session";
import { canUseChatRealtime } from "@/lib/chat/realtime-rules";
import { Suspense } from "react";
import { ChatDock } from "@/components/chat/chat-dock";

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <>
    <WorldShell
      header={<SiteHeader />}
      footer={<SiteFooter />}
      quickAccess={user && canUseChatRealtime(user) ? <StudentQuickAccess key={user.id} userId={user.id} /> : null}
    >
      {/*
        Vân giấy gạo chỉ phủ khu vực trang thường. Nhóm route (exam) có
        layout riêng và cố ý không nhận lớp này: phòng thi Reading giữ nền
        trắng trung tính mô phỏng đề thi thật.
      */}
      <main className="paper-grain flex-1">{children}</main>
    </WorldShell>
    {user && canUseChatRealtime(user) ? <Suspense fallback={null}><ChatDock key={user.id} userId={user.id} /></Suspense> : null}
    </>
  );
}
