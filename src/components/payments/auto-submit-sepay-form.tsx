"use client";

import { useEffect, useRef } from "react";

/**
 * Tự gửi biểu mẫu đã ký sang trang thanh toán SePay.
 *
 * Vẫn để một nút bấm thật: nếu JavaScript bị chặn hoặc chuyển hướng tự động
 * thất bại, học viên vẫn đi tiếp được thay vì kẹt ở màn hình trắng.
 */
export function AutoSubmitSePayForm({
  checkoutUrl,
  fields,
}: {
  checkoutUrl: string;
  fields: Record<string, string | number>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.submit();
  }, []);

  return (
    <form ref={formRef} action={checkoutUrl} method="POST" className="mt-8">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
      ))}
      <button
        type="submit"
        className="inline-flex cursor-pointer items-center justify-center gap-2 border border-navy bg-navy px-7 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-paper transition-colors hover:bg-navy-deep"
      >
        Tiếp tục đến trang thanh toán
      </button>
    </form>
  );
}
