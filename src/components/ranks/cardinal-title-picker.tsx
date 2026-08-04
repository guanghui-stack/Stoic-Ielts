"use client";

import { useActionState } from "react";
import { Compass } from "lucide-react";
import { CARDINAL_TITLES, type CardinalTitleCode } from "@/lib/ranks/catalog";
import { chooseCardinalTitleAction } from "@/lib/actions/ranks";
import { ErrorBanner, SubmitButton } from "@/components/ui";

/**
 * Chọn một trong bốn hiệu ở bậc 8.
 *
 * Bốn hiệu hoàn toàn ngang nhau — không hiệu nào mạnh hơn, mở thêm gì hay
 * cộng điểm. Giao diện phải nói thẳng điều đó, nếu không người học sẽ đi tìm
 * "lựa chọn tối ưu" cho một quyết định vốn không có đáp án đúng, rồi lo lắng
 * vì chọn nhầm.
 */
export function CardinalTitlePicker({
  current,
}: {
  current?: string | null;
}) {
  const [state, formAction, pending] = useActionState<
    { error?: string; success?: string } | undefined,
    FormData
  >(async (_prev, formData) => {
    const code = String(formData.get("code") ?? "") as CardinalTitleCode;
    const result = await chooseCardinalTitleAction(code);
    return result.ok
      ? { success: "Đã nhận hiệu." }
      : { error: result.error };
  }, undefined);

  return (
    <section
      aria-label="Chọn hiệu Tứ phương tướng quân"
      className="border border-line bg-paper p-7"
    >
      <p className="label-caps flex items-center gap-2">
        <Compass className="h-3.5 w-3.5" aria-hidden />
        Hiệu của bạn
      </p>
      <h2 className="mt-2.5 font-display text-xl font-bold text-navy-deep">
        Nhận một hiệu Trấn phương
      </h2>
      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        Bốn hiệu hoàn toàn ngang nhau: cùng cấp bậc, cùng quyền lợi, khác đúng
        một chữ. Đây là chỗ để bạn tự nhận một cái tên, không phải một lựa chọn
        cần tối ưu. Đổi lại lúc nào cũng được.
      </p>

      {state?.error && (
        <div className="mt-4">
          <ErrorBanner message={state.error} />
        </div>
      )}
      {state?.success && (
        <p role="status" className="mt-4 font-ui text-sm text-jade-ink">
          {state.success}
        </p>
      )}

      {/*
        Mỗi hiệu là một form riêng, không phải bốn nút trong một form. Bốn
        input ẩn cùng tên trong một form thì lần gửi nào cũng mang đủ bốn giá
        trị và trình duyệt lấy cái cuối, nên bấm hiệu nào cũng ra Trấn Bắc.
      */}
      <div className="mt-5 flex flex-wrap gap-2">
        {CARDINAL_TITLES.map((title) => {
          const chosen = current === title.code;
          return (
            <form key={title.code} action={formAction}>
              <input type="hidden" name="code" value={title.code} />
              <SubmitButton
                variant={chosen ? "gold" : "outline"}
                disabled={pending}
              >
                {title.name}
                {chosen && " · đang dùng"}
              </SubmitButton>
            </form>
          );
        })}
      </div>
    </section>
  );
}
