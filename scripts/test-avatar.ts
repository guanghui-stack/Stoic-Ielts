import { readFileSync } from "node:fs";
import {
  AVATAR_MAX_BYTES,
  AVATAR_OUTPUT_SIZE,
  isSafeAvatarWebp,
  webpDimensions,
} from "../src/lib/avatar/rules.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures += 1;
}

console.log("— Luật ảnh đại diện —");

const vp8l = new Uint8Array(32);
vp8l.set([..."RIFF"].map((char) => char.charCodeAt(0)), 0);
vp8l.set([..."WEBPVP8L"].map((char) => char.charCodeAt(0)), 8);
vp8l[4] = 24; // kich thuoc RIFF = kich thuoc file - 8
vp8l[16] = 12; // mot chunk VP8L dai 12 byte
const sizeMinusOne = AVATAR_OUTPUT_SIZE - 1;
vp8l[20] = 0x2f;
vp8l[21] = sizeMinusOne & 0xff;
vp8l[22] = ((sizeMinusOne >> 8) & 0x3f) | ((sizeMinusOne & 0x03) << 6);
vp8l[23] = (sizeMinusOne >> 2) & 0xff;
vp8l[24] = (sizeMinusOne >> 10) & 0x0f;

check("đọc đúng kích thước WebP VP8L", webpDimensions(vp8l), { width: 512, height: 512 });
check("chấp nhận container WebP tĩnh đủ cấu trúc", isSafeAvatarWebp(vp8l), true);
const brokenRiff = vp8l.slice();
brokenRiff[4] = 0;
check("từ chối RIFF khai sai kích thước", isSafeAvatarWebp(brokenRiff), false);
const trailingBytes = new Uint8Array(vp8l.length + 4);
trailingBytes.set(vp8l);
check("từ chối byte lạ nối sau container", isSafeAvatarWebp(trailingBytes), false);
check("từ chối dữ liệu không phải WebP", webpDimensions(new Uint8Array(30)), null);
check("kích thước đầu ra cố định", AVATAR_OUTPUT_SIZE, 512);

const fixtures = JSON.parse(readFileSync(new URL("./fixtures/avatar-canvas-webp.json", import.meta.url), "utf8")) as {
  images: Array<{ colorSpace: string; transparent: boolean; data: string }>;
};
for (const fixture of fixtures.images) {
  const bytes = Buffer.from(fixture.data.split(",")[1], "base64");
  const label = `${fixture.colorSpace}, ${fixture.transparent ? "trong suốt" : "nền trắng"}`;
  check(`đọc đúng kích thước canvas thật (${label})`, webpDimensions(bytes), { width: 512, height: 512 });
  check(`nhận WebP do trình duyệt xuất kèm ICC (${label})`, isSafeAvatarWebp(bytes), true);
  check(`nhận Uint8Array như phía trình duyệt (${label})`, isSafeAvatarWebp(new Uint8Array(bytes)), true);
  check(`ảnh thử nằm dưới giới hạn dung lượng (${label})`, bytes.length <= AVATAR_MAX_BYTES, true);
}

function fixtureChunks(transparent: boolean): Buffer[] {
  const fixture = fixtures.images.find((image) => image.colorSpace === "srgb" && image.transparent === transparent)!;
  const bytes = Buffer.from(fixture.data.split(",")[1], "base64");
  const chunks: Buffer[] = [];
  for (let offset = 12; offset < bytes.length;) {
    const size = bytes.readUInt32LE(offset + 4);
    const end = offset + 8 + size + (size % 2);
    chunks.push(Buffer.from(bytes.subarray(offset, end)));
    offset = end;
  }
  return chunks;
}

function container(...chunks: Uint8Array[]): Buffer {
  const header = Buffer.alloc(12);
  header.write("RIFF");
  header.writeUInt32LE(4 + chunks.reduce((size, chunk) => size + chunk.length, 0), 4);
  header.write("WEBP", 8);
  return Buffer.concat([header, ...chunks]);
}

const [extended, icc, lossy] = fixtureChunks(false);
const [alphaExtended, alphaIcc, alpha, alphaLossy] = fixtureChunks(true);
const noIcc = Buffer.from(extended);
noIcc[8] &= ~0x20;
const alphaNoIcc = Buffer.from(alphaExtended);
alphaNoIcc[8] &= ~0x20;
check("nhận VP8 đơn không có ICC", isSafeAvatarWebp(container(lossy)), true);
check("nhận VP8X + VP8 không có ICC", isSafeAvatarWebp(container(noIcc, lossy)), true);
check("nhận ảnh trong suốt không có ICC", isSafeAvatarWebp(container(alphaNoIcc, alpha, alphaLossy)), true);
check("nhận VP8L mở rộng có ICC", isSafeAvatarWebp(container(extended, icc, vp8l.slice(12))), true);
check("từ chối ICC bị lặp", isSafeAvatarWebp(container(extended, icc, icc, lossy)), false);
check("từ chối ICC đứng sau ảnh", isSafeAvatarWebp(container(extended, lossy, icc)), false);
check("từ chối ICC không có cờ tương ứng", isSafeAvatarWebp(container(noIcc, icc, lossy)), false);
check("từ chối thiếu ICC đã khai báo", isSafeAvatarWebp(container(extended, lossy)), false);
check("từ chối ALPH đứng sau ảnh", isSafeAvatarWebp(container(alphaExtended, alphaIcc, alphaLossy, alpha)), false);
check("từ chối ALPH kèm VP8L", isSafeAvatarWebp(container(alphaExtended, alphaIcc, alpha, vp8l.slice(12))), false);
check("từ chối thiếu ALPH đã khai báo cho VP8", isSafeAvatarWebp(container(alphaExtended, alphaIcc, alphaLossy)), false);
check("từ chối ALPH không có cờ tương ứng", isSafeAvatarWebp(container(extended, icc, alpha, alphaLossy)), false);
check("từ chối nhiều chunk ảnh", isSafeAvatarWebp(container(extended, icc, lossy, lossy)), false);
check("từ chối thiếu chunk ảnh", isSafeAvatarWebp(container(extended, icc)), false);
for (const [label, flag] of [["animation", 0x02], ["XMP", 0x04], ["EXIF", 0x08]] as const) {
  const flagged = Buffer.from(extended);
  flagged[8] |= flag;
  check(`từ chối cờ ${label}`, isSafeAvatarWebp(container(flagged, icc, lossy)), false);
}
for (const type of ["ANIM", "EXIF", "XMP "]) {
  const extraChunk = Buffer.alloc(8);
  extraChunk.write(type);
  check(`từ chối chunk ${type}`, isSafeAvatarWebp(container(extended, icc, lossy, extraChunk)), false);
}
const oversizedChunk = Buffer.from(icc);
oversizedChunk.writeUInt32LE(0xffffffff, 4);
check("từ chối chunk khai kích thước vượt file", isSafeAvatarWebp(container(extended, oversizedChunk, lossy)), false);
check("từ chối file bị cắt cụt", isSafeAvatarWebp(container(extended, icc, lossy).subarray(0, -1)), false);

if (failures > 0) {
  console.error(`Có ${failures} kiểm thử ảnh đại diện thất bại.`);
  process.exit(1);
}
console.log("✅ LUẬT ẢNH ĐẠI DIỆN ĐỀU ĐẠT");
