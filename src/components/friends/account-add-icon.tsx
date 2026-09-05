import type { SVGProps } from "react";

/** Bien the tinh tu mau nguoi dung cung cap; chuyen dong nam o nut bao quanh. */
export function AccountAddIcon({
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      {...props}
    >
      <path d="M3 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
      <circle cx="9" cy="10" r="3" />
      <path d="M15 6h6M18 3v6" />
    </svg>
  );
}
