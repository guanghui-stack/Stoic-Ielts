/**
 * Cho phép script kiểm thử nạp thẳng mã dùng alias "@/".
 *
 * VÌ SAO CẦN: mọi module chạm database (`ranks/facts.ts`, `ranks/engine.ts`,
 * `actions/*.ts`) đều import bằng alias "@/", mà `node --experimental-strip-
 * types` không biết alias đó. Trước đây chỉ hàm thuần mới kiểm thử được, còn
 * tầng nối database phải chờ tới lúc deploy mới biết đúng sai.
 *
 * Loader này dịch "@/x" thành "<gốc dự án>/src/x", thử lần lượt đường dẫn
 * nguyên vẹn, thêm ".ts", rồi "/index.ts".
 *
 * Dùng: node --experimental-strip-types --import ./scripts/alias-loader.mjs <file>
 */

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const SRC = pathToFileURL(path.join(process.cwd(), "src") + path.sep).href;

const hooks = `
import { pathToFileURL } from "node:url";
import fs from "node:fs";

const SRC = ${JSON.stringify(SRC)};

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = SRC + specifier.slice(2);
    for (const candidate of [base, base + ".ts", base + ".tsx", base + "/index.ts"]) {
      try {
        if (fs.existsSync(new URL(candidate))) {
          // KHÔNG đặt format: để node tự nhận .ts và lược kiểu. Ép "module"
          // khiến nó bỏ qua bước đó và vỡ ngay ở "import type".
          return { url: candidate, shortCircuit: true };
        }
      } catch {}
    }
  }
  // "server-only" chỉ là chốt chặn lúc biên dịch của Next, không có gì để chạy.
  if (specifier === "server-only") {
    return { url: "data:text/javascript,export{}", shortCircuit: true, format: "module" };
  }
  return nextResolve(specifier, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(hooks)}`, pathToFileURL("./"));
