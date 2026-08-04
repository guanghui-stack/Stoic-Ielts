import type { GeneralCode } from "@/lib/story/generals";

/**
 * Art manifest — nguồn sự thật duy nhất cho mọi ảnh thủy mặc.
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
 * Trạng thái hiện tại: CHƯA CÓ FILE ẢNH NÀO trong repo. Toàn bộ mục dưới
 * đây là hợp đồng đã chốt trước, chờ art đi qua pipeline duyệt thủ công.
 * Giao diện vì vậy phải chạy đúng khi không có ảnh — xem `InkWashHero`.
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
    src: "/art/home/trieu-van-hero.webp",
    alt: "Triệu Vân cưỡi ngựa lao qua chiến trường trong tranh thủy mặc, mũi giáo phát sáng lam",
    ratio: "16:9",
    focal: { x: 64, y: 47 },
    accent: "BLUE",
    featuredGeneralCode: "TRIEU_VAN",
    containsText: false,
    version: 1,
  },

  /* ===== Chân dung Lục tướng ===== */
  generalTruongPhi: {
    src: "/art/generals/truong-phi.webp",
    alt: "Trương Phi cầm xà mâu, thế đứng mở trận, mực chu sa nơi mũi giáo",
    ratio: "4:5",
    focal: { x: 50, y: 40 },
    accent: "VERMILION",
    featuredGeneralCode: "TRUONG_PHI",
    containsText: false,
    version: 1,
  },
  generalQuanVu: {
    src: "/art/generals/quan-vu.webp",
    alt: "Quan Vũ đứng thẳng với thanh long đao, ánh lục ngọc dọc lưỡi đao",
    ratio: "4:5",
    focal: { x: 50, y: 40 },
    accent: "JADE",
    featuredGeneralCode: "QUAN_VU",
    containsText: false,
    version: 1,
  },
  generalTrieuVan: {
    src: "/art/generals/trieu-van.webp",
    alt: "Triệu Vân trên ngựa trắng, giáo ánh lam điện, nét mực tĩnh giữa trận",
    ratio: "4:5",
    focal: { x: 50, y: 40 },
    accent: "BLUE",
    featuredGeneralCode: "TRIEU_VAN",
    containsText: false,
    version: 1,
  },
  generalHoangTrung: {
    src: "/art/generals/hoang-trung.webp",
    alt: "Hoàng Trung giương cung trên chiến mã, ánh kim đồng nơi dây cung",
    ratio: "4:5",
    focal: { x: 50, y: 40 },
    accent: "GOLD",
    featuredGeneralCode: "HOANG_TRUNG",
    containsText: false,
    version: 1,
  },
  generalMaSieu: {
    src: "/art/generals/ma-sieu.webp",
    alt: "Mã Siêu đột kích, ngọn thương tạo vòng sáng bạc lam",
    ratio: "4:5",
    focal: { x: 50, y: 40 },
    accent: "SILVER_BLUE",
    featuredGeneralCode: "MA_SIEU",
    containsText: false,
    version: 1,
  },
  generalLuBo: {
    src: "/art/generals/lu-bo.webp",
    alt: "Lữ Bố trên chiến mã, phương thiên họa kích phát sáng hỏa cam",
    ratio: "4:5",
    focal: { x: 50, y: 40 },
    accent: "FIRE",
    featuredGeneralCode: "LU_BO",
    containsText: false,
    version: 1,
  },

  /* ===== Bản đồ Chiến Dịch ===== */
  campaignMap: {
    src: "/art/campaign/map-loan-the-quan-hung-tam-phan.webp",
    alt: "",
    ratio: "21:9",
    focal: { x: 50, y: 50 },
    accent: "INK",
    containsText: false,
    version: 1,
  },

  /* ===== Tám cửa ải ===== */
  trialDaoVien: {
    src: "/art/trials/trial-01-dao-vien.webp",
    alt: "Hai bóng người dưới rừng đào, khí thế vừa khởi trong tranh thủy mặc",
    ratio: "16:9",
    focal: { x: 50, y: 50 },
    accent: "VERMILION",
    featuredGeneralCode: "TRUONG_PHI",
    containsText: false,
    version: 1,
  },
  trialHoangCan: {
    src: "/art/trials/trial-02-hoang-can.webp",
    alt: "Trương Phi xông qua rừng cờ trong mưa mực",
    ratio: "16:9",
    focal: { x: 55, y: 50 },
    accent: "GOLD",
    featuredGeneralCode: "TRUONG_PHI",
    containsText: false,
    version: 1,
  },
  trialHoaHung: {
    src: "/art/trials/trial-03-hoa-hung.webp",
    alt: "Quan Vũ lao nhanh, thanh đao phát sáng lục ngọc",
    ratio: "16:9",
    focal: { x: 58, y: 48 },
    accent: "JADE",
    featuredGeneralCode: "QUAN_VU",
    containsText: false,
    version: 1,
  },
  trialNguQuan: {
    src: "/art/trials/trial-04-ngu-quan.webp",
    alt: "Quan Vũ đi xuyên nhiều lớp cổng thành trong sương mực",
    ratio: "16:9",
    focal: { x: 50, y: 52 },
    accent: "VERMILION",
    featuredGeneralCode: "QUAN_VU",
    containsText: false,
    version: 1,
  },
  trialTruongBan: {
    src: "/art/trials/trial-05-truong-ban.webp",
    alt: "Triệu Vân trên ngựa trắng giữa vòng vây, giáo ánh lam điện",
    ratio: "16:9",
    focal: { x: 62, y: 48 },
    accent: "BLUE",
    featuredGeneralCode: "TRIEU_VAN",
    containsText: false,
    version: 1,
  },
  trialLaoTuong: {
    src: "/art/trials/trial-06-hoang-trung.webp",
    alt: "Hoàng Trung giương cung trên chiến mã, gió kéo áo choàng",
    ratio: "16:9",
    focal: { x: 55, y: 45 },
    accent: "GOLD",
    featuredGeneralCode: "HOANG_TRUNG",
    containsText: false,
    version: 1,
  },
  trialTayLuong: {
    src: "/art/trials/trial-07-ma-sieu.webp",
    alt: "Mã Siêu dẫn thiết kỵ đột kích, ngọn thương tạo vòng sáng bạc lam",
    ratio: "16:9",
    focal: { x: 60, y: 50 },
    accent: "SILVER_BLUE",
    featuredGeneralCode: "MA_SIEU",
    containsText: false,
    version: 1,
  },
  trialHoLao: {
    src: "/art/trials/trial-08-lu-bo.webp",
    alt: "Lữ Bố trấn cửa Hổ Lao, phương thiên họa kích phát sáng hỏa cam",
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
