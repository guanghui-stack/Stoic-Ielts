import type { GeneralCode } from "@/lib/story/generals";

/**
 * Ảnh cắt rời nền trong suốt của Lục tướng, dùng cho bản đồ 2.5D.
 *
 * Tách khỏi `art-manifest.ts` vì hai loại ảnh này có ràng buộc khác hẳn nhau.
 * Ảnh trong art manifest là tranh nền: có nền, có bố cục, `containsText: false`
 * là điều kiện đủ. Ảnh ở đây phải nền TRONG SUỐT, chân chạm đúng cạnh dưới, và
 * KHÔNG có bóng đổ nung sẵn — bóng do CSS vẽ và phải nằm bẹp trên mặt đất.
 *
 * Tướng nào chưa có ảnh thì để trống. Bản đồ tự thay bằng cờ hổ phù vẽ bằng
 * CSS và vẫn đọc được đầy đủ, nên không cần đủ sáu ảnh mới dùng được.
 */

export type HeroCutout = {
  src: string;
  alt: string;
  /**
   * Bề ngang hiển thị trên bản đồ, tính bằng pixel.
   *
   * Mỗi bức có tỷ lệ khác nhau tuỳ tư thế ngựa, nên chiều cao thực tế khác
   * nhau dù cùng bề ngang. Số này chỉnh bằng mắt cho nhân vật đứng cân xứng
   * với node, không suy ra từ kích thước file được.
   */
  width: number;
};

export const HERO_CUTOUTS: Partial<Record<GeneralCode, HeroCutout>> = {
  LU_BO: {
    src: "/art/heroes/hero-lu-bo.webp",
    alt: "Lữ Bố cưỡi Xích Thố, phương thiên họa kích bốc lửa",
    width: 190,
  },
};

export function heroCutoutFor(code: GeneralCode | undefined): HeroCutout | undefined {
  return code ? HERO_CUTOUTS[code] : undefined;
}
