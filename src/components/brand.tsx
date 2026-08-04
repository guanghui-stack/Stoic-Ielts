import Link from "next/link";

/**
 * Logomark HỔ PHÙ · IELTS — binh phù xẻ đôi.
 *
 * Hổ phù là binh phù cổ được xẻ làm hai nửa: một nửa giữ ở triều đình, một
 * nửa giao cho tướng ngoài biên. Lệnh chỉ có hiệu lực khi hai nửa khớp vào
 * nhau. Ở đây cũng vậy — một nửa là kết quả đo được (band, độ chính xác,
 * thời gian), nửa còn lại là quá trình kiểm chứng được (phục bàn, ngày học
 * thật, liêm chính). Cấp bậc chỉ được trao khi hai phía cùng hợp lệ.
 *
 * Nửa trái tô đặc: thứ đã đo được, không bàn cãi.
 * Nửa phải để rỗng viền: quá trình — thứ chỉ có giá trị khi tự mình đi qua.
 * Ba khấc răng cưa ăn khớp giữa hai nửa là ba trụ: Chiến trận, Phục bàn,
 * Luyện binh.
 *
 * Không có ký tự nào trong logomark. Quy tắc production cấm chữ Hán ở mọi
 * nơi, kể cả họa tiết con dấu, nên binh phù ở đây thuần túy là hình học.
 */
export function HoPhuMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22" stroke="#1e3a5c" strokeWidth="2" />

      {/* Nửa trái — kết quả đã đo được, tô đặc */}
      <path
        d="M24 13H17a4 4 0 0 0-4 4v14a4 4 0 0 0 4 4h7v-3h4v-4h-4v-3h4v-4h-4v-3h4v-4h-4z"
        fill="#1e3a5c"
      />

      {/* Nửa phải — quá trình, để rỗng; khấc lõm ăn khớp với khấc lồi bên trái */}
      <path
        d="M24 13v1h4v4h-4v3h4v4h-4v3h4v4h-4v3h7a4 4 0 0 0 4-4V17a4 4 0 0 0-4-4z"
        stroke="#b8862b"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <HoPhuMark className={compact ? "h-8 w-8" : "h-10 w-10"} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display font-bold tracking-tight text-navy-deep transition-colors group-hover:text-navy ${
            compact ? "text-lg" : "text-xl"
          }`}
        >
          HỔ PHÙ<span className="text-gold">·</span>IELTS
        </span>
        <span className="mt-1 font-ui text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold-ink">
          Chiến trận · Phục bàn · Luyện binh
        </span>
      </span>
    </Link>
  );
}
