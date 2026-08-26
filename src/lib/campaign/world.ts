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
    title: "Diễn Đàn",
    functionalLabel: "Cộng đồng học tập",
    href: "/nghi-su-duong",
    lockedMessage: null,
  },
  {
    code: "LANDMARK_HONORS",
    kind: "LANDMARK",
    title: "Dấu Mốc Cộng Đồng",
    functionalLabel: "Tiến bộ đã kiểm chứng",
    href: "/dien-danh-vong",
    lockedMessage: null,
  },
  {
    code: "LANDMARK_RESULTS",
    kind: "LANDMARK",
    title: "Thành Quả",
    functionalLabel: "Kết quả và dấu mốc",
    href: "/bang-vang",
    lockedMessage: null,
  },
] as const satisfies readonly WorldPlace[];

export const WORLD_COMPETITIONS = [
  {
    code: "COMP_MONTHLY",
    kind: "COMPETITION",
    title: "Thử Thách Tháng",
    functionalLabel: "Đối chiếu hàng tháng",
    href: "/nguyet-thi",
    lockedMessage: null,
  },
  {
    code: "COMP_QUARTERLY",
    kind: "COMPETITION",
    title: "Thử Thách Quý",
    functionalLabel: "Đối chiếu hàng quý",
    href: "/duong-thi",
    lockedMessage: null,
  },
  {
    code: "COMP_ANNUAL",
    kind: "COMPETITION",
    title: "Thử Thách Năm",
    functionalLabel: "Đối chiếu hàng năm",
    href: "/thien-thi",
    lockedMessage: null,
  },
] as const satisfies readonly WorldPlace[];

export const LOCKED_TERRITORIES = [
  {
    code: "TERRITORY_WEI",
    kind: "TERRITORY",
    artKey: "wei",
    title: "Nhận thức",
    functionalLabel: "Vùng nhìn rõ bằng chứng",
    href: null,
    lockedMessage: "Mở khi đạt điều kiện chặng",
  },
  {
    code: "TERRITORY_SHU",
    kind: "TERRITORY",
    artKey: "shu",
    title: "Hành động",
    functionalLabel: "Vùng làm đúng bước tiếp theo",
    href: null,
    lockedMessage: "Mở khi đạt điều kiện chặng",
  },
  {
    code: "TERRITORY_WU",
    kind: "TERRITORY",
    artKey: "wu",
    title: "Ý chí",
    functionalLabel: "Vùng giữ nhịp bền vững",
    href: null,
    lockedMessage: "Mở khi đạt điều kiện chặng",
  },
] as const satisfies readonly TerritoryPlace[];

export const STOIC_TRIAL_TITLES: Record<string, string> = {
  TRIAL_01_DAO_VIEN: "Bắt đầu bằng một lời hẹn",
  TRIAL_02_HOANG_CAN: "Giữ nhịp đều đặn",
  TRIAL_03_HOA_HUNG: "Tốc độ có chủ đích",
  TRIAL_04_NGU_QUAN: "Ổn định qua nhiều lượt",
  TRIAL_05_TRUONG_BAN: "Không bỏ rơi phần khó",
  TRIAL_06_LAO_TUONG: "Phản tư có chiều sâu",
  TRIAL_07_TAY_LUONG: "Tích hợp ba trụ",
  TRIAL_08_HO_LAO: "Tự chủ trước điểm yếu",
};

export const STOIC_TRIAL_LABELS: Record<string, string> = {
  TRIAL_01_DAO_VIEN: "Bắt đầu có chủ đích",
  TRIAL_02_HOANG_CAN: "Rèn nhịp đều đặn",
  TRIAL_03_HOA_HUNG: "Quản trị sự chú ý",
  TRIAL_04_NGU_QUAN: "Giữ phong độ ổn định",
  TRIAL_05_TRUONG_BAN: "Củng cố phần yếu",
  TRIAL_06_LAO_TUONG: "Phản tư có chiều sâu",
  TRIAL_07_TAY_LUONG: "Linh hoạt trong khuôn khổ",
  TRIAL_08_HO_LAO: "Tích hợp ba trụ",
};

export function stoicTrialTitle(node: Pick<CampaignNodeView, "trialCode" | "shortTitle">): string {

  return STOIC_TRIAL_TITLES[node.trialCode] ?? node.shortTitle;
}

export function stoicTrialLabel(node: Pick<CampaignNodeView, "trialCode" | "functionalLabel">): string {
  return STOIC_TRIAL_LABELS[node.trialCode] ?? node.functionalLabel;
}

function trialStep(node: CampaignNodeView, active: boolean): NextStepModel {
  const stoicTitle = stoicTrialTitle(node);
  return {
    eyebrow: "Bước tiếp theo của bạn",
    title: active ? `Tiếp tục ${stoicTitle}` : `Bước vào ${stoicTitle}`,
    body: active
      ? "Chặng đang dở được giữ nguyên. Tiếp tục từ đúng tiến độ hiện tại."
      : (node.hint ?? "Chặng đã mở. Xem điều kiện và chủ động bắt đầu khi sẵn sàng."),
    href: `/hoc-vien/thi-luyen/${node.trialCode}`,
    actionLabel: active ? "Tiếp tục chặng" : "Xem điều kiện",
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
      title: "Bắt đầu từ điều bạn kiểm soát",
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
              title: "Tám chặng đã hoàn tất",
              body: "Cấp bậc đã được giữ vĩnh viễn. Tiếp tục xây dấu mốc và chuẩn bị cho các thử thách đối chiếu.",
              href: "/hoc-vien/danh-hieu",
              actionLabel: "Xem dấu mốc",
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
