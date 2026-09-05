import type { GeneralCode } from "@/lib/story/generals";

/**
 * Art manifest — nguồn sự thật duy nhất cho mọi tài sản thị giác STOIC · IELTS.
 *
 * Lý do gom về một chỗ: điểm lấy nét (focal) của một bức tranh chỉ đúng với
 * chính bức đó. Rải `object-position` khắp các component nghĩa là mỗi lần
 * thay ảnh phải đi sửa từng nơi, và chắc chắn sẽ sót một chỗ. Ở đây đổi ảnh
 * là đổi đúng một dòng.
 *
 * Ba ràng buộc production mà mọi asset phải giữ:
 *
 *  1. `containsText` luôn là false. Ảnh không được chứa chữ — không chữ AI
 *     sinh, không thư pháp, không ký tự chữ Hán, kể cả trong con dấu. Chữ
 *     nằm trong DOM để đọc được bằng trình đọc màn hình, dịch được, và tìm
 *     kiếm được. Kiểu dữ liệu ép cứng `false` nên không ai đặt nhầm được.
 *
 *  2. Đúng MỘT accent cho mỗi ảnh. Ảnh nhiều màu phép thuật là ảnh bị loại
 *     ở khâu duyệt, không phải thứ để sửa bằng CSS về sau.
 *
 *  3. `alt` mô tả nội dung tranh bằng tiếng Việt, đủ để người không nhìn
 *     thấy ảnh vẫn hình dung được cảnh. Ảnh thuần trang trí thì để chuỗi
 *     rỗng — mô tả một hình nền vô nghĩa chỉ làm ồn trình đọc màn hình.
 *
 * Trạng thái: bộ SVG Stoic deterministic đã có file; key legacy được giữ để không đổi component consumer.
 * Các key bản đồ và thử thách vẫn được giữ vì component consumer dùng chúng,
 * nhưng src hiện trỏ tới SVG Stoic deterministic đã có trong `public/art/stoic`.
 *
 * Chân dung Lục tướng để 16:9 chứ không phải 4:5 như bản đặc tả: ảnh gốc do chủ
 * dự án cung cấp là cảnh hành động ngang, nhân vật lệch phải và chừa sẵn khoảng
 * trống bên trái. Trường `ratio` chỉ là siêu dữ liệu — `InkWashArt` dựng bằng
 * `fill` + `object-cover` nên khung do container quyết định, đổi số này không
 * làm dịch bố cục.
 */

export type ArtRatio = "16:9" | "21:9" | "4:5" | "1:1";

export type ArtAccent =
  | "BLUE"
  | "VERMILION"
  | "GOLD"
  | "JADE"
  | "SILVER_BLUE"
  | "FIRE"
  | "ASH"
  | "INK";

export type ArtAsset = {
  src: string;
  /** Tiếng Việt. Chuỗi rỗng nếu ảnh thuần trang trí. */
  alt: string;
  ratio: ArtRatio;
  /** Điểm lấy nét theo phần trăm, để crop mobile không cắt mất chủ thể. */
  focal: { x: number; y: number };
  accent: ArtAccent;
  featuredGeneralCode?: GeneralCode;
  /** Luôn false: ảnh production không bao giờ chứa chữ. */
  containsText: false;
  version: number;
};

