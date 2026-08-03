import "server-only";
import { db } from "@/lib/db";
import {
  INTEGRITY_POLICY,
  applyEvents,
  EVENT_RULES,
  computeResumeDeadline,
  computeRiskScore,
  decideReconnect,
  buildDedupeKey,
  type IntegrityEventType,
  type ReportedEvent,
  type SessionCommand,
} from "./policy";
import { forceSubmitExamSession } from "./submit";
import { deviceBindingHash } from "./auth";

/**
 * Điều phối một phiên thi: nhịp tim, nhận sự kiện, nối lại sau khi rớt mạng.
 *
 * File này CHỈ lo đọc/ghi database và gọi lệnh. Toàn bộ phần QUYẾT ĐỊNH nằm ở
 * `policy.ts` dưới dạng hàm thuần đã có kiểm thử — nếu logic bị nhân bản ở đây
 * thì sớm muộn hai nơi sẽ nói khác nhau, và khi đó không ai biết bên nào đúng.
 */

export type IncomingEvent = {
  type: string;
  occurredAt: string;
  durationMs?: number;
  details?: Record<string, unknown>;
};

export type IngestResult = {
  command: SessionCommand;
  strikeCount: number;
  maxStrikes: number;
  forceSubmitReason?: string;
  accepted: number;
  duplicated: number;
};

/**
 * Nhận một lô sự kiện từ trình duyệt.
 *
 * Ba lớp bảo vệ trước dữ liệu client gửi lên — vì client là thứ KHÔNG đáng tin,
 * nó chạy trên máy của chính người đang bị giám sát:
 *
 *  1. Số thứ tự phải tăng. Gửi lại lô cũ để "xóa" strike sẽ bị bỏ qua.
 *  2. Khóa chống trùng ở tầng database. Cùng sự kiện gửi mười lần vẫn một bản ghi.
 *  3. Thời điểm sự kiện bị kẹp trong khoảng phiên thi. Client khai giờ tương lai
 *     hoặc giờ từ hôm qua đều bị kéo về mốc hợp lệ.
 */
