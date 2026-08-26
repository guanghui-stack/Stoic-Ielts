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
  /** Năng lực mà cửa ải này thật sự đo. */
  skill: string;
  /** Vì sao cửa ải tồn tại — phải nói được hành vi học thật nào đang rèn. */
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
    name: "Đào viên kết nghĩa",
    featuredGeneralCode: "TRUONG_PHI",
    fromLevel: 1,
    toLevel: 2,
    skill: "Bắt đầu và tự chữa bài lần đầu",
    rationale:
      "Cửa đầu tiên cố tình dễ về ngưỡng nhưng không bỏ qua bước phục bàn. Người chỉ làm bài mà không bao giờ chữa lại sẽ lặp đúng một lỗi suốt nhiều tháng, nên thói quen chữa bài phải hình thành ngay từ bài đầu.",
    narrative:
      "Lấy cảm hứng từ điển tích kết nghĩa vườn đào: việc lớn bắt đầu bằng một lời hẹn giữ được, không bằng một trận thắng.",
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
    name: "Trương Phi phá Hoàng Cân",
    featuredGeneralCode: "TRUONG_PHI",
    fromLevel: 2,
    toLevel: 3,
    skill: "Giữ nhịp làm bài đều đặn",
    rationale:
      "Đo tính bền chứ không đo đỉnh cao. Năm bài khác nhau đều đạt band 4.5 nói lên nhiều hơn một bài 6.0 duy nhất rồi nghỉ hai tuần.",
    narrative:
      "Lấy cảm hứng từ điển tích dẹp loạn Khăn Vàng: đối thủ đông nhưng chưa mạnh, thứ cần là đánh liên tục chứ không phải một đòn quyết định.",
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
    name: "Quan Vũ ôn tửu trảm Hoa Hùng",
    featuredGeneralCode: "QUAN_VU",
    fromLevel: 3,
    toLevel: 4,
    skill: "Tốc độ đi cùng độ chính xác",
    rationale:
      "Cửa duy nhất ép cả hai chiều cùng lúc. Có sàn thời gian tối thiểu là cố ý: làm xong trong hai phút nghĩa là đoán bừa chứ không phải đọc nhanh, và hệ thống phải phân biệt được hai việc đó.",
    narrative:
      "Lấy cảm hứng từ điển tích chén rượu còn ấm: giá trị nằm ở chỗ việc khó được làm gọn, không ở chỗ làm vội.",
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
    name: "Quan Vũ quá ngũ quan",
    featuredGeneralCode: "QUAN_VU",
    fromLevel: 4,
    toLevel: 5,
    skill: "Ổn định phong độ qua nhiều lượt liên tiếp",
    rationale:
      "Đo độ ổn định, thứ mà điểm trung bình che giấu rất giỏi. Năm lượt liên tiếp không tụt dưới ngưỡng khó hơn nhiều so với năm lượt tốt nằm rải rác giữa những lượt hỏng.",
    narrative:
      "Lấy cảm hứng từ điển tích qua năm cửa ải: mỗi cửa là một lần phải giữ được đúng phong độ của cửa trước.",
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
    name: "Triệu Vân đơn kỵ cứu chúa",
    featuredGeneralCode: "TRIEU_VAN",
    fromLevel: 5,
    toLevel: 6,
    skill: "Làm trọn Full Test, không bỏ rơi phần yếu nhất",
    rationale:
      "Có sàn cho phần yếu nhất là điểm mấu chốt. Không có nó, người học sẽ tối ưu bằng cách dồn hết thời gian vào phần dễ và bỏ hẳn một phần, mà đề thi thật thì không cho phép làm vậy.",
    narrative:
      "Lấy cảm hứng từ điển tích một mình phá vòng vây để cứu người bị bỏ lại: phần khó nhất mới là phần phải quay lại đón.",
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
    name: "Hoàng Trung lão tướng khai cung",
    featuredGeneralCode: "HOANG_TRUNG",
    fromLevel: 6,
    toLevel: 7,
    skill: "Phản tư sâu, trải trên nhiều dạng câu",
    rationale:
      "Yêu cầu các lần chữa bài cách nhau ít nhất một ngày là có chủ đích. Ba bài chữa dồn trong một buổi là ba lần đọc lại; ba bài chữa cách ngày là ba lần thật sự nhớ lại, và chỉ cái sau mới đọng lại.",
    narrative:
      "Lấy cảm hứng từ điển tích lão tướng giương cung: sức bền tích lũy chậm nhưng không ai lấy đi được.",
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
    name: "Mã Siêu thiết kỵ Tây Lương",
    featuredGeneralCode: "MA_SIEU",
    fromLevel: 7,
    toLevel: 8,
    skill: "Tổng hợp cả ba trụ trong một chiến dịch dài",
    rationale:
      "Cửa dài nhất, và là cửa duy nhất bắt cả ba trụ cùng có mặt. Người mạnh một trụ mà bỏ hai trụ còn lại sẽ dừng ở đây, đúng như ngoài phòng thi thật.",
    narrative:
      "Lấy cảm hứng từ điển tích thiết kỵ Tây Lương: sức mạnh đến từ việc chuyển đội hình liên tục mà vẫn giữ được nhịp.",
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
    name: "Lữ Bố Hổ Lao quyết chiến",
    featuredGeneralCode: "LU_BO",
    fromLevel: 8,
    toLevel: 9,
    skill: "Sửa dứt điểm dạng câu yếu nhất của chính mình",
    rationale:
      "Cửa cuối không đo band mà đo một điểm yếu cụ thể. Dạng câu yếu nhất được chốt lại tại thời điểm bắt đầu và không đổi giữa chừng, nếu không người học có thể lách bằng cách để một dạng khác tụt xuống thấp hơn.",
    narrative:
      "Lấy cảm hứng từ điển tích quyết chiến ở cửa Hổ Lao: đối thủ cuối là phép thử xem thiên phú có đi cùng kỷ luật hay không.",
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
 * Hoa Dung đạo — một lần miễn trừ đứt chuỗi, chỉ cho thí luyện Quá ngũ quan.
 *
 * Ranh giới đã chốt: token NGĂN chuỗi bị đặt lại, nó KHÔNG biến một lượt
 * dưới ngưỡng thành lượt đạt. Nói cách khác nó tha thứ cho một ngày mất
 * phong độ, không tha thứ cho việc chưa đủ năng lực.
 */
export const GRACE_TOKEN = {
  code: "HOA_DUNG_DAO",
  name: "Hoa Dung đạo",
  appliesToTrialCode: "TRIAL_04_NGU_QUAN",
  maxAvailable: 1,
  cooldownDays: 30,
  description:
    "Một lần bỏ qua lượt làm dưới ngưỡng để chuỗi không bị đặt lại. Dùng xong phải chờ 30 ngày mới được cấp lại, và mọi lần dùng đều được ghi nhật ký.",
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
