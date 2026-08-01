import "server-only";
import { db } from "@/lib/db";
import type { AccessFeature } from "@/lib/payments/catalog";
import {
  decideGrantAccess,
  isGrantLive,
  type GrantLike,
} from "@/lib/payments/payment-rules";

/**
 * Lớp truy vấn sổ cái quyền. Việc *quyết định* nằm ở `payment-rules.ts` (hàm
 * thuần, có kiểm thử); file này chỉ lo lấy dữ liệu ra.
 *
 * Luôn lọc theo `feature` ngay trong truy vấn — quyền Reading và quyền Feynman
 * là hai sản phẩm độc lập, không được phép rò sang nhau.
 */

const GRANT_FIELDS = {
  feature: true,
  scope: true,
  exerciseId: true,
  status: true,
  startsAt: true,
  expiresAt: true,
} as const;

async function liveGrants(
  userId: string,
  feature: AccessFeature
): Promise<GrantLike[]> {
  return db.accessGrant.findMany({
    where: { userId, feature, status: "ACTIVE" },
    select: GRANT_FIELDS,
  });
}

/** Học viên có quyền dùng tính năng này cho bài này không. */
export async function hasActiveAccess(input: {
  userId: string;
  feature: AccessFeature;
  exerciseId?: string | null;
  at?: Date;
}): Promise<boolean> {
  const at = input.at ?? new Date();
  const grants = await liveGrants(input.userId, input.feature);
  return decideGrantAccess({
    grants,
    feature: input.feature,
    exerciseId: input.exerciseId ?? null,
    at,
  });
}

export type AccessSnapshot = {
  /** Đang có gói phủ mọi bài. */
  hasAll: boolean;
  /** Các bài đã mua lẻ. */
  exerciseIds: Set<string>;
  /** Ngày hết hạn gói (xa nhất), null nếu không có gói. */
  allExpiresAt: Date | null;
};

/**
 * Ảnh chụp quyền của một học viên — dùng khi cần dựng cả danh sách bài trong
 * một lần truy vấn, thay vì hỏi database cho từng bài một.
 */
export async function getAccessSnapshot(
  userId: string,
  feature: AccessFeature,
  at = new Date()
): Promise<AccessSnapshot> {
  const rows = await liveGrants(userId, feature);
  const live = rows.filter((row) => isGrantLive(row, at));

  const allExpiries = live
    .filter((row) => row.scope === "ALL")
    .map((row) => row.expiresAt);

  return {
    hasAll: allExpiries.length > 0,
    exerciseIds: new Set(
      live
        .filter((row) => row.scope === "EXERCISE" && row.exerciseId)
        .map((row) => row.exerciseId as string)
    ),
    // Gói vĩnh viễn (null) thì không có ngày hết hạn để hiển thị
    allExpiresAt: allExpiries.some((d) => d === null)
      ? null
      : (allExpiries
          .filter((d): d is Date => d !== null)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null),
  };
}

export type AdminGrantSummary = {
  /** Học viên đang được TRUNG TÂM TẶNG quyền Reading toàn bộ. */
  readingGift: Set<string>;
  /** Học viên đang được trung tâm tặng quyền Feynman toàn bộ. */
  feynmanGift: Set<string>;
  /** Số quyền Reading học viên đã TỰ MUA (không tính phần tặng). */
  readingPurchases: Map<string, number>;
  /** Học viên đang có gói Reading 30 ngày do tự mua. */
  readingPackage: Set<string>;
};

/**
 * Tổng hợp quyền của toàn bộ học viên cho trang quản trị.
 *
 * Tách khỏi trang vì cần đọc đồng hồ hệ thống để biết quyền nào còn hạn — việc
 * đó không được làm trong lúc dựng giao diện (React yêu cầu hàm dựng phải cho
 * cùng kết quả với cùng đầu vào).
 */
export async function summarizeGrantsForAdmin(): Promise<AdminGrantSummary> {
  const at = new Date();
  const rows = await db.accessGrant.findMany({
    where: { status: "ACTIVE" },
    select: {
      userId: true,
      feature: true,
      scope: true,
      source: true,
      status: true,
      startsAt: true,
      expiresAt: true,
      exerciseId: true,
    },
  });
  const live = rows.filter((row) => isGrantLive(row, at));

  const summary: AdminGrantSummary = {
    readingGift: new Set(),
    feynmanGift: new Set(),
    readingPurchases: new Map(),
    readingPackage: new Set(),
  };

  for (const row of live) {
    const gifted = row.source === "ADMIN";
    if (row.feature === "FEYNMAN") {
      if (gifted && row.scope === "ALL") summary.feynmanGift.add(row.userId);
      continue;
    }
    if (row.feature !== "READING") continue;
    if (gifted) {
      if (row.scope === "ALL") summary.readingGift.add(row.userId);
      continue;
    }
    summary.readingPurchases.set(
      row.userId,
      (summary.readingPurchases.get(row.userId) ?? 0) + 1
    );
    if (row.scope === "ALL") summary.readingPackage.add(row.userId);
  }

  return summary;
}

/** Hạn xa nhất của gói cùng loại đang còn hiệu lực — dùng để nối tiếp khi gia hạn. */
export async function latestPackageExpiry(
  userId: string,
  feature: AccessFeature,
  at = new Date()
): Promise<Date | null> {
  const rows = await db.accessGrant.findMany({
    where: {
      userId,
      feature,
      scope: "ALL",
      status: "ACTIVE",
      expiresAt: { gt: at },
    },
    orderBy: { expiresAt: "desc" },
    take: 1,
    select: { expiresAt: true },
  });
  return rows[0]?.expiresAt ?? null;
}
