/**
 * Dịch điều kiện danh hiệu từ dạng máy đọc sang tiếng Việt cho học viên.
 *
 * Vì sao cần file này: `ruleConfig` là JSON dành cho engine xét duyệt
 * (`{ distinctExercises: 8, minAverageBand: 5.5 }`), còn học viên cần biết chính
 * xác phải làm gì. Trước đây trang chỉ hiện một câu mô tả văn vẻ, nên người học
 * đoán mò tiêu chí — mà danh hiệu nào cũng cần hàng tuần công sức, đoán sai là
 * mất công thật.
 *
 * Nguồn sự thật vẫn là `rules.ts`. File này chỉ diễn giải, KHÔNG xét duyệt —
 * nhưng khi sửa ngưỡng trong catalog thì phần diễn giải tự đúng theo, vì cả hai
 * cùng đọc một `ruleConfig`.
 *
 * KHÔNG import "server-only" để bộ kiểm thử chạy được bằng node thuần.
 */

import { RARITY_LABELS, type Rarity } from "./catalog.ts";

export type RuleExplanation = {
  /** Một câu tóm tắt bản chất của danh hiệu. */
  summary: string;
  /** Các điều kiện cụ thể — phải đạt ĐỦ, không phải chọn một. */
  steps: string[];
  /** Lưu ý dễ khiến học viên mất công vô ích nếu không biết trước. */
  notes: string[];
};

type Config = Record<string, unknown>;

function num(config: Config, key: string): number | undefined {
  const value = config[key];
  return typeof value === "number" ? value : undefined;
}

function bool(config: Config, key: string): boolean {
  return config[key] === true;
}

function codes(config: Config, key: string): string[] {
  const value = config[key];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Band luôn hiện một chữ số thập phân: "band 6" đọc dễ nhầm với "6 câu". */
function band(value: number): string {
  return value.toFixed(1);
}

/** 180 phút đọc là "3 giờ" — không ai tự nhẩm phút thành giờ khi đang cân nhắc. */
export function humanMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const hours = minutes / 60;
  return Number.isInteger(hours)
    ? `${hours} giờ`
    : `${Math.floor(hours)} giờ ${minutes % 60} phút`;
}

/** "trong 90 ngày" — mọi mốc cuốn chiếu đều tính lùi từ hôm nay. */
function windowPhrase(days: number | undefined): string {
  return days ? ` trong ${days} ngày gần nhất` : "";
}

const COLLECTION_NOTE =
  "Tính trên bộ đề đã được trung tâm đóng băng — danh sách đề cố định từ lúc mở, thêm đề mới sau đó không làm bạn mất tiến độ.";

const AUTO_ONLY_NOTE =
  "Chỉ đề Full Test do hệ thống tự ghép mới được tính. Đề bạn tự chọn ba bài chỉ để luyện tập, vì nếu không ai cũng gom ba bài dễ để lấy band cao.";

const VALID_ATTEMPT_NOTE =
  "Bài làm phải hợp lệ: trả lời ít nhất một nửa số câu và dành đủ thời gian tối thiểu. Mở đề rồi nộp ngay không được tính.";

const REAL_TIME_NOTE =
  "Thời gian học được đếm THẬT — chỉ tính lúc bạn đang thao tác trên bài, không tính tab mở quên tắt.";

/**
 * Diễn giải đầy đủ một danh hiệu.
 *
 * `titleNameOf` để đổi mã danh hiệu trụ cột thành tên đọc được; thiếu nó thì
 * hiện tạm mã, vẫn không vỡ giao diện.
 */
