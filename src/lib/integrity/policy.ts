/**
 * Chính sách liêm chính cho Nguyệt Thí — toàn bộ ngưỡng và quyết định.
 *
 * Đây là NGUỒN SỰ THẬT DUY NHẤT cho việc một hành vi có thành strike hay không,
 * và khi nào máy chủ buộc nộp bài. Mọi route, cron và bảng giám thị đều phải đi
 * qua các hàm ở đây thay vì tự suy luận, vì mỗi nơi tự tính là một nơi có thể
 * tính sai — mà tính sai ở đây nghĩa là loại nhầm một thí sinh thật.
 *
 * Hai nguyên tắc chi phối cả file:
 *
 *  1. MÁY CHỦ QUYẾT ĐỊNH. Client chỉ báo cáo sự kiện. Tắt JavaScript hay rút
 *     mạng không vô hiệu hóa được quyết định nào.
 *
 *  2. KHÔNG TÍN HIỆU ĐƠN LẺ NÀO KẾT LUẬN GIAN LẬN. Ngưỡng ở đây chỉ dẫn tới
 *     REVIEW — tức là đưa hồ sơ cho người thật xem. Chuyển sang DISQUALIFIED
 *     luôn cần hai quản trị viên độc lập, và điều đó nằm ngoài file này.
 *
 * File KHÔNG import "server-only" để bộ kiểm thử chạy được bằng node thuần.
 */

export const INTEGRITY_POLICY = {
  version: "2026-08-v1",
  /** Client báo cáo còn sống mỗi 5 giây. */
  heartbeatMs: 5_000,
  /** Quá 20 giây không thấy heartbeat thì coi như mất kết nối. */
  staleAfterMs: 20_000,
  /** Cửa sổ cho phép nối lại đúng thiết bị sau khi rớt mạng. */
  reconnectGraceMs: 15 * 60_000,
  /** Các sự kiện kỹ thuật cùng nguyên nhân trong cửa sổ này chỉ tính MỘT lần. */
  eventDebounceMs: 3_000,
  maxStrikes: 3,
  /** Tổng thời gian rời trạng thái bảo vệ trước khi bị nộp bài. */
  maxProtectedLossMs: 10_000,
  /** Mất media dưới ngưỡng này chưa tính strike — chờ khôi phục. */
  mediaLossGraceMs: 2_000,
  /** Mất media liên tục quá ngưỡng này thì nộp bài. */
  maxContinuousMediaLossMs: 10_000,
  /** Thời hạn giải trình sau khi nhận thông báo. */
  appealWindowMs: 24 * 60 * 60_000,
} as const;

export type IntegrityEventType =
  | "COPY_ATTEMPT"
  | "CUT_ATTEMPT"
  | "CONTEXT_MENU"
  | "PROHIBITED_SHORTCUT"
  | "VISIBILITY_LOSS"
  | "WINDOW_BLUR"
  | "FULLSCREEN_EXIT"
  | "WEBCAM_ENDED"
  | "SCREEN_PROCTOR_LOST"
  | "MULTIPLE_FACE"
  | "PHONE_DETECTED"
  | "FACE_ABSENT"
  | "FACE_MISMATCH"
  | "GAZE_AWAY"
  | "DUPLICATE_SESSION"
  | "INVALID_SEB_KEY"
  | "UNAPPROVED_VERSION"
  | "NETWORK_OFFLINE"
  | "NETWORK_ONLINE"
  | "PROCTOR_FORCE_SUBMIT";

export type Severity = "TECHNICAL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Định nghĩa từng loại sự kiện.
 *
 * `minDurationMs` là thời lượng tối thiểu để một tín hiệu thành incident. Nó tồn
 * tại vì các tín hiệu thị giác rất nhiễu: người thi cúi nhặt bút là mất mặt vài
 * giây, người nhà đi ngang qua là có hai khuôn mặt trong một giây. Bắt phải kéo
 * dài liên tục mới lọc được phần lớn nhiễu đó.
 *
 * `protectedLoss` đánh dấu các sự kiện cộng vào tổng thời gian rời trạng thái
 * bảo vệ — tức là màn hình thi không còn nằm trước mặt thí sinh.
 */
export const EVENT_RULES: Record<
  IntegrityEventType,
  {
    severity: Severity;
    countsAsStrike: boolean;
    minDurationMs?: number;
    protectedLoss?: boolean;
    /** Nhóm gom sự kiện: cùng nhóm trong cửa sổ debounce chỉ tính một lần. */
    coalesceGroup: string;
  }
