import { parseMarkup, type InlineSpan } from "@/lib/forum/markup";

/**
 * Hiện nội dung người dùng viết.
 *
 * KHÔNG có `dangerouslySetInnerHTML` ở đây, và đừng bao giờ thêm vào. Mọi thẻ
 * xuất hiện trên màn hình đều do chính hàm này tạo; chữ của người dùng luôn đi
 * vào React dưới dạng nút chữ, nên nó tự được thoát. Đó là toàn bộ lý do định
 * dạng được lưu bằng dấu quy ước thay vì HTML.
 */
export function RichText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const blocks = parseMarkup(text);

  return (
    <div className={`break-words ${className}`}>
      {blocks.map((block, index) =>
        block.type === "list" ? (
          <ul key={index} className="my-2 list-disc space-y-1 pl-6">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <Spans spans={item} />
              </li>
            ))}
          </ul>
        ) : (
          // Dòng trống giữ lại chiều cao để người viết ngắt ý được — bỏ đi thì
          // mọi đoạn dính liền thành một khối chữ đặc.
          <p key={index} className={block.spans.length === 0 ? "h-4" : ""}>
            <Spans spans={block.spans} />
          </p>
        )
      )}
    </div>
  );
}

function Spans({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, index) => {
        let node: React.ReactNode = span.text;
        if (span.bold) node = <strong>{node}</strong>;
        if (span.italic) node = <em>{node}</em>;
        if (span.underline) node = <u>{node}</u>;
        return <span key={index}>{node}</span>;
      })}
    </>
  );
}