export async function ingestEvents(input: {
  sessionId: string;
  sequence: number;
  events: IncomingEvent[];
  now?: Date;
}): Promise<IngestResult> {
  const now = input.now ?? new Date();

  const session = await db.examSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      status: true,
      strikeCount: true,
      protectedLossMs: true,
      continuousMediaLossMs: true,
      networkState: true,
      lastClientSequence: true,
      startedAt: true,
      integrityStatus: true,
    },
  });
  if (!session || (session.status !== "ACTIVE" && session.status !== "DISCONNECTED")) {
    return {
      command: "NONE",
      strikeCount: session?.strikeCount ?? 0,
      maxStrikes: INTEGRITY_POLICY.maxStrikes,
      accepted: 0,
      duplicated: 0,
    };
  }

  // Lô cũ hoặc lô lặp: bỏ qua hoàn toàn, nhưng vẫn trả về trạng thái hiện tại để
  // client hiển thị đúng số strike.
  if (input.sequence <= session.lastClientSequence) {
    return {
      command: session.strikeCount > 0 ? "WARN" : "NONE",
      strikeCount: session.strikeCount,
      maxStrikes: INTEGRITY_POLICY.maxStrikes,
      accepted: 0,
      duplicated: input.events.length,
    };
  }

  const floor = session.startedAt?.getTime() ?? now.getTime() - 4 * 60 * 60_000;
  const ceiling = now.getTime();

  const reported: ReportedEvent[] = [];
  const meta: Array<{ dedupeKey: string; details: Record<string, unknown> }> = [];

  for (const raw of input.events) {
    const type = raw.type as IntegrityEventType;
    if (!EVENT_RULES[type]) continue; // loại sự kiện lạ do client tự bịa

    const parsed = Date.parse(raw.occurredAt);
    const occurredAtMs = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, floor), ceiling)
      : ceiling;

    const durationMs =
      typeof raw.durationMs === "number" && raw.durationMs >= 0
        ? Math.min(raw.durationMs, 6 * 60 * 60_000)
        : undefined;

    reported.push({ type, occurredAtMs, durationMs });
    meta.push({
      dedupeKey: buildDedupeKey({ sessionId: session.id, type, occurredAtMs, durationMs }),
      details: raw.details ?? {},
    });
  }

  const decision = applyEvents(
    {
      strikeCount: session.strikeCount,
      protectedLossMs: session.protectedLossMs,
      continuousMediaLossMs: session.continuousMediaLossMs,
      networkOffline: session.networkState === "OFFLINE",
    },
    reported
  );

  // Ghi TOÀN BỘ sự kiện vào timeline, kể cả sự kiện không tính strike. Bảng rà
  // soát cần thấy đủ để giải thích cho thí sinh vì sao một dòng có trong hồ sơ
  // mà không bị tính — im lặng bỏ qua sẽ khiến người bị loại không tâm phục.
  let accepted = 0;
  for (let i = 0; i < reported.length; i++) {
    const event = reported[i];
    const rule = EVENT_RULES[event.type];
    const outcome = decision.outcomes[i];

    const created = await db.examIntegrityEvent.createMany({
      data: [
        {
          sessionId: session.id,
          dedupeKey: meta[i].dedupeKey,
          clientSequence: input.sequence,
          type: event.type,
          source: "CLIENT",
          // Sự kiện do client tự báo luôn ở mức tin cậy trung bình: nó chạy trên
          // máy người bị giám sát nên về nguyên tắc có thể bị can thiệp.
          trustLevel: "MEDIUM",
          severity: rule.severity,
          countsAsStrike: outcome?.counted ?? false,
          skipReason: outcome?.counted ? null : (outcome?.reason ?? null),
          durationMs: event.durationMs ?? null,
          detailsJson: JSON.stringify(meta[i].details),
          occurredAt: new Date(event.occurredAtMs),
        },
      ],
      skipDuplicates: true,
    });
    accepted += created.count;
  }

  const criticalEvents = reported.filter((e) => EVENT_RULES[e.type].severity === "CRITICAL").length;
  const highEvents = reported.filter((e) => EVENT_RULES[e.type].severity === "HIGH").length;

  await db.examSession.update({
    where: { id: session.id },
    data: {
      strikeCount: decision.counters.strikeCount,
      protectedLossMs: decision.counters.protectedLossMs,
      continuousMediaLossMs: decision.counters.continuousMediaLossMs,
      networkState: decision.counters.networkOffline ? "OFFLINE" : "ONLINE",
      lastClientSequence: input.sequence,
      lastHeartbeatAt: now,
      integrityStatus: decision.integrityStatus === "REVIEW" ? "REVIEW" : session.integrityStatus,
      riskScore: computeRiskScore({
        strikeCount: decision.counters.strikeCount,
        protectedLossMs: decision.counters.protectedLossMs,
        criticalEvents,
        highEvents,
        analyticsSignals: 0,
      }),
      forceSubmitAt: decision.forceSubmitReason ? now : undefined,
      forceSubmitReason: decision.forceSubmitReason ?? undefined,
    },
  });

  if (decision.forceSubmitReason) {
    await forceSubmitExamSession(session.id, "INTEGRITY_AUTO", {
      detail: decision.forceSubmitReason,
    });
  }

  return {
    command: decision.command,
    strikeCount: decision.counters.strikeCount,
    maxStrikes: INTEGRITY_POLICY.maxStrikes,
    forceSubmitReason: decision.forceSubmitReason,
    accepted,
    duplicated: reported.length - accepted,
  };
}

export type HeartbeatResult = {
  command: SessionCommand;
  strikeCount: number;
  maxStrikes: number;
  status: string;
  /** Giây còn lại tới hạn nộp — client hiển thị đồng hồ theo con số của MÁY CHỦ. */
  remainingSeconds: number;
};

/**
 * Nhịp tim mỗi 5 giây.
 *
 * Đồng hồ đếm ngược của thí sinh luôn lấy theo con số máy chủ trả về, không phải
 * theo đồng hồ máy tính của họ — nếu tin đồng hồ client thì chỉ cần chỉnh giờ
 * hệ thống là có thêm thời gian làm bài.
 */
export async function recordHeartbeat(input: {
  sessionId: string;
  now?: Date;
}): Promise<HeartbeatResult | null> {
  const now = input.now ?? new Date();
  const session = await db.examSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      status: true,
      strikeCount: true,
      forceSubmitAt: true,
      competitionAttempt: { select: { attempt: { select: { deadlineAt: true } } } },
    },
  });
  if (!session) return null;

  const deadline = session.competitionAttempt.attempt.deadlineAt;
  const remainingSeconds = Math.max(0, Math.round((deadline.getTime() - now.getTime()) / 1000));

  // Hết giờ thì máy chủ tự chốt, không đợi client báo. Client có thể đã đóng máy.
  if (remainingSeconds === 0 && (session.status === "ACTIVE" || session.status === "DISCONNECTED")) {
    await forceSubmitExamSession(session.id, "TIMEOUT");
    return {
      command: "FORCE_SUBMIT",
      strikeCount: session.strikeCount,
      maxStrikes: INTEGRITY_POLICY.maxStrikes,
      status: "AUTO_SUBMITTED",
      remainingSeconds: 0,
    };
  }

  // Quay lại sau khi rớt mạng ngắn: nhịp tim tự đưa phiên về ACTIVE.
  const nextStatus = session.status === "DISCONNECTED" ? "ACTIVE" : session.status;

  await db.examSession.update({
    where: { id: session.id },
    data: {
      lastHeartbeatAt: now,
      status: nextStatus,
      networkState: "ONLINE",
      ...(session.status === "DISCONNECTED"
        ? { disconnectStartedAt: null, resumeUntil: null }
        : {}),
    },
  });

  return {
    command: session.forceSubmitAt ? "FORCE_SUBMIT" : session.strikeCount > 0 ? "WARN" : "NONE",
    strikeCount: session.strikeCount,
    maxStrikes: INTEGRITY_POLICY.maxStrikes,
    status: nextStatus,
    remainingSeconds,
  };
}

