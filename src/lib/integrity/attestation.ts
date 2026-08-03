/**
 * Xác thực Safe Exam Browser và cổng kiểm tra trước khi vào phòng thi.
 *
 * Đây là lớp phòng thủ QUAN TRỌNG NHẤT của phương án thi từ xa rút gọn. Không
 * có webcam và không có ảnh màn hình, nên toàn bộ sức mạnh còn lại nằm ở chỗ:
 * đề chỉ mở được trong đúng một trình duyệt đã bị khóa cứng, với đúng một cấu
 * hình do trung tâm ký. Nếu chỗ này thủng, mọi thứ phía sau vô nghĩa.
 *
 * NGUYÊN TẮC FAIL CLOSED: thiếu bằng chứng thì TỪ CHỐI, không đoán. Một lỗi
 * "từ chối nhầm người ngay thẳng" gây phiền nhưng cứu được; một lỗi "cho qua
 * nhầm người gian lận" thì không lấy lại được, vì đề đã ra khỏi tay.
 *
 * Cách SEB chứng minh danh tính của nó: trình duyệt tự tính
 * SHA256(URL đầy đủ + khóa bí mật của cấu hình) rồi đưa cho trang web qua
 * JavaScript API. Máy chủ tính lại bằng khóa mình đang giữ và so. Đổi một
 * setting trong file .seb là khóa đổi theo, nên thí sinh không thể tự sửa cấu
 * hình để nới lỏng hạn chế.
 *
 * File thuần, kiểm thử bằng node.
 */

import { createHash } from "node:crypto";

export type SebAttestation = {
  /** Chuỗi phiên bản SEB tự khai, ví dụ "SEB_Win_3.9.0". */
  version: string;
  /** SHA256(url + Config Key) do SEB tính. */
  configKeyHash: string;
  /** SHA256(url + Browser Exam Key) do SEB tính. */
  browserExamKeyHash: string;
  /** URL trang thi, đã bỏ phần sau dấu #. */
  pageUrl: string;
};

export type SebAllowlist = {
  /** Các bản SEB đã được trung tâm kiểm thử trên Windows/macOS. */
  allowedVersions: string[];
  /** Khóa bí mật của các cấu hình .seb đang hiệu lực. */
  configKeys: string[];
  browserExamKeys: string[];
};

export type AttestationFailure =
  | "SEB_REQUIRED"
  | "UNAPPROVED_VERSION"
  | "INVALID_CONFIG_KEY"
  | "INVALID_BROWSER_EXAM_KEY"
  | "URL_MISMATCH";

/** Cách SEB tính hash: nối thẳng URL với khóa rồi băm SHA256. */
export function sebKeyHash(pageUrl: string, secret: string): string {
  return createHash("sha256").update(pageUrl + secret).digest("hex");
}

/** Bỏ fragment và query để URL luôn khớp với thứ SEB đã băm. */
export function normalizeExamUrl(raw: string): string {
  return raw.split("#")[0].split("?")[0];
}

/**
 * Kiểm tra một lần trình bày của SEB.
 *
 * Trả về TẤT CẢ lý do thất bại chứ không dừng ở lý do đầu tiên: khi thí sinh gọi
 * hỗ trợ lúc 8 giờ tối trước giờ thi, nhân viên cần biết ngay là sai bản SEB hay
 * sai file cấu hình, chứ không phải dò từng cái một.
 */
