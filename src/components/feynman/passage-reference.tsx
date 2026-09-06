"use client";

import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import type { ReadingPart } from "@/lib/exercise-content";

/**
 * Bài đọc của chính đề vừa làm, đặt cạnh khung chữa bài Feynman.
 *
 * VÌ SAO PHẢI CÓ: bước cốt lõi của Feynman là "chỉ ra câu nào trong bài chứng
 * minh đáp án". Trước đây trang chữa bài chỉ hiện câu hỏi và đáp án học viên đã
 * chọn, KHÔNG hiện bài đọc — nên ô "bằng chứng trong bài" và ô "đoạn số mấy"
 * bắt người ta viết theo trí nhớ. Việc đó vừa bất khả thi vừa dạy sai: Feynman
 * là quay lại tìm bằng chứng, không phải cố nhớ lại.
 *
 * CHỈ CÓ BÀI ĐỌC, KHÔNG CÓ ĐÁP ÁN. Đây là ranh giới cứng của trang chữa bài:
 * ở trạng thái DRAFT, đáp án đúng và lời giải mẫu không được nằm trong payload
 * gửi xuống trình duyệt. Bài đọc thì luôn an toàn — nó là đề thi, học viên vừa
 * đọc xong; `sanitizeReadingParts()` đã bóc hết đáp án trước khi tới đây.
 *
 * Nhãn đoạn (A. B. C.) LUÔN được bật, kể cả khi đề gốc không bật: ô nhập ngay
 * bên cạnh hỏi "bằng chứng nằm ở đoạn nào", và không đánh nhãn thì câu hỏi đó
 * không có cách nào trả lời.
 */
export function PassageReference({
  parts,
  initialPart = 0,
}: {
  parts: ReadingPart[];
  /** Mở sẵn part chứa câu đầu tiên đang được chữa. */
  initialPart?: number;
}) {
  const safeInitial = initialPart >= 0 && initialPart < parts.length ? initialPart : 0;
  const [part, setPart] = useState(safeInitial);
  const [open, setOpen] = useState(true);

  if (parts.length === 0) {
    return (
      <aside className="rounded-stoic-lg border border-stoic-line bg-stoic-canvas p-5 text-sm leading-relaxed text-stoic-ink-muted">
        Không tải được bài đọc của đề này. Bạn vẫn chữa bài được, nhưng nên mở
        thêm trang kết quả ở một tab khác để đối chiếu.
      </aside>
    );
  }

  return (
    <aside
      className="rounded-stoic-lg border border-stoic-line bg-stoic-canvas shadow-stoic-1"
      aria-label="Bài đọc của đề vừa làm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-stoic-line px-5 py-3.5">
        <p className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-stoic-primary-deep">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Bài đọc để đối chiếu
        </p>
        {/*
          Nút thu gọn chỉ có ích trên màn hình hẹp — ở đó bài đọc nằm TRÊN khung
          chữa bài và đẩy nó xuống rất xa. Trên màn rộng, bài đọc nằm ở cột riêng
          nên không che gì, và nút bị ẩn đi.
        */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-stoic-pill px-3 py-1.5 text-xs font-semibold text-stoic-ink-secondary transition-colors hover:bg-stoic-canvas-soft xl:hidden"
        >
          {open ? "Thu gọn" : "Mở bài đọc"}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/*
        Trạng thái thu gọn dùng CLASS chứ không dùng thuộc tính `hidden`.
        `hidden` là display:none của trình duyệt, và một lớp responsive thường
        không đè được nó — hậu quả: thu gọn ở màn hẹp rồi phóng to thì bài đọc
        biến mất hẳn, mà nút mở lại đã bị ẩn ở khổ đó. Cặp `hidden xl:block`
        đè đúng theo breakpoint, và ở `xl` thì không bao giờ đóng.
      */}
      <div className={open ? undefined : "hidden xl:block"}>
        {parts.length > 1 && (
          <div
            role="tablist"
            aria-label="Chọn part để đọc"
            className="flex flex-wrap gap-1 border-b border-stoic-line bg-stoic-canvas-soft px-3 py-2"
          >
            {parts.map((item, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={index === part}
                onClick={() => setPart(index)}
                className={`min-h-9 rounded-stoic-pill px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  index === part
                    ? "bg-stoic-canvas text-stoic-primary-deep shadow-stoic-1"
                    : "text-stoic-ink-muted hover:bg-stoic-canvas/70 hover:text-stoic-primary-deep"
                }`}
              >
                Part {index + 1}
              </button>
            ))}
          </div>
        )}

        {parts.map((item, index) => (
          <div
            key={index}
            hidden={index !== part}
            className="max-h-[26rem] overflow-y-auto px-5 py-5 xl:max-h-[calc(100vh-11rem)]"
          >
            <h2 className="mb-4 text-center font-display text-lg font-bold text-navy-deep">
              {item.passage.title}
            </h2>
            {item.passage.paragraphs.map((paragraph, paragraphIndex) => (
              <p
                key={paragraphIndex}
                className="mb-4 text-[15px] leading-[1.75] text-ink last:mb-0"
              >
                <strong className="mr-1.5 text-stoic-primary-deep">
                  {String.fromCharCode(65 + paragraphIndex)}.
                </strong>
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
