"use client";

import { useActionState, useState } from "react";
import { Trophy } from "lucide-react";
import {
  registerForCompetitionAction,
  type CompetitionState,
} from "@/lib/actions/competition";

/**
 * Đăng ký dự thi, kèm lựa chọn cách xuất hiện trên Bảng Vàng.
 * Mặc định là ẨN DANH — công khai phải là lựa chọn chủ động.
 */
export function CompetitionRegisterForm({ competitionId }: { competitionId: string }) {
  const [mode, setMode] = useState("PRIVATE");
  const [state, formAction, pending] = useActionState<CompetitionState, FormData>(
    registerForCompetitionAction,
    undefined
  );

  return (
    <form action={formAction} className="mt-6 border border-gold bg-gold-pale p-7">
      <input type="hidden" name="competitionId" value={competitionId} />
      <p className="label-caps flex items-center gap-2">
        <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
        Bạn đã đủ điều kiện
      </p>
      <h3 className="mt-2.5 font-display text-xl font-bold text-navy-deep">
        Chọn cách bạn xuất hiện trên Bảng Vàng
      </h3>

      <div className="mt-5 space-y-2.5">
        {[
          { value: "PRIVATE", label: "Ẩn danh — chỉ hiện thứ hạng, không hiện tên" },
          { value: "ALIAS", label: "Dùng biệt danh" },
          { value: "REAL_NAME", label: "Dùng tên thật trong hồ sơ" },
        ].map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="publicMode"
              value={option.value}
              checked={mode === option.value}
              onChange={(e) => setMode(e.target.value)}
              className="h-4 w-4 cursor-pointer accent-[#1e3a5f]"
            />
            <span className="font-ui text-sm text-ink">{option.label}</span>
          </label>
        ))}
      </div>

      {mode === "ALIAS" && (
        <label className="mt-4 block max-w-sm">
          <span className="block font-ui text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink">
            Biệt danh
          </span>
          <input
            name="publicAlias"
            required
            minLength={2}
            maxLength={40}
            className="mt-1.5 w-full border border-line-strong bg-paper px-3 py-2.5 font-ui text-sm text-ink"
          />
        </label>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex cursor-pointer items-center gap-2 border border-gold bg-gold px-7 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-navy-deep transition-colors hover:border-gold-soft hover:bg-gold-soft disabled:opacity-50"
      >
        {pending ? "Đang đăng ký…" : "Đăng ký dự thi"}
      </button>

      {state?.error && <p className="mt-3 font-ui text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="mt-3 font-ui text-sm text-success">{state.success}</p>}
    </form>
  );
}
