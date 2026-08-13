/**
 * Định dạng chữ cho Nghị Sự Đường — HÀM THUẦN, không chạm database.
 *
 * VÌ SAO KHÔNG DÙNG TRÌNH SOẠN THẢO HTML:
 *
 * Cách thông thường là cho người dùng gõ vào một vùng `contenteditable` rồi lưu
 * HTML họ tạo ra. Làm vậy thì phải khử độc HTML trước khi hiện lại, và mọi bộ
 * khử độc đều là một cuộc chạy đua — sót một lần là lưu vĩnh viễn thứ độc hại
 * vào database, hiện cho mọi học viên.
 *
 * Ở đây chỉ lưu **văn bản thuần** với vài dấu quy ước, rồi dựng thành các phần
 * tử React ở lúc hiện. React tự thoát chuỗi cho mọi nút chữ, nên thứ duy nhất
 * thành thẻ HTML là thẻ do CHÍNH mã này tạo ra: `<strong>`, `<em>`, `<u>`,
 * `<ul>`, `<li>`. Người dùng không có đường nào chèn thẻ của họ vào.
 *
 * Hệ quả: `dangerouslySetInnerHTML` KHÔNG được xuất hiện ở bất cứ đâu trong
 * luồng diễn đàn. Đổi điều đó là mở lại đúng cái cửa này.
 *
 * Bốn dấu quy ước:
 *   **đậm**        → in đậm
 *   *nghiêng*      → in nghiêng
 *   __gạch chân__  → gạch chân
 *   - đầu dòng     → gạch đầu dòng
 */

export type InlineSpan = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

export type MarkupBlock =
  | { type: "para"; spans: InlineSpan[] }
  | { type: "list"; items: InlineSpan[][] };

/** Ba dấu, xét theo đúng thứ tự này. */
const MARKERS = [
  { open: "**", style: "bold" as const },
  { open: "__", style: "underline" as const },
  { open: "*", style: "italic" as const },
];

/**
 * Tách một dòng thành các đoạn chữ có kiểu.
 *
 * Chỉ coi là dấu định dạng khi TÌM ĐƯỢC dấu đóng tương ứng trên cùng dòng.
 * Thiếu dấu đóng thì để nguyên như chữ thường — nếu không, một dấu sao lạc
 * giữa bài sẽ bôi đậm toàn bộ phần còn lại, và người viết không hiểu vì sao.
 *
 * `**` xét trước `*` là bắt buộc: xét ngược lại thì `**đậm**` bị đọc thành một
 * cặp nghiêng rỗng rồi hỏng cả phần sau.
 */
function parseInline(
  line: string,
  active: Omit<InlineSpan, "text"> = {}
): InlineSpan[] {
  for (const marker of MARKERS) {
    const start = line.indexOf(marker.open);
    if (start === -1) continue;

    const from = start + marker.open.length;
    const end = line.indexOf(marker.open, from);
    // Dấu đóng phải cách dấu mở ít nhất một ký tự: `****` không phải là gì cả.
    if (end === -1 || end === from) continue;

    const before = line.slice(0, start);
    const inner = line.slice(from, end);
    const after = line.slice(end + marker.open.length);

    return [
      ...(before ? parseInline(before, active) : []),
      ...parseInline(inner, { ...active, [marker.style]: true }),
      ...(after ? parseInline(after, active) : []),
    ];
  }

  return line ? [{ text: line, ...active }] : [];
}

/**
 * Tách nội dung thành các khối để hiện.
 *
 * Dòng bắt đầu bằng `- ` hoặc `* ` là một mục gạch đầu dòng. Các dòng gạch đầu
 * dòng liền nhau gộp thành MỘT danh sách — tách ra thành nhiều danh sách một
 * mục sẽ hiện ra khoảng cách rời rạc rất xấu.
 *
 * Dòng trống giữ nguyên thành đoạn rỗng để người viết ngắt ý được.
 */
export function parseMarkup(text: string): MarkupBlock[] {
  const blocks: MarkupBlock[] = [];
  let list: InlineSpan[][] | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);

    if (bullet) {
      const item = parseInline(bullet[1]);
      if (list) list.push(item);
      else {
        list = [item];
        blocks.push({ type: "list", items: list });
      }
      continue;
    }

    list = null;
    blocks.push({ type: "para", spans: parseInline(line) });
  }

  return blocks;
}

/**
 * Bọc phần chữ đang chọn bằng một cặp dấu, hoặc mở sẵn cặp dấu rỗng.
 *
 * Bấm lại đúng nút khi phần chọn đã có dấu đó thì GỠ dấu ra. Thiếu điều này
 * thì không có cách nào bỏ in đậm ngoài việc xóa tay hai dấu sao — và người
 * dùng sẽ xóa nhầm chữ.
 *
 * Trả về cả vị trí con trỏ mới để ô nhập đặt lại đúng chỗ; không thì con trỏ
 * nhảy về cuối bài sau mỗi lần bấm.
 */
export function toggleWrap(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  marker: string
): { value: string; selectionStart: number; selectionEnd: number } {
  const before = value.slice(0, selectionStart);
  const selected = value.slice(selectionStart, selectionEnd);
  const after = value.slice(selectionEnd);

  // Đã bọc sẵn -> gỡ ra.
  if (
    before.endsWith(marker) &&
    after.startsWith(marker) &&
    selected.length > 0
  ) {
    return {
      value:
        before.slice(0, -marker.length) + selected + after.slice(marker.length),
      selectionStart: selectionStart - marker.length,
      selectionEnd: selectionEnd - marker.length,
    };
  }

  return {
    value: `${before}${marker}${selected}${marker}${after}`,
    selectionStart: selectionStart + marker.length,
    selectionEnd: selectionEnd + marker.length,
  };
}

/**
 * Thêm hoặc bỏ gạch đầu dòng cho các dòng đang chọn.
 *
 * Làm theo DÒNG chứ không theo phần chọn: người dùng hiếm khi bôi trọn vẹn từ
 * đầu dòng tới cuối dòng, và một dấu gạch đặt giữa dòng thì không thành danh
 * sách mà chỉ thành một dấu trừ lạc lõng.
 */
export function toggleBullet(
  value: string,
  selectionStart: number,
  selectionEnd: number
): { value: string; selectionStart: number; selectionEnd: number } {
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const lineEndIndex = value.indexOf("\n", selectionEnd);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;

  const target = value.slice(lineStart, lineEnd);
  const lines = target.split("\n");
  const allBulleted = lines.every((line) => /^\s*-\s+/.test(line) || !line.trim());

  const next = lines
    .map((line) => {
      if (!line.trim()) return line;
      return allBulleted ? line.replace(/^(\s*)-\s+/, "$1") : `- ${line}`;
    })
    .join("\n");

  const value2 = value.slice(0, lineStart) + next + value.slice(lineEnd);
  const shift = next.length - target.length;
  return {
    value: value2,
    selectionStart: lineStart,
    selectionEnd: Math.max(lineStart, selectionEnd + shift),
  };
}
