import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export type AuthRateLimitPolicy = {
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
};

export type AuthRateLimitTarget = {
  key: string;
  policy: AuthRateLimitPolicy;
};

export type ClientAddressHeaders = {
  cfConnectingIp?: string | null;
  realIp?: string | null;
  forwardedFor?: string | null;
};

/**
 * Chỉ nhận địa chỉ IP hợp lệ từ các header mà reverse proxy thường ghi lại.
 * Giá trị đầu tiên của X-Forwarded-For là client gần proxy nhất theo cấu hình
 * deploy hiện tại; chuỗi tùy ý bị bỏ qua để không làm nổ số lượng khóa DB.
 */
export function clientAddressFromHeaders(
  values: ClientAddressHeaders
): string | null {
  const candidates = [
    values.cfConnectingIp,
    values.realIp,
    values.forwardedFor?.split(",", 1)[0],
  ];

  for (const candidate of candidates) {
    const normalized = candidate?.trim().toLowerCase();
    if (normalized && isIP(normalized) !== 0) return normalized;
  }

  return null;
}

/** Khóa HMAC ổn định nhưng không để lộ email/IP trong database. */
export function buildAuthRateLimitKey(
  scope: string,
  value: string,
  secret: string
): string {
  const digest = createHmac("sha256", secret)
    .update(`${scope}\0${value}`)
    .digest("base64url");
  return `${scope}:${digest}`;
}

export type AuthRateLimitState = {
  attempts: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
};

export type AuthReservationTransaction = {
  read(key: string): Promise<AuthRateLimitState | null>;
  write(key: string, state: AuthRateLimitState): Promise<void>;
};

export type AuthReservationStore = {
  serializable<T>(
    operation: (transaction: AuthReservationTransaction) => Promise<T>
  ): Promise<T>;
};

export type AuthReservationRetryOptions = {
  maxAttempts: number;
  isRetryable(error: unknown): boolean;
};

export function authLimitStatus(
  state: AuthRateLimitState | null,
  now: Date
): { blocked: boolean; retryAfterSeconds: number } {
  if (!state?.blockedUntil || state.blockedUntil.getTime() <= now.getTime()) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  return {
    blocked: true,
    retryAfterSeconds: Math.ceil(
      (state.blockedUntil.getTime() - now.getTime()) / 1000
    ),
  };
}

export function nextAuthFailure(
  state: AuthRateLimitState | null,
  policy: AuthRateLimitPolicy,
  now: Date
): AuthRateLimitState {
  if (
    !state ||
    now.getTime() - state.windowStartedAt.getTime() >= policy.windowMs
  ) {
    const attempts = 1;
    return {
      attempts,
      windowStartedAt: now,
      blockedUntil:
        attempts >= policy.maxAttempts
          ? new Date(now.getTime() + policy.blockMs)
          : null,
    };
  }

  if (authLimitStatus(state, now).blocked) return state;

  const attempts = state.attempts + 1;
  return {
    attempts,
    windowStartedAt: state.windowStartedAt,
    blockedUntil:
      attempts >= policy.maxAttempts
        ? new Date(now.getTime() + policy.blockMs)
        : null,
  };
}

/**
 * Giữ chỗ cho một lần xác thực trước khi chạy bcrypt. Toàn bộ target được đọc,
 * kiểm tra và tăng trong cùng một transaction tuần tự hóa; lần chạm ngưỡng vẫn
 * được phép thử, mọi lần sau bị chặn trước phần xác thực tốn CPU.
 */
export async function reserveAuthAttempts(
  store: AuthReservationStore,
  targets: AuthRateLimitTarget[],
  now: Date,
  retry: AuthReservationRetryOptions = {
    maxAttempts: 1,
    isRetryable: () => false,
  }
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const maxAttempts = Math.max(1, Math.floor(retry.maxAttempts));
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await store.serializable(async (transaction) => {
        const uniqueTargets = [
          ...new Map(targets.map((item) => [item.key, item])).values(),
        ].sort((left, right) => left.key.localeCompare(right.key));
        const rows = new Map<string, AuthRateLimitState | null>();
        let retryAfterSeconds = 0;

        for (const item of uniqueTargets) {
          const row = await transaction.read(item.key);
          rows.set(item.key, row);
          retryAfterSeconds = Math.max(
            retryAfterSeconds,
            authLimitStatus(row, now).retryAfterSeconds
          );
        }

        if (retryAfterSeconds > 0) {
          return { allowed: false, retryAfterSeconds };
        }

        for (const item of uniqueTargets) {
          await transaction.write(
            item.key,
            nextAuthFailure(rows.get(item.key) ?? null, item.policy, now)
          );
        }

        return { allowed: true, retryAfterSeconds: 0 };
      });
    } catch (error) {
      if (attempt < maxAttempts && retry.isRetryable(error)) continue;
      throw error;
    }
  }

  throw new Error("Không thể giữ chỗ xác thực");
}

/**
 * Hoàn lại đúng một reservation cho mỗi khóa. Dùng cho khóa IP sau một lần
 * xác thực thành công để giữ nguyên mọi thất bại khác cùng địa chỉ.
 */
export async function releaseAuthAttemptReservations(
  store: AuthReservationStore,
  keys: string[],
  retry: AuthReservationRetryOptions = {
    maxAttempts: 1,
    isRetryable: () => false,
  }
): Promise<void> {
  const maxAttempts = Math.max(1, Math.floor(retry.maxAttempts));
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await store.serializable(async (transaction) => {
        for (const key of [...new Set(keys)].sort()) {
          const row = await transaction.read(key);
          if (!row || row.attempts <= 0) continue;
          await transaction.write(key, {
            attempts: row.attempts - 1,
            windowStartedAt: row.windowStartedAt,
            blockedUntil: null,
          });
        }
      });
      return;
    } catch (error) {
      if (attempt < maxAttempts && retry.isRetryable(error)) continue;
      throw error;
    }
  }
}
