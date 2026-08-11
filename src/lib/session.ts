import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";

const COOKIE_NAME = "wb_session";
const SESSION_DAYS = 7;

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

export async function createSession(payload: Omit<SessionPayload, "sid">) {
  const sid = crypto.randomUUID();

  // Ghi TRUOC khi phat cookie. Nguoc lai, neu ghi that bai thi may nay cam mot
  // cookie khong bao gio khop va nguoi dung bi khoa ngoai ma khong hieu vi sao.
  await db.user.update({
    where: { id: payload.userId },
    data: { activeSessionId: sid },
  });

  const token = await new SignJWT({ ...payload, sid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
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
