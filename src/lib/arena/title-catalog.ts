import "server-only";
import { db } from "@/lib/db";
import { ARENA_TITLE_THRESHOLDS } from "@/lib/arena/titles.ts";

/**
 * Tám danh hiệu của đấu trường.
 *
 * VỀ CÂU CHỮ. Dùng thành ngữ bốn chữ Hán Việt, VIẾT BẰNG CHỮ LATIN. Thể này
 * đúng chất Tam Quốc hơn một câu chửi, giữ được phẩm giá nền tảng, và không cũ
 * đi sau vài tháng. Chất châm biếm dồn vào dòng mô tả, nơi nó có sức nặng mà
 * không thành sỉ nhục.
 *
 * VỀ HIỂN THỊ. Cả năm danh hiệu chất vấn đều `PRIVATE_ONLY`. Chúng nằm im trên
 * hồ sơ cho ai xem hồ sơ thì thấy, và KHÔNG BAO GIỜ lên Bảng Bố Cáo: đẩy lên
 * bảng công cộng là bêu riếu, và mất luôn phần nhân từ.
 *
 * VỀ NGƯỠNG. Mọi con số nằm trong `ruleConfig`, gieo vào `ruleConfigJson`, nên
 * chỉnh được thẳng trong database mà không cần deploy lại. Xem khối ngưỡng ở
 * `titles.ts` để biết vì sao chúng là số TẠM.
 */
type ArenaTitleSeed = {
  code: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  visibility: "PUBLIC" | "PRIVATE_ONLY";
  ruleKey: string;
  ruleConfig: Record<string, unknown>;
  sortOrder: number;
};

const T = ARENA_TITLE_THRESHOLDS;

