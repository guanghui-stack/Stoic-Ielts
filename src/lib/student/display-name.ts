/**
 * Tên hiển thị trên nút tài khoản ở đầu trang.
 *
 * Trước đây nút chỉ hiện ĐÚNG MỘT chữ cuối, nên "Đặng Quang Huy" thành "Huy" —
 * không đủ để người dùng nhận ra tài khoản của mình, nhất là khi nhiều học viên
 * trùng tên gọi.
 *
 * Giữ ba chữ CUỐI chứ không phải ba chữ đầu: tiếng Việt đặt họ trước, tên gọi
 * sau, nên cắt từ đầu sẽ vứt đi đúng phần dùng để gọi nhau.
 *
 * Có thêm trần ký tự vì trần số chữ một mình không đủ: ba chữ vẫn có thể rất
 * dài, và nút này nằm cùng hàng với logo nên không được phép đẩy giãn thanh
 * đầu trang.
 */

export const NAV_NAME_MAX_WORDS = 3;
export const NAV_NAME_MAX_CHARS = 18;

export function navDisplayName(
  name: string | null | undefined,
  fallback = "Học viên",
): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;

  const kept = words.slice(-NAV_NAME_MAX_WORDS);
  // Bỏ dần chữ từ phía họ cho tới khi vừa trần ký tự. Còn đúng một chữ mà vẫn
  // quá dài thì mới cắt giữa chữ đó.
  while (kept.length > 1 && kept.join(" ").length > NAV_NAME_MAX_CHARS) {
    kept.shift();
  }

  const short = kept.join(" ");
  if (short.length <= NAV_NAME_MAX_CHARS) return short;
  return short.slice(0, NAV_NAME_MAX_CHARS - 1).trimEnd() + "…";
}
