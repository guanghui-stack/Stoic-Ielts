"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  OFFERS,
  isOfferCode,
  isOfferOnSale,
  type OfferCode,
} from "@/lib/payments/catalog";
import {
  COIN_RATE_VERSION,
  TOPUP_TIERS,
  isTopUpTierCode,
} from "@/lib/payments/coins";
import { spendCoinsForOffer } from "@/lib/payments/coin-service";
import { sePayEnvironment, isSePayConfigured } from "@/lib/payments/sepay";

/** Đơn chưa trả tiền sau 24 giờ coi như bỏ; học viên bấm mua lại là có đơn mới. */
const ORDER_TTL_MS = 24 * 60 * 60 * 1000;

/** Chặn bấm mua dồn dập (bot hoặc bấm liên tục) — đếm ngay trên database. */
const MAX_PENDING_PER_HOUR = 12;

/** Mã đơn dạng WB-260801-A1B2C3: đọc được bằng mắt khi đối soát với SePay. */
function newInvoiceNumber(): string {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(2, 14);
  return `WB-${stamp}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * Nạp xu vào ví — ĐƯỜNG DUY NHẤT tiền thật đi vào hệ thống.
 *
 * Từ 11/08/2026 không còn đường trả VND thẳng cho một gói nào: học viên nạp
 * xu, rồi tiêu xu. Một đường vào duy nhất là chủ ý, không phải tiện tay — hai
 * đường cấp quyền song song sớm muộn cũng lệch nhau, và lệch ở chỗ này nghĩa
 * là có người trả tiền mà không được học.
 *
 * Biểu mẫu chỉ gửi lên MÃ MỐC NẠP. Số tiền và số xu đều lấy từ bảng phía máy
 * chủ, nên sửa HTML không nạp được nhiều xu hơn.
 */
export async function createTopUpOrderAction(formData: FormData) {
  const user = await requireUser();

  if (!isSePayConfigured()) {
    redirect("/thanh-toan?loi=chua-cau-hinh");
  }

  const tierCodeRaw = String(formData.get("tierCode") ?? "");
  if (!isTopUpTierCode(tierCodeRaw)) redirect("/thanh-toan?loi=san-pham");
  const tier = TOPUP_TIERS[tierCodeRaw];

  // Nạp xong quay về đúng chỗ đang đứng. Lượt làm bài chỉ dùng để dựng đường
  // quay về; ví là của tài khoản nên KHÔNG ghim vào đơn nạp.
  const attemptIdRaw = String(formData.get("attemptId") ?? "").trim() || null;
  const returnPath = await topUpReturnPath(user.id, attemptIdRaw);

  // Bấm nạp nhiều lần cùng một mốc thì quay lại đúng đơn đang chờ, thay vì rải
  // ra hàng loạt đơn rác khiến việc đối soát rối tung.
  const reusable = await db.paymentOrder.findFirst({
    where: {
      userId: user.id,
      orderKind: "TOPUP",
      offerCode: tierCodeRaw,
      status: "PENDING",
      amount: tier.amountVnd,
      priceVersion: COIN_RATE_VERSION,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true },
  });
  if (reusable) redirect(`/thanh-toan/${reusable.invoiceNumber}`);

  const recentPending = await db.paymentOrder.count({
    where: {
      userId: user.id,
      status: "PENDING",
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recentPending >= MAX_PENDING_PER_HOUR) {
    redirect("/thanh-toan?loi=qua-nhieu-don");
  }

  const order = await db.paymentOrder.create({
    data: {
      invoiceNumber: newInvoiceNumber(),
      userId: user.id,
      exerciseId: null,
      attemptId: null,
      returnPath,
      offerCode: tierCodeRaw,
      orderKind: "TOPUP",
      // Chốt số xu vào đơn NGAY LÚC TẠO. Đổi mức thưởng sau đó không được phép
      // làm thay đổi số xu của một đơn học viên đã bấm mua theo tỉ lệ cũ.
      coinsGranted: tier.coins,
      feature: "COIN",
      scope: "NONE",
      amount: tier.amountVnd,
      currency: "VND",
      priceVersion: COIN_RATE_VERSION,
      priceRule: "STANDARD",
      status: "PENDING",
      provider: "SEPAY_PG",
      providerEnvironment: sePayEnvironment(),
      expiresAt: new Date(Date.now() + ORDER_TTL_MS),
    },
    select: { invoiceNumber: true },
  });

  redirect(`/thanh-toan/${order.invoiceNumber}`);
}

/**
 * Tiêu xu để mở một gói. Xong ngay, không qua cổng thanh toán, không có đơn
 * treo — đây là lợi ích thật của hệ xu: bớt hẳn một chặng hay hỏng.
 *
 * Việc trừ xu và cấp quyền nằm ở `spendCoinsForOffer()`; hàm này chỉ lo xác
 * minh đầu vào rồi dẫn học viên về đúng chỗ.
 */
export async function buyWithCoinsAction(formData: FormData) {
  const user = await requireUser();

  const offerCodeRaw = String(formData.get("offerCode") ?? "");
  if (!isOfferCode(offerCodeRaw)) redirect("/thanh-toan?loi=san-pham");
  const offerCode: OfferCode = offerCodeRaw;
  if (!isOfferOnSale(offerCode)) redirect("/thanh-toan?loi=ngung-ban");

  const exerciseId = String(formData.get("exerciseId") ?? "").trim() || null;
  const attemptId = String(formData.get("attemptId") ?? "").trim() || null;
  const spendToken = String(formData.get("spendToken") ?? "").trim() || null;

  // Chỗ DUY NHẤT xác minh lượt làm bài có thật, đúng chủ, đã chấm và đúng bài.
  // Không tin bất cứ ID nào từ trình duyệt.
  const resolved = await resolveReturnTarget({
    userId: user.id,
    offerCode,
    exerciseId,
    attemptId,
  });

  const result = await spendCoinsForOffer({
    userId: user.id,
    offerCode,
    exerciseId,
    attemptId: resolved.attemptId,
    spendToken,
  });

  if (result.ok) redirect(resolved.path);

  // Thiếu xu là trường hợp PHỔ BIẾN nhất, nên nó phải dẫn thẳng tới chỗ nạp
  // kèm số còn thiếu — chứ không phải một câu "không đủ" rồi bỏ mặc.
  if (result.reason === "NOT_ENOUGH_COINS") {
    redirect(`/thanh-toan?loi=thieu-xu&thieu=${result.missing}`);
  }
  if (result.reason === "ALREADY_OWNED") redirect(resolved.path);
  redirect("/thanh-toan?loi=san-pham");
}

/**
 * Đường quay về sau khi nạp ví.
 *
 * Lượt làm bài không hợp lệ thì lặng lẽ bỏ qua thay vì chặn — học viên chỉ
 * đang nạp tiền vào ví của chính mình, không có gì để bảo vệ ở đây.
 */
async function topUpReturnPath(
  userId: string,
  attemptId: string | null
): Promise<string> {
  if (!attemptId) return "/thanh-toan";
  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    select: { id: true, userId: true, status: true },
  });
  const mine =
    attempt && attempt.userId === userId && attempt.status === "GRADED";
  return mine ? `/hoc-vien/bai-lam/${attempt.id}` : "/thanh-toan";
}

type ReturnTarget = {
  /** Đường dẫn quay về sau khi trả tiền. */
  path: string;
  /** Lượt làm bài mà đơn này gắn vào, null nếu gói không gắn lượt nào. */
  attemptId: string | null;
};

/**
 * Xác minh bài/lượt làm rồi dựng đường quay về sau khi trả tiền.
 *
 * Đường dẫn luôn do máy chủ dựng và luôn là đường nội bộ, nên không thể bị lợi
 * dụng để chuyển hướng ra ngoài. Đây cũng là chỗ DUY NHẤT xác minh lượt làm bài
 * có thật và có đúng chủ không — `attemptId` trả về từ đây đã qua kiểm tra, nên
 * các bước sau được phép tin nó và ghi thẳng vào đơn.
 */
async function resolveReturnTarget(input: {
  userId: string;
  offerCode: OfferCode;
  exerciseId: string | null;
  attemptId: string | null;
}): Promise<ReturnTarget> {
  const offer = OFFERS[input.offerCode];

  // Gói nạp lượt không mở quyền gì nên không cần bài cũng không cần lượt. Vẫn
  // cố đưa học viên về đúng chỗ họ đang đứng khi bấm mua, nhưng lượt không hợp
  // lệ thì lặng lẽ bỏ qua thay vì chặn — họ chỉ đang nạp tiền vào ví.
  if (offer.kind === "AI_TOPUP") {
    const attempt = input.attemptId
      ? await db.attempt.findUnique({
          where: { id: input.attemptId },
          select: { id: true, userId: true, status: true },
        })
      : null;
    const mine =
      attempt && attempt.userId === input.userId && attempt.status === "GRADED";
    return {
      path: mine ? `/hoc-vien/bai-lam/${attempt.id}/feynman` : "/hoc-vien",
      // Ví là của tài khoản, không của lượt nào. Ghi attemptId vào đơn nạp lượt
      // sẽ khiến truy vấn "đơn dùng lại được" gom nhầm các đơn nạp khác nhau.
      attemptId: null,
    };
  }

  if (offer.scope === "ALL") {
    return {
      path: offer.feature === "READING" ? "/luyen-tap/reading" : "/hoc-vien",
      attemptId: null,
    };
  }

  if (!input.exerciseId) redirect("/thanh-toan?loi=thieu-bai");
  const exercise = await db.exercise.findUnique({
    where: { id: input.exerciseId },
    select: { id: true, published: true, skill: true },
  });
  if (!exercise || !exercise.published || exercise.skill !== "READING") {
    redirect("/luyen-tap/reading");
  }

  if (offer.feature === "READING") {
    return { path: "/luyen-tap/reading", attemptId: null };
  }

  // Feynman gắn với một lượt làm bài ĐÃ CHẤM của chính học viên đó — chưa làm
  // bài thì chưa có gì để chữa.
  const attempt = input.attemptId
    ? await db.attempt.findUnique({
        where: { id: input.attemptId },
        select: { id: true, userId: true, exerciseId: true, status: true },
      })
    : await db.attempt.findFirst({
        where: {
          userId: input.userId,
          exerciseId: input.exerciseId,
          status: "GRADED",
        },
        orderBy: { submittedAt: "desc" },
        select: { id: true, userId: true, exerciseId: true, status: true },
      });

  if (
    !attempt ||
    attempt.userId !== input.userId ||
    attempt.exerciseId !== input.exerciseId ||
    attempt.status !== "GRADED"
  ) {
    redirect("/hoc-vien");
  }

  return {
    path: `/hoc-vien/bai-lam/${attempt.id}`,
    // Chỉ gói bán theo lượt mới ghim lượt vào đơn. Gói cũ scope EXERCISE giữ
    // nguyên null để quyền của nó vẫn phủ mọi lượt của bài như đã bán.
    attemptId: offer.scope === "ATTEMPT" ? attempt.id : null,
  };
}

/** Học viên tự bỏ một đơn đang chờ (nút "Hủy đơn" ở trang kết quả). */
export async function cancelPaymentOrderAction(invoiceNumber: string) {
  const user = await requireUser();
  const order = await db.paymentOrder.findUnique({
    where: { invoiceNumber },
    select: { id: true, userId: true, status: true },
  });
  if (!order || order.userId !== user.id) redirect("/thanh-toan");
  if (order.status === "PENDING") {
    await db.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        // Nhả khóa ưu đãi: học viên chưa trả tiền nên chưa tiêu ưu đãi
        introPromoToken: null,
      },
    });
  }
  redirect(`/thanh-toan/${invoiceNumber}/ket-qua`);
}