> = {
  COPY_ATTEMPT: { severity: "MEDIUM", countsAsStrike: true, coalesceGroup: "CLIPBOARD" },
  CUT_ATTEMPT: { severity: "MEDIUM", countsAsStrike: true, coalesceGroup: "CLIPBOARD" },
  CONTEXT_MENU: { severity: "MEDIUM", countsAsStrike: true, coalesceGroup: "UI_BLOCK" },
  PROHIBITED_SHORTCUT: { severity: "MEDIUM", countsAsStrike: true, coalesceGroup: "UI_BLOCK" },

  // Alt+Tab sinh ra window.blur + document.hidden + fullscreenchange trong vài
  // mili-giây. Cùng nhóm PROTECTED_STATE nên chỉ thành MỘT strike.
  VISIBILITY_LOSS: {
    severity: "HIGH",
    countsAsStrike: true,
    protectedLoss: true,
    coalesceGroup: "PROTECTED_STATE",
  },
  WINDOW_BLUR: {
    severity: "HIGH",
    countsAsStrike: true,
    protectedLoss: true,
    coalesceGroup: "PROTECTED_STATE",
  },
  FULLSCREEN_EXIT: {
    severity: "HIGH",
    countsAsStrike: true,
    protectedLoss: true,
    coalesceGroup: "PROTECTED_STATE",
  },

  WEBCAM_ENDED: {
    severity: "HIGH",
    countsAsStrike: true,
    minDurationMs: INTEGRITY_POLICY.mediaLossGraceMs,
    coalesceGroup: "MEDIA_LOSS",
  },
  SCREEN_PROCTOR_LOST: {
    severity: "HIGH",
    countsAsStrike: true,
    minDurationMs: INTEGRITY_POLICY.mediaLossGraceMs,
    coalesceGroup: "MEDIA_LOSS",
  },

  MULTIPLE_FACE: { severity: "HIGH", countsAsStrike: true, minDurationMs: 5_000, coalesceGroup: "CV_PERSON" },
  PHONE_DETECTED: { severity: "HIGH", countsAsStrike: true, minDurationMs: 5_000, coalesceGroup: "CV_OBJECT" },
  FACE_ABSENT: { severity: "MEDIUM", countsAsStrike: true, minDurationMs: 10_000, coalesceGroup: "CV_PERSON" },

  // Sai người thi là chuyện nghiêm trọng nhất, nhưng nhận diện khuôn mặt sai số
  // rất lớn theo ánh sáng, kính và màu da. Nên: CRITICAL để người thật xem ngay,
  // mà KHÔNG tự cộng strike.
  FACE_MISMATCH: { severity: "CRITICAL", countsAsStrike: false, coalesceGroup: "CV_IDENTITY" },

  // Quay mặt khỏi màn hình là hành vi bình thường khi suy nghĩ. Chỉ dùng để
  // xếp thứ tự ưu tiên khi rà soát, không bao giờ thành strike.
  GAZE_AWAY: { severity: "LOW", countsAsStrike: false, coalesceGroup: "CV_GAZE" },

  DUPLICATE_SESSION: { severity: "CRITICAL", countsAsStrike: true, coalesceGroup: "SESSION" },
  INVALID_SEB_KEY: { severity: "CRITICAL", countsAsStrike: false, coalesceGroup: "ATTESTATION" },
  UNAPPROVED_VERSION: { severity: "CRITICAL", countsAsStrike: false, coalesceGroup: "ATTESTATION" },

  // Mất mạng KHÔNG BAO GIỜ là gian lận.
  NETWORK_OFFLINE: { severity: "TECHNICAL", countsAsStrike: false, coalesceGroup: "NETWORK" },
  NETWORK_ONLINE: { severity: "TECHNICAL", countsAsStrike: false, coalesceGroup: "NETWORK" },

  PROCTOR_FORCE_SUBMIT: { severity: "CRITICAL", countsAsStrike: false, coalesceGroup: "PROCTOR" },
};

export type SessionCommand = "NONE" | "WARN" | "FORCE_SUBMIT";

export type ReportedEvent = {
  type: IntegrityEventType;
  /** Mốc thời gian client báo, đã được máy chủ kiểm tính hợp lý. */
  occurredAtMs: number;
  durationMs?: number;
};

