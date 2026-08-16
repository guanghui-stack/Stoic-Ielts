import type { CampaignNodeView } from "./view.ts";

export type WorldPlaceKind = "LANDMARK" | "COMPETITION" | "TERRITORY";

export type WorldPlace = {
  code: string;
  kind: WorldPlaceKind;
  title: string;
  functionalLabel: string;
  href: string | null;
  lockedMessage: string | null;
};

export const TERRITORY_CODES = [
  "TERRITORY_WEI",
  "TERRITORY_SHU",
  "TERRITORY_WU",
] as const;

export type TerritoryCode = (typeof TERRITORY_CODES)[number];
export type TerritoryArtKey = "wei" | "shu" | "wu";

export type TerritoryPlace = Omit<WorldPlace, "code" | "kind"> & {
  code: TerritoryCode;
  kind: "TERRITORY";
  artKey: TerritoryArtKey;
};

export type NextStepModel = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  actionLabel: string;
  entersStudy: boolean;
};

export type CampaignWorld = {
  audience: "GUEST" | "STUDENT";
  gates: CampaignNodeView[];
  landmarks: readonly WorldPlace[];
  competitions: readonly WorldPlace[];
  territories: readonly TerritoryPlace[];
  nextStep: NextStepModel;
};

export const WORLD_LANDMARKS = [
  {
    code: "LANDMARK_COUNCIL",
    kind: "LANDMARK",
    title: "Nghị Sự Đường",
    functionalLabel: "Cộng đồng thảo luận",
    href: "/nghi-su-duong",
    lockedMessage: null,
  },
  {
    code: "LANDMARK_HONORS",
    kind: "LANDMARK",
    title: "Điện Danh Vọng",
    functionalLabel: "Danh hiệu và thành tích",
    href: "/dien-danh-vong",
    lockedMessage: null,
  },
  {
    code: "LANDMARK_RESULTS",
    kind: "LANDMARK",
    title: "Bảng Vàng",
    functionalLabel: "Kết quả kỳ thi",
    href: "/bang-vang",
    lockedMessage: null,
  },
] as const satisfies readonly WorldPlace[];

export const WORLD_COMPETITIONS = [
  {
    code: "COMP_MONTHLY",
    kind: "COMPETITION",
    title: "Nguyệt Thí",
    functionalLabel: "Cuộc thi hàng tháng",
    href: "/nguyet-thi",
    lockedMessage: null,
  },
  {
    code: "COMP_QUARTERLY",
    kind: "COMPETITION",
    title: "Dương Thí",
    functionalLabel: "Cuộc thi hàng quý",
    href: "/duong-thi",
    lockedMessage: null,
  },
  {
    code: "COMP_ANNUAL",
    kind: "COMPETITION",
    title: "Thiên Thí",
    functionalLabel: "Cuộc thi hàng năm",
    href: "/thien-thi",
    lockedMessage: null,
  },
] as const satisfies readonly WorldPlace[];

export const LOCKED_TERRITORIES = [
  {
    code: "TERRITORY_WEI",
    kind: "TERRITORY",
    artKey: "wei",
    title: "Ngụy",
    functionalLabel: "Lãnh địa phía bắc",
    href: null,
    lockedMessage: "Mở khi đạt cấp bậc yêu cầu",
  },
  {
    code: "TERRITORY_SHU",
    kind: "TERRITORY",
    artKey: "shu",
    title: "Thục",
    functionalLabel: "Lãnh địa phía tây",
    href: null,
    lockedMessage: "Mở khi đạt cấp bậc yêu cầu",
  },
  {
    code: "TERRITORY_WU",
    kind: "TERRITORY",
    artKey: "wu",
    title: "Ngô",
    functionalLabel: "Lãnh địa phía đông nam",
    href: null,
    lockedMessage: "Mở khi đạt cấp bậc yêu cầu",
  },
] as const satisfies readonly TerritoryPlace[];

function trialStep(node: CampaignNodeView, active: boolean): NextStepModel {
  return {
    eyebrow: "Bước tiếp theo của bạn",
    title: active ? `Tiếp tục ${node.shortTitle}` : `Bước vào ${node.shortTitle}`,
    body: active
      ? "Thí luyện đang dở được giữ nguyên. Tiếp tục từ đúng tiến độ hiện tại."
      : (node.hint ?? "Cửa ải đã mở. Xem điều kiện và chủ động bắt đầu khi sẵn sàng."),
    href: `/hoc-vien/thi-luyen/${node.trialCode}`,
    actionLabel: active ? "Tiếp tục thí luyện" : "Xem cửa ải",
    entersStudy: false,
  };
}

export function buildCampaignWorld({
  audience,
  nodes,
}: {
  audience: "GUEST" | "STUDENT";
  nodes: CampaignNodeView[];
}): CampaignWorld {
  let nextStep: NextStepModel;
  if (audience === "GUEST") {
    nextStep = {
      eyebrow: "Bước tiếp theo",
      title: "Bắt đầu từ Bạch thân",
      body: "Tạo tài khoản miễn phí, hiểu ba trụ và chọn đúng kho Reading trước khi làm bài đầu tiên.",
      href: "/dang-ky",
      actionLabel: "Tạo tài khoản",
      entersStudy: false,
    };
  } else {
    const active = nodes.find((node) => node.state === "ACTIVE");
    const available = nodes.find((node) => node.state === "AVAILABLE");
    const lockedCurrent = nodes.find((node) => node.isCurrent && node.state === "LOCKED");
    nextStep = active
      ? trialStep(active, true)
      : available
        ? trialStep(available, false)
        : lockedCurrent
          ? {
              eyebrow: "Bước tiếp theo của bạn",
              title: `Chuẩn bị cho ${lockedCurrent.shortTitle}`,
              body: lockedCurrent.hint ?? "Hoàn thành điều kiện còn thiếu để mở cửa ải kế tiếp.",
              href: "/hoc-vien/chien-dich#dieu-kien",
              actionLabel: "Xem điều kiện",
              entersStudy: false,
            }
          : {
              eyebrow: "Hành trình hiện tại",
              title: "Tám cửa ải đã hoàn tất",
              body: "Cấp bậc đã được giữ vĩnh viễn. Tiếp tục xây danh hiệu và chuẩn bị cho các kỳ đại thí.",
              href: "/hoc-vien/danh-hieu",
              actionLabel: "Xem danh hiệu",
              entersStudy: false,
            };
  }

  return {
    audience,
    gates: nodes,
    landmarks: WORLD_LANDMARKS,
    competitions: WORLD_COMPETITIONS,
    territories: LOCKED_TERRITORIES,
    nextStep,
  };
}
