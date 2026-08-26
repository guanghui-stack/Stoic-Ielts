import Link from "next/link";

/**
 * Biểu tượng STOIC · IELTS — Vòng tròn kiểm soát.
 *
 * Tâm điểm là lựa chọn của người học. Hai quỹ đạo mở nhắc rằng kết quả và hoàn
 * cảnh luôn chuyển động bên ngoài, còn hành động đúng tiếp theo bắt đầu từ tâm.
 * Ba điểm trên quỹ đạo là ba trụ Nhận thức, Hành động và Ý chí.
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
      <circle cx="24" cy="24" r="21" fill="white" fillOpacity="0.72" />
      <path
        d="M34.8 8.9A18.7 18.7 0 1 0 40.9 31"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M30.9 15.3a11.2 11.2 0 1 0 3.8 15.2"
        stroke="#8f92f5"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="4.25" fill="currentColor" />
      <circle cx="36.2" cy="11.8" r="2.2" fill="#d85b78" />
      <circle cx="39.6" cy="31.8" r="2.2" fill="#33745a" />
      <circle cx="11.2" cy="34.3" r="2.2" fill="#d78a58" />
    </svg>
  );
}

/** Alias tương thích để các import cũ không làm thay đổi cấu trúc code. */
export const HoPhuMark = StoicMark;

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="STOIC · IELTS — Trang chủ">
      <StoicMark
        className={`${compact ? "h-8 w-8" : "h-10 w-10"} text-stoic-primary transition-transform duration-300 group-hover:rotate-6`}
      />
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
