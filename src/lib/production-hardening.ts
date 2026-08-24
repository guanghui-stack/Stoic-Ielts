import type { PrismaClient } from "@prisma/client";

export const BUILD_MARKER = "2026-08-24-security-hardening";

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

export type PublicHealthPayload = {
  status: "ok" | "error";
  time: string;
  buildMarker: string;
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      timer = undefined;
      reject(new Error("health check timed out"));
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

  try {
    await withTimeout(db.$queryRaw`SELECT 1`, timeoutMs);
    return {
      httpStatus: 200,
      body: {
        status: "ok",
        time,
        buildMarker: BUILD_MARKER,
      },
    };
  } catch {
    return {
      httpStatus: 503,
      body: {
        status: "error",
        time,
        buildMarker: BUILD_MARKER,
      },
    };
  }
}
