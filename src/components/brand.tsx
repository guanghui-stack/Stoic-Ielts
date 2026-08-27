import Image from "next/image";
import Link from "next/link";

/**
 * Logo STOIC · IELTS do người dùng cung cấp.
 *
 * Giữ component và các alias cũ để không làm thay đổi cấu trúc import; chỉ thay
 * phần render mark bằng asset vuông đã được tối ưu cho web.
 */
export function StoicMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <Image
      src="/art/stoic/stoic-control-logo.png"
      alt=""
      aria-hidden="true"
      width={40}
      height={40}
      className={`stoic-logo-mark ${className}`}
    />
  );
}

/** Alias tương thích để các import cũ không làm thay đổi cấu trúc code. */
export const HoPhuMark = StoicMark;

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="stoic-logo-link group flex items-center gap-3"
      aria-label="STOIC · IELTS — Trang chủ"
    >
      <StoicMark className={compact ? "h-8 w-8" : "h-10 w-10"} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-stoic font-medium tracking-[-0.035em] text-stoic-slate-900 transition-colors group-hover:text-stoic-primary ${
            compact ? "text-lg" : "text-xl"
          }`}
        >
          STOIC<span className="mx-1 text-stoic-primary">·</span>IELTS
        </span>
        <span className="mt-1 font-stoic text-[0.6rem] font-semibold uppercase tracking-[0.17em] text-stoic-primary-deep">
          Nhận thức · Hành động · Ý chí
        </span>
      </span>
    </Link>
  );
}