export type SessionCounters = {
  strikeCount: number;
  protectedLossMs: number;
  continuousMediaLossMs: number;
  /** Mạng đang offline hay không — quyết định có tính thời gian mất media không. */
  networkOffline: boolean;
};

/**
 * Sự kiện này có được tính thành incident không.
 *
 * Trả về lý do bị loại để bảng giám thị giải thích được cho thí sinh vì sao một
 * sự kiện có trong timeline mà không cộng strike — im lặng bỏ qua sẽ khiến người
 * bị loại không tâm phục.
 */
export function qualifyEvent(
  event: ReportedEvent,
  context: { networkOffline: boolean }
): { counted: boolean; reason?: "TOO_SHORT" | "NOT_A_STRIKE" | "NETWORK_SUSPENDED" } {
  const rule = EVENT_RULES[event.type];
  if (!rule) return { counted: false, reason: "NOT_A_STRIKE" };

  // MẤU CHỐT — mâu thuẫn trong đặc tả gốc.
  //
  // §0.1 điều 7 nói mất mạng không bị tính là gian lận, nhưng §5.2 điều 3 lại
  // buộc nộp bài khi webcam/screen proctoring mất ≥10 giây. Về mặt vật lý đây là
  // CÙNG MỘT sự kiện: rớt Wi-Fi giết cả webcam lẫn screen proctoring ngay lập
  // tức. Nếu vẫn tính, mọi lần rớt mạng 10 giây đều tự nộp bài — trái hẳn điều 7
  // và biến một sự cố hạ tầng của nhà mạng thành án loại thí sinh.
  //
  // Xử lý: khi mạng đang offline, sự kiện mất media KHÔNG được tính. §5.2 đã có
  // sẵn cụm "sau khi đã loại trừ NETWORK_OFFLINE"; đây chính là chỗ loại trừ đó.
  if (context.networkOffline && rule.coalesceGroup === "MEDIA_LOSS") {
    return { counted: false, reason: "NETWORK_SUSPENDED" };
  }

  if (rule.minDurationMs !== undefined && (event.durationMs ?? 0) < rule.minDurationMs) {
    return { counted: false, reason: "TOO_SHORT" };
  }

  if (!rule.countsAsStrike) return { counted: false, reason: "NOT_A_STRIKE" };

  return { counted: true };
}

/**
 * Gom các sự kiện kỹ thuật cùng nguyên nhân thành incident.
 *
 * Một thao tác Alt+Tab sinh ra ba sự kiện trong vài mili-giây. Đếm cả ba nghĩa
 * là một lần chuyển cửa sổ đã đủ ba strike và bị nộp bài ngay — hình phạt hoàn
 * toàn không tương xứng. Cùng nhóm trong cửa sổ debounce chỉ giữ lại sự kiện
 * ĐẦU TIÊN; các sự kiện sau vẫn được lưu vào timeline nhưng không cộng strike.
 */
export function coalesceEvents(
  events: ReportedEvent[],
  options?: { debounceMs?: number }
): Array<ReportedEvent & { isIncident: boolean }> {
  const debounceMs = options?.debounceMs ?? INTEGRITY_POLICY.eventDebounceMs;
  const lastIncidentAt = new Map<string, number>();

  return [...events]
    .sort((a, b) => a.occurredAtMs - b.occurredAtMs)
    .map((event) => {
      const rule = EVENT_RULES[event.type];
      if (!rule) return { ...event, isIncident: false };

      const previous = lastIncidentAt.get(rule.coalesceGroup);
      const withinWindow = previous !== undefined && event.occurredAtMs - previous < debounceMs;
      if (withinWindow) return { ...event, isIncident: false };

      lastIncidentAt.set(rule.coalesceGroup, event.occurredAtMs);
      return { ...event, isIncident: true };
    });
}

/**
 * Áp một loạt sự kiện lên bộ đếm của phiên và quyết định lệnh gửi cho client.
 *
 * Thuần và tất định: cùng đầu vào luôn ra cùng kết quả, nên kiểm thử được toàn
 * bộ luật mà không cần database.
 */
