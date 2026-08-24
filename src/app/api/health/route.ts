import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  HEALTH_RESPONSE_HEADERS,
  runPublicHealthCheck,
} from "@/lib/production-hardening";

/**
 * Trạm kiểm tra tình trạng hệ thống — dùng để chẩn đoán từ xa khi
 * triển khai trên hosting. Bản public chỉ trả liveness tối giản để không lộ
 * dữ liệu vận hành ra internet công khai.
 */
export async function GET() {
  const report = await runPublicHealthCheck(db);
  return NextResponse.json(report.body, {
    status: report.httpStatus,
    headers: HEALTH_RESPONSE_HEADERS,
  });
}
