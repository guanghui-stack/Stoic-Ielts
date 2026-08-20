import Link from "next/link";
import type { ReactNode } from "react";

/** Nhãn mục + tiêu đề serif + gạch vàng — mô-típ mở đầu mỗi phần. */
export function SectionHeading({
  label,
  title,
  align = "left",
  className = "",
}: {
  label: string;
  title: string;
  align?: "left" | "center";
  className?: string;
}) {
  const center = align === "center";
  return (
    <div className={`${center ? "text-center" : ""} ${className}`}>
      <p className="label-caps">{label}</p>
      <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-navy-deep md:text-4xl">
        {title}
      </h2>
      <div className={`rule-gold mt-5 ${center ? "mx-auto" : ""}`} />
    </div>
  );
}

/** Hộp lưu ý nền kem đậm, viền vàng bên trái — như cẩm nang in. */
export function NoteBox({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-l-4 border-gold bg-cream-deep px-6 py-5 text-[0.95rem] leading-relaxed text-ink-soft ${className}`}
    >
      {title && <strong className="font-semibold text-ink">{title}. </strong>}
      {children}
    </div>
  );
}

const BTN_BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 px-7 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] transition-colors duration-200";

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "gold";
  className?: string;
}) {
  const styles = {
    primary: "border border-navy bg-navy text-paper hover:bg-navy-deep",
    outline: "border border-navy text-navy hover:bg-navy hover:text-paper",
    // Chữ là navy-deep chứ KHÔNG phải paper: paper trên nền vàng chỉ đạt
    // 3.19:1, trượt chuẩn AA cho nhãn nút. navy-deep đạt 4.56:1.
    // Trạng thái nhấn làm SÁNG lên (gold-soft, 7.25:1) chứ không làm trầm đi:
    // gold-deep sẽ kéo tương phản xuống 3.42:1 và lại trượt chuẩn.
    gold: "border border-gold bg-gold text-navy-deep hover:border-gold-soft hover:bg-gold-soft",
  }[variant];
  return (
    <Link href={href} className={`${BTN_BASE} ${styles} ${className}`}>
      {children}
    </Link>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "outline" | "gold" | "danger";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: "border border-navy bg-navy text-paper hover:bg-navy-deep",
    outline: "border border-navy text-navy hover:bg-navy hover:text-paper",
    // Chữ là navy-deep chứ KHÔNG phải paper: paper trên nền vàng chỉ đạt
    // 3.19:1, trượt chuẩn AA cho nhãn nút. navy-deep đạt 4.56:1.
    // Trạng thái nhấn làm SÁNG lên (gold-soft, 7.25:1) chứ không làm trầm đi:
    // gold-deep sẽ kéo tương phản xuống 3.42:1 và lại trượt chuẩn.
    gold: "border border-gold bg-gold text-navy-deep hover:border-gold-soft hover:bg-gold-soft",
    danger: "border border-danger bg-danger text-paper hover:bg-danger-deep",
  }[variant];
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`${BTN_BASE} ${styles} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

/** Ô nhập liệu chuẩn của hệ thống. */
export function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  autoComplete,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block font-ui text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-ink"
      >
        {label}
        {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="mt-2 w-full border border-line-strong bg-paper px-4 py-3 font-ui text-[0.95rem] text-ink placeholder:text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
      />
      {hint && <p className="mt-1.5 font-ui text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="border-l-4 border-danger bg-danger-pale px-4 py-3 font-ui text-sm text-danger"
    >
      {message}
    </div>
  );
}

export function PageHero({
  label,
  title,
  lede,
}: {
  label: string;
  title: string;
  lede?: string;
}) {
  return (
    <section className="border-b border-line bg-paper">
      <div className="mx-auto max-w-4xl px-6 py-14 md:py-16">
        <p className="label-caps">{label}</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-[1.15] text-navy-deep md:text-5xl">
          {title}
        </h1>
        <div className="rule-gold mt-6" />
        {lede && (
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
            {lede}
          </p>
        )}
      </div>
    </section>
  );
}