export function applyEvents(
  counters: SessionCounters,
  events: ReportedEvent[],
  options?: { debounceMs?: number }
): {
  counters: SessionCounters;
  command: SessionCommand;
  integrityStatus: "CLEAR" | "REVIEW";
  forceSubmitReason?: "STRIKES" | "PROTECTED_LOSS" | "MEDIA_LOSS";
  /** Từng sự kiện có được tính hay không — để hiện trong timeline rà soát. */
  outcomes: Array<{ type: IntegrityEventType; counted: boolean; reason?: string }>;
} {
  let { strikeCount, protectedLossMs, continuousMediaLossMs, networkOffline } = counters;
  const outcomes: Array<{ type: IntegrityEventType; counted: boolean; reason?: string }> = [];

  for (const event of coalesceEvents(events, options)) {
    // Trạng thái mạng phải cập nhật TRƯỚC khi xét các sự kiện sau nó, vì nó
    // quyết định các sự kiện mất media có được tính hay không.
    if (event.type === "NETWORK_OFFLINE") {
      networkOffline = true;
      // Rớt mạng cũng xóa luôn chuỗi mất media đang đếm: từ giây này trở đi
      // media chết vì mạng, không phải vì thí sinh tắt.
      continuousMediaLossMs = 0;
      outcomes.push({ type: event.type, counted: false, reason: "TECHNICAL" });
      continue;
    }
    if (event.type === "NETWORK_ONLINE") {
      networkOffline = false;
      outcomes.push({ type: event.type, counted: false, reason: "TECHNICAL" });
      continue;
    }

    const verdict = qualifyEvent(event, { networkOffline });

    // Thứ tự hai nhánh này có chủ ý. Một sự kiện vừa bị loại vì mạng đang mất,
    // vừa trùng nhóm với sự kiện trước, thì lý do ghi lại phải là "mạng đang
    // mất" — đó là điều giám thị cần nói với thí sinh. "Trùng nhóm" là chi tiết
    // kỹ thuật bên trong, không giải thích được gì cho người bị rà soát.
    if (!verdict.counted) {
      outcomes.push({ type: event.type, counted: false, reason: verdict.reason });
      continue;
    }
    if (!event.isIncident) {
      outcomes.push({ type: event.type, counted: false, reason: "COALESCED" });
      continue;
    }

    const rule = EVENT_RULES[event.type];
    strikeCount += 1;
    if (rule.protectedLoss) protectedLossMs += event.durationMs ?? 0;
    if (rule.coalesceGroup === "MEDIA_LOSS") {
      continuousMediaLossMs = Math.max(continuousMediaLossMs, event.durationMs ?? 0);
    }
    outcomes.push({ type: event.type, counted: true });
  }

  const next: SessionCounters = {
    strikeCount,
    protectedLossMs,
    continuousMediaLossMs,
    networkOffline,
  };

  let forceSubmitReason: "STRIKES" | "PROTECTED_LOSS" | "MEDIA_LOSS" | undefined;
  if (strikeCount >= INTEGRITY_POLICY.maxStrikes) forceSubmitReason = "STRIKES";
  else if (protectedLossMs >= INTEGRITY_POLICY.maxProtectedLossMs) forceSubmitReason = "PROTECTED_LOSS";
  else if (
    !networkOffline &&
    continuousMediaLossMs >= INTEGRITY_POLICY.maxContinuousMediaLossMs
  ) {
    forceSubmitReason = "MEDIA_LOSS";
  }

  return {
    counters: next,
    command: forceSubmitReason ? "FORCE_SUBMIT" : strikeCount > 0 ? "WARN" : "NONE",
    // Bất kỳ incident nào cũng đưa hồ sơ sang REVIEW — nghĩa là người thật sẽ
    // xem, KHÔNG phải là kết luận gian lận.
    integrityStatus: strikeCount > 0 ? "REVIEW" : "CLEAR",
    forceSubmitReason,
    outcomes,
  };
}

/* ================================================================== */
/*  State machine                                                      */
/* ================================================================== */

export type SessionStatus =
  | "CREATED"
  | "CHECKIN"
  | "READY"
  | "ACTIVE"
  | "DISCONNECTED"
  | "AUTO_SUBMITTED"
  | "COMPLETED"
  | "CLOSED";

const SESSION_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  CREATED: ["CHECKIN"],
  CHECKIN: ["READY", "CREATED"],
  READY: ["ACTIVE"],
  ACTIVE: ["DISCONNECTED", "AUTO_SUBMITTED", "COMPLETED"],
  DISCONNECTED: ["ACTIVE", "AUTO_SUBMITTED"],
  AUTO_SUBMITTED: ["CLOSED"],
  COMPLETED: ["CLOSED"],
  CLOSED: [],
};

