/**
 * Kiểm thử quyết định chuyển động của bản đồ 2.5D.
 * Chạy: node --experimental-strip-types scripts/test-campaign-motion.ts
 *
 * VÌ SAO CÓ FILE NÀY: `prefers-reduced-motion` không ép được từ công cụ kiểm
 * thử trình duyệt đang dùng. Nếu logic đó nằm rải trong component thì ràng
 * buộc §7.3 chỉ được kiểm bằng cách đọc mã và tin — mà đúng thứ dễ vỡ âm thầm
 * nhất là thứ không ai kiểm.
 */
import {
  DEFAULT_TILT,
  REDUCED_TILT,
  heroTransition,
  motionSettings,
  tiltFromPointer,
} from "../src/lib/campaign/motion.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

console.log("\n— Chuyển động bình thường —");

{
  const m = motionSettings(false);
  check("nghiêng đúng 52 độ", m.tilt, DEFAULT_TILT);
  check("xoay ngược là số đối của nghiêng", m.counterTilt, -DEFAULT_TILT);
  check("có parallax", m.parallax, true);
  check("có transition", m.transition !== "none", true);
}

console.log("\n— Khi bật giảm chuyển động —");

{
  const m = motionSettings(true);
  check("TẮT parallax hoàn toàn", m.parallax, false);
  check("TẮT transition hoàn toàn", m.transition, "none");
  check("nhân vật cũng không có transition", heroTransition(true), "none");
  check("nghiêng nhẹ hơn hẳn", m.tilt, REDUCED_TILT);
  check("nhưng KHÔNG về 0 — mất chiều sâu thì bản đồ khó đọc hơn", m.tilt > 0, true);
  check("xoay ngược vẫn khớp nghiêng", m.counterTilt, -REDUCED_TILT);
}

console.log("\n— Xoay ngược luôn khớp nghiêng —");

{
  // Bất biến quan trọng nhất: nếu hai số này lệch nhau thì nhãn và nhân vật
  // sẽ nghiêng méo thay vì đứng thẳng, và bản đồ trông hỏng ngay.
  const lech = [false, true].filter((r) => {
    const m = motionSettings(r);
    return m.tilt + m.counterTilt !== 0;
  });
  check("mọi chế độ đều có tilt + counterTilt = 0", lech, []);
}

console.log("\n— Rê chuột —");

{
  const giua = tiltFromPointer(false, { x: 0, y: 0 });
  check("con trỏ ở giữa thì giữ nguyên góc gốc", giua, { x: DEFAULT_TILT, z: 0 });
}

{
  const tren = tiltFromPointer(false, { x: 0, y: -0.5 });
  const duoi = tiltFromPointer(false, { x: 0, y: 0.5 });
  check("đưa chuột lên thì nghiêng nhiều hơn", tren.x > DEFAULT_TILT, true);
  check("đưa chuột xuống thì nghiêng ít hơn", duoi.x < DEFAULT_TILT, true);
}

{
  const trai = tiltFromPointer(false, { x: -0.5, y: 0 });
  const phai = tiltFromPointer(false, { x: 0.5, y: 0 });
  check("xoay quanh trục Z đổi chiều theo hai bên", trai.z < 0 && phai.z > 0, true);
}

{
  // Đây là phép thử quan trọng nhất của cả file: rê chuột KHÔNG được làm gì
  // khi người dùng đã bật giảm chuyển động.
  const goc = tiltFromPointer(true, { x: 0.5, y: -0.5 });
  check("giảm chuyển động thì rê chuột KHÔNG đổi góc", goc, { x: REDUCED_TILT, z: 0 });
}

{
  const bienDo = [
    { x: -0.5, y: -0.5 },
    { x: 0.5, y: 0.5 },
    { x: 0, y: 0 },
  ].every((offset) => {
    const t = tiltFromPointer(true, offset);
    return t.x === REDUCED_TILT && t.z === 0;
  });
  check("mọi vị trí con trỏ đều cho cùng một kết quả khi giảm chuyển động", bienDo, true);
}

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ CHUYỂN ĐỘNG BẢN ĐỒ ĐỀU ĐẠT\n"
    : `\n❌ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
