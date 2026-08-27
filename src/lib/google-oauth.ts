import "server-only";

/**
 * Đăng nhập bằng Google — phần thuần cấu hình và gọi mạng.
 *
 * NƠI DUY NHẤT đọc `GOOGLE_CLIENT_SECRET`. Khóa không đi qua giá trị trả về
 * nào, không vào log, không vào database.
 */

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

/** Cookie giữ `state` để chống CSRF, sống đúng thời gian một lần đăng nhập. */
export const STATE_COOKIE = "wb_oauth_state";

export function googleEnabled(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}

/**
 * Địa chỉ Google gọi ngược về. Phải khớp TỪNG KÝ TỰ với ô "Authorized redirect
 * URIs" trong Google Cloud Console, kể cả dấu gạch chéo cuối — lệch một ký tự
 * là Google trả `redirect_uri_mismatch`.
 */
export function redirectUri(): string {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
  return `${base}/api/auth/google/callback`;
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    // Không xin quyền ngoại tuyến: dự án chỉ cần biết "ai đây" một lần lúc
    // đăng nhập, không gọi API Google thay người dùng về sau.
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
};

/** Đổi `code` lấy hồ sơ. Ném lỗi nếu Google từ chối hoặc trả thiếu trường. */
function normalizeGooglePicture(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "googleusercontent.com" && !url.hostname.endsWith(".googleusercontent.com")) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function fetchGoogleProfile(code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!tokenRes.ok) throw new Error(`TOKEN_${tokenRes.status}`);

  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) throw new Error("TOKEN_MISSING");

  const infoRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!infoRes.ok) throw new Error(`USERINFO_${infoRes.status}`);

  const info = (await infoRes.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!info.sub || !info.email) throw new Error("USERINFO_MISSING");

  return {
    sub: info.sub,
    email: info.email.toLowerCase(),
    emailVerified: info.email_verified === true,
    name: info.name?.trim() || info.email.split("@")[0],
    picture: normalizeGooglePicture(info.picture),
  };
}
