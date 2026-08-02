/**
 * Danh mục danh hiệu — nguồn sự thật DUY NHẤT cho tên, điều kiện và nguồn câu chữ.
 *
 * Ba nguyên tắc bắt buộc khi thêm danh hiệu mới:
 *
 * 1. `quoteKind` phải trung thực. EXACT là trích nguyên văn có nguồn kiểm chứng
 *    được; ADAPTED là phỏng theo; ORIGINAL là Wobridges tự viết. Gán một câu tự
 *    sáng tác cho danh nhân lịch sử là bịa nguồn — không bao giờ được làm.
 *
 * 2. Danh hiệu tiêu cực chỉ được `PRIVATE_ONLY`. Bêu tên người học kém trước
 *    đám đông không dạy được ai điều gì, chỉ khiến họ bỏ học.
 *
 * 3. Mốc cao phải kết hợp ít nhất hai yếu tố (số đề, chất lượng, chiều sâu sửa
 *    bài, kỷ luật). Nếu chỉ đếm số lượng, học viên sẽ cày cho xong thay vì học.
 *
 * File này KHÔNG import "server-only" để bộ kiểm thử chạy được bằng node thuần.
 */

export type RuleKey =
  | "UNIQUE_FIRST_ATTEMPTS"
  | "ROLLING_ATTEMPTS"
  | "COLLECTION_ATTEMPT_COUNT"
  | "COLLECTION_MIN_FIRST_BAND"
  | "FEYNMAN_TOTALS"
  | "COLLECTION_FEYNMAN_COMPLETE"
  | "ACTIVE_TIME_WINDOW"
  | "COMPOSITE_TITLES"
  | "NEAR_COMPOSITE"
  | "RECOVERY_CHAIN";

export type QuoteKind = "EXACT" | "ADAPTED" | "ORIGINAL";
export type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "PRIVATE";
export type Visibility = "PUBLIC" | "PRIVATE_ONLY";
export type TitleCategory =
  | "PRACTICE"
  | "FEYNMAN"
  | "DISCIPLINE"
  | "COMPOSITE"
  | "TRANSFORMATION";

export type TitleSeed = {
  code: string;
  slug: string;
  name: string;
  description: string;
  quoteKind: QuoteKind;
  quoteSource?: string;
  quoteSourceUrl?: string;
  category: TitleCategory;
  rarity: Rarity;
  visibility?: Visibility;
  ruleKey: RuleKey;
  ruleConfig: Record<string, unknown>;
  repeatPolicy?: "ONCE" | "PER_COLLECTION";
  rewardCode?: "READING_FEYNMAN_SINGLE";
  sortOrder: number;
};

const THIVIEN_KHUYEN_HOC =
  "https://www.thivien.net/M%E1%BA%A1nh-Giao/Khuy%E1%BA%BFn-h%E1%BB%8Dc/poem-3vtxp34cF_Njt30mjeXn1A";

