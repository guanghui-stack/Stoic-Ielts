/**
 * Cấu hình tra từ điển — đọc biến môi trường, KHÔNG bao giờ trả khóa ra ngoài.
 *
 * Cùng quy tắc với Feynman AI: thiếu cấu hình thì nhà đó coi như không tồn tại,
 * chứ không phải "bật với giá trị lạ". Khóa chỉ được đọc tại đúng một nơi là
 * `providers.ts`, và không đi qua bất kỳ giá trị trả về nào của file này.
 *
 * Hai nhà miễn phí (Wiktionary, dictionaryapi.dev) không cần khóa nên luôn sẵn
 * sàng — tính năng chạy được ngay cả khi trung tâm chưa đăng ký gì.
 */
import "server-only";
import type { ProviderId } from "./lookup-rules.ts";

export type DictionaryConfig = {
  /** Tắt hẳn tính năng, kể cả hai nhà miễn phí. */
  enabled: boolean;
  /** Số lượt tra tối đa mỗi học viên mỗi giờ. */
  perUserPerHour: number;
};

export function readDictionaryConfig(): DictionaryConfig {
  // Mặc định BẬT, khác với Feynman AI: ở đây không có nhà nào tốn tiền trừ khi
  // quản trị viên tự thêm khóa, nên bật sẵn không tạo rủi ro hóa đơn.
  const enabled = process.env.DICTIONARY_ENABLED !== "false";

  const raw = Number.parseInt(process.env.DICTIONARY_PER_USER_PER_HOUR ?? "", 10);
  const perUserPerHour = Number.isFinite(raw) ? Math.min(600, Math.max(10, raw)) : 120;

  return { enabled, perUserPerHour };
}

/**
 * Nhà này đã có khóa chưa.
 *
 * Trả boolean chứ không trả khóa — nơi gọi chỉ cần biết có nên xếp nhà đó vào
 * chuỗi hay không. Oxford cần cả app id lẫn app key, thiếu một trong hai là
 * chưa dùng được.
 */
export function hasProviderKey(id: ProviderId): boolean {
  switch (id) {
    case "OXFORD":
      return Boolean(process.env.OXFORD_APP_ID && process.env.OXFORD_APP_KEY);
    case "STANDS4":
      return Boolean(process.env.STANDS4_UID && process.env.STANDS4_TOKEN);
    default:
      // Wiktionary và dictionaryapi.dev không cần khóa.
      return true;
  }
}
