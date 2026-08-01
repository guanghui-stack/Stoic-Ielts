import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { reconcileStalePendingOrders } from "@/lib/payments/reconcile";

/**
 * Đối soát định kỳ các đơn đang treo — lưới an toàn khi IPN không tới.
 *
 * Gọi từ một dịch vụ hẹn giờ bên ngoài (cron-job.org, Uptime Robot, hoặc Cron
 * Jobs trong hPanel), khoảng 15 phút một lần:
 *
 *   curl -H "X-Cron-Secret: <PAYMENT_CRON_SECRET>" \
 *        https://<domain>/api/payments/reconcile
 *
 * Không đặt biến `PAYMENT_CRON_SECRET` thì đường dẫn này đóng hoàn toàn — thà
 * không có lưới an toàn còn hơn có một cửa ai gọi cũng được.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.PAYMENT_CRON_SECRET?.trim();
  if (!expected) return false;

  const header =
    request.headers.get("x-cron-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");

  const a = Buffer.from(header, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await reconcileStalePendingOrders();
  const summary = {
    checked: results.length,
    granted: results.filter((r) => r.kind === "granted").length,
    alreadyPaid: results.filter((r) => r.kind === "already").length,
    stillUnpaid: results.filter((r) => r.kind === "not-paid").length,
    errors: results.filter((r) => r.kind === "error").length,
  };
  if (summary.granted > 0) {
    console.log(
      `[wobridges] Đối soát định kỳ: mở quyền cho ${summary.granted} đơn`
    );
  }
  return NextResponse.json(summary, {
    headers: { "Cache-Control": "no-store" },
  });
}

export const GET = run;
export const POST = run;
