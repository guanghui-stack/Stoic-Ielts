import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Token phiên thi và ràng buộc thiết bị.
 *
 * Phiên thi KHÔNG dùng chung cookie đăng nhập thường. Lý do: cookie đăng nhập
 * sống nhiều ngày và có ở mọi thiết bị người dùng từng đăng nhập. Phiên thi phải
 * gắn với đúng một máy, đúng một lượt thi, và chết ngay khi nộp bài.
 *
 * Máy chủ chỉ lưu BĂM của token. Giá trị thật gửi cho client đúng một lần lúc
 * kích hoạt phiên. Nếu database bị lộ, không ai dựng lại được token để cướp phiên.
 */

const TOKEN_BYTES = 32;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function issueSessionToken(): { token: string; hash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, hash: hashToken(token) };
}

/**
 * Vân tay thiết bị MỀM.
 *
 * Phải nói thẳng giới hạn: đây KHÔNG phải chứng thực phần cứng. Web không cho
 * đọc số máy thật, và SEB cũng không cung cấp một mã máy đáng tin qua JavaScript.
 * Thứ này đủ chặn việc mở đề ở máy thứ hai một cách tùy tiện, nhưng người quyết
 * tâm vẫn giả mạo được. Không được mô tả nó quá lời trong tài liệu cho thí sinh.
 *
 * Chống lại việc mở nhiều phiên thật sự dựa vào ràng buộc MỘT phiên ACTIVE cho
 * mỗi lượt thi ở tầng database, không dựa vào vân tay này.
 */
export function deviceBindingHash(input: {
  installToken: string;
  userAgent: string;
  sebConfigKeyHash: string;
}): string {
  return createHash("sha256")
    .update(`${input.installToken}|${input.userAgent}|${input.sebConfigKeyHash}`)
    .digest("hex");
}

export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export type AuthenticatedExamSession = {
  sessionId: string;
  userId: string;
  competitionAttemptId: string;
  status: string;
  strikeCount: number;
  protectedLossMs: number;
  continuousMediaLossMs: number;
  networkState: string;
  lastClientSequence: number;
};

/**
 * Xác thực một yêu cầu đến từ phòng thi.
 *
 * Token đi trong header `Authorization: Bearer …` chứ không phải cookie: nó
 * không được tự động gửi kèm mọi yêu cầu, nên không dính lỗi giả mạo yêu cầu
 * chéo trang, và cũng không lẫn với phiên đăng nhập thường.
 */
export async function authenticateExamSession(
  request: Request
): Promise<AuthenticatedExamSession | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const session = await db.examSession.findUnique({
    where: { sessionTokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      competitionAttemptId: true,
      status: true,
      strikeCount: true,
      protectedLossMs: true,
      continuousMediaLossMs: true,
      networkState: true,
      lastClientSequence: true,
    },
  });
  if (!session) return null;

  // Phiên đã đóng thì token vô giá trị, kể cả khi còn đúng.
  if (session.status === "CLOSED" || session.status === "COMPLETED") return null;

  return {
    sessionId: session.id,
    userId: session.userId,
    competitionAttemptId: session.competitionAttemptId,
    status: session.status,
    strikeCount: session.strikeCount,
    protectedLossMs: session.protectedLossMs,
    continuousMediaLossMs: session.continuousMediaLossMs,
    networkState: session.networkState,
    lastClientSequence: session.lastClientSequence,
  };
}

/**
 * Danh sách bản SEB và khóa cấu hình được phép, lấy từ bảng Config.
 *
 * Để trong database chứ không phải biến môi trường vì quản trị viên phải đổi
 * được giữa hai kỳ thi mà không cần triển khai lại — và mỗi lần đổi setting
 * trong file .seb là khóa đổi theo.
 *
 * Thiếu cấu hình thì trả về danh sách RỖNG, tức là mọi lần trình bày đều trượt.
 * Đó là chủ ý: quên cấu hình thì kỳ thi không mở được, thay vì mở toang.
 */
export async function loadSebAllowlist(): Promise<{
  allowedVersions: string[];
  configKeys: string[];
  browserExamKeys: string[];
}> {
  const rows = await db.config.findMany({
    where: {
      key: { in: ["SEB_ALLOWED_VERSIONS", "SEB_CONFIG_KEYS", "SEB_BROWSER_EXAM_KEYS"] },
    },
  });
  const valueOf = (key: string) =>
    (rows.find((r) => r.key === key)?.value ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  return {
    allowedVersions: valueOf("SEB_ALLOWED_VERSIONS"),
    configKeys: valueOf("SEB_CONFIG_KEYS"),
    browserExamKeys: valueOf("SEB_BROWSER_EXAM_KEYS"),
  };
}