export function verifySebAttestation(input: {
  attestation: Partial<SebAttestation> | null | undefined;
  allowlist: SebAllowlist;
  expectedUrl: string;
}): { ok: boolean; failures: AttestationFailure[] } {
  const failures: AttestationFailure[] = [];
  const a = input.attestation;

  // Mở bằng Chrome thì không có đối tượng SafeExamBrowser nào cả.
  if (!a || !a.version || !a.configKeyHash || !a.browserExamKeyHash || !a.pageUrl) {
    return { ok: false, failures: ["SEB_REQUIRED"] };
  }

  const expected = normalizeExamUrl(input.expectedUrl);
  const actual = normalizeExamUrl(a.pageUrl);
  if (expected !== actual) failures.push("URL_MISMATCH");

  if (!input.allowlist.allowedVersions.includes(a.version)) {
    failures.push("UNAPPROVED_VERSION");
  }

  // So với URL SEB tự khai chứ không phải URL mong đợi: nếu hai cái khác nhau
  // thì URL_MISMATCH ở trên đã bắt rồi. Làm vậy để một sai lệch chỉ sinh ra một
  // lý do, không phải hai lý do gây hiểu nhầm.
  const configOk = input.allowlist.configKeys.some(
    (key) => sebKeyHash(actual, key) === a.configKeyHash
  );
  if (!configOk) failures.push("INVALID_CONFIG_KEY");

  const bekOk = input.allowlist.browserExamKeys.some(
    (key) => sebKeyHash(actual, key) === a.browserExamKeyHash
  );
  if (!bekOk) failures.push("INVALID_BROWSER_EXAM_KEY");

  return { ok: failures.length === 0, failures };
}

/* ================================================================== */
/*  Cổng vào phòng thi                                                 */
/* ================================================================== */

/**
 * Hai mốc xác minh danh tính, cả hai đều BẮT BUỘC.
 *
 * Vì sao cần hai lần: xác minh trước ngày thi kiểm tra được giấy tờ kỹ lưỡng
 * nhưng không chứng minh được ai là người ngồi vào máy lúc thi. Xác minh T-5
 * phút chứng minh đúng người ngồi xuống nhưng quá gấp để soi kỹ giấy tờ. Thiếu
 * một trong hai là hở một đầu.
 *
 * Không có webcam trong lúc thi, nên hai mốc này là toàn bộ hàng rào chống thi
 * hộ — vì vậy chúng là điều kiện cứng ở máy chủ, không phải thủ tục hành chính.
 */
export const IDENTITY_CHECKPOINTS = ["PRE_EXAM_DAY", "CHECKIN_T5"] as const;
export type IdentityCheckpoint = (typeof IDENTITY_CHECKPOINTS)[number];

export type CheckInInput = {
  nowMs: number;
  checkInOpenAtMs: number;
  startsAtMs: number;
  endsAtMs: number;
  /** Các mốc xác minh đã được nhân viên xác nhận. */
  verifiedCheckpoints: IdentityCheckpoint[];
  /** Các loại đồng ý bắt buộc đã được cấp. */
  grantedConsents: string[];
  requiredConsents: string[];
  attestation: { ok: boolean; failures: AttestationFailure[] };
  /** Đã có phiên nào khác đang hoạt động cho cùng lượt thi này chưa. */
  hasActiveSessionElsewhere: boolean;
  /** Thí sinh đã qua bài thi thử bắt buộc chưa. */
  preflightPassed: boolean;
};

export type CheckInBlocker =
  | { code: "TOO_EARLY"; opensAtMs: number }
  | { code: "TOO_LATE" }
  | { code: "MISSING_IDENTITY_CHECK"; checkpoint: IdentityCheckpoint }
  | { code: "MISSING_CONSENT"; purpose: string }
  | { code: "SEB_ATTESTATION_FAILED"; failures: AttestationFailure[] }
  | { code: "DUPLICATE_SESSION" }
  | { code: "PREFLIGHT_NOT_PASSED" };

/**
 * Quyết định có cho phép mở phiên thi hay không.
 *
 * Trả về danh sách đầy đủ những gì còn thiếu, vì đây là màn hình thí sinh nhìn
 * thấy ngay trước giờ thi — lúc căng thẳng nhất. Nói "chưa đủ điều kiện" suông
 * ở thời điểm đó là tàn nhẫn và cũng làm nhân viên hỗ trợ không xử lý được.
 */
