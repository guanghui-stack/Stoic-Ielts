import Link from "next/link";
import type { CampaignWorld, WorldPlace } from "@/lib/campaign/world";

/**
 * Dải liên kết dưới bản đồ.
 *
 * Từng có thêm nhóm "Địa điểm" (Diễn Đàn · Dấu Mốc Cộng Đồng · Thành Quả). Đã
 * gỡ: cả ba nằm sẵn trên thanh menu chính, nên nhắc lại ngay dưới bản đồ chỉ
 * làm loãng đúng thứ dải này còn lý do tồn tại — ba kỳ đối chiếu định kỳ.
 */
export function WorldCompetitionRail({
  competitions,
}: Pick<CampaignWorld, "competitions">) {
  return (
    <nav aria-label="Các kỳ thử thách trên bản đồ" className="world-landmark-rail">
      <PlaceGroup label="Đại thí" items={competitions} />
    </nav>
  );
}

function PlaceGroup({ label, items }: { label: string; items: readonly WorldPlace[] }) {
  return (
    <section aria-label={label}>
      <p className="label-caps">{label}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {items.map((item) =>
          item.href ? (
            <li key={item.code}>
              <Link
                href={item.href}
                className="world-action block min-h-11 border border-line bg-paper px-4 py-3"
              >
                <span className="block font-display font-semibold text-navy-deep">
                  {item.title}
                </span>
                <span className="block font-ui text-xs text-muted">
                  {item.functionalLabel}
                </span>
              </Link>
            </li>
          ) : null,
        )}
      </ul>
    </section>
  );
}
