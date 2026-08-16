"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Award, BadgeCheck, X } from "lucide-react";
import {
  ceremonyStorageKey,
  hasSeenCeremony,
  markCeremonySeen,
  resolveCeremonyStorage,
  type CeremonyStorageScope,
} from "@/lib/motion/ceremony";

export function CeremonyLayer({
  eventId,
  storageScope,
  eligible,
  label,
  delayMs = 520,
  children,
}: {
  eventId: string;
  storageScope: CeremonyStorageScope;
  eligible: boolean;
  label: string;
  delayMs?: number;
  children: (dismiss: () => void) => ReactNode;
}) {
  const ceremonyId = `${storageScope}:${eventId}`;
  const [visibleEventId, setVisibleEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!eligible) return;

    const key = ceremonyStorageKey(storageScope, eventId);
    const storage = resolveCeremonyStorage(() => window.localStorage);
    if (storage && hasSeenCeremony(storage, key)) return;

    const timer = window.setTimeout(() => {
      if (storage) markCeremonySeen(storage, key);
      setVisibleEventId(ceremonyId);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [ceremonyId, delayMs, eligible, eventId, storageScope]);

  if (!eligible || visibleEventId !== ceremonyId) return null;

  return (
    <section role="status" aria-label={label} className="world-ceremony">
      <span className="world-ceremony__veil" aria-hidden="true" />
      <div className="world-ceremony__content">
        {children(() => setVisibleEventId(null))}
      </div>
    </section>
  );
}

export function TitleCeremonyMoment({
  eventId,
  eligible,
  titleName,
  rarityLabel,
  description,
}: {
  eventId: string;
  eligible: boolean;
  titleName: string;
  rarityLabel: string;
  description: string;
}) {
  return (
    <CeremonyLayer
      eventId={eventId}
      storageScope="title"
      eligible={eligible}
      label={`Đã nhận danh hiệu ${titleName}`}
    >
      {(dismiss) => (
        <article className="world-ceremony__surface paper-grain relative overflow-hidden border border-gold bg-paper p-7 shadow-card">
          <span className="absolute inset-y-0 left-0 w-1 bg-gold" aria-hidden="true" />
          <button
            type="button"
            onClick={dismiss}
            aria-label="Đóng thông báo nhận danh hiệu"
            className="world-action absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center text-ink-soft hover:text-gold"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex flex-wrap items-center gap-5 pr-10">
            <div className="world-ceremony__insignia flex h-20 w-20 shrink-0 items-center justify-center border border-gold bg-gold-pale text-gold">
              <Award className="h-10 w-10" aria-hidden="true" />
            </div>
            <div className="world-ceremony__copy min-w-0 flex-1">
              <p className="label-caps text-gold-ink">Danh hiệu mới · {rarityLabel}</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-navy-deep">
                {titleName}
              </h2>
              <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
                {description}
              </p>
            </div>
            <span className="world-ceremony__seal inline-flex items-center gap-1.5 border border-vermilion px-3 py-1.5 font-ui text-xs font-semibold uppercase tracking-[0.08em] text-vermilion-ink">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Đã ghi danh
            </span>
          </div>
        </article>
      )}
    </CeremonyLayer>
  );
}
