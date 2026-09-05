export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_MAX_BYTES = 400 * 1024;

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

function uint24le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function uint32le(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

/**
 * Canvas chi tao WebP tinh, khong can metadata hay animation. Gioi han dung
 * cac chunk anh toi thieu nay de file gia/RIFF hong khong lot vao database.
 */
export function isSafeAvatarWebp(bytes: Uint8Array): boolean {
  if (
    bytes.length < 25 ||
    ascii(bytes, 0, 4) !== "RIFF" ||
    ascii(bytes, 8, 12) !== "WEBP" ||
    uint32le(bytes, 4) + 8 !== bytes.length
  ) {
    return false;
  }

  const chunks: Array<{ type: string; size: number }> = [];
  let offset = 12;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length || chunks.length >= 3) return false;
    const type = ascii(bytes, offset, offset + 4);
    const size = uint32le(bytes, offset + 4);
    const next = offset + 8 + size + (size % 2);
    if (next > bytes.length) return false;
    chunks.push({ type, size });
    offset = next;
  }
  if (offset !== bytes.length) return false;

  const allowed = new Set(["VP8X", "ALPH", "VP8 ", "VP8L"]);
  if (chunks.some((chunk) => !allowed.has(chunk.type))) return false;
  const imageChunks = chunks.filter(
    (chunk) => chunk.type === "VP8 " || chunk.type === "VP8L",
  );
  if (imageChunks.length !== 1) return false;

  const extended = chunks[0]?.type === "VP8X";
  if (!extended) return chunks.length === 1;
  if (chunks[0].size !== 10) return false;
  return chunks.slice(1).every((chunk) => chunk.type !== "VP8X");
}

/** Doc kich thuoc tu ba dang container WebP thong dung, khong giai nen anh. */
export function webpDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  if (
    bytes.length < 25 ||
    ascii(bytes, 0, 4) !== "RIFF" ||
    ascii(bytes, 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const format = ascii(bytes, 12, 16);
  if (format === "VP8X" && bytes.length >= 30) {
    return {
      width: uint24le(bytes, 24) + 1,
      height: uint24le(bytes, 27) + 1,
    };
  }

  if (
    format === "VP8 " &&
    bytes.length >= 30 &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  ) {
    return {
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff,
    };
  }

  if (format === "VP8L" && bytes[20] === 0x2f) {
    return {
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10),
    };
  }

  return null;
}
