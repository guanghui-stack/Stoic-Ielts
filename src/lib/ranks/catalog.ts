import type { GeneralCode } from "@/lib/story/generals";

/**
 * Hệ chín cấp bậc và tám thí luyện.
 *
 * Catalog TypeScript là nguồn sự thật cho nội dung và ngưỡng; database chỉ
 * lưu bản đã seed để truy vấn và để chụp ảnh cấu hình tại thời điểm học viên
 * bắt đầu một thí luyện. Nhờ vậy sửa mô tả hay chỉnh ngưỡng cho tương lai
 * không làm thay đổi luật của một thí luyện ĐANG diễn ra — người đang đi nửa
 * đường không bị đổi luật giữa chừng.
 *
 * Sáu ràng buộc không được vi phạm khi sửa file này:
 *
 *  1. Cấp bậc chỉ TĂNG. Không có đường nào hạ cấp. Người ngừng học chuyển
 *     trạng thái "Nhàn cư" và giữ nguyên cấp bậc.
 *  2. Không thăng cấp tự động. Mỗi lần lên cấp bắt buộc có thao tác chủ động
 *     "Khởi thí luyện"; dữ liệu có trước thời điểm bắt đầu chỉ dùng để MỞ
 *     cửa ải, không dùng để vượt cửa ải.
 *  3. Không cửa ải nào được đòi hỏi mua hàng. Mọi điều kiện phục bàn đều
 *     chấp nhận TrialReflection miễn phí thay cho Feynman trả phí.
 *  4. Cấp bậc và Danh hiệu là hai trục độc lập. Danh hiệu không tự thăng cấp.
 *  5. Không XP, không cửa hàng đổi điểm, không trả tiền để mạnh hơn.
 *  6. Tên hiển thị phải dùng ngôn ngữ Stoic bằng tiếng Việt, không ký tự chữ Hán.
 */

export type RankEra = "LOAN_THE" | "QUAN_HUNG" | "TAM_PHAN";

export type RankDefinitionSeed = {
  level: number;
  code: string;
  slug: string;
  name: string;
  era: RankEra;
  /** Neo năng lực — mô tả band tương ứng, không phải điều kiện tự động. */
  bandAnchor: string;
  description: string;
};

/**
 * Ba thời đại. Chỉ là giọng kể và art direction; không tạo ra quyền lợi hay
 * ngưỡng chấm điểm khác nhau.
 */
export const RANK_ERAS: Record<RankEra, { name: string; meaning: string }> = {
  LOAN_THE: {
    name: "Bắt đầu",
    meaning: "Nhìn rõ điểm xuất phát và hình thành một nhịp học có thể giữ.",
  },
  QUAN_HUNG: {
    name: "Rèn luyện",
    meaning: "Làm đều, đối diện phần khó và điều chỉnh bằng bằng chứng.",
  },
  TAM_PHAN: {
    name: "Tích hợp",
    meaning: "Kết nối nhận thức, hành động và ý chí thành một hệ bền vững.",
  },
};

