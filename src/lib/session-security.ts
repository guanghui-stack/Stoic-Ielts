export type SessionIdentity = {
  userId: string;
  sid: string;
};

export type SessionSecurityStore = {
  installActiveSession(input: {
    userId: string;
    sid: string;
    expectedPasswordHash?: string;
  }): Promise<boolean>;
  clearActiveSession(input: SessionIdentity): Promise<boolean>;
  replacePassword(input: {
    userId: string;
    passwordHash: string;
  }): Promise<void>;
  replacePasswordIfCurrent(input: {
    userId: string;
    passwordHash: string;
    expectedPasswordHash: string | null;
    expectedActiveSessionId: string;
  }): Promise<boolean>;
};

export type SessionUserRepository = {
  updateMany(args: {
    where: {
      id: string;
      active?: boolean;
      activeSessionId?: string;
      passwordHash?: string | null;
    };
    data: { activeSessionId: string | null; passwordHash?: string };
  }): PromiseLike<{ count: number }>;
  update(args: {
    where: { id: string };
    data: { passwordHash: string; activeSessionId: null };
  }): PromiseLike<unknown>;
};

/** Adapter nhỏ để cùng một luật được dùng bởi Prisma thật và kho giả trong test. */
export function createSessionSecurityStore(
  users: SessionUserRepository
): SessionSecurityStore {
  return {
    async installActiveSession(input) {
      const result = await users.updateMany({
        where: {
          id: input.userId,
          active: true,
          ...(input.expectedPasswordHash
            ? { passwordHash: input.expectedPasswordHash }
            : {}),
        },
        data: { activeSessionId: input.sid },
      });
      return result.count === 1;
    },
    async clearActiveSession(input) {
      const result = await users.updateMany({
        where: { id: input.userId, activeSessionId: input.sid },
        data: { activeSessionId: null },
      });
      return result.count > 0;
    },
    async replacePassword(input) {
      await users.update({
        where: { id: input.userId },
        data: {
          passwordHash: input.passwordHash,
          activeSessionId: null,
        },
      });
    },
    async replacePasswordIfCurrent(input) {
      const result = await users.updateMany({
        where: {
          id: input.userId,
          active: true,
          activeSessionId: input.expectedActiveSessionId,
          passwordHash: input.expectedPasswordHash,
        },
        data: {
          passwordHash: input.passwordHash,
          activeSessionId: null,
        },
      });
      return result.count === 1;
    },
  };
}

/**
 * Cài phiên bằng compare-and-set. Luồng mật khẩu truyền đúng hash vừa được
 * bcrypt xác thực; nếu hash/active đổi trong lúc request đang chạy thì không
 * phiên nào được phát hành.
 */
export async function issueServerSession(
  store: SessionSecurityStore,
  input: { userId: string; sid: string; expectedPasswordHash?: string }
): Promise<boolean> {
  return store.installActiveSession(input);
}

/** Chỉ thu hồi khi sid vẫn là phiên hiện hành, tránh cookie cũ xóa phiên mới. */
export async function revokeCurrentServerSession(
  store: SessionSecurityStore,
  session: SessionIdentity | null
): Promise<boolean> {
  if (!session) return false;
  return store.clearActiveSession(session);
}

/** Cookie cục bộ luôn phải biến mất, kể cả khi kho phiên phía server lỗi. */
export async function revokeSessionAndDeleteCookie(
  revokeServerSession: () => Promise<unknown>,
  deleteLocalCookie: () => void | Promise<void>
): Promise<void> {
  try {
    await revokeServerSession();
  } finally {
    await deleteLocalCookie();
  }
}

/** Đổi mật khẩu và thu hồi mọi cookie cũ trong cùng một lần ghi tài khoản. */
export async function replacePasswordAndRevokeSessions(
  store: SessionSecurityStore,
  input: { userId: string; passwordHash: string }
): Promise<void> {
  await store.replacePassword(input);
}

/**
 * Luồng tự đổi mật khẩu chỉ được ghi khi đúng hash và đúng phiên vừa xác minh.
 * Admin reset, khóa tài khoản hoặc một đăng nhập mới thắng race sẽ làm CAS thất
 * bại, nên request cũ không thể giành lại tài khoản bằng cách ghi đè lần nữa.
 */
export async function replacePasswordIfCurrentAndRevokeSessions(
  store: SessionSecurityStore,
  input: {
    userId: string;
    passwordHash: string;
    expectedPasswordHash: string | null;
    expectedActiveSessionId: string;
  }
): Promise<boolean> {
  return store.replacePasswordIfCurrent(input);
}