export const TITLE_SEEDS: TitleSeed[] = [
  /* ===== Nhóm Giải đề ===== */
  {
    code: "PRACTICE_01_FIRE_FROM_STONE",
    slug: "kich-thach-nai-huu-hoa",
    name: "Kích thạch nãi hữu hỏa",
    description:
      "Tia lửa đầu tiên chỉ xuất hiện khi bạn thật sự bắt tay vào làm.",
    quoteKind: "EXACT",
    quoteSource: "Mạnh Giao · Khuyến học",
    quoteSourceUrl: THIVIEN_KHUYEN_HOC,
    category: "PRACTICE",
    rarity: "COMMON",
    ruleKey: "UNIQUE_FIRST_ATTEMPTS",
    ruleConfig: { distinctExercises: 3, minBandEach: 4.0 },
    sortOrder: 10,
  },
  {
    code: "PRACTICE_02_LEARN_THE_WAY",
    slug: "nhan-hoc-thuy-tri-dao",
    name: "Nhân học thủy tri đạo",
    description:
      "Tám bài đọc khác nhau, không bài nào bị bỏ lại phía sau. Đây là trụ Giải đề của điều kiện dự Nguyệt Thí.",
    quoteKind: "EXACT",
    quoteSource: "Mạnh Giao · Khuyến học",
    quoteSourceUrl: THIVIEN_KHUYEN_HOC,
    category: "PRACTICE",
    rarity: "UNCOMMON",
    ruleKey: "UNIQUE_FIRST_ATTEMPTS",
    ruleConfig: { distinctExercises: 8, minAverageBand: 5.5, minBandEach: 4.0 },
    sortOrder: 20,
  },
  {
    code: "PRACTICE_03_HARD_ROAD",
    slug: "duong-di-kho",
    name: "Đường đi khó, không khó vì ngăn sông cách núi",
    description:
      "Mười lăm đề trong chín mươi ngày, trong đó ít nhất năm đề Full Test. Bền bỉ mới là thứ tạo ra band.",
    quoteKind: "ADAPTED",
    quoteSource: "Phỏng theo Nguyễn Bá Học",
    quoteSourceUrl: "https://daidoanket.vn/vuot-kho-vuot-kho-10256076.html",
    category: "PRACTICE",
    rarity: "RARE",
    ruleKey: "ROLLING_ATTEMPTS",
    ruleConfig: {
      windowDays: 90,
      distinctExercises: 15,
      minFullTests: 5,
      minAverageBand: 6.5,
    },
    sortOrder: 30,
  },
  {
    code: "PRACTICE_04_EARLY_YOUTH",
    slug: "thanh-xuan-tu-tao-vi",
    name: "Thanh xuân tu tảo vi, khởi năng trường thiếu niên",
    description:
      "Làm lại có khoảng cách để chứng minh kiến thức đã ở lại, không chỉ là nhớ đáp án.",
    quoteKind: "EXACT",
    quoteSource: "Mạnh Giao · Khuyến học",
    quoteSourceUrl: THIVIEN_KHUYEN_HOC,
    category: "PRACTICE",
    rarity: "RARE",
    ruleKey: "COLLECTION_ATTEMPT_COUNT",
    ruleConfig: {
      collectionKind: "FREE_READING",
      minCollectionItems: 8,
      attemptsPerExercise: 2,
      minimumGapHours: 48,
      maxBandDrop: 0.5,
    },
    repeatPolicy: "PER_COLLECTION",
    rewardCode: "READING_FEYNMAN_SINGLE",
    sortOrder: 40,
  },
  {
    code: "PRACTICE_05_RARE_TALENT",
    slug: "tuan-kiet-nhan-tai",
    name: "Tuấn kiệt như sao buổi sớm, nhân tài như lá mùa thu",
    description:
      "Mỗi bài đều phải được chinh phục ngay từ lần hợp lệ đầu tiên. Không có cơ hội làm lại.",
    quoteKind: "EXACT",
    quoteSource: "Nguyễn Trãi · Bình Ngô đại cáo",
    quoteSourceUrl:
      "https://vi.wikisource.org/wiki/B%C3%ACnh_Ng%C3%B4_%C4%91%E1%BA%A1i_c%C3%A1o_%28Tr%E1%BA%A7n_Tr%E1%BB%8Dng_Kim_d%E1%BB%8Bch%29",
    category: "PRACTICE",
    rarity: "EPIC",
    ruleKey: "COLLECTION_MIN_FIRST_BAND",
    ruleConfig: {
      collectionKind: "FREE_READING",
      minCollectionItems: 8,
      minBandEach: 8.0,
    },
    repeatPolicy: "PER_COLLECTION",
    rewardCode: "READING_FEYNMAN_SINGLE",
    sortOrder: 50,
  },
  {
    code: "PRACTICE_06_SLEEPING_DRAGON",
    slug: "phuc-long-phuong-so",
    name: "Phục Long, Phượng Sồ; lưỡng nhân đắc nhất, khả an thiên hạ",
    description:
      "Danh hiệu huyền thoại: toàn bộ bộ đề đạt từ 8.5 ngay lần đầu, Feynman hoàn tất trọn vẹn, và hai mươi ngày học thật.",
    quoteKind: "EXACT",
    quoteSource: "Tam Quốc Diễn Nghĩa · hồi 36",
    quoteSourceUrl:
      "https://zh.wikisource.org/zh-hant/%E4%B8%89%E5%9C%8B%E6%BC%94%E7%BE%A9/%E7%AC%AC036%E5%9B%9E",
    category: "PRACTICE",
    rarity: "LEGENDARY",
    ruleKey: "COLLECTION_MIN_FIRST_BAND",
    ruleConfig: {
      collectionKind: "FREE_READING",
      minCollectionItems: 8,
      minBandEach: 8.5,
      requireFeynmanComplete: true,
      minActiveDays: 20,
      activeDaysWindow: 90,
    },
    repeatPolicy: "PER_COLLECTION",
    sortOrder: 60,
  },

  /* ===== Nhóm Sửa đề (Feynman) ===== */
  {
    code: "FEYNMAN_01_EXAMINE_MISTAKES",
    slug: "xem-xet-sai-lam-cua-minh",
    name: "Xem xét cả sai lầm của mình",
    description:
      "Năm phiên chữa bài hoàn tất và mười lăm câu sai đã được sửa đủ hai vòng.",
    quoteKind: "ADAPTED",
    quoteSource: "Phỏng theo Marcus Aurelius · Meditations 10.30",
    quoteSourceUrl:
      "https://chunghiakhacky.org/ngay-31-thang-8-xem-xet-ca-sai-lam-cua-minh/",
    category: "FEYNMAN",
    rarity: "UNCOMMON",
    ruleKey: "FEYNMAN_TOTALS",
    ruleConfig: { completedReviews: 5, completedMistakes: 15 },
    sortOrder: 70,
  },
  {
    code: "FEYNMAN_02_READ_CAREFULLY",
    slug: "doc-can-than",
    name: "Đọc cẩn thận, không dễ hài lòng với hiểu biết sơ bộ",
    description:
      "Mười hai phiên chữa bài, bốn mươi câu sai, mỗi câu đều có bằng chứng, lời giải đã sửa và quy tắc rút ra. Đây là trụ Sửa đề của điều kiện dự Nguyệt Thí.",
    quoteKind: "EXACT",
    quoteSource: "Marcus Aurelius · Meditations 1.7.3",
    quoteSourceUrl:
      "https://chunghiakhacky.org/ngay-24-thang-1-thoi-thuc-tim-den-nhung-kien-thuc-sau-sac/",
    category: "FEYNMAN",
    rarity: "RARE",
    ruleKey: "FEYNMAN_TOTALS",
    ruleConfig: {
      completedReviews: 12,
      completedMistakes: 40,
      requireFullFields: true,
    },
    sortOrder: 80,
  },
  {
    code: "FEYNMAN_03_MAKE_WORDS_YOURS",
    slug: "bien-tu-ngu-thanh-cua-minh",
    name: "Biến từ ngữ thành của mình",
    description:
      "Hai mươi phiên chữa bài, phần lớn có bài giảng lại đủ dài, và mức tự tin thật sự tăng lên sau khi sửa.",
    quoteKind: "ADAPTED",
    quoteSource: "Phỏng theo Seneca · Moral Letters",
    quoteSourceUrl:
      "https://chunghiakhacky.org/ngay-12-thang-8-bien-tu-ngu-thanh-cua-minh/",
    category: "FEYNMAN",
    rarity: "EPIC",
    ruleKey: "FEYNMAN_TOTALS",
    ruleConfig: {
      completedReviews: 20,
      minTeachBackChars: 180,
      minTeachBackCount: 16,
      confidenceImprovedRatio: 0.7,
    },
    sortOrder: 90,
  },
  {
    code: "FEYNMAN_04_ALL_BY_SELF",
    slug: "van-su-tu-ky-van",
    name: "Vạn sự tu kỷ vận",
    description:
      "Chữa sâu trọn vẹn mọi bài trong bộ đề miễn phí — không bỏ sót bài nào.",
    quoteKind: "EXACT",
    quoteSource: "Mạnh Giao · Khuyến học",
    quoteSourceUrl: THIVIEN_KHUYEN_HOC,
    category: "FEYNMAN",
    rarity: "EPIC",
    ruleKey: "COLLECTION_FEYNMAN_COMPLETE",
    ruleConfig: { collectionKind: "FREE_READING", minCollectionItems: 8 },
    repeatPolicy: "PER_COLLECTION",
    sortOrder: 100,
  },

  /* ===== Nhóm Kỷ luật ===== */
  {
    code: "DISCIPLINE_01_START_WHERE_YOU_ARE",
    slug: "bat-dau-voi-nhung-gi-dang-co",
    name: "Bắt đầu với những gì đang có",
    description: "Bảy ngày học thật trong hai tuần. Bắt đầu quan trọng hơn hoàn hảo.",
    quoteKind: "ADAPTED",
    quoteSource: "Phỏng theo Marcus Aurelius · Meditations 9.29",
    quoteSourceUrl:
      "https://chunghiakhacky.org/ngay-8-thang-8-bat-dau-voi-nhung-gi-dang-co/",
    category: "DISCIPLINE",
    rarity: "COMMON",
    ruleKey: "ACTIVE_TIME_WINDOW",
    ruleConfig: { windowDays: 14, activeDays: 7, minMinutes: 180, minOutputs: 2 },
    sortOrder: 110,
  },
  {
    code: "DISCIPLINE_02_KEEP_PURSUING",
    slug: "khong-tu-bo-muc-tieu",
    name: "Chúng ta không từ bỏ việc theo đuổi mục tiêu",
    description: "Mười bốn ngày học thật trong ba tuần, tổng cộng trên tám giờ.",
    quoteKind: "ADAPTED",
    quoteSource: "Phỏng theo Epictetus · Discourses 1.2.37b",
    quoteSourceUrl:
      "https://chunghiakhacky.org/ngay-10-thang-8-hoan-hao-la-ke-thu-cua-hanh-dong/",
    category: "DISCIPLINE",
    rarity: "UNCOMMON",
    ruleKey: "ACTIVE_TIME_WINDOW",
    ruleConfig: { windowDays: 21, activeDays: 14, minMinutes: 480, minOutputs: 6 },
    sortOrder: 120,
  },
  {
    code: "DISCIPLINE_03_WITHIN_HUMAN_POWER",
    slug: "trong-kha-nang-cua-loai-nguoi",
    name: "Nếu nỗ lực nằm trong khả năng của loài người…",
    description:
      "Hai mươi lăm ngày học thật, hai mươi giờ, mười hai đề và sáu phiên chữa bài. Đây là trụ Kỷ luật của điều kiện dự Nguyệt Thí.",
    quoteKind: "ADAPTED",
    quoteSource: "Phỏng theo Marcus Aurelius",
    quoteSourceUrl:
      "https://chunghiakhacky.org/ngay-6-thang-8-luon-co-nhieu-co-hoi-hon-ban-nghi/",
    category: "DISCIPLINE",
    rarity: "RARE",
    ruleKey: "ACTIVE_TIME_WINDOW",
    ruleConfig: {
      windowDays: 35,
      activeDays: 25,
      minMinutes: 1200,
      minDistinctExercises: 12,
      minFeynmanReviews: 6,
    },
    sortOrder: 130,
  },
  {
    code: "DISCIPLINE_04_LIVE_WELL_ANYWHERE",
    slug: "noi-nao-cung-song-tot",
    name: "Bất cứ nơi nào có thể tồn tại, nơi đó có thể sống tốt",
    description:
      "Sáu mươi ngày học thật trong ba tháng, bốn mươi lăm giờ, hai mươi đề khác nhau.",
    quoteKind: "EXACT",
    quoteSource: "Marcus Aurelius · Meditations 5.16",
    quoteSourceUrl:
      "https://chunghiakhacky.org/ngay-7-thang-8-song-thuc-dung-va-co-nguyen-tac/",
    category: "DISCIPLINE",
    rarity: "EPIC",
    ruleKey: "ACTIVE_TIME_WINDOW",
    ruleConfig: {
      windowDays: 90,
      activeDays: 60,
      minMinutes: 2700,
      minDistinctExercises: 20,
    },
    sortOrder: 140,
  },

  /* ===== Nhóm Tổng hợp ===== */
  {
    code: "COMPOSITE_01_EAST_WIND",
    slug: "chi-khiem-dong-phong",
    name: "Vạn sự cụ bị, chỉ khiếm đông phong",
    description:
      "Bạn đã có hai trong ba trụ, trụ còn lại đã đi được hơn 80%. Đông phong đã ở rất gần.",
    quoteKind: "EXACT",
    quoteSource: "Tam Quốc Diễn Nghĩa · hồi 49",
    quoteSourceUrl: "https://oldwlps.kl.edu.tw/idiom/10125",
    category: "COMPOSITE",
    rarity: "RARE",
    ruleKey: "NEAR_COMPOSITE",
    ruleConfig: {
      pillars: [
        "PRACTICE_02_LEARN_THE_WAY",
        "FEYNMAN_02_READ_CAREFULLY",
        "DISCIPLINE_03_WITHIN_HUMAN_POWER",
      ],
      earnedPillars: 2,
      remainingPercent: 80,
    },
    sortOrder: 150,
  },
  {
    code: "COMPOSITE_02_THREE_PILLARS",
    slug: "nhan-thuc-hanh-dong-y-chi",
    name: "Nhận thức — Hành động — Ý chí",
    description:
      "Bạn đã có đủ năng lực, chiều sâu và kỷ luật để bước vào Nguyệt Thí.",
    quoteKind: "ADAPTED",
    quoteSource: "Phỏng theo Marcus Aurelius",
    quoteSourceUrl: "https://chunghiakhacky.org/ngay-4-thang-1-ba-dieu-lon-nhat/",
    category: "COMPOSITE",
    rarity: "EPIC",
    ruleKey: "COMPOSITE_TITLES",
    ruleConfig: {
      pillars: [
        "PRACTICE_02_LEARN_THE_WAY",
        "FEYNMAN_02_READ_CAREFULLY",
        "DISCIPLINE_03_WITHIN_HUMAN_POWER",
      ],
    },
    sortOrder: 160,
  },

  /* ===== Nhóm Chuyển hóa ===== */
  {
    code: "TRANSFORM_01_LOW_WARNING",
    slug: "ha-nhan-canh-tinh",
    name: "Ngươi chỉ là một kẻ hạ nhân, sao xứng đáng làm Hoàng đế?",
    description:
      "Một lời cảnh tỉnh riêng tư, chỉ mình bạn thấy. Đây không phải bản án về năng lực của bạn — nó tồn tại để bạn có cái mà vượt qua.",
    quoteKind: "ORIGINAL",
    quoteSource: "Thông điệp của Wobridges",
    category: "TRANSFORMATION",
    rarity: "PRIVATE",
    visibility: "PRIVATE_ONLY",
    ruleKey: "RECOVERY_CHAIN",
    ruleConfig: { phase: "LOW", fullTests: 3, belowBand: 3.0, windowDays: 30 },
    sortOrder: 170,
  },
  {
    code: "TRANSFORM_02_RISE",
    slug: "anh-hung-mot-gioi",
    name: "Ta là anh hùng một giới, sao lại không thể làm đế vương?",
    description:
      "Từ đáy vực đi lên: hai bài Full Test liên tiếp đạt từ 7.0 sau giai đoạn sa sút. Phân cửu tất hợp.",
    quoteKind: "ORIGINAL",
    quoteSource: "Thông điệp của Wobridges",
    category: "TRANSFORMATION",
    rarity: "EPIC",
    ruleKey: "RECOVERY_CHAIN",
    ruleConfig: { phase: "RISE", fullTests: 2, minBand: 7.0, noBandBelow: 6.0, windowDays: 60 },
    sortOrder: 180,
  },
];