export const RANK_SEEDS: RankDefinitionSeed[] = [
  {
    level: 1,
    code: "RANK_01_BACH_THAN",
    slug: "bach-than",
    name: "Người bắt đầu",
    era: "LOAN_THE",
    bandAnchor: "Chưa có bài làm",
    description:
      "Chưa có bài làm được chấm. Đây không phải phán xét; đó chỉ là điểm xuất phát bình thường của mọi hành trình.",
  },
  {
    level: 2,
    code: "RANK_02_NGHIA_BINH",
    slug: "nghia-binh",
    name: "Người thực hành",
    era: "LOAN_THE",
    bandAnchor: "Hoàn tất bài đầu tiên",
    description:
      "Đã làm bài đầu tiên và tự nhìn lại bài của mình. Một bước nhỏ nhưng có thật: bạn đã bắt đầu bằng hành động.",
  },
  {
    level: 3,
    code: "RANK_03_THAP_TRUONG",
    slug: "thap-truong",
    name: "Giữ Nhịp",
    era: "LOAN_THE",
    bandAnchor: "Band 4.5 ổn định",
    description:
      "Giữ được band 4.5 qua nhiều bài khác nhau. Thói quen làm bài và nhìn lại đã bắt đầu thành nếp.",
  },
  {
    level: 4,
    code: "RANK_04_DO_BA",
    slug: "do-ba",
    name: "Rõ Ràng",
    era: "QUAN_HUNG",
    bandAnchor: "Band 5.0 - 5.5",
    description:
      "Đọc nhanh hơn và bắt đầu kiểm soát được đồng hồ. Tốc độ và độ chính xác được nhìn như hai dữ liệu cần cân bằng.",
  },
  {
    level: 5,
    code: "RANK_05_NHA_TUONG",
    slug: "nha-tuong",
    name: "Ổn Định",
    era: "QUAN_HUNG",
    bandAnchor: "Band 5.5 - 6.0",
    description:
      "Phong độ đã ổn định qua nhiều lượt liên tiếp. Không còn để một kết quả đơn lẻ quyết định cách nhìn về năng lực của mình.",
  },
  {
    level: 6,
    code: "RANK_06_HIEU_UY",
    slug: "hieu-uy",
    name: "Đối Diện",
    era: "QUAN_HUNG",
    bandAnchor: "Band 6.0 - 6.5",
    description:
      "Làm trọn Full Test mà không bỏ rơi phần yếu nhất. Biết quay lại với phần khó thay vì chỉ làm điều dễ chịu.",
  },
  {
    level: 7,
    code: "RANK_07_TRUNG_LANG_TUONG",
    slug: "trung-lang-tuong",
    name: "Phản Tư",
    era: "TAM_PHAN",
    bandAnchor: "Band 6.5 - 7.0",
    description:
      "Phản tư đã có chiều sâu và trải trên nhiều dạng câu. Hiểu vì sao mình sai, không chỉ biết mình sai.",
  },
  {
    level: 8,
    code: "RANK_08_TU_PHUONG_TUONG_QUAN",
    slug: "tu-phuong-tuong-quan",
    name: "Tích Hợp",
    era: "TAM_PHAN",
    bandAnchor: "Band 7.0 - 7.5",
    description:
      "Đủ cả ba trụ trong một hành trình dài. Nhận ra tiến bộ bền vững đến từ việc giữ hệ thống, không chỉ từ một điểm mạnh.",
  },
  {
    level: 9,
    code: "RANK_09_DAI_TUONG_QUAN",
    slug: "dai-tuong-quan",
    name: "Tự Chủ",
    era: "TAM_PHAN",
    bandAnchor: "Band 8.0 trở lên",
    description:
      "Đã sửa được chính điểm yếu dai dẳng nhất của mình. Không phải người không bao giờ sai, mà là người đã thôi sai theo cùng một kiểu.",
  },
];

/**
 * Bốn hiệu của bậc 8. Cùng cấp, cùng quyền lợi, khác đúng một chữ.
 *
 * Cố ý không tạo chênh lệch nào giữa bốn hiệu: đây là chỗ để người học tự
 * nhận một cái tên, không phải một nhánh nâng cấp để tối ưu.
 */
export const CARDINAL_TITLES = [
  { code: "TRAN_DONG", name: "Tập trung" },
  { code: "TRAN_TAY", name: "Bình thản" },
  { code: "TRAN_NAM", name: "Can đảm" },
  { code: "TRAN_BAC", name: "Công bằng" },
] as const;

export type CardinalTitleCode = (typeof CARDINAL_TITLES)[number]["code"];

/* ===================== Thí luyện ===================== */

/**
 * Khóa luật mở cửa ải. Gate trả lời "cửa này đã hiện ra chưa", và CHỈ dùng
 * dữ liệu có sẵn từ trước. Gate không bao giờ tự thăng cấp.
 */
export type GateRuleKey =
  | "NONE"
  | "DISTINCT_ATTEMPTS"
  | "ATTEMPTS_AND_REVIEWS"
  | "BAND_ATTEMPTS_IN_WINDOW"
  | "FULL_TESTS_COMPLETED"
  | "REVIEWS_ACROSS_TYPES"
  | "TITLE_OR_PILLARS"
  | "WEAKEST_TYPE_SAMPLE";

/**
 * Khóa luật vượt cửa ải. Success CHỈ tính sự kiện xảy ra SAU `startedAt`.
 * Đây là ranh giới quan trọng nhất của cả hệ: nó là thứ khiến thăng cấp là
 * một việc phải chủ động làm, không phải thứ tự rơi xuống đầu.
 */
export type SuccessRuleKey =
  | "GRADED_PLUS_REVIEW"
  | "DISTINCT_BAND_WITH_REVIEWS"
  | "TIMED_ACCURACY_RUN"
  | "CONSECUTIVE_BAND_STREAK"
  | "FULL_TEST_WITH_FLOOR"
  | "SPACED_DEEP_REVIEWS"
  | "COMPOSITE_CAMPAIGN"
  | "WEAKEST_TYPE_STREAK";

