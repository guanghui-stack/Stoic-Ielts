"use client";

import { useCallback, useEffect, useState } from "react";
import { Swords, Users } from "lucide-react";
import { challengeAction, type ChallengeState } from "@/lib/actions/arena";
import { useActionState } from "react";

type Player = {
  userId: string;
  name: string;
  chienLuc: number;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  IDLE: "Đang rảnh",
  QUEUED: "Đang chờ ghép",
  IN_DUEL: "Đang trong trận",
};

/**
 * Sân đấu: ai đang có mặt, và nút thách đấu.
 *
 * Cập nhật bằng NHỊP TIM chứ không bằng kết nối sống. Mỗi nhịp vừa báo mình
 * còn ở đây, vừa nhận về danh sách mới. Gộp hai việc vào một lần gọi là có chủ
 * ý: tách ra sẽ nhân đôi số lượt gọi mà không thêm thông tin nào.
 *
 * Nhịp DỪNG khi tab bị ẩn. Người mở tab rồi đi ngủ không nên xuất hiện trong
 * danh sách người sẵn sàng đấu, vì thách họ thì chỉ nhận lại im lặng, và im
 * lặng đó lại bị đếm vào Án Binh Bất Động của chính họ.
 */
export function ArenaFloor({
  selfId,
  inQuyDien,
}: {
  selfId: string;
  inQuyDien: boolean;
}) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [intervalSeconds, setIntervalSeconds] = useState(15);
  const [state, formAction, pending] = useActionState<ChallengeState, FormData>(
    challengeAction,
    undefined,
  );

  const beat = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/arena/heartbeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "IDLE" }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        players?: Player[];
        intervalSeconds?: number;
      };
      setPlayers(data.players ?? []);
      if (data.intervalSeconds) setIntervalSeconds(data.intervalSeconds);
    } catch {
      // Mất mạng thoáng qua không phải sự kiện đáng báo: nhịp sau sẽ bù.
    }
  }, []);

  useEffect(() => {
    if (inQuyDien) return;
    // Nhịp đầu hoãn sang vòng lặp sự kiện kế tiếp thay vì gọi thẳng trong thân
    // effect: gọi thẳng là đặt state ngay giữa lúc React đang dựng, và đó cũng
    // là thứ quy tắc `react-hooks/set-state-in-effect` sinh ra để chặn.
    const first = setTimeout(beat, 0);
    const id = setInterval(beat, intervalSeconds * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [beat, intervalSeconds, inQuyDien]);

  if (inQuyDien) {
    return (
      <div className="border border-line bg-paper p-8 text-center">
        <p className="font-display text-xl font-bold text-navy-deep">
          Bạn đang Quy Điền
        </p>
        <p className="mx-auto mt-3 max-w-lg text-[0.96rem] leading-relaxed text-ink-soft">
          Không ai thách được bạn, và bạn không xuất hiện trên bảng xếp hạng.
          Chiến Lực sẽ trôi xuống dần cho tới mốc gốc, rồi dừng lại ở đó.
        </p>
      </div>
    );
  }

  const others = players.filter((p) => p.userId !== selfId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className="label-caps flex items-center gap-2">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          Đang có mặt
        </p>
        <p
          className="font-ui text-sm tabular-nums text-ink-soft"
          aria-live="polite"
        >
          {others.length} người
        </p>
      </div>

      {others.length === 0 ? (
        <div className="border border-line bg-paper px-6 py-12 text-center">
          <p className="font-display text-lg font-bold text-navy-deep">
            Sân đang vắng
          </p>
          <p className="mx-auto mt-2.5 max-w-md text-[0.94rem] leading-relaxed text-ink-soft">
            Giờ điểm binh là 10 tới 12 giờ và 20 tới 22 giờ. Vào những khung đó
            thì đông người hơn, và mọi trận đều được thưởng thêm kinh nghiệm.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-px border border-line bg-line">
          {others.map((p) => (
            <li
              key={p.userId}
              className="flex flex-wrap items-center gap-3 bg-paper px-5 py-3.5"
            >
              <span className="font-ui text-[0.95rem] font-semibold text-ink">
                {p.name}
              </span>
              <span className="font-ui text-xs tabular-nums text-ink-soft">
                Chiến Lực {p.chienLuc}
              </span>
              <span className="font-ui text-xs text-muted">
                {STATUS_LABEL[p.status] ?? p.status}
              </span>

              <form action={formAction} className="ml-auto flex items-center gap-2">
                <input type="hidden" name="toUserId" value={p.userId} />
                <label className="sr-only" htmlFor={`stake-${p.userId}`}>
                  Mức cược
                </label>
                <input
                  id={`stake-${p.userId}`}
                  type="number"
                  name="stake"
                  min={0}
                  max={100}
                  defaultValue={0}
                  className="w-20 border border-line-strong bg-paper px-2.5 py-1.5 font-ui text-sm tabular-nums text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
                <button
                  type="submit"
                  disabled={pending || p.status === "IN_DUEL"}
                  className="inline-flex cursor-pointer items-center gap-2 border border-navy px-4 py-1.5 font-ui text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-navy transition-colors hover:bg-navy hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Swords className="h-3.5 w-3.5" aria-hidden="true" />
                  Gửi chiến thư
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <p className="font-ui text-xs text-muted">
        Cược 0 là hạng không cược. Cửa đấu trường luôn mở, chỉ sới cược là đóng.
      </p>

      {state?.error ? (
        <p className="border border-danger bg-danger-pale px-4 py-2.5 font-ui text-[0.9rem] text-danger">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="border border-success bg-success-pale px-4 py-2.5 font-ui text-[0.9rem] text-success">
          {state.success}
        </p>
      ) : null}
    </div>
  );
}