/**
 * Đánh dấu phiên mất kết nối.
 *
 * Đồng hồ KHÔNG dừng. Mất mạng là sự cố kỹ thuật nên không bị tính là gian lận,
 * nhưng cũng không được thưởng thêm giờ — nếu không, rút dây mạng sẽ thành một
 * chiến thuật kéo dài thời gian.
 */
export async function markDisconnected(input: {
  sessionId: string;
  now?: Date;
}): Promise<{ resumeUntil: Date } | null> {
  const now = input.now ?? new Date();
  const session = await db.examSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      status: true,
      competitionAttempt: { select: { attempt: { select: { deadlineAt: true } } } },
    },
  });
  if (!session || session.status !== "ACTIVE") return null;

  const resumeUntil = new Date(
    computeResumeDeadline({
      disconnectStartedAtMs: now.getTime(),
      examEndsAtMs: session.competitionAttempt.attempt.deadlineAt.getTime(),
    })
  );

  await db.examSession.update({
    where: { id: session.id },
    data: {
      status: "DISCONNECTED",
      networkState: "OFFLINE",
      disconnectStartedAt: now,
      resumeUntil,
    },
  });

  return { resumeUntil };
}

/**
 * Nối lại phiên sau khi rớt mạng.
 *
 * Ba điều kiện đều bắt buộc: còn trong hạn, đúng thiết bị, SEB vẫn hợp lệ. Thiếu
 * một là từ chối — nếu không, "rớt mạng" trở thành đường vòng để mở đề ở máy khác.
 */
export async function resumeSession(input: {
  sessionId: string;
  installToken: string;
  userAgent: string;
  sebConfigKeyHash: string;
  sebAttestationValid: boolean;
  now?: Date;
}): Promise<
  | { ok: true; remainingSeconds: number }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "DIFFERENT_DEVICE" | "SEB_INVALID" | "NOT_RESUMABLE" }
> {
  const now = input.now ?? new Date();
  const session = await db.examSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      status: true,
      deviceBindingHash: true,
      resumeUntil: true,
      competitionAttempt: { select: { attempt: { select: { deadlineAt: true } } } },
    },
  });
  if (!session) return { ok: false, reason: "NOT_FOUND" };
  if (session.status !== "DISCONNECTED") return { ok: false, reason: "NOT_RESUMABLE" };

  const sameDevice =
    deviceBindingHash({
      installToken: input.installToken,
      userAgent: input.userAgent,
      sebConfigKeyHash: input.sebConfigKeyHash,
    }) === session.deviceBindingHash;

  const verdict = decideReconnect({
    nowMs: now.getTime(),
    resumeUntilMs: session.resumeUntil?.getTime() ?? 0,
    sameDevice,
    sebAttestationValid: input.sebAttestationValid,
  });

  if (!verdict.allowed) {
    // Thử nối lại bằng máy khác là tín hiệu đáng ghi lại, dù đã bị từ chối.
    if (verdict.reason === "DIFFERENT_DEVICE") {
      await db.examIntegrityEvent.createMany({
        data: [
          {
            sessionId: session.id,
            dedupeKey: buildDedupeKey({
              sessionId: session.id,
              type: "DUPLICATE_SESSION",
              occurredAtMs: now.getTime(),
            }),
            type: "DUPLICATE_SESSION",
            source: "SERVER",
            trustLevel: "HIGH",
            severity: "CRITICAL",
            countsAsStrike: false,
            skipReason: "BLOCKED_AT_RECONNECT",
            detailsJson: JSON.stringify({ note: "Từ chối nối lại từ thiết bị khác" }),
            occurredAt: now,
          },
        ],
        skipDuplicates: true,
      });
    }
    return { ok: false, reason: verdict.reason ?? "NOT_RESUMABLE" };
  }

  await db.examSession.update({
    where: { id: session.id },
    data: {
      status: "ACTIVE",
      networkState: "ONLINE",
      disconnectStartedAt: null,
      resumeUntil: null,
      lastHeartbeatAt: now,
    },
  });

  const deadline = session.competitionAttempt.attempt.deadlineAt;
  return {
    ok: true,
    remainingSeconds: Math.max(0, Math.round((deadline.getTime() - now.getTime()) / 1000)),
  };
}