export function explainTitleRule(input: {
  ruleKey: string;
  ruleConfig: Config;
  repeatPolicy?: string | null;
  rewardCode?: string | null;
  titleNameOf?: (code: string) => string | undefined;
}): RuleExplanation {
  const c = input.ruleConfig ?? {};
  const steps: string[] = [];
  const notes: string[] = [];
  let summary = "";

  switch (input.ruleKey) {
    /* ===== Đếm số đề khác nhau, xét theo LẦN LÀM ĐẦU TIÊN ===== */
    case "UNIQUE_FIRST_ATTEMPTS": {
      const distinct = num(c, "distinctExercises") ?? 0;
      const each = num(c, "minBandEach");
      const avg = num(c, "minAverageBand");

      summary = `Làm ${distinct} bài đọc KHÁC NHAU và đạt chuẩn ngay từ lần đầu.`;
      steps.push(`Hoàn thành ${distinct} bài đọc khác nhau (làm lại cùng một bài không cộng thêm).`);
      if (each !== undefined) {
        steps.push(`Mỗi bài đạt tối thiểu band ${band(each)} ngay ở LẦN LÀM ĐẦU TIÊN.`);
      }
      if (avg !== undefined) {
        steps.push(`Band trung bình của ${distinct} bài đó từ ${band(avg)} trở lên.`);
      }
      notes.push(
        "Chỉ lần làm đầu tiên của mỗi bài được tính. Làm lại để lấy điểm cao hơn không thay đổi kết quả xét danh hiệu — đây là chỗ nhiều người hiểu nhầm nhất."
      );
      notes.push(VALID_ATTEMPT_NOTE);
      break;
    }

    /* ===== Đếm cuốn chiếu trong một khoảng thời gian ===== */
    case "ROLLING_ATTEMPTS": {
      const days = num(c, "windowDays");
      const distinct = num(c, "distinctExercises") ?? 0;
      const fullTests = num(c, "minFullTests");
      const avg = num(c, "minAverageBand");

      summary = `Giữ nhịp làm bài đều đặn${windowPhrase(days)}.`;
      steps.push(`Làm ${distinct} bài đọc khác nhau${windowPhrase(days)}.`);
      if (fullTests !== undefined) {
        steps.push(`Trong đó có ít nhất ${fullTests} đề Full Test (đề ghép ba bài đọc, 60 phút).`);
      }
      if (avg !== undefined) {
        steps.push(`Band trung bình đạt từ ${band(avg)} trở lên.`);
      }
      notes.push(
        `Khoảng ${days ?? 0} ngày này trượt theo thời gian: bài làm cũ hơn ${days ?? 0} ngày sẽ rơi ra khỏi cách tính, nên cần duy trì chứ không dồn một đợt rồi nghỉ.`
      );
      notes.push(AUTO_ONLY_NOTE);
      break;
    }

    /* ===== Làm lại trọn bộ đề, có giãn cách và không tụt band ===== */
    case "COLLECTION_ATTEMPT_COUNT": {
      const items = num(c, "minCollectionItems") ?? 0;
      const perExercise = num(c, "attemptsPerExercise") ?? 0;
      const gapHours = num(c, "minimumGapHours");
      const maxDrop = num(c, "maxBandDrop");

      summary = `Làm lại trọn bộ ${items} đề, mỗi đề ${perExercise} lần, và giữ được phong độ.`;
      steps.push(`Hoàn thành đủ ${items} đề trong bộ, mỗi đề làm ${perExercise} lần.`);
      if (gapHours !== undefined) {
        steps.push(
          `Hai lần làm cùng một đề phải cách nhau tối thiểu ${gapHours} giờ — để bạn nhớ cách hiểu bài, không phải nhớ vị trí đáp án.`
        );
      }
      if (maxDrop !== undefined) {
        steps.push(`Lần làm sau không được tụt quá ${band(maxDrop)} band so với lần trước.`);
      }
      notes.push(COLLECTION_NOTE);
      break;
    }

    /* ===== Chuẩn band cao trên trọn bộ đề ===== */
    case "COLLECTION_MIN_FIRST_BAND": {
      const items = num(c, "minCollectionItems") ?? 0;
      const each = num(c, "minBandEach");
      const needFeynman = bool(c, "requireFeynmanComplete");
      const activeDays = num(c, "minActiveDays");
      const activeWindow = num(c, "activeDaysWindow");

      summary = `Đạt band cao trên TOÀN BỘ ${items} đề, ngay lần làm đầu.`;
      if (each !== undefined) {
        steps.push(
          `Cả ${items} đề trong bộ đều đạt từ band ${band(each)} trở lên ngay ở lần làm đầu tiên.`
        );
      }
      if (needFeynman) {
        steps.push(`Hoàn thành đủ bốn bước chữa bài Feynman cho cả ${items} đề.`);
      }
      if (activeDays !== undefined) {
        steps.push(
          `Có ít nhất ${activeDays} ngày học thật${windowPhrase(activeWindow)}.`
        );
      }
      notes.push(
        "Chỉ tính lần làm đầu tiên của mỗi đề — một đề lỡ tay là phải chờ bộ đề mới, không sửa lại được."
      );
      notes.push(COLLECTION_NOTE);
      break;
    }

    /* ===== Chiều sâu chữa bài ===== */
    case "FEYNMAN_TOTALS": {
      const reviews = num(c, "completedReviews") ?? 0;
      const mistakes = num(c, "completedMistakes");
      const fullFields = bool(c, "requireFullFields");
      const teachChars = num(c, "minTeachBackChars");
      const teachCount = num(c, "minTeachBackCount");
      const improved = num(c, "confidenceImprovedRatio");

      summary = `Chữa bài đủ sâu: ${reviews} phiên Feynman hoàn tất.`;
      steps.push(`Hoàn thành ${reviews} phiên chữa bài Feynman (đủ cả bốn bước).`);
      if (mistakes !== undefined) {
        steps.push(`Xử lý tổng cộng ${mistakes} câu sai trong các phiên đó.`);
      }
      if (fullFields) {
        steps.push(
          "Mỗi câu sai phải điền đủ ba phần: bằng chứng trong bài đọc, lời giải đã sửa, và quy tắc rút ra cho lần sau."
        );
      }
      if (teachCount !== undefined && teachChars !== undefined) {
        steps.push(
          `Có ít nhất ${teachCount} phần tự giảng lại dài từ ${teachChars} ký tự — đủ để thật sự giải thích, không phải viết cho có.`
        );
      }
      if (improved !== undefined) {
        steps.push(
          `Ít nhất ${Math.round(improved * 100)}% số phiên cho thấy mức độ tự tin tăng lên sau khi chữa.`
        );
      }
      notes.push(
        "Phiên chữa bài chỉ được tính khi đã chuyển sang trạng thái hoàn tất. Phiên đang viết dở không cộng vào."
      );
      break;
    }

    /* ===== Chữa bài trọn bộ đề ===== */
    case "COLLECTION_FEYNMAN_COMPLETE": {
      const items = num(c, "minCollectionItems") ?? 0;
      summary = `Chữa bài Feynman trọn vẹn cho cả ${items} đề trong bộ.`;
      steps.push(`Mỗi đề trong bộ ${items} đề đều có một phiên Feynman hoàn tất.`);
      steps.push("Không bỏ sót đề nào — thiếu một đề là chưa đạt.");
      notes.push(COLLECTION_NOTE);
      break;
    }

    /* ===== Kỷ luật: ngày học thật ===== */
    case "ACTIVE_TIME_WINDOW": {
      const days = num(c, "windowDays");
      const activeDays = num(c, "activeDays") ?? 0;
      const minutes = num(c, "minMinutes");
      const outputs = num(c, "minOutputs");
      const distinct = num(c, "minDistinctExercises");
      const feynman = num(c, "minFeynmanReviews");

      summary = `Duy trì ${activeDays} ngày học thật${windowPhrase(days)}.`;
      steps.push(`Có ${activeDays} ngày khác nhau thật sự ngồi học${windowPhrase(days)}.`);
      if (minutes !== undefined) {
        steps.push(`Tổng thời gian học đạt tối thiểu ${humanMinutes(minutes)}.`);
      }
      if (outputs !== undefined) {
        steps.push(`Tạo ra ít nhất ${outputs} kết quả cụ thể (bài đã nộp hoặc phiên chữa bài).`);
      }
      if (distinct !== undefined) {
        steps.push(`Làm ít nhất ${distinct} đề khác nhau.`);
      }
      if (feynman !== undefined) {
        steps.push(`Hoàn thành ít nhất ${feynman} phiên chữa bài Feynman.`);
      }
      notes.push(REAL_TIME_NOTE);
      notes.push(
        "Đây là nhóm danh hiệu không có đường tắt: dù giỏi đến đâu cũng không thể rút ngắn số ngày."
      );
      break;
    }

    /* ===== Gần đủ ba trụ ===== */
    case "NEAR_COMPOSITE": {
      const pillars = codes(c, "pillars");
      const earned = num(c, "earnedPillars") ?? 0;
      const percent = num(c, "remainingPercent");
      const names = pillars.map((p) => input.titleNameOf?.(p) ?? p);

      summary = `Đã nắm ${earned} trong ba trụ, trụ còn lại cũng gần chạm đích.`;
      steps.push(`Đạt ${earned} trong ba danh hiệu trụ cột: ${names.join(" · ")}.`);
      if (percent !== undefined) {
        steps.push(`Trụ còn lại đã hoàn thành tối thiểu ${percent}% tiến độ.`);
      }
      notes.push(
        "Danh hiệu này là cột mốc báo hiệu bạn sắp đủ điều kiện dự Nguyệt Thí — mọi việc còn lại chỉ là hoàn tất trụ cuối."
      );
      break;
    }

    /* ===== Đủ ba trụ ===== */
    case "COMPOSITE_TITLES": {
      const pillars = codes(c, "pillars");
      const names = pillars.map((p) => input.titleNameOf?.(p) ?? p);

      summary = "Nắm đủ cả ba trụ — đây là tấm vé duy nhất vào Nguyệt Thí.";
      steps.push("Đạt trọn vẹn cả ba danh hiệu trụ cột:");
      for (const name of names) steps.push(`— ${name}`);
      notes.push(
        "Ba trụ tương ứng ba việc khác nhau: làm đủ đề, chữa bài đủ sâu, và giữ được kỷ luật. Giỏi một mặt không thay thế được hai mặt kia."
      );
      break;
    }

    /* ===== Sa sút rồi đi lên ===== */
    case "RECOVERY_CHAIN": {
      const phase = typeof c.phase === "string" ? c.phase : "";
      const fullTests = num(c, "fullTests") ?? 0;
      const days = num(c, "windowDays");
      const belowBand = num(c, "belowBand");
      const minBand = num(c, "minBand");
      const noBelow = num(c, "noBandBelow");

      if (phase === "LOW") {
        summary = "Dấu hiệu cần điều chỉnh cách học — chỉ mình bạn nhìn thấy.";
        if (belowBand !== undefined) {
          steps.push(
            `${fullTests} đề Full Test liên tiếp dưới band ${band(belowBand)}${windowPhrase(days)}.`
          );
        }
        notes.push(
          "Danh hiệu này KHÔNG BAO GIỜ hiển thị công khai và không xuất hiện trong Điện Danh Vọng. Nó chỉ nhắc riêng bạn nên đổi cách học, không phải để so sánh với ai."
        );
      } else {
        summary = "Đi lên từ giai đoạn sa sút — ngã rồi đứng dậy cũng là một năng lực.";
        if (minBand !== undefined) {
          steps.push(
            `${fullTests} đề Full Test liên tiếp đạt từ band ${band(minBand)} trở lên${windowPhrase(days)}.`
          );
        }
        if (noBelow !== undefined) {
          steps.push(`Trong chuỗi đó không có đề nào rơi xuống dưới band ${band(noBelow)}.`);
        }
        notes.push(
          "Chỉ dành cho người từng trải qua giai đoạn sa sút. Đây là danh hiệu tôn vinh sự phục hồi, nên không thể đạt nếu chưa từng đi xuống."
        );
        notes.push(AUTO_ONLY_NOTE);
      }
      break;
    }

    default: {
      summary = "Điều kiện của danh hiệu này chưa được mô tả chi tiết.";
      notes.push("Vui lòng liên hệ trung tâm nếu bạn cần biết chính xác tiêu chí.");
    }
  }

  if (input.repeatPolicy === "PER_COLLECTION") {
    notes.push(
      "Đạt được một lần cho MỖI bộ đề. Khi trung tâm mở bộ đề mới, bạn có cơ hội nhận lại danh hiệu này."
    );
  }
  if (input.rewardCode === "READING_FEYNMAN_SINGLE") {
    notes.push("Phần thưởng kèm theo: mở miễn phí một lượt chữa bài Feynman chuyên sâu.");
  }

  return { summary, steps, notes };
}

