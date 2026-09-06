import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { footerNavItems, READING_NAV } from "@/lib/nav";
import { features } from "@/lib/features";
import { StoicMark } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-stoic-slate-950 text-white">
      <div className="h-[3px] bg-gradient-to-r from-stoic-sherbet via-stoic-primary to-stoic-ruby" />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <StoicMark className="h-10 w-10" />
            <div className="leading-none">
              <p className="font-stoic text-xl font-medium tracking-[-0.035em] text-white">
                STOIC<span className="mx-1 text-stoic-lavender">·</span>IELTS
              </p>
              <p className="mt-1 font-stoic text-[0.6rem] font-semibold uppercase tracking-[0.17em] text-stoic-lavender">
                Nhận thức · Hành động · Ý chí
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-white/68">
            Bạn không kiểm soát độ khó của đề. Bạn kiểm soát cách đọc, cách chữa
            lỗi và việc quay lại học vào ngày mai. STOIC · IELTS giúp biến những
            lựa chọn đó thành một tiến trình có thể nhìn thấy.
          </p>
          <p className="mt-5 text-[0.95rem] font-semibold leading-relaxed text-white/90">
            Công ty TNHH Kết Nối Toàn Cầu
          </p>
          <ul className="mt-4 space-y-2.5 font-ui text-sm text-white/75">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stoic-lavender" aria-hidden="true" />
              <span>23/53G Nguyễn Hữu Tiến, Phường Tây Thạnh, Thành phố Hồ Chí Minh, Việt Nam</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-stoic-lavender" aria-hidden="true" />
              <a href="tel:+84917920345" className="transition-colors hover:text-white">
                0917 920 345
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-stoic-lavender" aria-hidden="true" />
              <a
                href="mailto:info@stoic-ielts.online"
                className="transition-colors hover:text-white"
              >
                info@stoic-ielts.online
              </a>
            </li>
          </ul>
        </div>

        <nav aria-label="Liên kết nhanh">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stoic-lavender">
            Khám phá
          </p>
          <ul className="mt-4 space-y-2.5">
            {footerNavItems(features.competitionTiers).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-ui text-sm text-white/70 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Kho Reading">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stoic-lavender">
            IELTS Reading
          </p>
          <ul className="mt-4 space-y-2.5">
            {READING_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-ui text-sm text-white/70 transition-colors hover:text-white"
                >
                  Reading {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stoic-lavender">
            Học viên
          </p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link href="/dang-nhap" className="font-ui text-sm text-white/70 transition-colors hover:text-white">
                Đăng nhập
              </Link>
            </li>
            <li>
              <Link href="/dang-ky" className="font-ui text-sm text-white/70 transition-colors hover:text-white">
                Đăng ký tài khoản
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-6 py-5 font-ui text-xs tracking-wide text-white/45">
          © {new Date().getFullYear()} Công ty TNHH Kết Nối Toàn Cầu. Bảo lưu mọi quyền.
        </p>
      </div>
    </footer>
  );
}
