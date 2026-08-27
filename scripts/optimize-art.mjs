/**
 * Kiểm tra asset STOIC · IELTS đã được duyệt.
 *
 * Asset hiện hành là SVG deterministic nằm trong public/art/stoic. Script này
 * không sinh lại, không tải từ API và không ghi đè asset production; nó chỉ
 * kiểm tra file bắt buộc, giới hạn dung lượng và các cấu trúc không được phép.
 *
 * Chạy: node scripts/optimize-art.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ASSET_DIR = path.resolve("public/art/stoic");
const ASSETS = [
  { file: "control-circle-hero.svg", maxKb: 40 },
  { file: "quiet-orbit.svg", maxKb: 30 },
  { file: "three-virtues.svg", maxKb: 30 },
];

let failures = 0;

for (const asset of ASSETS) {
  const filePath = path.join(ASSET_DIR, asset.file);
  if (!fs.existsSync(filePath)) {
    console.error(`THIẾU ${asset.file}`);
    failures += 1;
    continue;
  }

  const source = fs.readFileSync(filePath, "utf8");
  const kb = fs.statSync(filePath).size / 1024;
  const forbidden = [
    /<script\b/i,
    /<text\b/i,
    /<image\b/i,
    /<use\b[^>]+(?:href|xlink:href)=/i,
    /(?:href|src)=["']https?:\/\//i,
  ];

  if (kb > asset.maxKb) {
    console.error(`VƯỢT TRẦN ${asset.file} — ${kb.toFixed(1)} KB / ${asset.maxKb} KB`);
    failures += 1;
  }

  for (const pattern of forbidden) {
    if (pattern.test(source)) {
      console.error(`KHÔNG HỢP LỆ ${asset.file} — khớp ${pattern}`);
      failures += 1;
    }
  }

  if (!/^<svg\b[^>]*viewBox=/i.test(source.trim())) {
    console.error(`THIẾU VIEWBOX ${asset.file}`);
    failures += 1;
  }

  if (failures === 0) console.log(`ĐẠT ${asset.file} — ${kb.toFixed(1)} KB`);
}

if (failures > 0) {
  console.error(`\nAsset validator thất bại: ${failures} lỗi.`);
  process.exitCode = 1;
} else {
  console.log(`\nAsset validator đạt: ${ASSETS.length} asset Stoic hợp lệ.`);
}
