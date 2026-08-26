import "server-only";
import { db } from "@/lib/db";
import { ARENA_TITLE_THRESHOLDS } from "@/lib/arena/titles.ts";

/**
 * Tám danh hiệu của đấu trường.
 *
 * VỀ CÂU CHỮ. Dùng nhãn tiếng Việt ngắn, trực diện và có tính phản tư. Ngôn ngữ
 * phải giúp người học nhìn vào hành vi và dữ liệu, không biến một kết luận vận hành
 * thành lời phán xét về con người. Chất nhắc nhở dồn vào dòng mô tả, nơi nó có
 * sức nặng mà không thành sỉ nhục.
 *
 * VỀ HIỂN THỊ. Cả năm danh hiệu chất vấn đều `PRIVATE_ONLY`. Chúng nằm im trên
 * hồ sơ cho ai xem hồ sơ thì thấy, và KHÔNG BAO GIỜ lên Thông Báo: đẩy lên
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
    name: "Tên gọi chưa khớp dữ liệu",
    description:
      "Hồ sơ đang cho thấy khoảng cách giữa tên gọi và kết quả thực tế. Đây không phải bản án về năng lực; nó chỉ ra chỗ cần kiểm tra lại.",
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
    name: "Năng lực đang chờ được dùng",
    description:
      "Bạn đã có nền tảng để bước lên nhưng vẫn đang chọn vùng dễ. Hãy thử một nhiệm vụ nằm ngay ngoài thói quen.",
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
    name: "Trì hoãn lựa chọn",
    description:
      "Nhiều lời mời đã đến khi bạn đang có thể tham gia nhưng chưa phản hồi. Chỉ ghi nhận lời mời phù hợp và mỗi người một lần mỗi ngày.",
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
    name: "Rời khỏi cam kết",
    description:
      "Bạn rời phiên trước khi hoàn tất. Thua là một kết quả có thể học từ đó; bỏ mặc khiến người còn lại phải chờ vô ích.",
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
    name: "Chọn thử thách quá dễ",
    description:
      "Các thử thách bạn chủ động gửi thường thấp hơn đáng kể so với năng lực hiện tại. Trận tự ghép do máy chọn đối thủ không bị tính vào tín hiệu này.",
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
    name: "Tín hiệu chưa nhất quán",
    description:
      "Dữ liệu trong hồ sơ chưa khớp với các bằng chứng đang có. Chỉ gắn khi người xét duyệt xác minh và lưu bằng chứng; xóa sau một mùa giải không tái phạm.",
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
    name: "Phối hợp không minh bạch",
    description:
      "Nhiều tín hiệu cho thấy kết quả cần được rà soát thêm. Chỉ gắn khi phối hợp không minh bạch đã được xác minh; xóa sau một mùa giải không tái phạm.",
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
    name: "Sửa mình bằng hành động",
    description:
      "Bạn đã nhìn lại tín hiệu cũ và tạo ra thay đổi có bằng chứng. Chỉ người từng vấp mới có danh hiệu này, và nó ở lại vĩnh viễn.",
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
        quoteSource: "STOIC · IELTS — nội dung nguyên bản",
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
