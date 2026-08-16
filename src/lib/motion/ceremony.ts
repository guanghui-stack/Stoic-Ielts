export type CeremonyStorageScope = "rank" | "title" | "competition";

type ReadableCeremonyStorage = {
  getItem(key: string): string | null;
};

type WritableCeremonyStorage = {
  setItem(key: string, value: string): void;
};

export type CeremonyStorage = ReadableCeremonyStorage & WritableCeremonyStorage;

const CEREMONY_STORAGE_VERSION = "v1";
const DEFAULT_FRESH_DAYS = 14;

export function ceremonyStorageKey(
  scope: CeremonyStorageScope,
  eventId: string,
): string {
  return `wb-ceremony:${CEREMONY_STORAGE_VERSION}:${scope}:${eventId}`;
}

export function resolveCeremonyStorage(
  access: () => CeremonyStorage,
): CeremonyStorage | null {
  try {
    return access();
  } catch {
    return null;
  }
}

export function hasSeenCeremony(
  storage: ReadableCeremonyStorage,
  key: string,
): boolean {
  try {
    return storage.getItem(key) === "seen";
  } catch {
    return false;
  }
}

export function markCeremonySeen(
  storage: WritableCeremonyStorage,
  key: string,
): boolean {
  try {
    storage.setItem(key, "seen");
    return true;
  } catch {
    return false;
  }
}

export function isFreshCeremonyEvent(
  happenedAt: Date,
  now = new Date(),
  freshDays = DEFAULT_FRESH_DAYS,
): boolean {
  const age = now.getTime() - happenedAt.getTime();
  return age >= 0 && age <= freshDays * 24 * 60 * 60 * 1000;
}
