"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Swords, X } from "lucide-react";
import {
  acceptInviteAction,
  declineInviteAction,
  type InviteReplyState,
} from "@/lib/actions/arena";

export type IncomingInvite = {
  inviteId: string;
  fromName: string;
  fromChienLuc: number;
  stake: number;
  secondsLeft: number;
};

/**
 * Một chiến thư đang chờ trả lời.
 *
 * Đếm ngược lấy mốc từ MÁY CHỦ (`secondsLeft`), không tự tính từ `expiresAt`
 * bằng đồng hồ trình duyệt: hai máy lệch giờ sẽ thấy hai con số khác nhau về
 * cùng một lá thư, và người có đồng hồ chạy nhanh sẽ tưởng thư đã hết hạn
 * trong khi máy chủ vẫn nhận.
 *
  * Nhận lời thì đi thẳng vào phòng thi. Đức Hạnh đã bị trừ ngay lúc đó, nên để
 * người ta phải tự tìm đường vào là cách nhanh nhất khiến họ mất cược mà không
 * hiểu vì sao.
 */
function InviteCard({ invite }: { invite: IncomingInvite }) {
  const router = useRouter();
  const [accepted, acceptAction, accepting] = useActionState<
    InviteReplyState,
    FormData
  >(acceptInviteAction, undefined);
  const [declined, declineAction, declining] = useActionState<
    InviteReplyState,
    FormData
  >(declineInviteAction, undefined);

  useEffect(() => {
    if (accepted && "accepted" in accepted && accepted.attemptId) {
      router.push(`/lam-bai/${accepted.attemptId}`);
    }
  }, [accepted, router]);

  const state = accepted ?? declined;

  return (
    <li className="border border-gold bg-gold-pale px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-ui text-[0.95rem] font-semibold text-navy-deep">
          {invite.fromName}
        </span>
        <span className="font-ui text-xs tabular-nums text-ink-soft">
          Chiến Lực {invite.fromChienLuc}
        </span>
        <span className="font-ui text-xs text-ink-soft">
          {invite.stake > 0 ? `Cược ${invite.stake} Đức Hạnh` : "Không cược"}
        </span>
        <span
          className="ml-auto font-ui text-xs tabular-nums text-gold-ink"
          aria-label={`Còn ${invite.secondsLeft} giây để trả lời`}
        >
          còn {invite.secondsLeft}s
        </span>
      </div>

      <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
        Nhận lời thì vào phòng thi ngay, và Đức Hạnh bị trừ lúc đó.
      </p>

      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <form action={acceptAction}>
          <input type="hidden" name="inviteId" value={invite.inviteId} />
          <button
            type="submit"
            disabled={accepting || declining}
            className="inline-flex cursor-pointer items-center gap-2 border border-navy bg-navy px-5 py-2 font-ui text-[0.74rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-navy-deep disabled:opacity-50"
          >
            <Swords className="h-3.5 w-3.5" aria-hidden="true" />
            {accepting ? "Đang vào trận…" : "Nhận lời"}
          </button>
        </form>
        <form action={declineAction}>
          <input type="hidden" name="inviteId" value={invite.inviteId} />
          <button
            type="submit"
            disabled={accepting || declining}
            className="inline-flex cursor-pointer items-center gap-2 border border-line-strong px-5 py-2 font-ui text-[0.74rem] font-semibold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-ash hover:text-ash-ink disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Từ chối
          </button>
        </form>
      </div>

      {state && "error" in state ? (
        <p className="mt-3 border border-danger bg-danger-pale px-4 py-2 font-ui text-[0.86rem] text-danger">
          {state.error}
        </p>
      ) : null}
    </li>
  );
}

export function IncomingInvites({ invites }: { invites: IncomingInvite[] }) {
  if (invites.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <p className="label-caps">Chiến thư gửi tới bạn</p>
      <ul className="flex flex-col gap-3">
        {invites.map((invite) => (
          <InviteCard key={invite.inviteId} invite={invite} />
        ))}
      </ul>
      <p className="font-ui text-xs text-muted">
        Thư sống 90 giây. Từ chối khi bạn đang ở sân và đang rảnh thì có bị đếm,
        nhưng mỗi người thách chỉ tính một lần mỗi ngày.
      </p>
    </section>
  );
}
