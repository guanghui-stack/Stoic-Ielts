import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import seedData from "../../../../prisma/seed-data.json";

/**
 * Dấu mốc phiên bản mã nguồn — đổi mỗi khi có thay đổi cần xác nhận đã lên
 * production. Nhờ đó biết chắc máy chủ đang chạy bản nào.
 */
const BUILD_MARKER = "2026-07-31-feynman-reading-v1";

/**
 * Trạm kiểm tra tình trạng hệ thống — dùng để chẩn đoán từ xa khi
 * triển khai trên hosting. Chỉ trả về trạng thái, không lộ dữ liệu.
 */
export async function GET() {
  const report: Record<string, unknown> = {
    time: new Date().toISOString(),
    buildMarker: BUILD_MARKER,
    nodeEnv: process.env.NODE_ENV,
    sessionSecretConfigured: Boolean(process.env.SESSION_SECRET),
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    adminPasswordEnvSet: Boolean(process.env.ADMIN_PASSWORD),
    initStatus:
      (globalThis as { __wobridgesInit?: string }).__wobridgesInit ??
      "chưa chạy (dev hoặc instrumentation không được gọi)",
  };

  // Giới hạn 8 giây cho phần kiểm tra database — nếu kết nối bị treo
  // (thường do sai host trong DATABASE_URL) vẫn trả được báo cáo lỗi rõ ràng.
  const withTimeout = <T,>(p: Promise<T>, ms: number) =>
    Promise.race<T>([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Hết thời gian chờ sau ${ms / 1000}s — kết nối database bị treo (kiểm tra phần host trong DATABASE_URL)`)),
          ms
        )
      ),
    ]);

  // Email quản trị đang được cấu hình (chỉ dùng để đối chiếu, KHÔNG trả ra ngoài)
  const configuredAdminEmail = (
    process.env.ADMIN_EMAIL || seedData.admin.email
  )
    .trim()
    .toLowerCase();

  try {
    const [users, exercises, admins, configuredAdmin] = await withTimeout(
      Promise.all([
        db.user.count(),
        db.exercise.count(),
        db.user.count({ where: { role: "ADMIN" } }),
        db.user.findUnique({
          where: { email: configuredAdminEmail },
          select: { role: true, active: true },
        }),
      ]),
      8000
    );
    report.database = "ok";
    report.userCount = users;
    report.adminCount = admins;
    report.exerciseCount = exercises;
    report.restrictedExerciseCount = await db.exercise.count({
      where: { accessLevel: "RESTRICTED" },
    });
    // Trả về trạng thái, không lộ email: đủ để biết việc đổi tài khoản
    // quản trị đã áp dụng thành công trên máy chủ này hay chưa.
    report.configuredAdmin = configuredAdmin
      ? configuredAdmin.role === "ADMIN" && configuredAdmin.active
        ? "ok"
        : `tồn tại nhưng role=${configuredAdmin.role}, active=${configuredAdmin.active}`
      : "chưa tồn tại";
  } catch (err) {
    report.database = "error";
    report.databaseError = String(err).slice(0, 400);
  }

  // Khi thiếu cấu hình DB, liệt kê TÊN các biến môi trường liên quan
  // (chỉ tên, không lộ giá trị) để chẩn đoán từ xa
  if (!process.env.DATABASE_URL) {
    report.dbRelatedEnvNames = Object.keys(process.env).filter((k) =>
      /mysql|maria|database|db_/i.test(k)
    );
  }

  return NextResponse.json(report, {
    status: report.database === "ok" ? 200 : 500,
  });
}
