import { StoicSpotlightCard } from "@/components/ui/spotlight-card";
import type { TerritoryPlace } from "@/lib/campaign/world";

type PillarConfig = {
  body: string;
  tone: "lavender" | "sage" | "gold";
  icon: "brain" | "book-open" | "repeat";
};

const PILLAR_CONFIG: Record<string, PillarConfig> = {
  TERRITORY_WEI: {
    body: "Đọc đúng yêu cầu, tách dữ kiện khỏi suy đoán và biết rõ mình sai ở đâu. Một lỗi được gọi đúng tên sẽ dễ sửa hơn một band điểm mơ hồ.",
    tone: "lavender",
    icon: "brain",
  },
  TERRITORY_SHU: {
    body: "Làm bài trong điều kiện thật, rồi quay lại passage để tìm bằng chứng. Phản hồi chỉ có giá trị khi nó dẫn tới một việc cụ thể cho lần tiếp theo.",
    tone: "sage",
    icon: "book-open",
  },
  TERRITORY_WU: {
    body: "Năng lực ổn định đến từ một nhịp học có thể lặp lại. Hệ thống chỉ ghi nhận thời gian bạn thực sự học, không tính tab mở quên tắt.",
    tone: "gold",
    icon: "repeat",
  },
};

const FALLBACK_TERRITORIES: readonly TerritoryPlace[] = [
  {
    code: "TERRITORY_WEI",
    kind: "TERRITORY",
    artKey: "wei",
    title: "Nhận thức",
    functionalLabel: "Nhìn đúng dữ kiện",
    href: null,
    lockedMessage: "Mở khi đạt điều kiện chặng",
  },
  {
    code: "TERRITORY_SHU",
    kind: "TERRITORY",
    artKey: "shu",
    title: "Hành động",
    functionalLabel: "Làm và chữa bằng bằng chứng",
    href: null,
    lockedMessage: "Mở khi đạt điều kiện chặng",
  },
  {
    code: "TERRITORY_WU",
    kind: "TERRITORY",
    artKey: "wu",
    title: "Ý chí",
    functionalLabel: "Giữ ngày học thật",
    href: null,
    lockedMessage: "Mở khi đạt điều kiện chặng",
  },
];

export function StoicPillarCards({
  territories = FALLBACK_TERRITORIES,
  ownerLabel = null,
  seasonCode = null,
}: {
  territories?: readonly TerritoryPlace[];
  ownerLabel?: string | null;
  seasonCode?: string | null;
}) {
  return (
    <section className="stoic-pillars-home" aria-labelledby="stoic-pillars-title">
      <div className="stoic-pillars-home__heading">
        <p className="label-caps">Ba trụ thực hành</p>
        <h2 id="stoic-pillars-title" className="font-display text-2xl font-bold text-navy-deep">
          Ba trụ đang chờ bạn rèn
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Nhận thức, Hành động và Ý chí sẽ mở dần khi bạn đạt điều kiện của từng chặng.
        </p>
        {ownerLabel ? (
          <p className="mt-2 text-xs font-semibold text-stoic-primary-deep">
            {ownerLabel} đang dẫn đầu mùa {seasonCode ?? "hiện tại"}.
          </p>
        ) : null}
      </div>

      <div className="stoic-pillars-home__grid">
        {territories.map((territory, index) => {
          const config = PILLAR_CONFIG[territory.code] ?? PILLAR_CONFIG.TERRITORY_WEI;
          return (
            <StoicSpotlightCard
              key={territory.code}
              index={String(index + 1).padStart(2, "0")}
              title={territory.title}
              functional={territory.functionalLabel}
              body={config.body}
              tone={config.tone}
              icon={config.icon}
            />
          );
        })}
      </div>

      <p className="stoic-pillars-home__note">
        Ba trụ không phải ba giai đoạn tách rời. Mỗi lần học tốt đều cần đủ
        <strong> nhận thức để thấy đúng, hành động để sửa và ý chí để quay lại.</strong>
      </p>
    </section>
  );
}
