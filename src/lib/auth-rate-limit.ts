import "server-only";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  authLimitStatus,
  buildAuthRateLimitKey,
  clientAddressFromHeaders,
  nextAuthFailure,
  releaseAuthAttemptReservations,
  reserveAuthAttempts,
  type AuthRateLimitPolicy,
  type AuthRateLimitTarget,
  type AuthReservationStore,
} from "@/lib/auth-rate-limit-rules";

export type LoginRateLimits = {
  targets: AuthRateLimitTarget[];
  resetOnSuccess: string[];
  releaseOneOnSuccess: string[];
};

const MINUTE = 60_000;
const LOGIN_PAIR_POLICY: AuthRateLimitPolicy = {
  maxAttempts: 5,
  windowMs: 15 * MINUTE,
  blockMs: 15 * MINUTE,
};
const LOGIN_ACCOUNT_POLICY: AuthRateLimitPolicy = {
  maxAttempts: 12,
  windowMs: 15 * MINUTE,
  blockMs: 15 * MINUTE,
};
const LOGIN_IP_POLICY: AuthRateLimitPolicy = {
  maxAttempts: 30,
  windowMs: 15 * MINUTE,
  blockMs: 15 * MINUTE,
};
const REGISTER_EMAIL_POLICY: AuthRateLimitPolicy = {
  maxAttempts: 3,
  windowMs: 60 * MINUTE,
  blockMs: 60 * MINUTE,
};
const REGISTER_IP_POLICY: AuthRateLimitPolicy = {
  maxAttempts: 10,
  windowMs: 60 * MINUTE,
  blockMs: 60 * MINUTE,
};

let lastCleanupAt = 0;

function rateLimitSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Thiếu biến môi trường SESSION_SECRET");
  return secret;
}

function target(
  scope: string,
  value: string,
  policy: AuthRateLimitPolicy
): AuthRateLimitTarget {
  return {
    key: buildAuthRateLimitKey(scope, value, rateLimitSecret()),
    policy,
  };
}

/** Địa chỉ do reverse proxy cung cấp; null nếu không có header IP hợp lệ. */
export async function getAuthClientAddress(): Promise<string | null> {
  const requestHeaders = await headers();
  return clientAddressFromHeaders({
    cfConnectingIp: requestHeaders.get("cf-connecting-ip"),
    realIp: requestHeaders.get("x-real-ip"),
    forwardedFor: requestHeaders.get("x-forwarded-for"),
  });
}

export function buildLoginRateLimits(
  email: string,
  clientAddress: string | null
): LoginRateLimits {
  const boundedEmail = email.slice(0, 320);
  const account = target("login-account", boundedEmail, LOGIN_ACCOUNT_POLICY);
  const targets = [account];
  const resetOnSuccess = [account.key];
  const releaseOneOnSuccess: string[] = [];

  if (clientAddress) {
    const pair = target(
      "login-pair",
      `${boundedEmail}\0${clientAddress}`,
      LOGIN_PAIR_POLICY
    );
    const ip = target("login-ip", clientAddress, LOGIN_IP_POLICY);
    targets.push(pair, ip);
    resetOnSuccess.push(pair.key);
    releaseOneOnSuccess.push(ip.key);
  }

  return { targets, resetOnSuccess, releaseOneOnSuccess };
}

export function buildRegistrationRateLimits(
  email: string,
  clientAddress: string | null
): AuthRateLimitTarget[] {
  const targets = [
    target("register-email", email.slice(0, 320), REGISTER_EMAIL_POLICY),
  ];
  if (clientAddress) {
    targets.push(target("register-ip", clientAddress, REGISTER_IP_POLICY));
  }
  return targets;
}

/**
 * Đọc lỗi rate-limit theo kiểu fail-open: sự cố riêng của bảng bảo vệ không
 * được phép biến thành sự cố khóa toàn bộ đăng nhập.
 */
export async function checkAuthRateLimits(
  targets: AuthRateLimitTarget[],
  now = new Date()
): Promise<{ blocked: boolean; retryAfterSeconds: number }> {
  try {
    const rows = await db.authRateLimit.findMany({
      where: { key: { in: targets.map((item) => item.key) } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row]));
    let retryAfterSeconds = 0;

    for (const item of targets) {
      const status = authLimitStatus(byKey.get(item.key) ?? null, now);
      retryAfterSeconds = Math.max(
        retryAfterSeconds,
        status.retryAfterSeconds
      );
    }

    return { blocked: retryAfterSeconds > 0, retryAfterSeconds };
  } catch (error) {
    console.error("[auth-rate-limit] Không đọc được bộ đếm:", error);
    return { blocked: false, retryAfterSeconds: 0 };
  }
}

