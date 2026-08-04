// Import tương đối kèm đuôi .ts là cố ý, giống seeds.ts: script kiểm thử chạy
// thẳng bằng node nên alias "@/" không tồn tại ở đó.
import { CAMPAIGN_NODES, type CampaignNode } from "./catalog.ts";
import { trialByCode } from "../ranks/catalog.ts";

/**
 * Suy trạng thái từng node trên bản đồ.
 *
 * Hàm thuần, không chạm database: bản đồ chỉ trình bày lại thứ hệ cấp bậc đã
 * quyết định. Tách ra như vậy để kiểm thử được mọi tổ hợp cấp bậc và trạng
 * thái thí luyện mà không cần MySQL.
 */

export type CampaignNodeState = "LOCKED" | "AVAILABLE" | "ACTIVE" | "PASSED";

export type CampaignNodeView = CampaignNode & {
  state: CampaignNodeState;
  /** Node ứng với cấp bậc học viên đang đứng — nơi cắm cờ hổ phù. */
  isCurrent: boolean;
  trialName: string;
  /** Điều kiện còn thiếu, để đưa vào aria-label thay vì chỉ đổi màu. */
  hint: string | null;
};

export type TrialStatusMap = Record<
  string,
  { status: string; hint?: string | null } | undefined
>;

export function campaignView(
  currentLevel: number,
  trials: TrialStatusMap,
): CampaignNodeView[] {
  return CAMPAIGN_NODES.map((node) => {
    const trial = trialByCode(node.trialCode);
    const record = trials[node.trialCode];
    const fromLevel = trial?.fromLevel ?? 0;

    let state: CampaignNodeState = "LOCKED";
    if (record?.status === "PASSED" || fromLevel < currentLevel) {
      // Cửa ải nằm dưới cấp hiện tại chắc chắn đã qua, kể cả khi bản ghi
      // UserTrial bị thiếu vì dữ liệu cũ hoặc do admin can thiệp.
      state = "PASSED";
    } else if (record?.status === "ACTIVE") {
      state = "ACTIVE";
    } else if (fromLevel === currentLevel && record?.status === "ELIGIBLE") {
      state = "AVAILABLE";
    }

    return {
      ...node,
      state,
      isCurrent: fromLevel === currentLevel,
      trialName: trial?.name ?? node.shortTitle,
      // Chỉ nói điều kiện còn thiếu của cửa ải đang tới. Cửa ở xa mà hiện
      // đủ điều kiện chi tiết thì vừa rối vừa làm người mới nản.
      hint: fromLevel === currentLevel ? (record?.hint ?? null) : null,
    };
  });
}

/** Nhãn tiếng Việt của trạng thái, dùng cho cả giao diện lẫn trình đọc màn hình. */
export const STATE_LABELS: Record<CampaignNodeState, string> = {
  LOCKED: "Chưa mở",
  AVAILABLE: "Đã mở, có thể khởi thí luyện",
  ACTIVE: "Đang thí luyện",
  PASSED: "Đã vượt",
};
