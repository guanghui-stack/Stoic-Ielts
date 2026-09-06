import assert from "node:assert/strict";
import { db } from "../src/lib/db.ts";
import {
  HEALTH_RESPONSE_HEADERS,
  PRODUCTION_SECURITY_HEADERS,
  buildAllowedOrigins,
  runPublicHealthCheck,
} from "../src/lib/production-hardening.ts";

process.env.ALLOWED_ORIGINS =
  "preview.stoic-ielts.online, staging.stoic-ielts.online";

const { default: nextConfig } = await import("../next.config.ts");

function sameMembers(actual: string[], expected: string[], label: string) {
  assert.deepEqual(
    [...actual].sort(),
    [...expected].sort(),
    `${label} mismatch`
  );
}

const nextHeaders = await nextConfig.headers?.();
assert(nextHeaders, "next.config.ts must define headers()");
assert.equal(nextConfig.poweredByHeader, false);

const catchAllRule = nextHeaders.find(
  (rule: { source: string }) => rule.source === "/:path*"
);
assert(catchAllRule, "missing catch-all security header rule");

const configuredHeaders = new Map(
  catchAllRule.headers.map((header: { key: string; value: string }) => [
    header.key,
    header.value,
  ])
);
sameMembers(
  [...configuredHeaders.keys()] as string[],
  PRODUCTION_SECURITY_HEADERS.map((header) => header.key),
  "security header keys"
);
for (const header of PRODUCTION_SECURITY_HEADERS) {
  assert.equal(
    configuredHeaders.get(header.key),
    header.value,
    `unexpected ${header.key} value`
  );
}

const allowedOrigins = [
  ...(nextConfig.experimental?.serverActions?.allowedOrigins ?? []),
] as string[];
sameMembers(
  allowedOrigins,
  buildAllowedOrigins(process.env.ALLOWED_ORIGINS),
  "allowedOrigins"
);
assert(
  !allowedOrigins.includes("*.hostingersite.com"),
  "allowedOrigins should not wildcard Hostinger preview domains"
);
assert.deepEqual(HEALTH_RESPONSE_HEADERS, { "Cache-Control": "no-store" });

const originalQueryRaw = db.$queryRaw.bind(db);

try {
  let successCalls = 0;
  db.$queryRaw = (async () => {
    successCalls += 1;
    return [{ ok: 1 }];
  }) as typeof db.$queryRaw;

  const successResponse = await runPublicHealthCheck(db);
  assert.equal(successResponse.httpStatus, 200);
  const successBody = successResponse.body as Record<string, unknown>;
  sameMembers(
    Object.keys(successBody),
    ["buildMarker", "status", "time", "dbReason"],
    "success health payload keys"
  );
  assert.equal(successBody.status, "ok");
  assert.equal(successBody.dbReason, "OK");
  assert.equal(typeof successBody.time, "string");
  assert.equal(typeof successBody.buildMarker, "string");
  assert.equal(successCalls, 1, "health check should perform exactly one DB ping");

  let failureCalls = 0;
  db.$queryRaw = (async () => {
    failureCalls += 1;
    throw new Error("raw database error should never leak");
  }) as typeof db.$queryRaw;

  const failureResponse = await runPublicHealthCheck(db);
  assert.equal(failureResponse.httpStatus, 503);
  const failureBody = failureResponse.body as Record<string, unknown>;
  sameMembers(
    Object.keys(failureBody),
    ["buildMarker", "status", "time", "dbReason"],
    "failure health payload keys"
  );
  assert.equal(failureBody.status, "error");
  // MySQL trả lời ngay bằng một lỗi -> REJECTED, không phải TIMEOUT. Phân biệt
  // được hai cái này là toàn bộ giá trị của trường `dbReason`.
  assert.equal(failureBody.dbReason, "REJECTED");
  assert.equal(typeof failureBody.time, "string");
  assert.equal(typeof failureBody.buildMarker, "string");
  assert.equal(failureCalls, 1, "failed health check should still use one DB ping");
  assert(
    !JSON.stringify(failureBody).includes("raw database error"),
    "health payload must not leak raw DB errors"
  );

  const neverSettlingDb = {
    $queryRaw: (() => new Promise<never>(() => {})) as typeof db.$queryRaw,
  };
  const timeoutStartedAt = Date.now();
  const timeoutResponse = await Promise.race([
    runPublicHealthCheck(neverSettlingDb, 20),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 100)),
  ]);
  assert(timeoutResponse, "never-settling DB ping should be bounded");
  assert.equal(timeoutResponse.httpStatus, 503);
  assert.equal(timeoutResponse.body.status, "error");
  assert.equal(
    timeoutResponse.body.dbReason,
    "TIMEOUT",
    "ping treo phải báo TIMEOUT, không phải REJECTED",
  );
  assert(
    Date.now() - timeoutStartedAt < 1_000,
    "health timeout regression should not wait for the default timeout"
  );

  // Thiếu DATABASE_URL là sự cố đã lặp lại nhiều lần với dự án này (đổi tên
  // miền trong hPanel là biến này bị xoá). Nó phải có mã riêng, và phải được
  // trả lời mà KHÔNG ping database — ping lúc đó chỉ tốn thêm 8 giây chờ.
  const savedUrl = process.env.DATABASE_URL;
  let pingsWhileMissing = 0;
  db.$queryRaw = (async () => {
    pingsWhileMissing += 1;
    return [{ ok: 1 }];
  }) as typeof db.$queryRaw;
  delete process.env.DATABASE_URL;
  try {
    const missing = await runPublicHealthCheck(db);
    assert.equal(missing.httpStatus, 503);
    assert.equal(missing.body.dbReason, "NO_DATABASE_URL");
    assert.equal(pingsWhileMissing, 0, "thiếu DATABASE_URL thì không ping database");
  } finally {
    if (savedUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = savedUrl;
  }
} finally {
  db.$queryRaw = originalQueryRaw as typeof db.$queryRaw;
}
