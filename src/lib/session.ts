import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  createSessionSecurityStore,
  issueServerSession,
  replacePasswordAndRevokeSessions,
  replacePasswordIfCurrentAndRevokeSessions,
  revokeCurrentServerSession,
  revokeSessionAndDeleteCookie,
} from "@/lib/session-security";

const COOKIE_NAME = "wb_session";
const SESSION_DAYS = 7;
const sessionSecurityStore = createSessionSecurityStore(db.user);

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Thiếu biến môi trường SESSION_SECRET");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  role: "STUDENT" | "ADMIN";
  /**
   * Ma phien. JWT khong thu hoi duoc, nen day la thu duy nhat cho phep gioi
   * han "mot tai khoan mot thiet bi": moi lan dang nhap sinh ma moi va ghi de
   * `User.activeSessionId`, khien moi cookie cu tro thanh khong khop.
   */
  sid: string;
};

export async function createSession(
  payload: Omit<SessionPayload, "sid">,
  guard: { expectedPasswordHash?: string } = {}
): Promise<boolean> {
  const sid = crypto.randomUUID();

  const token = await new SignJWT({ ...payload, sid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  // CAS trước khi phát cookie. Với đăng nhập mật khẩu, hash phải vẫn đúng
  // hash vừa được bcrypt xác thực; reset mật khẩu thắng race sẽ làm count = 0.
  const installed = await issueServerSession(sessionSecurityStore, {
    userId: payload.userId,
    sid,
    expectedPasswordHash: guard.expectedPasswordHash,
  });
  if (!installed) return false;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return true;
}

export async function destroySession() {
  const cookieStore = await cookies();
  await revokeSessionAndDeleteCookie(
    async () => {
      const session = await getSession();
      await revokeCurrentServerSession(sessionSecurityStore, session);
    },
    () => {
      cookieStore.delete(COOKIE_NAME);
    }
  );
}

/** Đổi mật khẩu và làm mất hiệu lực mọi cookie cũ của đúng tài khoản đó. */
export async function replacePasswordAndRevokeUserSessions(
  userId: string,
  passwordHash: string
) {
  await replacePasswordAndRevokeSessions(sessionSecurityStore, {
    userId,
    passwordHash,
  });
}

/** Tự đổi mật khẩu bằng CAS trên đúng hash và phiên vừa được xác minh. */
export async function replacePasswordIfCurrentAndRevokeUserSessions(input: {
  userId: string;
  passwordHash: string;
  expectedPasswordHash: string | null;
  expectedActiveSessionId: string;
}): Promise<boolean> {
  return replacePasswordIfCurrentAndRevokeSessions(
    sessionSecurityStore,
    input
  );
}

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secretKey());
    if (!payload.userId || !payload.sid) return null;
    return { userId: payload.userId, role: payload.role, sid: payload.sid };
  } catch {
    return null;
  }
});

/** Người dùng hiện tại (đã xác minh còn tồn tại và đang hoạt động trong DB). */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.active) return null;

  // Da dang nhap o may khac -> cookie nay khong con la phien hop le.
  if (user.activeSessionId !== session.sid) return null;

  return user;
});

/** Bắt buộc đăng nhập — chưa đăng nhập thì chuyển tới trang đăng nhập. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  return user;
}

/** Bắt buộc quyền quản trị. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/hoc-vien");
  return user;
}