export type TrialDefinitionSeed = {
  code: string;
  slug: string;
  name: string;
  featuredGeneralCode: GeneralCode;
  fromLevel: number;
  toLevel: number;
  /** Năng lực mà chặng này thật sự đo. */
  skill: string;
  /** Điểm tựa Khắc kỷ hiển thị trên các bề mặt rebrand. */
  stoicAnchor: string;
  /** Vì sao chặng tồn tại — phải nói được hành vi học thật nào đang rèn. */
  rationale: string;
  /** Giọng kể cổ phong. Không đặt lời thoại giả vào miệng nhân vật. */
  narrative: string;
  gateRuleKey: GateRuleKey;
  gateConfig: Record<string, unknown>;
  successRuleKey: SuccessRuleKey;
  successConfig: Record<string, unknown>;
  retryUnlimited: boolean;
  /** Ước lượng thời gian, để người học biết mình đang cam kết điều gì. */
  estimate: string;
};

export const TRIAL_SEEDS: TrialDefinitionSeed[] = [
  {
    code: "TRIAL_01_DAO_VIEN",
    slug: "dao-vien-ket-nghia",
    name: "Chủ động bắt đầu",
    featuredGeneralCode: "TRUONG_PHI",
    fromLevel: 1,
    toLevel: 2,
    skill: "Bắt đầu có chủ đích và tự chữa bài lần đầu",
    stoicAnchor: "Chủ động trong điều có thể kiểm soát",
    rationale:
      "Mọi thực hành bắt đầu bằng việc phân biệt điều có thể kiểm soát. Chặng đầu không đòi hỏi một kết quả lớn, nhưng đòi hỏi người học thật sự bắt đầu và nhìn lại bằng chứng từ bài làm của mình.",
    narrative:
      "Không chờ động lực hoàn hảo. Một bài làm được bắt đầu và một lỗi được gọi đúng tên là lời cam kết đầu tiên với con đường của chính mình.",
    gateRuleKey: "NONE",
    gateConfig: {},
    successRuleKey: "GRADED_PLUS_REVIEW",
    successConfig: { attempts: 1, qualifiedReviews: 1 },
    retryUnlimited: true,
    estimate: "Khoảng 1 buổi học",
  },
  {
    code: "TRIAL_02_HOANG_CAN",
    slug: "truong-phi-pha-hoang-can",
    name: "Giữ nhịp đều đặn",
    featuredGeneralCode: "TRUONG_PHI",
    fromLevel: 2,
    toLevel: 3,
    skill: "Duy trì một nhịp học có thể lặp lại",
    stoicAnchor: "Kỷ luật của việc quay lại",
    rationale:
      "Chặng này đo tính bền chứ không đo một ngày bùng nổ. Nhiều bài đạt ngưỡng ổn định nói lên nhiều hơn một kết quả cao rồi biến mất khỏi bàn học trong nhiều tuần.",
    narrative:
      "Mỗi lần quay lại là một lựa chọn nhỏ nhưng có thật. Nhịp học bền không đến từ việc ép mình thắng một lần, mà từ việc giữ lời hẹn với ngày tiếp theo.",
    gateRuleKey: "DISTINCT_ATTEMPTS",
    gateConfig: { distinctExercises: 3 },
    successRuleKey: "DISTINCT_BAND_WITH_REVIEWS",
    successConfig: { distinctExercises: 5, minBand: 4.5, qualifiedReviews: 3 },
    retryUnlimited: true,
    estimate: "Khoảng 2 tuần",
  },
  {
    code: "TRIAL_03_HOA_HUNG",
    slug: "quan-vu-on-tuu-tram-hoa-hung",
    name: "Quản trị sự chú ý",
    featuredGeneralCode: "QUAN_VU",
    fromLevel: 3,
    toLevel: 4,
    skill: "Giữ tốc độ và độ chính xác trong giới hạn thời gian",
    stoicAnchor: "Tập trung vào bước kế tiếp",
    rationale:
      "Thời gian là một dữ kiện cần quản trị, không phải đối thủ để hoảng sợ. Chặng này buộc tốc độ đi cùng độ chính xác để người học phân biệt đọc nhanh có chủ đích với đoán vội.",
    narrative:
      "Khi sự chú ý có mặt trọn vẹn, việc khó được làm gọn mà không cần hấp tấp. Người học chỉ cần trở về với câu hỏi đang ở trước mắt.",
    gateRuleKey: "ATTEMPTS_AND_REVIEWS",
    gateConfig: { validAttempts: 5, qualifiedReviews: 3 },
    successRuleKey: "TIMED_ACCURACY_RUN",
    successConfig: {
      minQuestions: 13,
      maxMinutes: 15,
      minMinutes: 4,
      minAccuracy: 0.7,
    },
    retryUnlimited: true,
    estimate: "Một lượt làm bài đạt chuẩn",
  },
  {
    code: "TRIAL_04_NGU_QUAN",
    slug: "quan-vu-qua-ngu-quan",
    name: "Ổn định qua biến động",
    featuredGeneralCode: "QUAN_VU",
    fromLevel: 4,
    toLevel: 5,
    skill: "Giữ phong độ ổn định qua nhiều lượt liên tiếp",
    stoicAnchor: "Bình thản trước kết quả",
    rationale:
      "Ổn định không có nghĩa là lần nào cũng hoàn hảo. Đó là khả năng giữ một ngưỡng đáng tin qua nhiều lượt, không để một kết quả đơn lẻ quyết định cách nhìn về năng lực của mình.",
    narrative:
      "Điều nằm ngoài kiểm soát có thể đổi từ lượt này sang lượt khác. Điều người học giữ được là cách chuẩn bị, cách đọc dữ kiện và cách quay lại sau một lần chệch nhịp.",
    gateRuleKey: "BAND_ATTEMPTS_IN_WINDOW",
    gateConfig: { minBand: 5.5, count: 2, windowDays: 30 },
    successRuleKey: "CONSECUTIVE_BAND_STREAK",
    successConfig: {
      consecutive: 5,
      minBand: 5.5,
      windowDays: 14,
      graceTokenCode: "HOA_DUNG_DAO",
    },
    retryUnlimited: true,
    estimate: "Khoảng 2 tuần liên tục",
  },
  {
    code: "TRIAL_05_TRUONG_BAN",
    slug: "trieu-van-don-ky-cuu-chua",
    name: "Không bỏ rơi phần khó",
    featuredGeneralCode: "TRIEU_VAN",
    fromLevel: 5,
    toLevel: 6,
    skill: "Làm trọn Full Test và quay lại phần yếu nhất",
    stoicAnchor: "Can đảm nhìn vào phần yếu",
    rationale:
      "Một người học không chỉ chọn vùng mình đã giỏi. Sàn cho phần yếu nhất buộc ta phân bổ sự chú ý công bằng hơn và quay lại nơi đang cần hành động nhất.",
    narrative:
      "Phần khó không phải kẻ thù cần né tránh. Nó là nơi dữ liệu nói rõ nhất việc tiếp theo mà người học có thể làm.",
    gateRuleKey: "FULL_TESTS_COMPLETED",
    gateConfig: { count: 1 },
    successRuleKey: "FULL_TEST_WITH_FLOOR",
    successConfig: { minBand: 6.0, minWeakestPartAccuracy: 0.5 },
    retryUnlimited: true,
    estimate: "Một Full Test 60 phút",
  },
  {
    code: "TRIAL_06_LAO_TUONG",
    slug: "hoang-trung-lao-tuong-khai-cung",
    name: "Phản tư có chiều sâu",
    featuredGeneralCode: "HOANG_TRUNG",
    fromLevel: 6,
    toLevel: 7,
    skill: "Phản tư cách làm qua nhiều dạng câu",
    stoicAnchor: "Học từ điều đã xảy ra",
    rationale:
      "Khoảng cách giữa các lần chữa bài là có chủ đích. Nhiều ngày khác nhau giúp người học thật sự nhớ lại cách mình đã suy luận, thay vì chỉ đọc lại đáp án ngay sau khi vừa làm xong.",
    narrative:
      "Mỗi lần nhìn lại là một lần biến trải nghiệm thành hiểu biết. Sức bền của người học được tích lũy lặng lẽ qua những điều đã được gọi đúng tên.",
    gateRuleKey: "REVIEWS_ACROSS_TYPES",
    gateConfig: { qualifiedReviews: 5, distinctQuestionTypes: 2 },
    successRuleKey: "SPACED_DEEP_REVIEWS",
    successConfig: { deepReviews: 3, distinctQuestionTypes: 3, minDaysApart: 1 },
    retryUnlimited: true,
    estimate: "Ít nhất 3 ngày khác nhau",
  },
  {
    code: "TRIAL_07_TAY_LUONG",
    slug: "ma-sieu-thiet-ky-tay-luong",
    name: "Tích hợp ba trụ",
    featuredGeneralCode: "MA_SIEU",
    fromLevel: 7,
    toLevel: 8,
    skill: "Kết nối nhận thức, hành động và ý chí trong hành trình dài",
    stoicAnchor: "Nhận thức · Hành động · Ý chí",
    rationale:
      "Chặng dài nhất yêu cầu cả ba trụ cùng có mặt. Nhìn rõ mà không hành động, hành động mà không phản tư, hoặc có ý chí nhưng không điều chỉnh đều chưa tạo thành một hệ thống bền vững.",
    narrative:
      "Khi nhìn rõ, làm đúng và quay lại đủ lâu, năng lực không còn phụ thuộc vào một ngày thuận lợi. Ba trụ bắt đầu nâng đỡ lẫn nhau.",
    gateRuleKey: "TITLE_OR_PILLARS",
    gateConfig: { pillarsComplete: 2, remainingPillarPercent: 80 },
    successRuleKey: "COMPOSITE_CAMPAIGN",
    successConfig: {
      windowDays: 60,
      fullTestMinBand: 7.0,
      deepReviews: 10,
      studyDays: 25,
    },
    retryUnlimited: true,
    estimate: "Khoảng 60 ngày",
  },
  {
    code: "TRIAL_08_HO_LAO",
    slug: "lu-bo-ho-lao-quyet-chien",
    name: "Tự chủ trước điểm yếu",
    featuredGeneralCode: "LU_BO",
    fromLevel: 8,
    toLevel: 9,
    skill: "Sửa dứt điểm dạng câu yếu nhất của chính mình",
    stoicAnchor: "Tự chủ trước điều có thể sửa",
    rationale:
      "Tự chủ không có nghĩa là không bao giờ sai. Đó là khả năng chốt đúng điểm yếu, làm việc với nó đủ lâu và không lách sang một mục tiêu dễ chịu hơn khi tiến bộ trở nên khó.",
    narrative:
      "Đối diện điểm yếu là một hành động bình tĩnh. Mỗi lần sửa đúng cùng một kiểu sai, người học lấy lại một phần quyền chủ động của mình.",
    gateRuleKey: "WEAKEST_TYPE_SAMPLE",
    gateConfig: { minSamples: 20 },
    successRuleKey: "WEAKEST_TYPE_STREAK",
    successConfig: {
      correctStreak: 7,
      minDistinctExercises: 5,
      resetOnMiss: true,
    },
    retryUnlimited: true,
    estimate: "Tùy điểm yếu, thường vài tuần",
  },
];

