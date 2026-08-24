/**
 * Kiểm thử thu hồi phiên và giới hạn thử đăng nhập/đăng ký.
 * Chạy: node --experimental-strip-types scripts/test-auth-security.ts
 */

export {};

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const rateRules = await import("../src/lib/auth-rate-limit-rules.ts").catch(
  () => null
);
const sessionSecurity = await import("../src/lib/session-security.ts").catch(
  () => null
);

console.log("\n— Giới hạn đăng nhập —");
check("có module quy tắc rate limit", Boolean(rateRules), true);

if (rateRules) {
  check(
    "lấy IP hợp lệ theo thứ tự proxy tin cậy",
    rateRules.clientAddressFromHeaders?.({
      cfConnectingIp: "not-an-ip",
      realIp: "203.0.113.7",
      forwardedFor: "198.51.100.8, 10.0.0.1",
    }),
    "203.0.113.7"
  );
  check(
    "không nhận chuỗi header giả làm IP",
    rateRules.clientAddressFromHeaders?.({ forwardedFor: "attacker-value" }),
    null
  );

  const derivedKey = rateRules.buildAuthRateLimitKey?.(
    "login-account",
    "student@example.com",
    "test-secret"
  );
  check("khóa giới hạn không chứa email thô", derivedKey?.includes("student@example.com"), false);
  check("khóa giới hạn vừa cột VARCHAR(96)", (derivedKey?.length ?? 999) <= 96, true);
  check(
    "cùng dữ liệu sinh cùng khóa ổn định",
    derivedKey,
    rateRules.buildAuthRateLimitKey?.(
      "login-account",
      "student@example.com",
      "test-secret"
    )
  );

  const policy = { maxAttempts: 3, windowMs: 10 * 60_000, blockMs: 15 * 60_000 };
  const now = new Date("2026-08-24T10:00:00.000Z");

  const first = rateRules.nextAuthFailure(null, policy, now);
  check("lần sai đầu mở một cửa sổ mới", first, {
    attempts: 1,
    windowStartedAt: now,
    blockedUntil: null,
  });

  const second = rateRules.nextAuthFailure(first, policy, new Date(now.getTime() + 1_000));
  check("lần sai thứ hai chưa khóa", second.blockedUntil, null);
  check("bộ đếm tăng trong cùng cửa sổ", second.attempts, 2);

  const thirdAt = new Date(now.getTime() + 2_000);
  const third = rateRules.nextAuthFailure(second, policy, thirdAt);
  check("chạm ngưỡng thì khóa", third.blockedUntil, new Date(thirdAt.getTime() + policy.blockMs));

  check(
    "đang trong thời gian khóa thì bị chặn",
    rateRules.authLimitStatus(third, new Date(thirdAt.getTime() + 60_000)),
    { blocked: true, retryAfterSeconds: 14 * 60 }
  );

  check(
    "hết thời gian khóa thì được thử lại",
    rateRules.authLimitStatus(third, new Date(thirdAt.getTime() + policy.blockMs)),
    { blocked: false, retryAfterSeconds: 0 }
  );

  const resetAt = new Date(now.getTime() + policy.windowMs + 1);
  check("hết cửa sổ thì lần sai mới bắt đầu lại từ một", rateRules.nextAuthFailure(second, policy, resetAt), {
    attempts: 1,
    windowStartedAt: resetAt,
    blockedUntil: null,
  });

  const reservationRows = new Map<
    string,
    { attempts: number; windowStartedAt: Date; blockedUntil: Date | null }
  >();
  let serialTail = Promise.resolve();
  const serialStore = {
    async serializable<T>(
      operation: (transaction: {
        read(key: string): Promise<{
          attempts: number;
          windowStartedAt: Date;
          blockedUntil: Date | null;
        } | null>;
        write(
          key: string,
          state: {
            attempts: number;
            windowStartedAt: Date;
            blockedUntil: Date | null;
          }
        ): Promise<void>;
      }) => Promise<T>
    ): Promise<T> {
      let release!: () => void;
      const previous = serialTail;
      serialTail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await operation({
          async read(key) {
            return reservationRows.get(key) ?? null;
          },
          async write(key, state) {
            // Một yield buộc các lời gọi Promise.all thực sự tranh chấp; khóa
            // serializable của fake phải là thứ ngăn lost update.
            await Promise.resolve();
            reservationRows.set(key, state);
          },
        });
      } finally {
        release();
      }
    },
  };
  const reserve = rateRules.reserveAuthAttempts;
  check("có primitive reservation nguyên tử trước bcrypt", typeof reserve, "function");
  const burstDecisions =
    typeof reserve === "function"
      ? await Promise.all(
          Array.from({ length: 12 }, () =>
            reserve(
              serialStore,
              [{ key: "login-account:test", policy }],
              now
            )
          )
        )
      : [];
  check(
    "burst đồng thời chỉ cấp phép tối đa đúng ngưỡng",
    burstDecisions.filter((decision) => decision.allowed).length,
    policy.maxAttempts
  );
  check(
    "mọi request vượt ngưỡng bị chặn trước xác thực",
    burstDecisions.filter((decision) => !decision.allowed).length,
    12 - policy.maxAttempts
  );
  const releaseReservation = rateRules.releaseAuthAttemptReservations;
  check(
    "có primitive hoàn lại đúng reservation của login thành công",
    typeof releaseReservation,
    "function"
  );
  if (typeof releaseReservation === "function") {
    await releaseReservation(serialStore, ["login-account:test"]);
  }
  check(
    "login thành công chỉ hoàn lại một lượt, không xóa lịch sử IP",
    reservationRows.get("login-account:test")?.attempts,
    policy.maxAttempts - 1
  );
  check(
    "hoàn reservation gỡ block do lượt thành công vừa tạo",
    reservationRows.get("login-account:test")?.blockedUntil,
    null
  );

  let serializationCalls = 0;
  const retryDecision =
    typeof reserve === "function"
      ? await reserve(
          {
            async serializable(operation) {
              serializationCalls++;
              if (serializationCalls < 3) {
                throw Object.assign(new Error("WRITE_CONFLICT"), {
                  code: "P2034",
                });
              }
              return serialStore.serializable(operation);
            },
          },
          [{ key: "login-account:retry", policy }],
          now,
          {
            maxAttempts: 3,
            isRetryable: (error: unknown) =>
              Boolean(
                error &&
                  typeof error === "object" &&
                  "code" in error &&
                  error.code === "P2034"
              ),
          }
        ).catch(() => null)
      : null;
  check("xung đột Serializable được retry rồi cấp phép", retryDecision?.allowed, true);
  check("retry dừng ngay khi transaction thành công", serializationCalls, 3);
}

