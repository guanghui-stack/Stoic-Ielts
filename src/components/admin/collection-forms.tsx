"use client";

import { useActionState } from "react";
import { Plus, Snowflake } from "lucide-react";
import {
  activateCollectionAction,
  createCollectionAction,
  type CollectionState,
} from "@/lib/actions/collections";

type Summary = { id: string; code: string; itemCount: number } | null;

/** Tạo bộ đề mới và kích hoạt bộ đang soạn. */
export function CollectionForms({
  activeCollection,
  draftCollection,
}: {
  activeCollection: Summary;
  draftCollection: Summary;
}) {
  const [createState, create, creating] = useActionState<CollectionState, FormData>(
    createCollectionAction,
    undefined
  );
  const [activateState, activate, activating] = useActionState<CollectionState, FormData>(
    activateCollectionAction,
    undefined
  );

  return (
    <div className="mt-8 space-y-6">
      {activeCollection && (
        <p className="border-l-4 border-success bg-success-pale px-5 py-4 font-ui text-sm text-success">
          Bộ đang hoạt động: <strong>{activeCollection.code}</strong> ·{" "}
          {activeCollection.itemCount} bài.
        </p>
      )}

      {!draftCollection ? (
        <form action={create} className="flex flex-wrap items-end gap-3 border border-line bg-paper p-6">
          <label className="min-w-[12rem] flex-1">
            <span className="block font-ui text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink">
              Mã bộ đề
            </span>
            <input
              name="code"
              required
              placeholder="FREE2026Q3"
              className="mt-1.5 w-full border border-line-strong bg-paper px-3 py-2.5 font-ui text-sm text-ink"
            />
          </label>
          <label className="min-w-[14rem] flex-[2]">
            <span className="block font-ui text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink">
              Tên hiển thị
            </span>
            <input
              name="name"
              required
              placeholder="Bộ đề miễn phí quý 3/2026"
              className="mt-1.5 w-full border border-line-strong bg-paper px-3 py-2.5 font-ui text-sm text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="inline-flex cursor-pointer items-center gap-2 border border-navy bg-navy px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-navy-deep disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tạo bộ mới
          </button>
        </form>
      ) : (
        <form action={activate} className="flex flex-wrap items-center gap-4 border border-gold bg-gold-pale p-6">
          <input type="hidden" name="collectionId" value={draftCollection.id} />
          <p className="min-w-0 flex-1 font-ui text-sm leading-relaxed text-ink">
            Bộ <strong>{draftCollection.code}</strong> đang soạn với{" "}
            <strong>{draftCollection.itemCount}</strong> bài. Kích hoạt sẽ{" "}
            <strong>đóng băng danh sách này vĩnh viễn</strong> và chuyển bộ đang
            chạy sang lưu trữ.
          </p>
          <button
            type="submit"
            disabled={activating || draftCollection.itemCount < 8}
            className="inline-flex cursor-pointer items-center gap-2 border border-gold bg-gold px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-navy-deep transition-colors hover:border-gold-soft hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Snowflake className="h-4 w-4" aria-hidden="true" />
            {activating ? "Đang kích hoạt…" : "Đóng băng và kích hoạt"}
          </button>
        </form>
      )}

      {(createState?.error ?? activateState?.error) && (
        <p className="font-ui text-sm text-danger">
          {createState?.error ?? activateState?.error}
        </p>
      )}
      {(createState?.success ?? activateState?.success) && (
        <p className="font-ui text-sm text-success">
          {createState?.success ?? activateState?.success}
        </p>
      )}
    </div>
  );
}
