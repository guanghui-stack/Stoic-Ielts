export const MESSAGE_MAX = 2_000;
export const MESSAGE_MIN_INTERVAL_MS = 700;

export type ChatBodyResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function orderedParticipants(firstId: string, secondId: string): [string, string] {
  return firstId < secondId ? [firstId, secondId] : [secondId, firstId];
}

export function validateMessageBody(raw: string): ChatBodyResult {
  const body = raw.replace(/\r\n/g, "\n").trim();
  if (!body) return { ok: false, error: "Tin nhắn không được để trống." };
  if (body.length > MESSAGE_MAX) {
    return { ok: false, error: `Tin nhắn tối đa ${MESSAGE_MAX.toLocaleString("vi-VN")} ký tự.` };
  }
  return { ok: true, value: body };
}
