import { RANK_ERAS, rankByLevel, type RankEra } from "@/lib/ranks/catalog";

/**
 * Huy hiệu chín bậc — ẤN TRIỆN.
 *
 * VÌ SAO LÀ CON DẤU, không phải khiên: bản đầu tôi vẽ khiên đáy nhọn, và chủ
 * dự án nhận ra ngay là lệch. Khiên đáy nhọn là hình huy hiệu **châu Âu** thời
 * trung cổ — đổi màu cách mấy cũng không cứu được đường viền.
 *
 * Thời Hán thì cấp bậc quan chức đọc được từ chính con dấu: chất liệu ấn và
 * màu dây thao đổi theo chức. Đây đúng nghĩa là vật dùng để phân cấp trong bối
 * cảnh Tam Quốc, chứ không phải một hình gợi nhớ mơ hồ.
 *
 * KHÁC HẲN huy hiệu cuộc thi ở `components/competition/badges.tsx`:
 *
 * | | Huy hiệu cấp bậc (file này) | Huy hiệu cuộc thi |
 * |---|---|---|
 * | Lấy bằng cách nào | Lên bậc qua quá trình luyện | **Đoạt giải** một kỳ thi |
 * | Ai cũng có thể có | Có, chỉ cần đủ kiên trì | Không, chỉ người thắng |
 * | Sống bao lâu | Vĩnh viễn theo bậc hiện tại | 30 ngày |
 *
 * Trộn hai loại là xoá mất ý nghĩa của loại thứ hai: một huy hiệu ai cũng có
 * thì không còn là phần thưởng.
 *
 * TUYỆT ĐỐI KHÔNG thêm chữ Hán vào đây, kể cả nét giả trang trí — dự án có
 * `npm run test:no-han` chặn, và đó là quy tắc không có ngoại lệ.
 */

const PAPER = "#fffdf9";
const NAVY = "#1e3a5c";

/**
 * Ba thời đại, ba chất ấn — lấy thẳng từ bảng màu Tam Quốc.
 *
 * Loạn thế dùng tro: chưa có gì để khoe, và đó là điểm xuất phát bình thường.
 * Quần hùng dùng lam điện của Chiến trận. Tam phân dùng chu sa, màu mà bảng
 * màu đã ghi rõ là dành cho "con dấu, cấp bậc cao".
 */
const ERA_STYLE: Record<RankEra, { line: string; ink: string; pale: string }> = {
  LOAN_THE: { line: "#77736c", ink: "#5f5b54", pale: "#efeae0" },
  QUAN_HUNG: { line: "#3a7fc4", ink: "#2c6099", pale: "#e6eef7" },
  TAM_PHAN: { line: "#a33a2b", ink: "#8e3125", pale: "#f4e6e2" },
};

/**
 * Bậc trong thời đại: 1, 2 hay 3 — số vạch trong lòng ấn.
 *
 * Suy từ `level` chứ không khai tay: khai tay thì thêm một bậc là lệch ngay,
 * và không ai để ý cho tới khi học viên hỏi.
 */
function tierWithinEra(level: number): number {
  return ((level - 1) % 3) + 1;
}

/**
 * Núm ấn (nữu) — mấu nhỏ trên lưng ấn để xỏ dây thao.
 *
 * PHẢI NHỎ VÀ THẤP. Bản trước tôi vẽ núm thành vòng cung rộng bắc qua cả mặt
 * ấn, và nhìn tận mắt thì cả con dấu đọc thành **cái túi xách** — vòng cung
 * rộng trên một hình vuông bo góc là quai xách, không phải núm ấn. Núm thật
 * chiếm chưa tới một phần ba bề ngang và gần như dính vào lưng ấn.
 *
 * Ba thời đại, ba kiểu nữu, đúng thứ tự leo thang của đồ án cổ:
 * mấu trơn → nữu vòng → nữu vòng trên bệ.
 */
