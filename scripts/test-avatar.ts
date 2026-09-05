import {
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

if (failures > 0) {
  console.error(`Có ${failures} kiểm thử ảnh đại diện thất bại.`);
  process.exit(1);
}
console.log("✅ LUẬT ẢNH ĐẠI DIỆN ĐỀU ĐẠT");
