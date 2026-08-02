import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { MAIN_NAV, READING_NAV } from "@/lib/nav";
import { StoicMark } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy-deep text-cream">
      <div className="h-[3px] bg-gold" />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <StoicMark className="h-10 w-10 [&_circle]:stroke-cream [&_path]:stroke-gold-soft" />
            <div className="leading-none">
              <p className="font-display text-xl font-bold text-paper">
                STOIC<span className="text-gold-soft">·</span>IELTS
              </p>
              <p className="mt-1 font-ui text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold-soft">
                Kiên trì · Kỷ luật · Danh dự
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-cream/75">
            Điểm số là hệ quả, kỷ luật mới là thứ bạn kiểm soát. Nền tảng luyện
            IELTS Reading theo hai định dạng Academic và General, bám sát điều
            kiện phòng thi thật.
          </p>
          <p className="mt-5 text-[0.95rem] font-semibold leading-relaxed text-cream/90">
            Công ty TNHH Kết Nối Toàn Cầu
          </p>
          <ul className="mt-4 space-y-2.5 font-ui text-sm text-cream/85">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-soft" aria-hidden="true" />
              <span>23/53G Nguyễn Hữu Tiến, Phường Tây Thạnh, Thành phố Hồ Chí Minh, Việt Nam</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-gold-soft" aria-hidden="true" />
              <a href="tel:+84866868701" className="transition-colors hover:text-gold-soft">
                0866 868 701
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-gold-soft" aria-hidden="true" />
              hello@wobridges.vn
            </li>
          </ul>
        </div>

        <nav aria-label="Liên kết nhanh">
          <p className="label-caps text-gold-soft">Khám phá</p>
          <ul className="mt-4 space-y-2.5">
            {MAIN_NAV.filter((i) => i.href !== "/").map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-ui text-sm text-cream/80 transition-colors hover:text-gold-soft"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Kho Reading">
          <p className="label-caps text-gold-soft">IELTS Reading</p>
          <ul className="mt-4 space-y-2.5">
            {READING_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-ui text-sm text-cream/80 transition-colors hover:text-gold-soft"
                >
                  Reading {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="label-caps mt-8 text-gold-soft">Học viên</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link href="/dang-nhap" className="font-ui text-sm text-cream/80 transition-colors hover:text-gold-soft">
                Đăng nhập
              </Link>
            </li>
            <li>
              <Link href="/dang-ky" className="font-ui text-sm text-cream/80 transition-colors hover:text-gold-soft">
                Đăng ký tài khoản
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-cream/15">
        <p className="mx-auto max-w-6xl px-6 py-5 font-ui text-xs tracking-wide text-cream/50">
          © {new Date().getFullYear()} Công ty TNHH Kết Nối Toàn Cầu. Bảo lưu mọi quyền.
        </p>
      </div>
    </footer>
  );
}