function knob(era: RankEra, line: string, ink: string) {
  if (era === "LOAN_THE") {
    return (
      <rect
        x="24.4"
        y="10.2"
        width="7.2"
        height="3.6"
        rx="1.1"
        stroke={line}
        strokeWidth="1.3"
      />
    );
  }

  if (era === "QUAN_HUNG") {
    return (
      <>
        <rect
          x="24.4"
          y="11.4"
          width="7.2"
          height="2.6"
          rx="0.9"
          fill={line}
          opacity="0.9"
        />
        <circle cx="28" cy="8.6" r="2.9" stroke={line} strokeWidth="1.3" />
      </>
    );
  }

  return (
    <>
      <rect
        x="23.4"
        y="11.4"
        width="9.2"
        height="2.6"
        rx="0.9"
        fill={line}
        opacity="0.9"
      />
      <rect
        x="25.2"
        y="9.2"
        width="5.6"
        height="2.4"
        rx="0.7"
        fill={line}
        opacity="0.7"
      />
      <circle cx="28" cy="6.4" r="2.9" stroke={ink} strokeWidth="1.4" />
    </>
  );
}

export function RankInsignia({
  level,
  className = "h-9 w-9",
}: {
  level: number;
  className?: string;
}) {
  const rank = rankByLevel(level);
  // Bậc lạ (dữ liệu hỏng) vẽ theo Loạn thế thay vì đổ vỡ: một con dấu xám vẫn
  // hơn một ô trống hay một trang lỗi.
  const era = rank?.era ?? "LOAN_THE";
  const style = ERA_STYLE[era];
  const tier = tierWithinEra(level);
  const label = rank
    ? `${rank.name} — bậc ${level}, ${RANK_ERAS[era].name}`
    : `Bậc ${level}`;

  const barWidth = 16;
  const barX = 28 - barWidth / 2;
  // Xếp các vạch quanh tâm mặt ấn (y = 29) để một vạch, hai vạch hay ba vạch
  // đều nằm cân — cố định vị trí vạch đầu sẽ làm bậc 1 lệch lên trên.
  const barTop = 29 - (tier * 6 - 2.6) / 2;

  return (
    <svg
      viewBox="0 0 56 56"
      className={className}
      role="img"
      aria-label={label}
      fill="none"
    >
      <title>{label}</title>

      {knob(era, style.line, style.ink)}

      {/* Mặt ấn */}
      <rect
        x="13"
        y="14"
        width="30"
        height="30"
        rx="1.8"
        fill={style.pale}
        stroke={style.line}
        strokeWidth="1.8"
      />

      {/* Khung trong: chỉ có từ Quần hùng trở lên. */}
      {era !== "LOAN_THE" && (
        <rect
          x="16.5"
          y="17.5"
          width="23"
          height="23"
          rx="2"
          stroke={style.line}
          strokeWidth="0.9"
          opacity="0.5"
        />
      )}

      {/* Vạch bậc trong thời đại: một, hai hay ba. */}
      {Array.from({ length: tier }).map((_, index) => (
        <rect
          key={index}
          x={barX}
          y={barTop + index * 6}
          width={barWidth}
          height="2.6"
          rx="1"
          fill={style.ink}
        />
      ))}

      {/*
        Bậc 9 — Đại tướng quân.

        Bản trước vẽ hai dải thao buông dưới chân ấn, và nhìn tận mắt thì hai
        nét đó đọc thành DẤU TÍCH. Nay đổi sang một khung viền thứ ba sát mép
        trong: cùng ý "nhiều lớp hơn mọi bậc khác" mà không sinh ra một ký hiệu
        mang nghĩa khác hẳn.
      */}
      {level === 9 && (
        <rect
          x="19.5"
          y="20.5"
          width="17"
          height="17"
          rx="1.5"
          stroke={style.ink}
          strokeWidth="0.8"
          opacity="0.45"
        />
      )}
    </svg>
  );
}

/**
 * Ấn kèm số bậc — dùng ở chỗ cần đọc ngay con số mà không phải đếm vạch,
 * ví dụ bảng quản trị. Chỗ nào đã có cột "Bậc" riêng thì dùng `RankInsignia`.
 */
export function RankInsigniaWithLevel({
  level,
  className = "h-11 w-11",
}: {
  level: number;
  className?: string;
}) {
  const rank = rankByLevel(level);
  const era = rank?.era ?? "LOAN_THE";
  const style = ERA_STYLE[era];

  return (
    <span className="relative inline-flex">
      <RankInsignia level={level} className={className} />
      <span
        className="absolute -bottom-0.5 -right-0.5 inline-flex h-[1.15rem] w-[1.15rem] items-center justify-center rounded-full font-ui text-[0.62rem] font-bold tabular-nums"
        style={{ background: NAVY, color: PAPER, border: `1px solid ${style.line}` }}
        aria-hidden="true"
      >
        {level}
      </span>
    </span>
  );
}
