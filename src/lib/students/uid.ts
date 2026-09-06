/**
 * Mã UID công khai của học viên — LUẬT THUẦN, không chạm database.
 *
 * Vì sao cần: hai học viên muốn tìm nhau hiện chỉ có tên và email. Tên thì
 * trùng, còn email là thông tin riêng — bảo người ta đưa email cho người lạ để
 * kết bạn là dạy họ một thói quen xấu. UID là một chuỗi vô nghĩa, đưa cho ai
 * cũng được, và lộ ra thì cũng không mở được gì.
 *
 * BẢNG CHỮ CÁI CỐ Ý THIẾU `0 1 I L O U`:
 *   - `0/O` và `1/I/L` là các cặp nhìn giống nhau; mã được đọc qua điện thoại
 *     và chép tay, nên hai ký tự trông giống nhau là hai lần gõ sai.
 *   - `U` bị bỏ để không vô tình ghép thành từ tục trong tiếng Anh.
 *
 * Vì bảng chữ cái không chứa cặp nhìn giống nhau nào, việc chuẩn hoá KHÔNG cần
 * đoán ý người gõ: chỉ cần viết hoa và bỏ dấu phân cách. Gõ sai thì trượt hẳn,
 * chứ không tra ra nhầm người — điều tệ hơn nhiều khi cái tra ra là một người
 * thật để nhắn tin.
 */

export const UID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export const UID_LENGTH = 8;
/** Chèn gạch nối sau ngần này ký tự khi hiển thị. */
const UID_GROUP = 4;

/** Không gian mã: 30^8 ≈ 656 tỉ, đủ để sinh ngẫu nhiên mà hiếm khi đụng. */
export const UID_SPACE = UID_ALPHABET.length ** UID_LENGTH;

/**
 * Chuẩn hoá chuỗi người dùng gõ về dạng lưu trong database.
 *
 * Nhận cả `k3m9-7qx2`, `K3M9 7QX2` và `K3M97QX2`. Trả về chuỗi rỗng nếu sau khi
 * bỏ ký tự phân cách mà còn ký tự ngoài bảng chữ cái — gọi là "không phải UID"
 * chứ không cố sửa hộ.
 */
export function normalizeUid(raw: string): string {
  const compact = (raw ?? "")
    .toUpperCase()
    .replace(/[\s\-_.]/g, "");
  if (compact.length !== UID_LENGTH) return "";
  for (const char of compact) {
    if (!UID_ALPHABET.includes(char)) return "";
  }
  return compact;
}

/** Chuỗi này có hình dạng của một UID hay không. */
export function isUidLike(raw: string): boolean {
  return normalizeUid(raw) !== "";
}

/** Dạng để hiển thị và đọc cho nhau nghe: `K3M9-7QX2`. */
export function formatUid(stored: string | null | undefined): string {
  const normalized = normalizeUid(stored ?? "");
  if (!normalized) return "";
  return `${normalized.slice(0, UID_GROUP)}-${normalized.slice(UID_GROUP)}`;
}

/**
 * Sinh một mã mới.
 *
 * `randomInt` phải là nguồn NGẪU NHIÊN THẬT (`crypto`), không phải `Math.random`.
 * Mã đoán được nghĩa là dò được ra tài khoản người khác để nhắn tin — nhận
 * nguồn ngẫu nhiên từ bên ngoài để chỗ gọi tự chịu trách nhiệm và để kiểm thử
 * bơm được dãy số cố định.
 */
export function generateUid(randomInt: (maxExclusive: number) => number): string {
  let out = "";
  for (let i = 0; i < UID_LENGTH; i++) {
    out += UID_ALPHABET[randomInt(UID_ALPHABET.length)];
  }
  return out;
}
