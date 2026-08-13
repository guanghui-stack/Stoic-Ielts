import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { ImageIcon, AlertTriangle } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { features } from "@/lib/features";
import { ART_ASSETS, type ArtAsset } from "@/lib/brand/art-manifest";
import { InkWashArt } from "@/components/brand/ink-wash-art";

export const metadata = { title: "Kho hình ảnh" };
export const dynamic = "force-dynamic";

/**
 * Trang kiểm tra kho ảnh, theo đặc tả §11.2.
 *
 * Ba thứ trang này bắt được mà mắt thường bỏ sót khi lướt qua website:
 * ảnh khai trong manifest nhưng THIẾU FILE, ảnh VƯỢT trần dung lượng làm chậm
 * trang trên 3G, và ảnh trang trí lỡ có alt text (hoặc ngược lại, ảnh nội
 * dung bị bỏ trống alt).
 *
 * Cố ý KHÔNG có nút tải ảnh lên. Đặc tả §11.2 cấm ghi thẳng vào `public/` ở
 * production vì mỗi lần deploy Hostinger xoá sạch file của lần chạy trước —
 * ảnh tải lên qua giao diện sẽ biến mất mà không ai hiểu vì sao. Ảnh phải đi
 * qua Git.
 */

/** Trần dung lượng theo §8.5, tính theo tỷ lệ khung hình. */
const BUDGET_KB: Record<ArtAsset["ratio"], number> = {
  "21:9": 500,
  "16:9": 350,
  "4:5": 220,
  "1:1": 160,
};

type Row = {
  key: string;
  asset: ArtAsset;
  exists: boolean;
  sizeKb: number | null;
  overBudget: boolean;
};

function inspect(key: string, asset: ArtAsset): Row {
  const file = path.join(process.cwd(), "public", asset.src.replace(/^\//, ""));
  let sizeKb: number | null = null;
  let exists = false;
  try {
    sizeKb = Math.round(fs.statSync(file).size / 1024);
    exists = true;
  } catch {
    // Thiếu file không phải lỗi chết người: InkWashArt tự thay bằng lớp mực
    // CSS. Nhưng nó phải hiện ra ở đây để không ai quên.
  }
  return {
    key,
    asset,
    exists,
    sizeKb,
    overBudget: sizeKb !== null && sizeKb > BUDGET_KB[asset.ratio],
  };
}

export default async function ArtAdminPage() {
  if (!features.hoPhuBrand) notFound();
  await requireAdmin();

  const rows = Object.entries(ART_ASSETS).map(([key, asset]) =>
    inspect(key, asset as ArtAsset),
  );

  const missing = rows.filter((r) => !r.exists);
  const oversize = rows.filter((r) => r.overBudget);
  const totalKb = rows.reduce((sum, r) => sum + (r.sizeKb ?? 0), 0);

  return (
    <main className="motion-page-entry mx-auto max-w-6xl px-6 py-10">
      <p className="label-caps flex items-center gap-2">
        <ImageIcon className="h-3.5 w-3.5" aria-hidden />
        Quản trị
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep">
        Kho hình ảnh
      </h1>
      <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        {rows.length} ảnh khai trong art manifest · tổng {Math.round(totalKb / 1024 * 10) / 10} MB.
        Trang này chỉ đọc — ảnh production phải đi qua Git, vì mỗi lần deploy
        Hostinger xoá sạch file của lần chạy trước.
      </p>

      {(missing.length > 0 || oversize.length > 0) && (
        <div className="mt-6 border-l-4 border-danger bg-danger-pale px-6 py-5">
          <p className="flex items-center gap-2 font-ui text-sm font-semibold text-danger">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Cần xử lý
          </p>
          {missing.length > 0 && (
            <p className="mt-2 font-ui text-sm text-ink-soft">
              {missing.length} ảnh thiếu file: {missing.map((r) => r.key).join(", ")}
            </p>
          )}
          {oversize.length > 0 && (
            <p className="mt-2 font-ui text-sm text-ink-soft">
              {oversize.length} ảnh vượt trần dung lượng:{" "}
              {oversize.map((r) => `${r.key} (${r.sizeKb} KB)`).join(", ")}
            </p>
          )}
        </div>
      )}

      <ul className="mt-8 m-0 grid list-none gap-6 p-0 md:grid-cols-2">
        {rows.map((row) => (
          <li key={row.key} className="border border-line bg-paper">
            <div
              className="relative overflow-hidden border-b border-line bg-cream"
              style={{ aspectRatio: row.asset.ratio.replace(":", " / ") }}
            >
              {row.exists ? (
                <InkWashArt asset={row.asset} className="object-cover" />
              ) : (
                <p className="absolute inset-0 flex items-center justify-center font-ui text-sm text-muted">
                  Thiếu file
                </p>
              )}
            </div>

            <div className="p-5">
              <p className="font-ui text-sm font-semibold text-navy-deep">{row.key}</p>
              <p className="mt-0.5 break-all font-ui text-xs text-muted">{row.asset.src}</p>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-ui text-xs">
                <dt className="text-muted">Tỷ lệ</dt>
                <dd className="text-ink-soft">{row.asset.ratio}</dd>
                <dt className="text-muted">Accent</dt>
                <dd className="text-ink-soft">{row.asset.accent}</dd>
                <dt className="text-muted">Điểm lấy nét</dt>
                <dd className="text-ink-soft">
                  {row.asset.focal.x}% / {row.asset.focal.y}%
                </dd>
                <dt className="text-muted">Dung lượng</dt>
                <dd className={row.overBudget ? "font-semibold text-danger" : "text-ink-soft"}>
                  {row.sizeKb === null
                    ? "—"
                    : `${row.sizeKb} KB / trần ${BUDGET_KB[row.asset.ratio]}`}
                </dd>
              </dl>

              <p className="mt-3 font-ui text-xs leading-relaxed text-muted">
                {row.asset.alt === "" ? (
                  <em>Ảnh trang trí, alt rỗng theo đúng thiết kế.</em>
                ) : (
                  <>Alt: {row.asset.alt}</>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-8 border-l-4 border-gold bg-cream-deep px-6 py-5 text-sm leading-relaxed text-ink-soft">
        Trang này không kiểm được thứ quan trọng nhất: ảnh có chứa ký tự chữ Hán
        hay không. Máy không đọc được chữ trong ảnh, nên đó vẫn là việc phải nhìn
        bằng mắt trước khi đưa ảnh vào repo — xem quy trình duyệt ở{" "}
        <code className="text-xs">docs/ART-ASSET-REGISTER.md</code>.
      </p>
    </main>
  );
}