/** Ba trụ của điều kiện dự Nguyệt Thí. */
export const PILLAR_CODES = [
  "PRACTICE_02_LEARN_THE_WAY",
  "FEYNMAN_02_READ_CAREFULLY",
  "DISCIPLINE_03_WITHIN_HUMAN_POWER",
] as const;

export const ENTRY_TITLE_CODE = "COMPOSITE_02_THREE_PILLARS";

export const RARITY_LABELS: Record<Rarity, string> = {
  COMMON: "Phổ thông",
  UNCOMMON: "Không phổ biến",
  RARE: "Hiếm",
  EPIC: "Sử thi",
  LEGENDARY: "Huyền thoại",
  PRIVATE: "Riêng tư",
};

export const CATEGORY_LABELS: Record<TitleCategory, string> = {
  PRACTICE: "Giải đề",
  FEYNMAN: "Sửa đề",
  DISCIPLINE: "Kỷ luật",
  COMPOSITE: "Tổng hợp",
  TRANSFORMATION: "Chuyển hóa",
};

/** Cách ghi nguồn cho đúng loại — không bao giờ để câu tự viết trông như trích dẫn. */
export function quoteAttribution(seed: {
  quoteKind: QuoteKind;
  quoteSource?: string | null;
}): string {
  if (!seed.quoteSource) return "";
  switch (seed.quoteKind) {
    case "EXACT":
      return `Nguồn: ${seed.quoteSource}`;
    case "ADAPTED":
      return seed.quoteSource.startsWith("Phỏng theo")
        ? seed.quoteSource
        : `Phỏng theo ${seed.quoteSource}`;
    case "ORIGINAL":
      return seed.quoteSource;
  }
}
