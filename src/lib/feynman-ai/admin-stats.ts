import "server-only";
import { db } from "@/lib/db";

/**
 * Số liệu cho trang theo dõi Feynman AI.
 *
 * Tách khỏi trang vì cần đọc đồng hồ hệ thống để chốt cửa sổ 30 ngày — việc đó
 * không được làm trong lúc dựng giao diện, vì React yêu cầu hàm dựng phải cho
 * cùng kết quả với cùng đầu vào. Đây cũng là lý do `summarizeGrantsForAdmin()`
 * nằm trong lib chứ không nằm trong trang quản trị quyền.
 */

const WINDOW_DAYS = 30;

export type FeynmanAiStats = {
  windowDays: number;
  completedCount: number;
  failedCount: number;
  costMicroUsd: number;
  avgLatencyMs: number;
  avgSimilarityPercent: number;
  wallet: { granted: number; used: number; remaining: number };
  alerts: Array<{
    id: string;
    source: string;
    severity: string;
    kind: string;
    questionCode: string | null;
    detail: string | null;
    createdAt: Date;
  }>;
  recent: Array<{
    id: string;
    status: string;
    verdict: string | null;
    similarityPercent: number | null;
    confidence: number | null;
    estimatedCostMicroUsd: number | null;
    latencyMs: number | null;
    errorCode: string | null;
    createdAt: Date;
  }>;
};

export async function loadFeynmanAiStats(
  now = new Date()
): Promise<FeynmanAiStats> {
  const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [totals, failedCount, alerts, budgets, recent] = await Promise.all([
    db.feynmanAiEvaluation.aggregate({
      where: { createdAt: { gte: since }, status: "COMPLETED" },
      _count: { _all: true },
      _sum: { estimatedCostMicroUsd: true },
      _avg: { latencyMs: true, similarityPercent: true },
    }),
    db.feynmanAiEvaluation.count({
      where: { createdAt: { gte: since }, status: "FAILED" },
    }),
    db.feynmanAiAlert.findMany({
      where: { status: "OPEN" },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 25,
      select: {
        id: true,
        source: true,
        severity: true,
        kind: true,
        questionCode: true,
        detail: true,
        createdAt: true,
      },
    }),
    db.feynmanAiBudget.aggregate({
      _sum: { grantedTotal: true, usedTotal: true },
    }),
    db.feynmanAiEvaluation.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        verdict: true,
        similarityPercent: true,
        confidence: true,
        estimatedCostMicroUsd: true,
        latencyMs: true,
        errorCode: true,
        createdAt: true,
      },
    }),
  ]);

  const granted = budgets._sum.grantedTotal ?? 0;
  const used = budgets._sum.usedTotal ?? 0;

  return {
    windowDays: WINDOW_DAYS,
    completedCount: totals._count._all,
    failedCount,
    costMicroUsd: totals._sum.estimatedCostMicroUsd ?? 0,
    avgLatencyMs: Math.round(totals._avg.latencyMs ?? 0),
    avgSimilarityPercent: Math.round(totals._avg.similarityPercent ?? 0),
    // Không bao giờ âm, kể cả khi dữ liệu lệch vì một lần hoàn lượt hỏng.
    wallet: { granted, used, remaining: Math.max(0, granted - used) },
    alerts,
    recent,
  };
}
