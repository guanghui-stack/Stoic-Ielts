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
  videoSrc,
  children,
}: {
  asset: ArtAsset;
  eyebrow: string;
  /** Nhận ReactNode để tiêu đề dài xuống dòng được đúng chỗ mình muốn. */
  title: React.ReactNode;
  functionalLabel: string;
  /**
   * Bản động của CHÍNH bức tranh trong `asset`, không phải một cảnh khác.
   * Bỏ trống thì hero giữ nguyên như cũ.
   */
  videoSrc?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="ink-wash-fallback relative isolate overflow-hidden border-b border-line">
      {/* Có video thì KHÔNG vẽ tranh tĩnh nữa — quyết định của chủ dự án.
          Nền lúc video chưa chạy là lớp mực CSS `.ink-wash-fallback` của
          section, nên hero không bao giờ trống trơn. */}
      {videoSrc ? null : <InkWashArt asset={asset} priority />}

      {/* Hai màn phủ chỉ có việc khi có tranh TRÀN NỀN phía sau chữ. Bố cục
          video là hai cột tách bạch, chữ nằm trên nền kem sạch — thêm màn phủ
          vào đây chỉ làm đục nền mà không bảo vệ gì. */}
      {videoSrc ? null : (
        <>
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
        </>
      )}

      {/* Có video thì hero là LƯỚI HAI CỘT thật, không phải video thả nổi phía
          sau rồi lấy padding đẩy chữ tránh ra. Cách cũ bóp cột chữ tới mức vỡ
          dòng, vì `padding` tính theo bề rộng khung chứa còn video lại neo
          theo bề rộng màn hình — hai mốc khác nhau nên không bao giờ khớp. */}
      <div
        className={
          videoSrc
            ? "relative md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,42%)] md:items-center"
            : "relative mx-auto max-w-6xl px-6 py-16 md:py-24"
        }
      >
        {/* Lưới trải hết bề ngang để video chạm được mép phải màn hình. Cột
            chữ tự canh về đúng vị trí của khung 72rem bằng padding-left —
            `max()` giữ lề 1.5rem khi màn hình hẹp hơn khung. Cách này thay cho
            lề âm: lề âm vô hiệu khi ô lưới đã bị `w-full` khoá cứng bề rộng. */}
        <div
          className={
            videoSrc
              ? "px-6 py-16 md:py-24 md:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] md:pr-8"
              : ""
          }
        >
          <p className="label-caps">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.12] text-navy-deep md:text-6xl">
            {title}
          </h1>
          <p className="dual-label__function mt-3 text-[0.95rem]">
            {functionalLabel}
          </p>
          <div className="rule-gold mt-7" />
          {children ? <div className="mt-6 max-w-2xl">{children}</div> : null}
        </div>

        {videoSrc ? (
          <video
            className="hero-motion hidden h-auto w-full md:block"
            src={videoSrc}
            autoPlay
            muted
            playsInline
            // Thuần trang trí: không mang thông tin nào mà chữ chưa nói.
            aria-hidden="true"
            tabIndex={-1}
          />
        ) : null}
      </div>
    </section>
  );
}
