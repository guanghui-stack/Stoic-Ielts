import { notFound } from "next/navigation";
import { StudentAvatar } from "@/components/student/student-avatar";
import { VoteButtons } from "@/components/forum/vote-buttons";
import { ReputationCard } from "@/components/student/reputation-card";

export const metadata = { title: "Xem thử kết nối và uy vọng" };

/**
 * Xem thử — dữ liệu minh họa, KHÔNG chạm database.
 *
 * Ba thứ trên trang này đều nằm sau lớp đăng nhập nên không soi được trước khi
 * phát hành: chấm trạng thái trên avatar, nút Like/Dislike, và khối uy vọng.
 * Cùng khuôn với `xem-thu-cbt`, `xem-thu-doi-chieu`, `xem-thu-cap-bac`.
 */
export default function ConnectionPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const sizes = ["sm", "md", "lg", "xl"] as const;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="label-caps">Xem thử giao diện · dữ liệu minh họa</p>
      <h1 className="mt-3 font-display text-2xl font-bold text-navy-deep md:text-3xl">
        Kết nối và uy vọng
      </h1>

      {/* ===== 1. Chấm trạng thái trên avatar ===== */}
      <h2 className="mt-10 font-display text-lg font-bold text-navy-deep">
        Chấm trạng thái — bốn cỡ avatar
      </h2>
      <p className="mt-1 font-ui text-sm text-ink-soft">
        Chấm phải nằm gọn trên viền vòng tròn ở mọi cỡ, không bị mặt nạ tròn xén
        mất một góc.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-8 border border-line bg-paper p-6">
        {sizes.map((size) => (
          <div key={size} className="text-center">
            <StudentAvatar name="Đặng Quang Minh" email="" size={size} showStatus online />
            <p className="mt-2 font-ui text-xs text-muted">{size} · trực tuyến</p>
          </div>
        ))}
        {sizes.map((size) => (
          <div key={`${size}-off`} className="text-center">
            <StudentAvatar name="Đặng Quang Minh" email="" size={size} showStatus online={false} />
            <p className="mt-2 font-ui text-xs text-muted">{size} · ngoại tuyến</p>
          </div>
        ))}
      </div>

      {/* ===== 2. Like / Dislike ===== */}
      <h2 className="mt-12 font-display text-lg font-bold text-navy-deep">
        Nút Like và Dislike
      </h2>
      <p className="mt-1 font-ui text-sm text-ink-soft">
        Tim tô đỏ và phình nhẹ khi bấm, con số trượt lên thay số cũ. Nút Dislike
        cố ý KHÔNG có con số.
      </p>
      <div className="mt-4 space-y-4 border border-line bg-paper p-6">
        <div className="flex flex-wrap items-center gap-6">
          <span className="w-40 font-ui text-xs text-muted">Chưa bầu</span>
          <VoteButtons
            targetType="POST"
            targetId="xem-thu-1"
            upCount={68}
            myValue={0}
            path="/xem-thu-ket-noi"
            disabled={false}
          />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <span className="w-40 font-ui text-xs text-muted">Đã Like</span>
          <VoteButtons
            targetType="POST"
            targetId="xem-thu-2"
            upCount={69}
            myValue={1}
            path="/xem-thu-ket-noi"
            disabled={false}
          />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <span className="w-40 font-ui text-xs text-muted">Đã Dislike</span>
          <VoteButtons
            targetType="POST"
            targetId="xem-thu-3"
            upCount={12}
            myValue={-1}
            path="/xem-thu-ket-noi"
            disabled={false}
          />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <span className="w-40 font-ui text-xs text-muted">Chỉ xem (khách)</span>
          <VoteButtons
            targetType="POST"
            targetId="xem-thu-4"
            upCount={7}
            myValue={0}
            path="/xem-thu-ket-noi"
            disabled
          />
        </div>
      </div>

      {/* ===== 3. Uy vọng và UID ===== */}
      <h2 className="mt-12 font-display text-lg font-bold text-navy-deep">
        Khối uy vọng và mã UID trên trang cá nhân
      </h2>
      <div className="mt-4 space-y-4">
        <ReputationCard balance={42} convertible={42} converted={0} uid="K3M9-7QX2" />
        <ReputationCard balance={15} convertible={15} converted={25} uid="P7RT-2WHY" />
        <ReputationCard balance={-6} convertible={0} converted={0} uid="B4NX-9KDS" />
      </div>
    </section>
  );
}