console.log("\n— Thu hồi phiên phía máy chủ —");
check("có module dịch vụ an toàn phiên", Boolean(sessionSecurity), true);

if (sessionSecurity) {
  check(
    "có adapter nối dịch vụ phiên với kho User",
    typeof sessionSecurity.createSessionSecurityStore,
    "function"
  );

  if (typeof sessionSecurity.createSessionSecurityStore !== "function") {
    console.log("  ⓘ bỏ qua các phép thử adapter vì implementation chưa tồn tại");
  } else {
  let localCookieDeleted = false;
  const revocationError = new Error("DATABASE_UNAVAILABLE");
  let observedRevocationError: unknown = null;
  try {
    await sessionSecurity.revokeSessionAndDeleteCookie?.(
      async () => {
        throw revocationError;
      },
      () => {
        localCookieDeleted = true;
      }
    );
  } catch (error) {
    observedRevocationError = error;
  }
  check("logout vẫn xóa cookie khi thu hồi DB lỗi", localCookieDeleted, true);
  check("logout không che mất lỗi thu hồi DB", observedRevocationError, revocationError);

  const users = new Map<
    string,
    { active: boolean; activeSessionId: string | null; passwordHash: string }
  >([
    [
      "u1",
      { active: true, activeSessionId: "sid-old", passwordHash: "hash-old" },
    ],
    [
      "u2",
      { active: false, activeSessionId: null, passwordHash: "hash-inactive" },
    ],
  ]);
  const repository = {
    async updateMany(args: {
      where: {
        id: string;
        active?: boolean;
        activeSessionId?: string;
        passwordHash?: string | null;
      };
      data: { activeSessionId: string | null; passwordHash?: string };
    }) {
      const user = users.get(args.where.id);
      if (
        !user ||
        (args.where.active !== undefined && user.active !== args.where.active) ||
        (args.where.activeSessionId !== undefined &&
          user.activeSessionId !== args.where.activeSessionId) ||
        (args.where.passwordHash !== undefined &&
          user.passwordHash !== args.where.passwordHash)
      ) {
        return { count: 0 };
      }
      user.activeSessionId = args.data.activeSessionId;
      if (args.data.passwordHash !== undefined) {
        user.passwordHash = args.data.passwordHash;
      }
      return { count: 1 };
    },
    async update(args: {
      where: { id: string };
      data: { passwordHash: string; activeSessionId: null };
    }) {
      const user = users.get(args.where.id);
      if (!user) throw new Error("USER_NOT_FOUND");
      user.passwordHash = args.data.passwordHash;
      user.activeSessionId = args.data.activeSessionId;
    },
  };
  const store = sessionSecurity.createSessionSecurityStore(repository);

  const normalIssued = await sessionSecurity.issueServerSession?.(store, {
    userId: "u1",
    sid: "sid-login",
    expectedPasswordHash: "hash-old",
  });
  check("đăng nhập bình thường phát hành được phiên", normalIssued, true);
  check("phiên mới thay thế phiên cũ trên server", users.get("u1")?.activeSessionId, "sid-login");

  // Mô phỏng đúng race: bcrypt vừa xác thực hash cũ, quản trị viên reset mật
  // khẩu, rồi request đăng nhập cũ mới cố ghi phiên.
  const verifiedOldHash = users.get("u1")!.passwordHash;
  await sessionSecurity.replacePasswordAndRevokeSessions(store, {
    userId: "u1",
    passwordHash: "hash-after-reset",
  });
  const racedIssue = await sessionSecurity.issueServerSession?.(store, {
    userId: "u1",
    sid: "sid-from-old-password",
    expectedPasswordHash: verifiedOldHash,
  });
  check("hash cũ không thể phát hành phiên sau khi reset thắng race", racedIssue, false);
  check("race không cài activeSessionId", users.get("u1")?.activeSessionId, null);

  const inactiveIssue = await sessionSecurity.issueServerSession?.(store, {
    userId: "u2",
    sid: "sid-inactive",
  });
  check("luồng không dùng mật khẩu vẫn từ chối tài khoản bị khóa", inactiveIssue, false);
  check("tài khoản bị khóa không nhận activeSessionId", users.get("u2")?.activeSessionId, null);

  users.get("u1")!.activeSessionId = "sid-old";
  const revoked = await sessionSecurity.revokeCurrentServerSession(store, {
    userId: "u1",
    sid: "sid-old",
  });
  check("logout thu hồi đúng phiên đang hoạt động", revoked, true);
  check("logout xóa activeSessionId trên server", users.get("u1")?.activeSessionId, null);

  users.get("u1")!.activeSessionId = "sid-new";
  const staleRevoked = await sessionSecurity.revokeCurrentServerSession(store, {
    userId: "u1",
    sid: "sid-old",
  });
  check("cookie cũ không được xóa nhầm phiên đăng nhập mới", staleRevoked, false);
  check("phiên mới vẫn còn nguyên", users.get("u1")?.activeSessionId, "sid-new");

  await sessionSecurity.replacePasswordAndRevokeSessions(store, {
    userId: "u1",
    passwordHash: "hash-new",
  });
  check("đổi mật khẩu ghi hash mới", users.get("u1")?.passwordHash, "hash-new");
  check("đổi mật khẩu thu hồi mọi cookie cũ", users.get("u1")?.activeSessionId, null);

  users.set("u3", {
    active: true,
    activeSessionId: "sid-self-change",
    passwordHash: "hash-self-old",
  });
  const selfChanged = await sessionSecurity.replacePasswordIfCurrentAndRevokeSessions?.(
    store,
    {
      userId: "u3",
      passwordHash: "hash-self-new",
      expectedPasswordHash: "hash-self-old",
      expectedActiveSessionId: "sid-self-change",
    }
  );
  check("tự đổi mật khẩu bình thường dùng CAS thành công", selfChanged, true);
  check("CAS ghi mật khẩu tự đổi", users.get("u3")?.passwordHash, "hash-self-new");
  check("CAS tự đổi mật khẩu thu hồi phiên", users.get("u3")?.activeSessionId, null);

  users.set("u4", {
    active: true,
    activeSessionId: "sid-before-admin-reset",
    passwordHash: "hash-verified-by-old-request",
  });
  const verifiedBeforeRace = users.get("u4")!.passwordHash;
  await sessionSecurity.replacePasswordAndRevokeSessions(store, {
    userId: "u4",
    passwordHash: "hash-admin-reset",
  });
  const staleSelfChange =
    await sessionSecurity.replacePasswordIfCurrentAndRevokeSessions?.(store, {
      userId: "u4",
      passwordHash: "hash-attacker-old-request",
      expectedPasswordHash: verifiedBeforeRace,
      expectedActiveSessionId: "sid-before-admin-reset",
    });
  check("request tự đổi cũ thua CAS sau admin reset", staleSelfChange, false);
  check(
    "request cũ không ghi đè mật khẩu admin vừa reset",
    users.get("u4")?.passwordHash,
    "hash-admin-reset"
  );
  check("phiên vẫn bị thu hồi sau admin reset", users.get("u4")?.activeSessionId, null);
  }
}

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ BẢO MẬT ĐĂNG NHẬP ĐỀU ĐẠT\n"
    : `\n❌ CÓ ${failures} KIỂM THỬ BẢO MẬT ĐĂNG NHẬP THẤT BẠI\n`
);
process.exit(failures === 0 ? 0 : 1);
