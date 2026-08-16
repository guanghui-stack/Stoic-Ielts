import assert from "node:assert/strict";
import {
  ceremonyStorageKey,
  hasSeenCeremony,
  isFreshCeremonyEvent,
  markCeremonySeen,
  resolveCeremonyStorage,
} from "../src/lib/motion/ceremony.ts";

function check(label: string, run: () => void) {
  run();
  console.log(`PASS ${label}`);
}

check("storage keys are versioned and event-specific", () => {
  assert.equal(
    ceremonyStorageKey("rank", "user-1:promotion-5"),
    "wb-ceremony:v1:rank:user-1:promotion-5",
  );
  assert.notEqual(
    ceremonyStorageKey("rank", "user-1:promotion-5"),
    ceremonyStorageKey("title", "user-1:promotion-5"),
  );
});

check("seen state only accepts the explicit marker", () => {
  assert.equal(hasSeenCeremony({ getItem: () => "seen" }, "key"), true);
  assert.equal(hasSeenCeremony({ getItem: () => "other" }, "key"), false);
});

check("blocked storage fails open without throwing", () => {
  assert.equal(
    resolveCeremonyStorage(() => {
      throw new Error("property blocked");
    }),
    null,
  );
  assert.equal(
    hasSeenCeremony(
      {
        getItem() {
          throw new Error("blocked");
        },
      },
      "key",
    ),
    false,
  );
  assert.equal(
    markCeremonySeen(
      {
        setItem() {
          throw new Error("blocked");
        },
      },
      "key",
    ),
    false,
  );
});

check("freshness accepts today and the exact fourteen-day boundary", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");
  assert.equal(isFreshCeremonyEvent(now, now), true);
  assert.equal(
    isFreshCeremonyEvent(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), now),
    true,
  );
});

check("freshness rejects future and older events", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");
  assert.equal(isFreshCeremonyEvent(new Date(now.getTime() + 1), now), false);
  assert.equal(
    isFreshCeremonyEvent(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000 - 1), now),
    false,
  );
});
