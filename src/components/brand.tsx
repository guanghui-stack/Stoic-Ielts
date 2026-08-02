import Link from "next/link";

/**
 * Logomark STOIC·IELTS — cây cột đá đứng trong vòng tròn.
 *
 * Cột đá là hình ảnh cổ điển của chủ nghĩa Khắc kỷ: thứ trụ được qua hàng nghìn
 * năm mưa nắng nhờ đứng vững, không nhờ chạy nhanh. Ba rãnh dọc là ba trụ của
 * hành trình — Giải đề, Sửa đề, Kỷ luật. Chân đế được vẽ dày nhất vì nền móng
 * mới là thứ đỡ tất cả những gì bên trên.
 */
export function StoicMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22" stroke="#1e3a5c" strokeWidth="2" />
      {/* Đầu cột */}
      <path d="M15 15.5h18" stroke="#b8862b" strokeWidth="2.6" strokeLinecap="round" />
      {/* Thân cột: ba rãnh dọc = ba trụ */}
      <path
        d="M19 18v12.5M24 18v12.5M29 18v12.5"
        stroke="#1e3a5c"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      {/* Chân đế — dày nhất, vì nền móng đỡ tất cả */}
      <path d="M13.5 33h21" stroke="#1e3a5c" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 36.5h16" stroke="#b8862b" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <StoicMark className={compact ? "h-8 w-8" : "h-10 w-10"} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display font-bold tracking-tight text-navy-deep transition-colors group-hover:text-navy ${
            compact ? "text-lg" : "text-xl"
          }`}
        >
          STOIC<span className="text-gold">·</span>IELTS
        </span>
        <span className="mt-1 font-ui text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold">
          Kiên trì · Kỷ luật · Danh dự
        </span>
      </span>
    </Link>
  );
}
