import { requireAdmin } from "@/lib/session";
import { features } from "@/lib/features";
import { AdminNav } from "@/components/admin/admin-nav";

/**
 * Tab "Tuyển chọn" chỉ hiện khi cờ ba tầng đại thí được bật. Hiện một tab dẫn
 * tới trang trả 404 thì tệ hơn là không hiện gì.
 */
const TABS = [
  { href: "/quan-tri", label: "Tổng quan" },
  { href: "/quan-tri/bai-tap", label: "Bài tập" },
  { href: "/quan-tri/hoc-vien", label: "Học viên" },
  { href: "/quan-tri/thanh-toan", label: "Thanh toán" },
  { href: "/quan-tri/phan-thuong", label: "Phần thưởng" },
  { href: "/quan-tri/bo-de", label: "Bộ đề" },
  { href: "/quan-tri/cuoc-thi", label: "Nguyệt Thí" },
  { href: "/quan-tri/nghi-su-duong", label: "Nghị Sự Đường" },
  { href: "/quan-tri/thi-but", label: "Thí Bút" },
  ...(features.ranks ? [{ href: "/quan-tri/cap-bac", label: "Cấp bậc" }] : []),
  ...(features.hoPhuBrand ? [{ href: "/quan-tri/hinh-anh", label: "Hình ảnh" }] : []),
  ...(features.competitionTiers
    ? [{ href: "/quan-tri/tuyen-chon", label: "Tuyển chọn" }]
    : []),
  // Đây là trang duy nhất xem được tiền đã tiêu cho OpenAI. Không có tab thì
  // phải nhớ URL mới vào được — đúng cái trang cần liếc hằng ngày.
  ...(features.feynmanAi ? [{ href: "/quan-tri/ai-feynman", label: "AI Feynman" }] : []),
  { href: "/doi-mat-khau", label: "Đổi mật khẩu" },
];

export const metadata = { title: "Quản trị" };

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return (
    <>
      <div
        data-admin-chrome="true"
        className="border-b border-line bg-navy-deep"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <p className="font-ui text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gold-soft">
            Khu vực quản trị · HỔ PHÙ · IELTS
          </p>
          <AdminNav tabs={TABS} />
        </div>
      </div>
      {children}
    </>
  );
}