export const ART_ASSETS = {
  /* ===== Trang chủ ===== */
  homeTrieuVan: {
    src: "/art/stoic/control-circle-hero.svg",
    alt: "Các vòng tròn mở tượng trưng cho sự tập trung và lựa chọn trong hành trình học",
    ratio: "16:9",
    focal: { x: 70, y: 46 },
    accent: "BLUE",
    featuredGeneralCode: "TRIEU_VAN",
    containsText: false,
    version: 1,
  },

  /* ===== Chân dung Lục tướng ===== */
  generalTruongPhi: {
    src: "/art/stoic/quiet-orbit.svg",
    alt: "Quỹ đạo yên tĩnh quanh một điểm tập trung",
    ratio: "16:9",
    focal: { x: 58, y: 46 },
    accent: "VERMILION",
    featuredGeneralCode: "TRUONG_PHI",
    containsText: false,
    version: 1,
  },
  generalQuanVu: {
    src: "/art/stoic/quiet-orbit.svg",
    alt: "Quỹ đạo yên tĩnh quanh một điểm tập trung",
    ratio: "16:9",
    focal: { x: 58, y: 46 },
    accent: "JADE",
    featuredGeneralCode: "QUAN_VU",
    containsText: false,
    version: 1,
  },
  generalTrieuVan: {
    src: "/art/stoic/quiet-orbit.svg",
    alt: "Quỹ đạo yên tĩnh quanh một điểm tập trung",
    ratio: "16:9",
    focal: { x: 58, y: 46 },
    accent: "BLUE",
    featuredGeneralCode: "TRIEU_VAN",
    containsText: false,
    version: 1,
  },
  generalHoangTrung: {
    src: "/art/stoic/quiet-orbit.svg",
    alt: "Quỹ đạo yên tĩnh quanh một điểm tập trung",
    ratio: "16:9",
    focal: { x: 58, y: 46 },
    accent: "GOLD",
    featuredGeneralCode: "HOANG_TRUNG",
    containsText: false,
    version: 1,
  },
  generalMaSieu: {
    src: "/art/stoic/quiet-orbit.svg",
    alt: "Quỹ đạo yên tĩnh quanh một điểm tập trung",
    ratio: "16:9",
    focal: { x: 58, y: 46 },
    accent: "SILVER_BLUE",
    featuredGeneralCode: "MA_SIEU",
    containsText: false,
    version: 1,
  },
  generalLuBo: {
    src: "/art/stoic/quiet-orbit.svg",
    alt: "Quỹ đạo yên tĩnh quanh một điểm tập trung",
    ratio: "16:9",
    focal: { x: 58, y: 46 },
    accent: "FIRE",
    featuredGeneralCode: "LU_BO",
    containsText: false,
    version: 1,
  },

  territoryBase: {
    src: "/art/stoic/three-virtues.svg",
    alt: "",
    ratio: "16:9",
    focal: { x: 50, y: 50 },
    accent: "INK",
    containsText: false,
    version: 1,
  },
  territoryWei: {
    src: "/art/stoic/three-virtues.svg",
    alt: "",
    ratio: "16:9",
    focal: { x: 50, y: 50 },
    accent: "SILVER_BLUE",
    containsText: false,
    version: 1,
  },
  territoryShu: {
    src: "/art/stoic/three-virtues.svg",
    alt: "",
    ratio: "16:9",
    focal: { x: 50, y: 50 },
    accent: "GOLD",
    containsText: false,
    version: 1,
  },
  territoryWu: {
    src: "/art/stoic/three-virtues.svg",
    alt: "",
    ratio: "16:9",
    focal: { x: 50, y: 50 },
    accent: "JADE",
    containsText: false,
    version: 1,
  },

  /* ===== Bản đồ Chiến Dịch ===== */
  campaignMap: {
    src: "/art/stoic/three-virtues.svg",
    alt: "",
    ratio: "21:9",
    focal: { x: 50, y: 50 },
    accent: "INK",
    containsText: false,
    version: 1,
  },

  /* ===== Tám cửa ải ===== */
  trialDaoVien: {
    src: "/art/stoic/three-virtues.svg",
    alt: "Ba quỹ đạo gặp nhau tạo thành một hệ cân bằng",
    ratio: "16:9",
    focal: { x: 50, y: 50 },
    accent: "VERMILION",
    featuredGeneralCode: "TRUONG_PHI",
    containsText: false,
    version: 1,
  },
  trialHoangCan: {
    src: "/art/stoic/three-virtues.svg",
    alt: "Ba quỹ đạo gặp nhau tạo thành một hệ cân bằng",
    ratio: "16:9",
    focal: { x: 55, y: 50 },
    accent: "GOLD",
    featuredGeneralCode: "TRUONG_PHI",
    containsText: false,
    version: 1,
  },
  trialHoaHung: {
    src: "/art/stoic/three-virtues.svg",
    alt: "Ba quỹ đạo gặp nhau tạo thành một hệ cân bằng",
    ratio: "16:9",
    focal: { x: 58, y: 48 },
    accent: "JADE",
    featuredGeneralCode: "QUAN_VU",
    containsText: false,
    version: 1,
  },
  trialNguQuan: {
    src: "/art/stoic/three-virtues.svg",
    alt: "Ba quỹ đạo gặp nhau tạo thành một hệ cân bằng",
    ratio: "16:9",
    focal: { x: 50, y: 52 },
    accent: "VERMILION",
    featuredGeneralCode: "QUAN_VU",
    containsText: false,
    version: 1,
  },
  trialTruongBan: {
    src: "/art/stoic/three-virtues.svg",
    alt: "Ba quỹ đạo gặp nhau tạo thành một hệ cân bằng",
    ratio: "16:9",
    focal: { x: 62, y: 48 },
    accent: "BLUE",
    featuredGeneralCode: "TRIEU_VAN",
    containsText: false,
    version: 1,
  },
  trialLaoTuong: {
    src: "/art/stoic/three-virtues.svg",
    alt: "Ba quỹ đạo gặp nhau tạo thành một hệ cân bằng",
    ratio: "16:9",
    focal: { x: 55, y: 45 },
    accent: "GOLD",
    featuredGeneralCode: "HOANG_TRUNG",
    containsText: false,
    version: 1,
  },
  trialTayLuong: {
    src: "/art/stoic/three-virtues.svg",
    alt: "Ba quỹ đạo gặp nhau tạo thành một hệ cân bằng",
    ratio: "16:9",
    focal: { x: 60, y: 50 },
    accent: "SILVER_BLUE",
    featuredGeneralCode: "MA_SIEU",
    containsText: false,
    version: 1,
  },
  trialHoLao: {
    src: "/art/stoic/three-virtues.svg",
    alt: "Ba quỹ đạo gặp nhau tạo thành một hệ cân bằng",
    ratio: "16:9",
    focal: { x: 61, y: 50 },
    accent: "FIRE",
    featuredGeneralCode: "LU_BO",
    containsText: false,
    version: 1,
  },
} satisfies Record<string, ArtAsset>;

export type ArtKey = keyof typeof ART_ASSETS;

export function artAsset(key: ArtKey): ArtAsset {
  return ART_ASSETS[key];
}

/**
 * Lớp Tailwind phủ mực theo accent, dùng khi chưa có file ảnh.
 *
 * Không phải để thay thế tranh thật, mà để một trang thiếu ảnh vẫn giữ đúng
 * ngôn ngữ thị giác và đúng màu module thay vì hiện ra một mảng trắng.
 */
export const ACCENT_WASH_CLASS: Record<ArtAccent, string> = {
  BLUE: "from-azure/25",
  VERMILION: "from-vermilion/25",
  GOLD: "from-gold/25",
  JADE: "from-jade/25",
  SILVER_BLUE: "from-silver-blue/25",
  FIRE: "from-fire/25",
  ASH: "from-ash/25",
  INK: "from-navy/20",
};
