import type { GeneralCode } from "@/lib/story/generals";
import type { ArtKey } from "@/lib/brand/art-manifest";
import type { RankEra } from "@/lib/ranks/catalog";

/**
 * Bản đồ Chiến Dịch — catalog tĩnh, không có bảng trong database.
 *
 * Bản đồ là LỚP TRÌNH BÀY của hệ cấp bậc, không phải một engine thứ hai.
 * Trạng thái mỗi node đều suy ra được từ `UserRank.currentLevel` và
 * `UserTrial.status` đã có, nên thêm bảng Campaign chỉ tạo ra một nguồn sự
 * thật thứ hai để lệch nhau. Giữ ở đây còn giúp rollback bằng revert và kiểm
 * thử không cần database.
 *
 * Tọa độ theo phần trăm chiều rộng và chiều cao của ảnh nền, đi từ góc dưới
 * bên trái lên góc trên bên phải, biểu thị một hành trình từ bước đầu có chủ
 * đích tới năng lực tự chủ.
 */

export type CampaignNode = {
  code: string;
  trialCode: string;
  era: RankEra;
  featuredGeneralCode: GeneralCode;
  /** Phần trăm, gốc ở góc trên bên trái của ảnh nền. */
  x: number;
  y: number;
  artKey: ArtKey;
  /** Tên gợi nhớ, ngắn. */
  shortTitle: string;
  /** Nhãn chức năng — luôn đi kèm tên cổ phong, theo quy tắc nhãn kép §3. */
  functionalLabel: string;
};

export const CAMPAIGN_NODES: CampaignNode[] = [
  {
    code: "NODE_01",
    trialCode: "TRIAL_01_DAO_VIEN",
    era: "LOAN_THE",
    featuredGeneralCode: "TRUONG_PHI",
    x: 8,
    y: 78,
    artKey: "trialDaoVien",
    shortTitle: "Chủ động bắt đầu",
    functionalLabel: "Bắt đầu có chủ đích",
  },
  {
    code: "NODE_02",
    trialCode: "TRIAL_02_HOANG_CAN",
    era: "LOAN_THE",
    featuredGeneralCode: "TRUONG_PHI",
    x: 20,
    y: 66,
    artKey: "trialHoangCan",
    shortTitle: "Giữ nhịp đều đặn",
    functionalLabel: "Kỷ luật quay lại",
  },
  {
    code: "NODE_03",
    trialCode: "TRIAL_03_HOA_HUNG",
    era: "LOAN_THE",
    featuredGeneralCode: "QUAN_VU",
    x: 34,
    y: 58,
    artKey: "trialHoaHung",
    shortTitle: "Quản trị sự chú ý",
    functionalLabel: "Tập trung vào bước kế tiếp",
  },
  {
    code: "NODE_04",
    trialCode: "TRIAL_04_NGU_QUAN",
    era: "QUAN_HUNG",
    featuredGeneralCode: "QUAN_VU",
    x: 47,
    y: 68,
    artKey: "trialNguQuan",
    shortTitle: "Ổn định qua biến động",
    functionalLabel: "Bình thản trước kết quả",
  },
  {
    code: "NODE_05",
    trialCode: "TRIAL_05_TRUONG_BAN",
    era: "QUAN_HUNG",
    featuredGeneralCode: "TRIEU_VAN",
    x: 59,
    y: 52,
    artKey: "trialTruongBan",
    shortTitle: "Không bỏ rơi phần khó",
    functionalLabel: "Can đảm nhìn vào phần yếu",
  },
  {
    code: "NODE_06",
    trialCode: "TRIAL_06_LAO_TUONG",
    era: "QUAN_HUNG",
    featuredGeneralCode: "HOANG_TRUNG",
    x: 70,
    y: 38,
    artKey: "trialLaoTuong",
    shortTitle: "Phản tư có chiều sâu",
    functionalLabel: "Học từ điều đã xảy ra",
  },
  {
    code: "NODE_07",
    trialCode: "TRIAL_07_TAY_LUONG",
    era: "TAM_PHAN",
    featuredGeneralCode: "MA_SIEU",
    x: 83,
    y: 28,
    artKey: "trialTayLuong",
    shortTitle: "Tích hợp ba trụ",
    functionalLabel: "Nhận thức · Hành động · Ý chí",
  },
  {
    code: "NODE_08",
    trialCode: "TRIAL_08_HO_LAO",
    era: "TAM_PHAN",
    featuredGeneralCode: "LU_BO",
    x: 93,
    y: 15,
    artKey: "trialHoLao",
    shortTitle: "Tự chủ trước điểm yếu",
    functionalLabel: "Tự chủ trước điều có thể sửa",
  },
];

export function campaignNodeByTrial(trialCode: string): CampaignNode | undefined {
  return CAMPAIGN_NODES.find((node) => node.trialCode === trialCode);
}
