// Import tương đối kèm đuôi .ts là cố ý: các script kiểm thử chạy thẳng bằng
// node, nơi alias "@/" không tồn tại. Giữ nguyên đường dẫn này để bộ kiểm thử
// nạp được module mà không cần thêm bước biên dịch.
import { RANK_SEEDS, TRIAL_SEEDS, FIRST_RANK_CODE } from "./catalog.ts";

/**
 * Đưa catalog cấp bậc vào database.
 *
 * Chỉ nhận đúng phần Prisma Client mà hàm này dùng, thay vì cả client. Nhờ
 * vậy script kiểm thử có thể truyền vào một bản giả lập nhỏ mà không cần
 * dựng cả database thật.
 */
/**
 * Các shape dưới đây liệt kê đủ mọi trường bắt buộc chứ không dùng kiểu túi
 * chung chung. Prisma sinh ra kiểu rất chặt cho `create`, nên một cổng lỏng
 * lẻo sẽ không khớp — và đó là điều tốt: nếu ai thêm một cột NOT NULL vào
 * schema mà quên seed nó, trình biên dịch báo ngay tại đây thay vì để
 * database từ chối lúc máy chủ khởi động.
 */
type RankDefinitionFields = {
  level: number;
  slug: string;
  name: string;
  era: string;
  bandAnchor: string;
  description: string;
  active: boolean;
};

type TrialDefinitionFields = {
  slug: string;
  name: string;
  featuredGeneralCode: string;
  fromLevel: number;
  toLevel: number;
  skill: string;
  rationale: string;
  narrative: string;
  gateRuleKey: string;
  gateConfigJson: string;
  successRuleKey: string;
  successConfigJson: string;
  retryUnlimited: boolean;
  estimate: string;
  active: boolean;
};

export type RankSeedDb = {
  rankDefinition: {
    upsert(args: {
      where: { code: string };
      update: RankDefinitionFields;
      create: RankDefinitionFields & { code: string };
    }): Promise<unknown>;
  };
  trialDefinition: {
    upsert(args: {
      where: { code: string };
      update: TrialDefinitionFields;
      create: TrialDefinitionFields & { code: string };
    }): Promise<unknown>;
  };
};

/**
 * Seed idempotent theo `code`.
 *
 * Ba điều hàm này cố ý KHÔNG làm:
 *
 *  - không xóa định nghĩa cũ. Một cấp bậc bị bỏ khỏi catalog vẫn ở lại trong
 *    database, chỉ cần đánh dấu inactive. Xóa nó sẽ làm hỏng lịch sử của
 *    những người đã từng đi qua.
 *  - không đụng tới UserTrial hay TrialRun. Sửa mô tả một cửa ải không được
 *    phép thay đổi luật của một lượt đang chạy dở; luật của lượt đó đã được
 *    chụp lại trong `configSnapshotJson` từ lúc bắt đầu.
 *  - không cấp cấp bậc cho ai. Seed chỉ tạo định nghĩa.
 */
export async function seedRankCatalog(db: RankSeedDb): Promise<{
  ranks: number;
  trials: number;
}> {
  for (const rank of RANK_SEEDS) {
    const fields = {
      level: rank.level,
      slug: rank.slug,
      name: rank.name,
      era: rank.era,
      bandAnchor: rank.bandAnchor,
      description: rank.description,
      active: true,
    };
    await db.rankDefinition.upsert({
      where: { code: rank.code },
      update: fields,
      create: { code: rank.code, ...fields },
    });
  }

  for (const trial of TRIAL_SEEDS) {
    const fields = {
      slug: trial.slug,
      name: trial.name,
      featuredGeneralCode: trial.featuredGeneralCode,
      fromLevel: trial.fromLevel,
      toLevel: trial.toLevel,
      skill: trial.skill,
      rationale: trial.rationale,
      narrative: trial.narrative,
      gateRuleKey: trial.gateRuleKey,
      gateConfigJson: JSON.stringify(trial.gateConfig),
      successRuleKey: trial.successRuleKey,
      successConfigJson: JSON.stringify(trial.successConfig),
      retryUnlimited: trial.retryUnlimited,
      estimate: trial.estimate,
      active: true,
    };
    await db.trialDefinition.upsert({
      where: { code: trial.code },
      update: fields,
      create: { code: trial.code, ...fields },
    });
  }

  return { ranks: RANK_SEEDS.length, trials: TRIAL_SEEDS.length };
}

type UserRankSeedRow = {
  userId: string;
  currentLevel: number;
  currentRankCode: string;
};

export type RankBackfillDb = {
  user: {
    findMany(args: {
      where: { role: string };
      select: { id: true };
    }): Promise<Array<{ id: string }>>;
  };
  userRank: {
    createMany(args: {
      data: UserRankSeedRow[];
      skipDuplicates: boolean;
    }): Promise<{ count: number }>;
  };
};

/**
 * Cho mọi học viên hiện hữu một hồ sơ cấp bậc ở mức 1.
 *
 * Cố ý KHÔNG suy ra cấp bậc từ lịch sử làm bài. Người đã học sáu tháng và
 * người mới đăng ký hôm nay đều bắt đầu ở Bạch thân. Lý do: mọi lần thăng
 * cấp đều phải đi qua một thí luyện được bấm chủ động, nên trao sẵn cấp bậc
 * dựa trên dữ liệu cũ sẽ phá đúng cái nguyên tắc mà cả hệ thống dựng lên để
 * bảo vệ. Nếu về sau muốn ghi nhận người học cũ thì đó là một script riêng,
 * chạy thử trước, xuất báo cáo và cần chủ dự án duyệt.
 *
 * `skipDuplicates` khiến hàm chạy lại bao nhiêu lần cũng vô hại.
 */
export async function backfillUserRanks(db: RankBackfillDb): Promise<number> {
  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true },
  });
  if (students.length === 0) return 0;

  const result = await db.userRank.createMany({
    data: students.map((student) => ({
      userId: student.id,
      currentLevel: 1,
      currentRankCode: FIRST_RANK_CODE,
    })),
    skipDuplicates: true,
  });
  return result.count;
}
