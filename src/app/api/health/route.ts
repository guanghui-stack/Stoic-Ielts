import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import seedData from "../../../../prisma/seed-data.json";

/**
 * Dấu mốc phiên bản mã nguồn — đổi mỗi khi có thay đổi cần xác nhận đã lên
 * production. Nhờ đó biết chắc máy chủ đang chạy bản nào.
 */
const BUILD_MARKER = "2026-08-03-toc-mobile-fix";

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
    // Cấu hình thanh toán: chỉ báo ĐÃ ĐẶT hay CHƯA, tuyệt đối không trả giá trị
    payment: {
      appUrlConfigured: Boolean(process.env.APP_URL?.trim()),
      merchantIdConfigured: Boolean(process.env.SEPAY_MERCHANT_ID?.trim()),
      secretKeyConfigured: Boolean(process.env.SEPAY_SECRET_KEY?.trim()),
      ipnSecretConfigured: Boolean(process.env.SEPAY_IPN_SECRET?.trim()),
      environment: (process.env.SEPAY_ENV ?? "sandbox").trim(),
    },
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
    // Ba bảng thanh toán có tồn tại chưa (biết ngay migration đã chạy hay chưa)
    const [orderCount, grantCount, reviewCount] = await Promise.all([
      db.paymentOrder.count(),
      db.accessGrant.count({ where: { status: "ACTIVE" } }),
      db.paymentOrder.count({ where: { status: "REQUIRES_REVIEW" } }),
    ]);
    report.paymentOrderCount = orderCount;
    report.activeGrantCount = grantCount;
    report.ordersNeedingReview = reviewCount;

    // Hệ danh hiệu: đủ để biết catalog đã gieo chưa và bộ đề đã đóng băng chưa.
    // `initStatus: ok` KHÔNG chứng minh được điều này vì phần gieo catalog nằm
    // trong try/catch riêng để một lỗi ở đó không chặn cả việc khởi động.
    const [titleCount, awardCount, activeCollection, eventsFailed] =
      await Promise.all([
        db.titleDefinition.count({ where: { active: true } }),
        db.userTitle.count({ where: { status: "EARNED" } }),
        db.exerciseCollection.findFirst({
          where: { status: "ACTIVE" },
          select: { code: true, _count: { select: { items: true } } },
        }),
        db.achievementEvent.count({ where: { status: "FAILED" } }),
      ]);
    // Ba con số này phân biệt được "chưa đủ điều kiện" với "hệ thống hỏng":
    //  - progressRows = 0  → engine chưa từng chạy cho ai
    //  - validAttempts = 0 → hàng rào chống cày đang loại sạch bài làm
    //  - cả hai > 0 mà awardCount = 0 → học viên đúng là chưa đủ điều kiện
    const [progressRows, validAttempts, gradedReading] = await Promise.all([
      db.titleProgress.count(),
      db.attempt.count({ where: { validForAchievements: true } }),
      db.attempt.count({
        where: { status: "GRADED", exercise: { skill: "READING" } },
      }),
    ]);

    report.achievements = {
      titleCount,
      awardCount,
      progressRows,
      validAttempts,
      gradedReadingAttempts: gradedReading,
      activeCollection: activeCollection
        ? `${activeCollection.code} (${activeCollection._count.items} bài)`
        : "chưa có bộ đề nào được đóng băng",
      failedEvents: eventsFailed,
      achievementEligibleExercises: await db.exercise.count({
        where: { achievementEligible: true },
      }),
    };
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