function isRetryableWriteConflict(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return error.code === "P2002" || error.code === "P2034";
}

const reservationStore: AuthReservationStore = {
  serializable(operation) {
    return db.$transaction(
      async (tx) =>
        operation({
          async read(key) {
            return tx.authRateLimit.findUnique({ where: { key } });
          },
          async write(key, state) {
            const data = {
              attempts: state.attempts,
              windowStartedAt: state.windowStartedAt,
              blockedUntil: state.blockedUntil,
            };
            await tx.authRateLimit.upsert({
              where: { key },
              update: data,
              create: { key, ...data },
            });
          },
        }),
      { isolationLevel: "Serializable" }
    );
  },
};

/**
 * Đọc + giữ chỗ trong cùng transaction trước bcrypt. Xung đột cạnh tranh bị
 * retry; nếu vẫn xung đột sau cùng thì fail-closed ngắn hạn để burst không lọt
 * qua. Các lỗi hạ tầng khác vẫn fail-open để DB phụ không khóa toàn website.
 */
export async function reserveAuthRateLimits(
  targets: AuthRateLimitTarget[],
  now = new Date()
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  try {
    const result = await reserveAuthAttempts(reservationStore, targets, now, {
      maxAttempts: 5,
      isRetryable: isRetryableWriteConflict,
    });
    scheduleOldCounterCleanup(now);
    return result;
  } catch (error) {
    console.error("[auth-rate-limit] Không giữ được lượt xác thực:", error);
    if (isRetryableWriteConflict(error)) {
      return { allowed: false, retryAfterSeconds: 1 };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

async function recordOneFailure(
  item: AuthRateLimitTarget,
  now: Date
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.$transaction(
        async (tx) => {
          const existing = await tx.authRateLimit.findUnique({
            where: { key: item.key },
          });
          const next = nextAuthFailure(existing, item.policy, now);
          const data = {
            attempts: next.attempts,
            windowStartedAt: next.windowStartedAt,
            blockedUntil: next.blockedUntil,
          };

          if (existing) {
            await tx.authRateLimit.update({
              where: { key: item.key },
              data,
            });
          } else {
            await tx.authRateLimit.create({
              data: { key: item.key, ...data },
            });
          }
        },
        { isolationLevel: "Serializable" }
      );
      return;
    } catch (error) {
      if (attempt < 2 && isRetryableWriteConflict(error)) continue;
      throw error;
    }
  }
}

function scheduleOldCounterCleanup(now: Date) {
  if (now.getTime() - lastCleanupAt < 60 * MINUTE) return;
  lastCleanupAt = now.getTime();
  const cutoff = new Date(now.getTime() - 24 * 60 * MINUTE);
  void db.authRateLimit
    .deleteMany({ where: { updatedAt: { lt: cutoff } } })
    .catch((error) =>
      console.error("[auth-rate-limit] Không dọn được bộ đếm cũ:", error)
    );
}

export async function recordAuthFailures(
  targets: AuthRateLimitTarget[],
  now = new Date()
): Promise<void> {
  try {
    for (const item of targets) await recordOneFailure(item, now);
    scheduleOldCounterCleanup(now);
  } catch (error) {
    console.error("[auth-rate-limit] Không ghi được lần thất bại:", error);
  }
}

export async function clearAuthRateLimits(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await db.authRateLimit.deleteMany({ where: { key: { in: keys } } });
  } catch (error) {
    console.error("[auth-rate-limit] Không xóa được bộ đếm đã thành công:", error);
  }
}

/**
 * Account/pair được reset sau mật khẩu đúng. IP chỉ hoàn đúng một reservation,
 * nhờ vậy login hợp lệ không bị tính là lỗi nhưng cũng không xóa lỗi của request
 * khác đang dùng chung NAT/proxy.
 */
export async function settleSuccessfulLoginRateLimits(
  limits: LoginRateLimits
): Promise<void> {
  await clearAuthRateLimits(limits.resetOnSuccess);
  if (limits.releaseOneOnSuccess.length === 0) return;
  try {
    await releaseAuthAttemptReservations(
      reservationStore,
      limits.releaseOneOnSuccess,
      { maxAttempts: 5, isRetryable: isRetryableWriteConflict }
    );
  } catch (error) {
    console.error("[auth-rate-limit] Không hoàn được lượt IP hợp lệ:", error);
  }
}
