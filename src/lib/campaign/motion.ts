/**
 * Quyết định chuyển động của bản đồ 2.5D — hàm thuần, kiểm thử được.
 *
 * VÌ SAO TÁCH RA: `prefers-reduced-motion` không ép được từ công cụ kiểm thử
 * trình duyệt đang dùng, nên nếu để logic này nằm rải trong component thì
 * ràng buộc §7.3 chỉ được kiểm bằng cách đọc mã và tin. Tách thành hàm thuần
 * là cách duy nhất có phép thử canh thật.
 *
 * Nguyên tắc: người bật giảm chuyển động không nên phải chọn giữa "dùng được"
 * và "chóng mặt". Bản đồ vẫn phải đọc được đầy đủ, chỉ là đứng yên.
 */

/** Độ nghiêng mặc định của mặt đất. Mọi phép xoay ngược bám số này. */
export const DEFAULT_TILT = 52;

/**
 * Nghiêng nhẹ hơn hẳn khi giảm chuyển động.
 *
 * Không đưa về 0: mất hẳn chiều sâu thì cột cờ và nhân vật chồng lên nhau,
 * bản đồ khó đọc hơn chứ không dễ hơn. 28 độ đủ để phân tầng mà không tạo
 * cảm giác không gian mạnh.
 */
export const REDUCED_TILT = 28;

export type MotionSettings = {
  /** Góc nghiêng mặt đất, tính bằng độ. */
  tilt: number;
  /** Góc xoay ngược để nhãn và nhân vật đứng thẳng. Luôn là số đối của tilt. */
  counterTilt: number;
  /** Giá trị CSS transition, hoặc "none". */
  transition: string;
  /** Rê chuột có làm nghiêng bản đồ không. */
  parallax: boolean;
};

const MOVE_EASING = "cubic-bezier(.5,.05,.2,1)";

export function motionSettings(reduced: boolean): MotionSettings {
  const tilt = reduced ? REDUCED_TILT : DEFAULT_TILT;
  return {
    tilt,
    counterTilt: -tilt,
    transition: reduced ? "none" : `transform .3s ease-out`,
    parallax: !reduced,
  };
}

/** Transition cho nhân vật và bóng khi đi giữa các cửa ải. */
export function heroTransition(reduced: boolean): string {
  return reduced
    ? "none"
    : `left 1.1s ${MOVE_EASING}, top 1.1s ${MOVE_EASING}`;
}

/**
 * Góc nghiêng sau khi rê chuột.
 *
 * Trả về góc gốc khi đang giảm chuyển động — nghĩa là con trỏ không làm gì cả,
 * chứ không phải "nghiêng ít hơn".
 */
export function tiltFromPointer(
  reduced: boolean,
  /** Vị trí con trỏ trong khung, đã chuẩn hóa về khoảng -0.5 tới 0.5. */
  offset: { x: number; y: number },
): { x: number; z: number } {
  if (reduced) return { x: REDUCED_TILT, z: 0 };
  return {
    x: DEFAULT_TILT - offset.y * 8,
    z: offset.x * 6,
  };
}
