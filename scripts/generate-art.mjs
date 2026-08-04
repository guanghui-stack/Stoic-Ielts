/**
 * Sinh ảnh thủy mặc cho art manifest bằng Gemini API.
 *
 * Vì sao có script này: pipeline duyệt ảnh ở docs/ART-ASSET-REGISTER.md đòi bốn
 * phương án cho mỗi ảnh rồi mới chọn một. Làm tay thì mỗi ảnh phải mở trình duyệt,
 * dán prompt, tải về, đổi tên — nhân với 29 ảnh là hàng trăm thao tác dễ sai.
 *
 * Script KHÔNG tự duyệt ảnh. Nó chỉ sinh phương án ra thư mục tạm NGOÀI repo.
 * Việc loại ảnh có ký tự chữ Hán, sai giải phẫu hoặc nhiều hơn một accent vẫn
 * phải do người (hoặc agent nhìn được ảnh) làm, đúng như đặc tả §8.10 yêu cầu.
 *
 * Khóa API đọc từ .env.local — file này bị .gitignore chặn. Không bao giờ ghi
 * giá trị khóa ra log hay ra file, vì repo là public.
 *
 * Dùng:
 *   node scripts/generate-art.mjs --key homeTrieuVan --count 4
 *   node scripts/generate-art.mjs --prompt "..." --ratio 16:9 --out truong-phi
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ENV_FILE = ".env.local";
/**
 * Không dùng imagen-4.0: Google đã ngừng cấp cho tài khoản mới (HTTP 404
 * "no longer available to new users"). Dòng gemini-*-image thay thế, và có thêm
 * một điểm quan trọng cho dự án này: nó nhận ảnh đầu vào, nên cùng một script
 * vừa sinh ảnh mới vừa sửa ảnh cũ (xoá chữ khỏi sáu ảnh tướng đã có).
 */
const MODEL = process.env.ART_MODEL ?? "gemini-3.1-flash-image";
const API = "https://generativelanguage.googleapis.com/v1beta";

/** Thư mục nháp nằm ngoài repo: ảnh chưa duyệt không được lọt vào Git. */
const OUT_DIR =
  process.env.ART_OUT_DIR ??
  path.join(process.env.TEMP ?? "/tmp", "ho-phu-art-candidates");

function readKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  if (!fs.existsSync(ENV_FILE)) {
    throw new Error(
      `Không thấy ${ENV_FILE}. Tạo file đó với một dòng GEMINI_API_KEY=...`,
    );
  }
  const m = fs.readFileSync(ENV_FILE, "utf8").match(/GEMINI_API_KEY\s*=\s*(.+)/);
  if (!m) throw new Error(`${ENV_FILE} không có dòng GEMINI_API_KEY=...`);
  return m[1].trim().replace(/^["']|["']$/g, "");
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i]?.replace(/^--/, "");
    if (k) out[k] = argv[i + 1];
  }
  return out;
}

/**
 * Đuôi prompt bắt buộc, dán vào MỌI lần sinh.
 *
 * Imagen 4 không nhận trường negativePrompt riêng nên các điều cấm phải nói
 * thẳng trong prompt. Câu cấm chữ được lặp hai lần một cách có chủ ý: model rất
 * hay tự vẽ thêm chữ Hán giả khi được yêu cầu vẽ tranh thủy mặc Trung Hoa, và
 * nhắc một lần là không đủ.
 */
const HARD_RULES = [
  "Absolutely no text anywhere in the image.",
  "No Chinese characters, no Hanzi, no Kanji, no calligraphy glyphs, no lettering,",
  "no signature, no watermark, no logo, no caption, no title.",
  "Any seal shape must be a plain abstract vermilion rectangle with no characters inside.",
  "Do not write anything on banners, armor, flags or paper.",
  "Not photorealistic, not 3D render, not anime. No modern clothing, no firearms,",
  "no gore, no neon. Exactly one accent colour and nothing else coloured.",
  "Correct anatomy: five fingers per hand, four legs per horse.",
  "Do not resemble any real actor or any film or game costume design.",
].join(" ");

/** Một lần gọi = một ảnh. Model này không nhận sampleCount như Imagen. */
async function generateOne({ key, prompt, ratio, inputImage }) {
  const parts = [{ text: `${prompt} ${HARD_RULES}` }];
  if (inputImage) {
    // Ảnh đặt TRƯỚC câu lệnh: model bám ảnh gốc sát hơn khi đọc ảnh trước chỉ thị.
    parts.unshift({
      inlineData: {
        mimeType: inputImage.mime,
        data: fs.readFileSync(inputImage.file).toString("base64"),
      },
    });
  }

  const res = await fetch(`${API}/models/${MODEL}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: ratio || "16:9" },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    // Cắt ngắn: thân lỗi của Google có thể rất dài và không thêm thông tin.
    throw new Error(`HTTP ${res.status} — ${text.slice(0, 500)}`);
  }

  const json = await res.json();
  const cand = json.candidates?.[0];
  const part = cand?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) {
    const why = cand?.finishReason ?? "không rõ";
    throw new Error(
      `Không có ảnh trong phản hồi (finishReason: ${why}). ` +
        "Thường là bộ lọc an toàn chặn prompt, không phải lỗi khóa.",
    );
  }
  return Buffer.from(part.inlineData.data, "base64");
}

async function generate({ key, prompt, ratio, count, outName, inputImage }) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const n = Math.min(Number(count) || 1, 4);
  const files = [];
  const errors = [];

  // Chạy tuần tự chứ không song song: gói miễn phí giới hạn số yêu cầu mỗi phút,
  // bắn bốn lần cùng lúc là ăn 429 ngay.
  for (let i = 1; i <= n; i += 1) {
    try {
      const buf = await generateOne({ key, prompt, ratio, inputImage });
      const file = path.join(OUT_DIR, `${outName}-v${i}.png`);
      fs.writeFileSync(file, buf);
      files.push(file);
      console.log(`  v${i} xong (${Math.round(buf.length / 1024)} KB)`);
    } catch (err) {
      errors.push(`v${i}: ${err.message}`);
      console.log(`  v${i} hỏng — ${err.message.slice(0, 120)}`);
    }
  }

  if (files.length === 0) throw new Error(errors.join(" | "));
  return files;
}

const args = parseArgs(process.argv.slice(2));
if (!args.prompt) {
  console.error("Thiếu --prompt. Xem chú thích đầu file.");
  process.exit(1);
}

try {
  const files = await generate({
    key: readKey(),
    prompt: args.prompt,
    ratio: args.ratio,
    count: args.count ?? 4,
    outName: args.out ?? "candidate",
    inputImage: args.image
      ? {
          file: args.image,
          mime: args.image.toLowerCase().endsWith(".png")
            ? "image/png"
            : "image/jpeg",
        }
      : undefined,
  });
  console.log(`Đã sinh ${files.length} ảnh vào:\n  ${OUT_DIR}`);
  for (const f of files) console.log("  " + path.basename(f));
} catch (err) {
  console.error("Lỗi:", err.message);
  process.exit(1);
}
