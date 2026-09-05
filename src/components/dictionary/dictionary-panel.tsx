"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Search, Volume2, X } from "lucide-react";
import styles from "./dictionary-panel.module.css";

type Sense = {
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
};

type Payload = {
  ok: boolean;
  error?: string;
  term?: string;
  phonetic?: string | null;
  audioUrl?: string | null;
  senses?: Sense[];
  synonyms?: string[];
  antonyms?: string[];
  attribution?: string;
  sourceUrl?: string | null;
  fromCache?: boolean;
};

/** Thông báo cho từng mã lỗi máy chủ trả về. Không hiện mã kỹ thuật cho học viên. */
const MESSAGES: Record<string, string> = {
  KHONG_TIM_THAY: "Không tìm thấy từ này. Kiểm tra lại chính tả giúp bạn nhé.",
  TU_KHONG_HOP_LE: "Hãy nhập một từ hoặc cụm ngắn (tối đa 3 từ).",
  TAM_THOI_KHONG_TRA_DUOC: "Từ điển đang bận. Thử lại sau ít phút nhé.",
  DANG_LAM_BAI: "Không tra từ trong lúc đang làm bài. Nộp bài xong bạn tra thoải mái.",
  QUA_NHIEU_LUOT: "Bạn tra hơi nhiều trong một giờ. Nghỉ một chút rồi tra tiếp nhé.",
  DICTIONARY_DISABLED: "Tính năng tra từ đang tạm tắt.",
  UNAUTHENTICATED: "Bạn cần đăng nhập để tra từ.",
  MANG_LOI: "Không kết nối được. Kiểm tra mạng rồi thử lại nhé.",
};

export function DictionaryPanel({ onClose }: { onClose: () => void }) {
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  // Mở bảng là con trỏ nhảy thẳng vào ô nhập: người ta bấm nút tra từ nghĩa là
  // đã có sẵn từ muốn tra trong đầu, không nên bắt bấm thêm một lần nữa.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const value = term.trim();
    if (!value || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tu-dien?tu=${encodeURIComponent(value)}`);
      setData((await res.json()) as Payload);
    } catch {
      // Mất mạng giữa chừng cũng phải nói thành lời, không để bảng đứng im.
      setData({ ok: false, error: "MANG_LOI" });
    } finally {
      setLoading(false);
    }
  }

  const message = data && !data.ok ? MESSAGES[data.error ?? ""] ?? MESSAGES.TAM_THOI_KHONG_TRA_DUOC : null;

  return (
    <div className={styles.panel} role="dialog" aria-modal="false" aria-labelledby={titleId}>
      <div className={styles.head}>
        <p id={titleId} className={styles.title}>Tra từ</p>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Đóng bảng tra từ">
          <X size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      <form className={styles.form} onSubmit={search}>
        <label className={styles.srOnly} htmlFor={`${titleId}-input`}>
          Từ tiếng Anh cần tra
        </label>
        <input
          id={`${titleId}-input`}
          ref={inputRef}
          className={styles.input}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="ví dụ: resilience"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
        />
        <button type="submit" className={styles.submit} disabled={loading || !term.trim()}>
          {loading ? (
            <Loader2 size={18} strokeWidth={2} className={styles.spin} aria-hidden="true" />
          ) : (
            <Search size={18} strokeWidth={2} aria-hidden="true" />
          )}
          <span className={styles.srOnly}>Tra từ</span>
        </button>
      </form>

      {/* aria-live để trình đọc màn hình đọc kết quả mà không cần chuyển focus. */}
      <div className={styles.body} aria-live="polite">
        {message && <p className={styles.message}>{message}</p>}

        {data?.ok && (
          <article className={styles.result}>
            <header className={styles.resultHead}>
              <h3 className={styles.word}>{data.term}</h3>
              {data.phonetic && <span className={styles.phonetic}>{data.phonetic}</span>}
              {data.audioUrl && (
                <button
                  type="button"
                  className={styles.audio}
                  onClick={() => void new Audio(data.audioUrl!).play().catch(() => {})}
                  aria-label={`Nghe phát âm từ ${data.term}`}
                >
                  <Volume2 size={16} strokeWidth={1.8} aria-hidden="true" />
                </button>
              )}
            </header>

            <ol className={styles.senses}>
              {data.senses?.map((sense, index) => (
                <li key={index} className={styles.sense}>
                  {sense.partOfSpeech && <span className={styles.pos}>{sense.partOfSpeech}</span>}
                  <p className={styles.definition}>{sense.definition}</p>
                  {sense.example && <p className={styles.example}>“{sense.example}”</p>}
                </li>
              ))}
            </ol>

            {data.synonyms && data.synonyms.length > 0 && (
              <p className={styles.related}>
                <span className={styles.relatedLabel}>Đồng nghĩa</span> {data.synonyms.join(", ")}
              </p>
            )}
            {data.antonyms && data.antonyms.length > 0 && (
              <p className={styles.related}>
                <span className={styles.relatedLabel}>Trái nghĩa</span> {data.antonyms.join(", ")}
              </p>
            )}

            {/* Ghi công là điều kiện của giấy phép CC BY-SA, không phải phép lịch sự. */}
            <footer className={styles.credit}>
              {data.sourceUrl ? (
                <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {data.attribution}
                </a>
              ) : (
                <span>{data.attribution}</span>
              )}
            </footer>
          </article>
        )}

        {!data && !loading && (
          <p className={styles.hint}>
            Gõ một từ tiếng Anh rồi bấm Enter. Định nghĩa bằng tiếng Anh giúp bạn
            quen cách diễn đạt trong đề thi hơn là dịch sang tiếng Việt.
          </p>
        )}
      </div>
    </div>
  );
}
