"use client";

import { useActionState } from "react";
import { Heart, IdCard, Repeat2 } from "lucide-react";
import {
  convertReputationAction,
  type ConvertReputationState,
} from "@/lib/actions/reputation";
import { REPUTATION_TO_MERIT_RATE } from "@/lib/forum/reputation";
import { SubmitButton } from "@/components/ui";

/**
 * Uy vọng và mã UID trên trang cá nhân.
 *
 * Hai thứ đứng chung một khối vì cùng trả lời câu "người khác thấy gì về tôi":
 * mã để tìm ra tôi, uy vọng để biết tôi đóng góp gì cho cộng đồng.
 *
 * Nút quy đổi KHÔNG cho nhập số lượng — đổi hết hoặc không đổi. Xem chú thích
 * trong `actions/reputation.ts`.
 */
export function ReputationCard({
  balance,
  convertible,
  converted,
  uid,
}: {
  balance: number;
  convertible: number;
  converted: number;
  uid: string;
}) {
  const [state, action] = useActionState<ConvertReputationState, FormData>(
    convertReputationAction,
    undefined,
  );

  return (
    <section className="border border-line bg-paper p-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* ===== Uy vọng ===== */}
        <div>
          <p className="label-caps flex items-center gap-2">
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            Uy vọng
          </p>
          <p className="mt-2 flex items-baseline gap-2">
            <span
              className={`font-display text-3xl font-bold tabular-nums ${
                balance < 0 ? "text-danger" : "text-navy-deep"
              }`}
            >
              {balance}
            </span>
            <span className="font-ui text-xs text-muted">
              {converted > 0 ? `đã quy đổi ${converted}` : "chưa quy đổi lần nào"}
            </span>
          </p>
          <p className="mt-2 font-ui text-xs leading-relaxed text-ink-soft">
            Uy vọng là tổng lượt Like trừ Dislike trên bài viết và bình luận của
            bạn ở Diễn đàn.
          </p>

          <form action={action} className="mt-4">
            {convertible > 0 ? (
              <>
                <SubmitButton variant="outline">
                  <Repeat2 className="h-4 w-4" aria-hidden="true" />
                  Đổi {convertible} uy vọng thành {convertible} Đức Hạnh
                </SubmitButton>
                <p className="mt-2 font-ui text-[0.68rem] text-muted">
                  Tỉ lệ {REPUTATION_TO_MERIT_RATE}:1. Uy vọng bị trừ đúng bằng số
                  đã đổi, phần kiếm được sau đó vẫn cộng tiếp.
                </p>
              </>
            ) : (
              <p className="font-ui text-xs leading-relaxed text-muted">
                {balance < 0
                  ? "Uy vọng đang âm nên chưa quy đổi được. Hãy đóng góp thêm ở Diễn đàn."
                  : "Chưa có uy vọng dương nào để quy đổi."}
              </p>
            )}
          </form>

          {state && (
            <p
              className={`mt-3 font-ui text-xs leading-relaxed ${
                state.ok ? "text-success" : "text-danger"
              }`}
              role="status"
            >
              {state.ok ? state.message : state.error}
            </p>
          )}
        </div>

        {/* ===== Mã UID ===== */}
        <div className="border-t border-line pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <p className="label-caps flex items-center gap-2">
            <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
            Mã học viên (UID)
          </p>
          <p className="mt-2">
            <code className="inline-block border border-line bg-cream-deep px-3 py-2 font-mono text-lg font-bold tracking-[0.15em] text-navy-deep">
              {uid || "—"}
            </code>
          </p>
          <p className="mt-3 font-ui text-xs leading-relaxed text-ink-soft">
            Đưa mã này cho bạn học để họ tìm ra bạn ở mục Tin nhắn mà không cần
            biết email của bạn. Mã không mở được gì, lộ ra cũng không sao.
          </p>
        </div>
      </div>
    </section>
  );
}