/**
 * Thứ tự độ khó để sắp xếp từ dễ đến khó.
 *
 * Độ hiếm chính là thước đo độ khó đã được cân nhắc khi soạn catalog, nên dùng
 * luôn thay vì bịa ra một thang riêng dễ lệch với thực tế.
 */
export const RARITY_RANK: Record<string, number> = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
  PRIVATE: 5,
};

export function rarityRank(rarity: string): number {
  return RARITY_RANK[rarity] ?? 99;
}

export function rarityLabel(rarity: string): string {
  return RARITY_LABELS[rarity as Rarity] ?? rarity;
}

/**
 * Sắp xếp trong một nhóm: dễ trước, khó sau.
 *
 * Cùng độ hiếm thì giữ nguyên thứ tự trong catalog (`sortOrder`) — thứ tự đó đã
 * được soạn theo mạch câu chuyện của nhóm.
 */
export function byDifficulty<T extends { rarity: string; sortOrder: number }>(
  a: T,
  b: T
): number {
  const diff = rarityRank(a.rarity) - rarityRank(b.rarity);
  return diff !== 0 ? diff : a.sortOrder - b.sortOrder;
}

/** Thứ tự trình bày các nhóm: theo hành trình học viên đi qua. */
export const CATEGORY_ORDER = [
  "PRACTICE",
  "FEYNMAN",
  "DISCIPLINE",
  "COMPOSITE",
  "TRANSFORMATION",
] as const;