export function evaluateCheckIn(input: CheckInInput): {
  allowed: boolean;
  blockers: CheckInBlocker[];
} {
  const blockers: CheckInBlocker[] = [];

  if (input.nowMs < input.checkInOpenAtMs) {
    blockers.push({ code: "TOO_EARLY", opensAtMs: input.checkInOpenAtMs });
  }
  // Hết giờ đề thì không mở phiên mới. Vào muộn vẫn được nhưng KHÔNG được cộng
  // thêm thời gian: đồng hồ tính từ giờ bắt đầu chung, không tính từ lúc vào.
  if (input.nowMs >= input.endsAtMs) {
    blockers.push({ code: "TOO_LATE" });
  }

  if (!input.preflightPassed) blockers.push({ code: "PREFLIGHT_NOT_PASSED" });

  for (const checkpoint of IDENTITY_CHECKPOINTS) {
    if (!input.verifiedCheckpoints.includes(checkpoint)) {
      blockers.push({ code: "MISSING_IDENTITY_CHECK", checkpoint });
    }
  }

  for (const purpose of input.requiredConsents) {
    if (!input.grantedConsents.includes(purpose)) {
      blockers.push({ code: "MISSING_CONSENT", purpose });
    }
  }

  if (!input.attestation.ok) {
    blockers.push({ code: "SEB_ATTESTATION_FAILED", failures: input.attestation.failures });
  }

  if (input.hasActiveSessionElsewhere) blockers.push({ code: "DUPLICATE_SESSION" });

  return { allowed: blockers.length === 0, blockers };
}

/**
 * Nội dung đề chỉ được phát ĐÚNG giờ bắt đầu, không sớm hơn một giây.
 *
 * Tách khỏi việc check-in là có chủ đích: thí sinh vào phòng chờ từ T-30 phút,
 * nhưng gói đề nằm ngoài tầm với cho tới T0. Nếu phát sớm, người vào sớm có thêm
 * thời gian đọc — và tệ hơn, có thời gian chụp đề gửi người khác.
 */
export function canReleaseContent(input: {
  nowMs: number;
  startsAtMs: number;
  endsAtMs: number;
  sessionStatus: string;
}): { allowed: boolean; reason?: "NOT_STARTED" | "ENDED" | "SESSION_NOT_ACTIVE" } {
  if (input.sessionStatus !== "ACTIVE") return { allowed: false, reason: "SESSION_NOT_ACTIVE" };
  if (input.nowMs < input.startsAtMs) return { allowed: false, reason: "NOT_STARTED" };
  if (input.nowMs >= input.endsAtMs) return { allowed: false, reason: "ENDED" };
  return { allowed: true };
}

/**
 * Hạn nộp bài của một thí sinh.
 *
 * Luôn là giờ kết thúc CHUNG, không phải "giờ vào + thời lượng". Vào muộn thì
 * mất thời gian của chính mình — nếu không, chậm chân lại thành có lợi.
 */
export function examDeadlineMs(input: { startsAtMs: number; endsAtMs: number }): number {
  return input.endsAtMs;
}

/** Thông điệp tiếng Việt cho từng lý do bị chặn. */
export const BLOCKER_MESSAGES: Record<CheckInBlocker["code"], string> = {
  TOO_EARLY: "Chưa tới giờ mở phòng chờ.",
  TOO_LATE: "Đã hết giờ làm đề này.",
  MISSING_IDENTITY_CHECK: "Chưa hoàn tất xác minh danh tính với cán bộ coi thi.",
  MISSING_CONSENT: "Còn thiếu một nội dung bạn cần đồng ý trước khi thi.",
  SEB_ATTESTATION_FAILED:
    "Đề Nguyệt Thí chỉ mở được trong Safe Exam Browser với đúng file cấu hình của trung tâm.",
  DUPLICATE_SESSION: "Tài khoản này đang có một phiên thi mở ở thiết bị khác.",
  PREFLIGHT_NOT_PASSED: "Bạn chưa hoàn thành bài thi thử bắt buộc.",
};

export const ATTESTATION_MESSAGES: Record<AttestationFailure, string> = {
  SEB_REQUIRED: "Bạn đang mở bằng trình duyệt thường. Hãy mở file .seb của trung tâm.",
  UNAPPROVED_VERSION: "Phiên bản Safe Exam Browser chưa được trung tâm phê duyệt.",
  INVALID_CONFIG_KEY: "File cấu hình không đúng hoặc đã bị chỉnh sửa.",
  INVALID_BROWSER_EXAM_KEY: "Khóa kỳ thi không hợp lệ.",
  URL_MISMATCH: "Địa chỉ trang thi không khớp với cấu hình.",
};
