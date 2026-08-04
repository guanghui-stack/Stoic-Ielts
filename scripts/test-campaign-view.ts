/**
 * Kiểm thử suy trạng thái node trên bản đồ Chiến Dịch.
 * Chạy: node --experimental-strip-types scripts/test-campaign-view.ts
 *
 * Phủ yêu cầu ở Mục 13.1 của đặc tả: "Campaign node state đúng ở mọi
 * level/status". Bản đồ không có bảng riêng trong database nên toàn bộ logic
 * nằm ở một hàm thuần, kiểm được hết mọi tổ hợp mà không cần MySQL.
 */
import { campaignView, type TrialStatusMap } from "../src/lib/campaign/view.ts";
import { CAMPAIGN_NODES } from "../src/lib/campaign/catalog.ts";
import { TRIAL_SEEDS } from "../src/lib/ranks/catalog.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗ THẤT BẠI:"} ${label}`);
  if (!ok) {
    console.log(`      mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
    failures++;
  }
}

const stateAt = (level: number, trials: TrialStatusMap = {}) =>
  campaignView(level, trials).map((n) => n.state);

console.log("\n— Người mới hoàn toàn —");

{
  const view = campaignView(1, {});
  check(
    "cấp 1 chưa đủ điều kiện: mọi cửa đều khóa",
    view.map((n) => n.state),
    Array(8).fill("LOCKED"),
  );
  check(
    "chỉ cửa đầu tiên được đánh dấu đang đứng",
    view.filter((n) => n.isCurrent).map((n) => n.code),
    ["NODE_01"],
  );
}

{
  const view = campaignView(1, { TRIAL_01_DAO_VIEN: { status: "ELIGIBLE" } });
  check("đủ điều kiện thì cửa đầu chuyển sang AVAILABLE", view[0].state, "AVAILABLE");
  check(
    "bảy cửa còn lại vẫn khóa, không hiện như lời mời",
    view.slice(1).every((n) => n.state === "LOCKED"),
    true,
  );
}

console.log("\n— Đang thí luyện —");

{
  const view = campaignView(1, { TRIAL_01_DAO_VIEN: { status: "ACTIVE" } });
  check("đang làm dở thì node là ACTIVE", view[0].state, "ACTIVE");
}

console.log("\n— Đã vượt —");

{
  const view = campaignView(2, { TRIAL_01_DAO_VIEN: { status: "PASSED" } });
  check("cửa đã vượt là PASSED", view[0].state, "PASSED");
  check("cờ hổ phù chuyển sang cửa kế tiếp", view[1].isCurrent, true);
  check("cửa đầu không còn là vị trí hiện tại", view[0].isCurrent, false);
}

{
  // Người được admin nâng cấp trong sự cố, hoặc dữ liệu cũ thiếu UserTrial.
  const view = campaignView(5, {});
  check(
    "cửa nằm dưới cấp hiện tại vẫn hiện PASSED dù thiếu bản ghi",
    view.slice(0, 4).map((n) => n.state),
    ["PASSED", "PASSED", "PASSED", "PASSED"],
  );
  check("cửa của cấp hiện tại thì chưa PASSED", view[4].state, "LOCKED");
}

console.log("\n— Cấp cao nhất —");

{
  const view = campaignView(9, {});
  check("cấp 9 đã vượt cả tám cửa", view.map((n) => n.state), Array(8).fill("PASSED"));
  check("cấp 9 không còn cửa nào là vị trí hiện tại", view.some((n) => n.isCurrent), false);
}

console.log("\n— Gợi ý điều kiện còn thiếu —");

{
  const view = campaignView(1, {
    TRIAL_01_DAO_VIEN: { status: "LOCKED", hint: "Cần làm 3 đề khác nhau." },
    TRIAL_08_HO_LAO: { status: "LOCKED", hint: "Cần 20 câu của dạng yếu nhất." },
  });
  check("cửa đang tới có hiển thị điều kiện còn thiếu", view[0].hint, "Cần làm 3 đề khác nhau.");
  check("cửa ở xa KHÔNG đổ điều kiện chi tiết ra", view[7].hint, null);
}

console.log("\n— Toàn vẹn catalog —");

{
  check("có đúng 8 node", CAMPAIGN_NODES.length, 8);
  check(
    "mọi node trỏ tới một thí luyện có thật",
    CAMPAIGN_NODES.filter((n) => !TRIAL_SEEDS.some((t) => t.code === n.trialCode)).map(
      (n) => n.code,
    ),
    [],
  );
  check(
    "mỗi thí luyện có đúng một node",
    TRIAL_SEEDS.filter(
      (t) => CAMPAIGN_NODES.filter((n) => n.trialCode === t.code).length !== 1,
    ).map((t) => t.code),
    [],
  );
  check(
    "tọa độ nằm trong khung ảnh",
    CAMPAIGN_NODES.filter(
      (n) => n.x < 0 || n.x > 100 || n.y < 0 || n.y > 100,
    ).map((n) => n.code),
    [],
  );
  check(
    "bản đồ đi từ trái sang phải theo đúng thứ tự cửa ải",
    CAMPAIGN_NODES.every((n, i) => i === 0 || n.x > CAMPAIGN_NODES[i - 1].x),
    true,
  );
  check(
    "nhân vật của node khớp nhân vật của thí luyện",
    CAMPAIGN_NODES.filter((n) => {
      const trial = TRIAL_SEEDS.find((t) => t.code === n.trialCode);
      return trial?.featuredGeneralCode !== n.featuredGeneralCode;
    }).map((n) => n.code),
    [],
  );
}

console.log("\n— Không bao giờ hạ cấp —");

{
  // Quét mọi cấp bậc: số cửa PASSED phải tăng đơn điệu theo cấp.
  const counts = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(
    (level) => stateAt(level).filter((s) => s === "PASSED").length,
  );
  check("số cửa đã vượt tăng đơn điệu theo cấp bậc", counts, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
}

console.log(
  failures === 0
    ? "\n✅ TẤT CẢ KIỂM THỬ BẢN ĐỒ ĐỀU ĐẠT\n"
    : `\n❌ ${failures} KIỂM THỬ THẤT BẠI\n`,
);
process.exit(failures === 0 ? 0 : 1);