/**
 * Khoảng Thở Có Kỷ Luật — một lần bảo toàn chuỗi, chỉ cho chặng Ổn định qua biến động.
 *
 * Ranh giới đã chốt: token NGĂN chuỗi bị đặt lại, nó KHÔNG biến một lượt
 * dưới ngưỡng thành lượt đạt. Nói cách khác nó tha thứ cho một ngày mất
 * phong độ, không tha thứ cho việc chưa đủ năng lực.
 */
export const GRACE_TOKEN = {
  code: "HOA_DUNG_DAO",
  name: "Khoảng Thở Có Kỷ Luật",
  appliesToTrialCode: "TRIAL_04_NGU_QUAN",
  maxAvailable: 1,
  cooldownDays: 30,
  description:
    "Một lần bảo toàn chuỗi sau một lượt dưới ngưỡng. Dùng xong phải chờ 30 ngày mới được cấp lại, và mọi lần sử dụng đều được ghi nhật ký.",
} as const;

/* ===================== Tra cứu ===================== */

export function rankByLevel(level: number): RankDefinitionSeed | undefined {
  return RANK_SEEDS.find((rank) => rank.level === level);
}

export function rankByCode(code: string): RankDefinitionSeed | undefined {
  return RANK_SEEDS.find((rank) => rank.code === code);
}

export function trialByCode(code: string): TrialDefinitionSeed | undefined {
  return TRIAL_SEEDS.find((trial) => trial.code === code);
}

/** Cửa ải đi ra từ một cấp bậc. Mỗi cấp có tối đa một cửa, trừ cấp 9. */
export function trialFromLevel(level: number): TrialDefinitionSeed | undefined {
  return TRIAL_SEEDS.find((trial) => trial.fromLevel === level);
}

export const MAX_RANK_LEVEL = 9;
export const FIRST_RANK_CODE = "RANK_01_BACH_THAN";