export const ARENA_TITLE_SEEDS: readonly ArenaTitleSeed[] = [
  {
    code: "ARENA_Q01_DANH_BAT_PHU_THUC",
    slug: "danh-bat-phu-thuc",
    name: "Danh Bất Phù Thực",
    description:
      "Ấn triện thì cao, chiến tích thì thấp. Thiên hạ đã có lời bàn. Đây không phải bản án về năng lực: nó chỉ ra chỗ tên gọi và sự thật đang lệch nhau, và nó xoá được.",
    category: "ARENA_QUESTION",
    rarity: "PRIVATE",
    visibility: "PRIVATE_ONLY",
    ruleKey: "ARENA_RATING_BELOW_PEERS",
    ruleConfig: T.DANH_BAT_PHU_THUC,
    sortOrder: 300,
  },
  {
    code: "ARENA_Q02_AN_TAI_DAI_GIA",
    slug: "an-tai-dai-gia",
    name: "Ẩn Tài Đãi Giá",
    description:
      "Sức đủ vượt Vũ Môn từ lâu, mà cố nán lại chốn thấp để tìm phần dễ. Cửa đang mở, và nó chờ bạn.",
    category: "ARENA_QUESTION",
    rarity: "PRIVATE",
    visibility: "PRIVATE_ONLY",
    ruleKey: "ARENA_IDLE_ABOVE_PEERS",
    ruleConfig: T.AN_TAI_DAI_GIA,
    sortOrder: 301,
  },
  {
    code: "ARENA_Q03_AN_BINH_BAT_DONG",
    slug: "an-binh-bat-dong",
    name: "Án Binh Bất Động",
    description:
      "Mười lần trống giục, mười lần cửa doanh khép chặt. Chỉ đếm những lời thách tới khi bạn đang ở sân và đang rảnh, và mỗi người thách chỉ tính một lần mỗi ngày.",
    category: "ARENA_QUESTION",
    rarity: "PRIVATE",
    visibility: "PRIVATE_ONLY",
    ruleKey: "ARENA_DECLINE_STREAK",
    ruleConfig: T.AN_BINH_BAT_DONG,
    sortOrder: 302,
  },
  {
    code: "ARENA_Q04_LAM_TRAN_THOAT_DAO",
    slug: "lam-tran-thoat-dao",
    name: "Lâm Trận Thoát Đào",
    description:
      "Trống chưa dứt hồi, bóng người đã khuất sau trại. Bỏ mặc tới hết giờ, không phải thua: thua thì không ai trách, bỏ mặc thì đối thủ ngồi chờ vô ích.",
    category: "ARENA_QUESTION",
    rarity: "PRIVATE",
    visibility: "PRIVATE_ONLY",
    ruleKey: "ARENA_ABANDON_COUNT",
    ruleConfig: T.LAM_TRAN_THOAT_DAO,
    sortOrder: 303,
  },
  {
    code: "ARENA_Q05_Y_CUONG_LANG_NHUOC",
    slug: "y-cuong-lang-nhuoc",
    name: "Ỷ Cường Lăng Nhược",
    description:
      "Đao chỉ hướng kẻ yếu, chưa từng ngước nhìn lên trên. Chỉ đếm những trận do chính bạn gửi chiến thư: trận tự ghép do máy chọn đối thủ, không phải lỗi của ai.",
    category: "ARENA_QUESTION",
    rarity: "PRIVATE",
    visibility: "PRIVATE_ONLY",
    ruleKey: "ARENA_BULLY_STREAK",
    ruleConfig: T.Y_CUONG_LANG_NHUOC,
    sortOrder: 304,
  },

  /* ===== Hai danh hiệu chỉ NGƯỜI mới gắn được ===== */
  {
    code: "ARENA_M01_NGUY_TAO_QUAN_CONG",
    slug: "nguy-tao-quan-cong",
    name: "Ngụy Tạo Quân Công",
    description:
      "Công trạng ghi trong sổ, mà chiến trường chưa từng thấy mặt. Chỉ gắn khi có người xét duyệt xác minh và lưu bằng chứng. Xoá sau một mùa giải không tái phạm.",
    category: "ARENA_MANUAL",
    rarity: "PRIVATE",
    visibility: "PRIVATE_ONLY",
    // Không có luật máy nào ứng với khoá này, và đó là chủ ý: máy không có
    // đường nào gắn danh hiệu này kể cả khi ai đó lỡ tay gọi nhầm hàm.
    ruleKey: "MANUAL_REVIEW_ONLY",
    ruleConfig: { requiresHumanReview: true },
    sortOrder: 310,
  },
  {
    code: "ARENA_M02_NOI_UNG_NGOAI_HOP",
    slug: "noi-ung-ngoai-hop",
    name: "Nội Ứng Ngoại Hợp",
    description:
      "Hai quân giao tranh mà cùng một lòng, thắng bại đã định trước khi gióng trống. Chỉ gắn khi thông đồng đã được xác minh. Xoá sau một mùa giải không tái phạm.",
    category: "ARENA_MANUAL",
    rarity: "PRIVATE",
    visibility: "PRIVATE_ONLY",
    ruleKey: "MANUAL_REVIEW_ONLY",
    ruleConfig: { requiresHumanReview: true },
    sortOrder: 311,
  },

  /* ===== Đường chuộc lỗi ===== */
  {
    code: "ARENA_R01_CAI_QUA_TU_TAN",
    slug: "cai-qua-tu-tan",
    name: "Cải Quá Tự Tân",
    description:
      "Từng có lời bàn sau lưng, nay đã tự mình rửa sạch. Chỉ người từng vấp mới có được danh hiệu này, và nó ở lại vĩnh viễn.",
    // CÔNG KHAI, và giữ vĩnh viễn. Đây là điểm mấu chốt: nó biến vết trượt
    // thành một thứ đáng kể, và là lời hứa cụ thể rằng nền tảng không đóng đinh
    // ai vĩnh viễn.
    category: "ARENA_REDEMPTION",
    rarity: "EPIC",
    visibility: "PUBLIC",
    ruleKey: "ARENA_CLEARED_A_QUESTION_TITLE",
    ruleConfig: { clearedAtLeast: 1 },
    sortOrder: 320,
  },
];

/**
 * Gieo danh mục vào `TitleDefinition`.
 *
 * Chạy MỖI lần khởi động chứ không phải một lần: sửa câu chữ trong mã nguồn là
 * thấy ngay trên website, đúng cách `seedTitleCatalog` của hệ danh hiệu đang
 * làm. Danh hiệu học viên đã nhận KHÔNG bị đụng tới.
 */
export async function seedArenaTitles(): Promise<number> {
  for (const seed of ARENA_TITLE_SEEDS) {
    await db.titleDefinition.upsert({
      where: { code: seed.code },
      create: {
        code: seed.code,
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        quoteKind: "ORIGINAL",
        quoteSource: "Thông điệp của HỔ PHÙ · IELTS",
        category: seed.category,
        rarity: seed.rarity,
        visibility: seed.visibility,
        ruleKey: seed.ruleKey,
        ruleConfigJson: JSON.stringify(seed.ruleConfig),
        repeatPolicy: "ONCE",
        sortOrder: seed.sortOrder,
      },
      update: {
        name: seed.name,
        description: seed.description,
        category: seed.category,
        rarity: seed.rarity,
        visibility: seed.visibility,
        ruleKey: seed.ruleKey,
        // KHÔNG ghi đè `ruleConfigJson` khi đã có: quản trị viên chỉnh ngưỡng
        // thẳng trong database, và một lần deploy không được xoá công đó.
        sortOrder: seed.sortOrder,
      },
    });
  }
  return ARENA_TITLE_SEEDS.length;
}
