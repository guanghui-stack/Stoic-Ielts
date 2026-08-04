import { ACCENT_WASH_CLASS, type ArtAsset } from "@/lib/brand/art-manifest";
import { InkWashArt } from "@/components/brand/ink-wash-art";

/**
 * Hero thủy mặc — khối mở đầu chuẩn cho mọi trang lớn ngoài phòng thi.
 *
 * Cấu trúc ba lớp, từ dưới lên:
 *  1. nền mực CSS (.ink-wash-fallback) — luôn có mặt, không phụ thuộc mạng,
 *  2. tranh thủy mặc, tự ẩn nếu file chưa tồn tại,
 *  3. màn phủ chuyển sắc từ nền kem, để chữ luôn đủ tương phản.
 *
 * Lớp 3 là thứ khiến hero này an toàn: dải phủ đục ở phía chữ và trong suốt
 * dần về phía chủ thể tranh. Nhờ vậy tiêu đề đọc được bất kể bức tranh phía
 * sau sáng hay tối, và không cần chỉnh lại độ mờ cho từng ảnh một.
 *
 * Nhãn kép (Master Spec §3): `eyebrow` mang tên cổ phong, `functionalLabel`
 * nói thẳng trang này làm gì. Người mới đọc dòng thứ hai là hiểu, không phải
 * đoán nghĩa từ Hán-Việt.
 *
 * Không dùng component này trong phòng thi Reading CBT. Phòng thi giữ giao
 * diện trung tính mô phỏng đề thật; thêm giấy gạo và mực vào vùng passage
 * chỉ làm giảm khả năng đọc và sai mục tiêu mô phỏng.
 */
export function InkWashHero({
  asset,
  eyebrow,
  title,
  functionalLabel,
  children,
}: {
  asset: ArtAsset;
  eyebrow: string;
  /** Nhận ReactNode để tiêu đề dài xuống dòng được đúng chỗ mình muốn. */
  title: React.ReactNode;
  functionalLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="ink-wash-fallback relative isolate overflow-hidden border-b border-line">
      <InkWashArt asset={asset} priority />

      {/* Màn phủ giữ tương phản chữ. aria-hidden vì thuần trang trí. */}
      <div
        className={`absolute inset-0 bg-gradient-to-r ${
          ACCENT_WASH_CLASS[asset.accent]
        } via-transparent to-transparent`}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-cream via-cream/85 to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
        <p className="label-caps">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.12] text-navy-deep md:text-6xl">
          {title}
        </h1>
        <p className="dual-label__function mt-3 text-[0.95rem]">{functionalLabel}</p>
        <div className="rule-gold mt-7" />
        {children ? <div className="mt-6 max-w-2xl">{children}</div> : null}
      </div>
    </section>
  );
}
