import { campaignView } from "../src/lib/campaign/view.ts";
import {
  buildCampaignWorld,
  LOCKED_TERRITORIES,
  WORLD_COMPETITIONS,
  WORLD_LANDMARKS,
} from "../src/lib/campaign/world.ts";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) {
    console.log(`  expected ${JSON.stringify(expected)}`);
    console.log(`  received ${JSON.stringify(actual)}`);
    failures++;
  }
}

const guestNodes = campaignView(1, {
  TRIAL_01_DAO_VIEN: { status: "ELIGIBLE" },
});
const activeNodes = campaignView(1, {
  TRIAL_01_DAO_VIEN: { status: "ACTIVE" },
});
const availableNodes = campaignView(1, {
  TRIAL_01_DAO_VIEN: { status: "ELIGIBLE" },
});
const lockedCurrentNodes = campaignView(1, {});
const completedNodes = campaignView(9, {});

check(
  "exactly three public landmarks",
  WORLD_LANDMARKS,
  [
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
  ],
);

check(
  "competitions keep Nguyệt Thí, Dương Thí, Thiên Thí order",
  WORLD_COMPETITIONS.map((item) => item.title),
  ["Nguyệt Thí", "Dương Thí", "Thiên Thí"],
);

check(
  "exactly three locked territories",
  LOCKED_TERRITORIES,
  [
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
  ],
);

check(
  "all locked territories have no destination",
  LOCKED_TERRITORIES.every((item) => item.href === null),
  true,
);
check(
  "all locked territories use the exact locked copy",
  LOCKED_TERRITORIES.every((item) => item.lockedMessage === "Mở khi đạt cấp bậc yêu cầu"),
  true,
);

check(
  "guest starts at registration",
  buildCampaignWorld({ audience: "GUEST", nodes: guestNodes }).nextStep,
  {
    eyebrow: "Bước tiếp theo",
    title: "Bắt đầu từ Bạch thân",
    body: "Tạo tài khoản miễn phí, hiểu ba trụ và chọn đúng kho Reading trước khi làm bài đầu tiên.",
    href: "/dang-ky",
    actionLabel: "Tạo tài khoản",
    entersStudy: false,
  },
);

check(
  "active student resumes the active trial",
  buildCampaignWorld({ audience: "STUDENT", nodes: activeNodes }).nextStep.href,
  "/hoc-vien/thi-luyen/TRIAL_01_DAO_VIEN",
);

check(
  "available student enters the available trial",
  buildCampaignWorld({ audience: "STUDENT", nodes: availableNodes }).nextStep,
  {
    eyebrow: "Bước tiếp theo của bạn",
    title: "Bước vào Đào viên",
    body: "Cửa ải đã mở. Xem điều kiện và chủ động bắt đầu khi sẵn sàng.",
    href: "/hoc-vien/thi-luyen/TRIAL_01_DAO_VIEN",
    actionLabel: "Xem cửa ải",
    entersStudy: false,
  },
);

check(
  "locked current student sees the condition route",
  buildCampaignWorld({ audience: "STUDENT", nodes: lockedCurrentNodes }).nextStep,
  {
    eyebrow: "Bước tiếp theo của bạn",
    title: "Chuẩn bị cho Đào viên",
    body: "Hoàn thành điều kiện còn thiếu để mở cửa ải kế tiếp.",
    href: "/hoc-vien/chien-dich#dieu-kien",
    actionLabel: "Xem điều kiện",
    entersStudy: false,
  },
);

check(
  "completed student sees the honors route",
  buildCampaignWorld({ audience: "STUDENT", nodes: completedNodes }).nextStep,
  {
    eyebrow: "Hành trình hiện tại",
    title: "Tám cửa ải đã hoàn tất",
    body: "Cấp bậc đã được giữ vĩnh viễn. Tiếp tục xây danh hiệu và chuẩn bị cho các kỳ đại thí.",
    href: "/hoc-vien/danh-hieu",
    actionLabel: "Xem danh hiệu",
    entersStudy: false,
  },
);

const availablePriorityNodes = campaignView(2, {
  TRIAL_02_HOANG_CAN: { status: "ELIGIBLE" },
});
const activeAndAvailable = [activeNodes[0], availablePriorityNodes[1]];
check(
  "active has priority over available",
  buildCampaignWorld({ audience: "STUDENT", nodes: activeAndAvailable }).nextStep,
  {
    eyebrow: "Bước tiếp theo của bạn",
    title: "Tiếp tục Đào viên",
    body: "Thí luyện đang dở được giữ nguyên. Tiếp tục từ đúng tiến độ hiện tại.",
    href: "/hoc-vien/thi-luyen/TRIAL_01_DAO_VIEN",
    actionLabel: "Tiếp tục thí luyện",
    entersStudy: false,
  },
);

process.exit(failures === 0 ? 0 : 1);
