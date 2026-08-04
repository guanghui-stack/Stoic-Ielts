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
 * bên trái lên góc trên bên phải đúng như bố cục ảnh bản đồ: đồng bằng loạn
 * lạc ở dưới, đỉnh núi cô độc ở trên.
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
    shortTitle: "Đào viên",
    functionalLabel: "Bắt đầu",
  },
  {
    code: "NODE_02",
    trialCode: "TRIAL_02_HOANG_CAN",
    era: "LOAN_THE",
    featuredGeneralCode: "TRUONG_PHI",
    x: 20,
    y: 66,
    artKey: "trialHoangCan",
    shortTitle: "Hoàng Cân",
    functionalLabel: "Tạo thói quen",
  },
  {
    code: "NODE_03",
    trialCode: "TRIAL_03_HOA_HUNG",
    era: "LOAN_THE",
    featuredGeneralCode: "QUAN_VU",
    x: 34,
    y: 58,
    artKey: "trialHoaHung",
    shortTitle: "Hoa Hùng",
    functionalLabel: "Quản lý thời gian",
  },
  {
    code: "NODE_04",
    trialCode: "TRIAL_04_NGU_QUAN",
    era: "QUAN_HUNG",
    featuredGeneralCode: "QUAN_VU",
    x: 47,
    y: 68,
    artKey: "trialNguQuan",
    shortTitle: "Ngũ quan",
    functionalLabel: "Ổn định phong độ",
  },
  {
    code: "NODE_05",
    trialCode: "TRIAL_05_TRUONG_BAN",
    era: "QUAN_HUNG",
    featuredGeneralCode: "TRIEU_VAN",
    x: 59,
    y: 52,
    artKey: "trialTruongBan",
    shortTitle: "Trường Bản",
    functionalLabel: "Cứu phần yếu",
  },
  {
    code: "NODE_06",
    trialCode: "TRIAL_06_LAO_TUONG",
    era: "QUAN_HUNG",
    featuredGeneralCode: "HOANG_TRUNG",
    x: 70,
    y: 38,
    artKey: "trialLaoTuong",
    shortTitle: "Khai cung",
    functionalLabel: "Phục bàn sâu",
  },
  {
    code: "NODE_07",
    trialCode: "TRIAL_07_TAY_LUONG",
    era: "TAM_PHAN",
    featuredGeneralCode: "MA_SIEU",
    x: 83,
    y: 28,
    artKey: "trialTayLuong",
    shortTitle: "Tây Lương",
    functionalLabel: "Biến hóa",
  },
  {
    code: "NODE_08",
    trialCode: "TRIAL_08_HO_LAO",
    era: "TAM_PHAN",
    featuredGeneralCode: "LU_BO",
    x: 93,
    y: 15,
    artKey: "trialHoLao",
    shortTitle: "Hổ Lao",
    functionalLabel: "Tổng hợp cuối",
  },
];

export function campaignNodeByTrial(trialCode: string): CampaignNode | undefined {
  return CAMPAIGN_NODES.find((node) => node.trialCode === trialCode);
}