/**
 * Mã neo của từng nhóm trên trang Điện Danh Vọng.
 *
 * Đặt cố định bằng tiếng Việt không dấu thay vì sinh tự động từ tên nhóm: đây là
 * đường dẫn người ta gửi cho nhau (`/dien-danh-vong#nhom-ky-luat`), đổi tên
 * hiển thị mà làm hỏng liên kết cũ thì phiền.
 */
export const CATEGORY_ANCHORS: Record<string, string> = {
  PRACTICE: "nhom-giai-de",
  FEYNMAN: "nhom-sua-de",
  DISCIPLINE: "nhom-ky-luat",
  COMPOSITE: "nhom-tong-hop",
  TRANSFORMATION: "nhom-chuyen-hoa",
};

export function categoryAnchor(category: string): string {
  return CATEGORY_ANCHORS[category] ?? `nhom-${category.toLowerCase().replace(/_/g, "-")}`;
}

/** Vì sao nhóm này tồn tại — hiện dưới tên nhóm để học viên biết mình đang xem gì. */
export const CATEGORY_BLURBS: Record<string, string> = {
  PRACTICE:
    "Đếm số đề bạn thật sự hoàn thành và chất lượng của lần làm đầu tiên. Đây là nhóm dễ bắt đầu nhất.",
  FEYNMAN:
    "Thưởng cho chiều sâu chữa bài, không thưởng cho số lượng. Làm thêm đề không tự khiến bạn giỏi hơn — hiểu vì sao mình sai mới có.",
  DISCIPLINE:
    "Tính theo số ngày học thật và tổng thời gian ngồi học. Không có đường tắt: dù giỏi đến đâu cũng không rút ngắn được số ngày.",
  COMPOSITE:
    "Cần đủ cả ba mặt cùng lúc — làm đề, chữa bài và kỷ luật. Đây là cửa vào Nguyệt Thí.",
  TRANSFORMATION:
    "Dành cho người đi lên từ giai đoạn sa sút. Ngã rồi đứng dậy cũng là một loại năng lực.",
};

/**
 * Gom danh hiệu theo nhóm, mỗi nhóm sắp từ dễ đến khó.
 *
 * Nhóm rỗng bị loại để trang không hiện tiêu đề trống trơn.
 */
export function groupByCategory<
  T extends { category: string; rarity: string; sortOrder: number },
>(definitions: T[]): { category: string; items: T[] }[] {
  const seen = new Map<string, T[]>();
  for (const def of definitions) {
    const list = seen.get(def.category);
    if (list) list.push(def);
    else seen.set(def.category, [def]);
  }

  const ordered: string[] = [
    ...CATEGORY_ORDER,
    // Nhóm mới thêm sau này vẫn hiện ra, xếp cuối thay vì biến mất
    ...[...seen.keys()].filter((k) => !CATEGORY_ORDER.includes(k as never)).sort(),
  ];

  return ordered
    .filter((category) => seen.has(category))
    .map((category) => ({
      category,
      items: [...seen.get(category)!].sort(byDifficulty),
    }));
}
