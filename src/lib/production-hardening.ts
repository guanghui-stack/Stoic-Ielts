import type { PrismaClient } from "@prisma/client";

export const BUILD_MARKER = "2026-09-06-health-db-reason";

export const PRODUCTION_SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
] as const;

const DEFAULT_ALLOWED_ORIGINS = [
  "stoic-ielts.online",
  "www.stoic-ielts.online",
  "wobridgeacademy.com",
  "www.wobridgeacademy.com",
  "wobridges.com",
  "www.wobridges.com",
  "localhost:3000",
] as const;

/**
 * Vì sao hỏng, nói bằng MÃ ĐÓNG chứ không bằng thông điệp lỗi.
 *
 * Endpoint này công khai trên internet, nên không được phép mang theo chuỗi lỗi
 * thô của MySQL — chuỗi đó có tên máy chủ, tên người dùng và tên database. Bốn
 * mã dưới đây không lộ gì mà vẫn tách được ba nguyên nhân hoàn toàn khác nhau,
 * và ba nguyên nhân đó cần ba cách sửa khác nhau:
 *
 *   NO_DATABASE_URL — biến môi trường không có. Đây là sự cố ĐÃ TỪNG XẢY RA
 *     nhiều lần với dự án này: đổi tên miền trong hPanel là `DATABASE_URL` bị
 *     xoá. Không mở hPanel thì không đoán ra, nên nó xứng đáng có mã riêng.
 *   TIMEOUT — quá hạn chờ. Máy chủ MySQL không trả lời: sai host, tường lửa,
 *     hoặc database đang quá tải.
 *   REJECTED — MySQL trả lời NGAY bằng một lỗi. Gần như luôn là sai mật khẩu,
 *     tài khoản bị xoá, chưa bật truy cập từ xa, hoặc chạm trần kết nối.
 *
 * Phân biệt TIMEOUT với REJECTED là phần đáng giá nhất: một cái là "không tới
 * được", một cái là "tới được nhưng bị từ chối", và nhìn từ ngoài chúng giống
 * hệt nhau nếu chỉ có một chữ "error".
 */
export type HealthDbReason = "OK" | "NO_DATABASE_URL" | "TIMEOUT" | "REJECTED";

export type PublicHealthPayload = {
  status: "ok" | "error";
  time: string;
  buildMarker: string;
  dbReason: HealthDbReason;
};

export const HEALTH_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

type HealthCheckResult = {
  httpStatus: 200 | 503;
  body: PublicHealthPayload;
};

type DbPingClient = Pick<PrismaClient, "$queryRaw">;

const DEFAULT_HEALTH_TIMEOUT_MS = 8_000;

/** Dấu riêng để nhận ra lỗi do CHÍNH hàng rào thời gian ném ra, không phải lỗi của MySQL. */
class HealthTimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      timer = undefined;
      reject(new HealthTimeoutError("health check timed out"));
    }, timeoutMs);

    promise.then(
      (value) => {
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
        resolve(value);
      },
      (error: unknown) => {
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
        reject(error);
      }
    );
  });
}

export function buildAllowedOrigins(extraOrigins = ""): string[] {
  const extras = extraOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...extras])];
}

export async function runPublicHealthCheck(
  db: DbPingClient,
  timeoutMs = DEFAULT_HEALTH_TIMEOUT_MS
): Promise<HealthCheckResult> {
  const time = new Date().toISOString();

  // Kiểm biến môi trường TRƯỚC khi ping: thiếu nó thì Prisma cũng ném lỗi ngay,
  // nhưng lỗi đó trông y hệt lỗi sai mật khẩu — mà hai thứ sửa ở hai chỗ khác
  // nhau trong hPanel.
  if (!process.env.DATABASE_URL) {
    return {
      httpStatus: 503,
      body: {
        status: "error",
        time,
        buildMarker: BUILD_MARKER,
        dbReason: "NO_DATABASE_URL",
      },
    };
  }

  try {
    await withTimeout(db.$queryRaw`SELECT 1`, timeoutMs);
    return {
      httpStatus: 200,
      body: {
        status: "ok",
        time,
        buildMarker: BUILD_MARKER,
        dbReason: "OK",
      },
    };
  } catch (error) {
    return {
      httpStatus: 503,
      body: {
        status: "error",
        time,
        buildMarker: BUILD_MARKER,
        // Chỉ đọc KIỂU của lỗi, không bao giờ đọc nội dung — nội dung là thứ
        // mang tên máy chủ và tên tài khoản.
        dbReason: error instanceof HealthTimeoutError ? "TIMEOUT" : "REJECTED",
      },
    };
  }
}