export function canTransitionSession(from: SessionStatus, to: SessionStatus): boolean {
  return SESSION_TRANSITIONS[from]?.includes(to) ?? false;
}

export type ReviewStatus =
  | "CLEAR"
  | "REVIEW"
  | "DISQUALIFICATION_PROPOSED"
  | "DISQUALIFIED"
  | "APPEALED"
  | "UPHELD"
  | "OVERTURNED";

const REVIEW_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  CLEAR: ["REVIEW"],
  REVIEW: ["CLEAR", "DISQUALIFICATION_PROPOSED"],
  DISQUALIFICATION_PROPOSED: ["DISQUALIFIED", "REVIEW"],
  DISQUALIFIED: ["APPEALED"],
  APPEALED: ["UPHELD", "OVERTURNED"],
  UPHELD: [],
  OVERTURNED: ["CLEAR"],
};

export function canTransitionReview(from: ReviewStatus, to: ReviewStatus): boolean {
  return REVIEW_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Ai được phép thực hiện bước chuyển này.
 *
 * Loại một thí sinh khỏi cuộc thi có tiền thưởng cần HAI quản trị viên khác
 * nhau. Một người vừa đề xuất vừa tự duyệt thì cơ chế hai người chỉ còn là hình
 * thức, nên chặn ngay ở tầng quy tắc chứ không trông vào giao diện.
 */
export function authorizeReviewTransition(input: {
  from: ReviewStatus;
  to: ReviewStatus;
  actorAdminId: string;
  proposedByAdminId?: string | null;
}): { allowed: boolean; reason?: string } {
  if (!canTransitionReview(input.from, input.to)) {
    return { allowed: false, reason: "TRANSITION_NOT_ALLOWED" };
  }
  if (input.to === "DISQUALIFIED") {
    if (!input.proposedByAdminId) return { allowed: false, reason: "NO_PROPOSAL" };
    if (input.proposedByAdminId === input.actorAdminId) {
      return { allowed: false, reason: "SAME_ADMIN_CANNOT_CONFIRM" };
    }
  }
  return { allowed: true };
}

/* ================================================================== */
/*  Mất mạng và nối lại                                                */
/* ================================================================== */

/**
 * Hạn chót được phép nối lại phiên.
 *
 * Không bao giờ vượt quá giờ kết thúc đề: cho nối lại sau khi hết giờ nghĩa là
 * tặng thêm thời gian làm bài cho người rớt mạng, tức là thưởng cho sự cố.
 */
export function computeResumeDeadline(input: {
  disconnectStartedAtMs: number;
  examEndsAtMs: number;
  graceMs?: number;
}): number {
  const grace = input.graceMs ?? INTEGRITY_POLICY.reconnectGraceMs;
  return Math.min(input.disconnectStartedAtMs + grace, input.examEndsAtMs);
}

export function decideReconnect(input: {
  nowMs: number;
  resumeUntilMs: number;
  sameDevice: boolean;
  sebAttestationValid: boolean;
}): { allowed: boolean; reason?: "EXPIRED" | "DIFFERENT_DEVICE" | "SEB_INVALID" } {
  if (input.nowMs > input.resumeUntilMs) return { allowed: false, reason: "EXPIRED" };
  if (!input.sameDevice) return { allowed: false, reason: "DIFFERENT_DEVICE" };
  if (!input.sebAttestationValid) return { allowed: false, reason: "SEB_INVALID" };
  return { allowed: true };
}

/**
 * Điểm rủi ro chỉ để XẾP THỨ TỰ hàng chờ rà soát.
 *
 * Nó không bao giờ được tự loại ai. Mục đích duy nhất là giúp giám thị xem hồ sơ
 * đáng ngờ nhất trước, khi có hàng chục phiên cùng chờ.
 */
export function computeRiskScore(input: {
  strikeCount: number;
  protectedLossMs: number;
  criticalEvents: number;
  highEvents: number;
  analyticsSignals: number;
}): number {
  const score =
    input.strikeCount * 15 +
    Math.min(30, Math.round(input.protectedLossMs / 1000) * 2) +
    input.criticalEvents * 25 +
    input.highEvents * 8 +
    input.analyticsSignals * 12;
  return Math.max(0, Math.min(100, score));
}
