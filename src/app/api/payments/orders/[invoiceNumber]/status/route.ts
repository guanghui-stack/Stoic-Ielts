import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Trạng thái đơn hàng cho trang kết quả tự cập nhật.
 *
 * Chỉ chủ đơn (hoặc quản trị viên) đọc được, và chỉ trả về đúng những gì giao
 * diện cần — không bao giờ trả payload thô của SePay xuống trình duyệt.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  const { invoiceNumber } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await db.paymentOrder.findUnique({
    where: { invoiceNumber },
    select: {
      userId: true,
      status: true,
      returnPath: true,
      paidAt: true,
      amount: true,
    },
  });

  // Không phân biệt "không tồn tại" với "không phải của bạn" — tránh để người
  // khác dò xem mã đơn nào có thật.
  if (!order || (order.userId !== user.id && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      status: order.status,
      // Chỉ đưa đường dẫn học khi đã thực sự trả tiền
      returnPath: order.status === "PAID" ? order.returnPath : null,
      paidAt: order.paidAt,
      amount: order.amount,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
