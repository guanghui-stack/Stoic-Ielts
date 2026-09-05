import type { SVGProps } from "react";

/** Huy chuong hinh hoc cho Duc Hanh: ro nghia o kich thuoc nho, khong dung chu Han. */
export function MeritSealIcon({
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="m8.4 14.4-1 6.1 4.6-2.3 4.6 2.3-1-6.1"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M12 2.75 14 4l2.35-.05.7 2.25 1.95 1.3-.8 2.2.8 2.2-1.95 1.3-.7 2.25L14 15.4l-2 1.25-2-1.25-2.35.05-.7-2.25L5 11.9l.8-2.2L5 7.5l1.95-1.3.7-2.25L10 4l2-1.25Z"
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="m9.25 9.8 1.8 1.8 3.85-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
