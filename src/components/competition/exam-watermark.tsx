"use client";

import { useEffect, useState } from "react";

/**
 * Watermark lặp kín màn hình trong phòng thi.
 *
 * Không ngăn được ai chụp màn hình bằng điện thoại — không có gì ngăn được điều
 * đó. Mục đích khác: nếu một tấm ảnh đề thi xuất hiện ở đâu đó, watermark cho
 * biết nó chảy ra từ tài khoản nào và phiên thi nào.
 *
 * Chính vì vậy nó phải nằm ĐÈ LÊN nội dung và lặp kín màn hình, thay vì một
 * dòng nhỏ ở góc — cắt cúp ảnh sẽ bỏ được một góc, nhưng không bỏ được lớp phủ
 * toàn màn hình mà vẫn giữ được phần đề đọc được.
 *
 * Độ mờ giữ ở mức rất thấp để không cản việc đọc: bài thi đã đủ căng, không nên
 * thêm một lớp nhiễu thị giác lên trên.
 */
export function ExamWatermark({
  candidateCode,
  sessionSuffix,
}: {
  candidateCode: string;
  sessionSuffix: string;
}) {
  // Dấu thời gian và vị trí đổi mỗi 20 giây. Nhờ vậy hai tấm ảnh chụp cách nhau
  // vài phút có dấu khác nhau, thu hẹp được thời điểm rò rỉ.
  const [stamp, setStamp] = useState("");
  const [shift, setShift] = useState(0);

  useEffect(() => {
    // Đọc đồng hồ trong effect, không phải lúc render — render phải thuần.
    const tick = () => {
      setStamp(new Date().toLocaleTimeString("vi-VN"));
      setShift((v) => (v + 1) % 6);
    };
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, []);

  const label = `${candidateCode} · ${sessionSuffix}${stamp ? ` · ${stamp}` : ""}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[90] select-none overflow-hidden"
      style={{ opacity: 0.07 }}
    >
      <div
        className="grid h-[140%] w-[140%] -translate-x-[10%] -translate-y-[10%] grid-cols-3 content-start gap-x-16 gap-y-24"
        style={{ transform: `translate(${shift * 14}px, ${shift * 9}px) rotate(-22deg)` }}
      >
        {Array.from({ length: 36 }, (_, i) => (
          <span
            key={i}
            className="whitespace-nowrap font-ui text-[0.7rem] font-bold tracking-wide text-black"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
