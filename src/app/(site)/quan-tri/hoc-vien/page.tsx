import {
  UserRoundCheck,
  UserRoundX,
  LockKeyholeOpen,
  LockKeyhole,
  Brain,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import {
  toggleUserActiveAction,
  toggleAllExerciseAccessAction,
  toggleAllFeynmanAccessAction,
} from "@/lib/actions/admin";
import { summarizeGrantsForAdmin } from "@/lib/access-grants";
import { coinBalance, formatCoins } from "@/lib/payments/coins";
import { GiftCoinsForm } from "@/components/admin/gift-coins-form";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";
import { DeleteUserButton } from "@/components/admin/delete-user-button";

export const metadata = { title: "Quản lý học viên" };

function fmt(d: Date) {
  return d.toLocaleDateString("vi-VN");
}

export default async function AdminStudentsPage() {
  await requireAdmin();

  const [students, restrictedCount, grants, wallets] = await Promise.all([
    db.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { attempts: { where: { exercise: { skill: "READING" } } } },
        },
      },
    }),
    db.exercise.count({
      where: { skill: "READING", accessLevel: "RESTRICTED" },
    }),
    // Cần phân biệt quyền trung tâm TẶNG với quyền học viên MUA, vì nút
    // mở/thu hồi bên dưới chỉ được phép đụng tới phần tặng.
    summarizeGrantsForAdmin(),
    db.coinWallet.findMany({
      select: { userId: true, grantedTotal: true, spentTotal: true },
    }),
  ]);

  // Tra cứu theo Map thay vì hỏi database cho từng học viên: bảng này liệt kê
  // TOÀN BỘ học viên, nên một truy vấn mỗi dòng sẽ thành hàng trăm truy vấn.
  const balanceOf = new Map(
    wallets.map((w) => [w.userId, coinBalance(w)] as const)
  );

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <p className="label-caps">Danh sách</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep md:text-4xl">
        Quản lý học viên
      </h1>
      <div className="rule-gold mt-5" />
      <p className="mt-5 max-w-3xl text-[0.95rem] leading-relaxed text-ink-soft">
        Học viên tự đăng ký bằng email. Bạn có thể đặt lại mật khẩu khi học viên
        quên (nhớ báo mật khẩu mới qua Zalo/điện thoại), khóa tài khoản bất
        thường, tặng quyền học, hoặc xóa vĩnh viễn tài khoản.
      </p>
      <p className="mt-3 max-w-3xl border-l-4 border-gold bg-cream-deep px-5 py-3.5 font-ui text-sm leading-relaxed text-ink-soft">
        Hai nút <strong>tặng quyền</strong> (ổ khóa = Reading, bộ não = Feynman)
        chỉ thêm hoặc gỡ đúng phần trung tâm tặng. Bài học viên đã tự bỏ tiền mua
        không bao giờ bị các nút này gỡ mất.
      </p>

      {restrictedCount === 0 && (
        <p className="mt-4 border-l-4 border-gold bg-cream-deep px-4 py-3 font-ui text-sm text-ink-soft">
          Hiện chưa có bài tập nào ở mức <strong>Cần mở khóa</strong>. Vào{" "}
          <strong>Bài tập</strong> để đặt mức truy cập cho từng đề.
        </p>
      )}

      {students.length === 0 ? (
        <p className="mt-10 border border-line bg-paper p-8 text-center text-ink-soft">
          Chưa có học viên nào đăng ký.
        </p>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[860px] border border-line font-ui text-sm">
            <thead>
              <tr className="bg-navy text-paper">
                <th className="px-4 py-3 text-left font-semibold">Họ tên</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-center font-semibold">Ngày đăng ký</th>
                <th className="px-4 py-3 text-center font-semibold">Bài đã làm</th>
                <th className="px-4 py-3 text-center font-semibold">Ví xu</th>
                <th className="px-4 py-3 text-center font-semibold">Quyền Reading</th>
                <th className="px-4 py-3 text-center font-semibold">Trạng thái</th>
                <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.map((s) => {
                // "Đã tặng" = quyền do trung tâm cấp, tách hẳn với quyền đã mua
                const gifted = grants.readingGift.has(s.id);
                const bought = grants.readingPurchases.get(s.id) ?? 0;
                const boughtPackage = grants.readingPackage.has(s.id);
                return (
                  <tr key={s.id} className={s.active ? "bg-paper" : "bg-cream opacity-70"}>
                    <td className="px-4 py-3 font-semibold text-ink">{s.name}</td>
                    <td className="px-4 py-3 text-ink-soft">{s.email}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-ink-soft">
                      {fmt(s.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-ink-soft">
                      {s._count.attempts}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-ui text-sm font-semibold tabular-nums text-ink">
                        {formatCoins(balanceOf.get(s.id) ?? 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {gifted && (
                        <span className="block font-semibold text-success">
                          Trung tâm đã tặng toàn bộ
                        </span>
                      )}
                      {boughtPackage && (
                        <span className="block font-semibold text-navy">
                          Đã mua gói 30 ngày
                        </span>
                      )}
                      {bought > 0 && !boughtPackage && (
                        <span className="block text-ink-soft">
                          Đã mua {bought} bài
                        </span>
                      )}
                      {!gifted && bought === 0 && (
                        <span className="text-muted">Chưa có quyền</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.active ? (
                        <span className="border border-success bg-success-pale px-2 py-0.5 text-xs font-semibold text-success">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="border border-danger bg-danger-pale px-2 py-0.5 text-xs font-semibold text-danger">
                          Đã khóa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <ResetPasswordForm userId={s.id} userEmail={s.email} />

                        <GiftCoinsForm userId={s.id} userName={s.name} />

                        <form action={toggleAllExerciseAccessAction.bind(null, s.id)}>
                          <button
                            type="submit"
                            disabled={restrictedCount === 0}
                            title={
                              restrictedCount === 0
                                ? "Chưa có bài tập nào cần mở khóa"
                                : gifted
                                  ? "Thu hồi phần trung tâm đã tặng (KHÔNG đụng tới bài học viên đã mua)"
                                  : "Tặng quyền làm toàn bộ bài Reading"
                            }
                            className={`flex h-9 w-9 cursor-pointer items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                              gifted
                                ? "border-success bg-success-pale text-success"
                                : "border-line text-ink-soft hover:border-gold hover:text-gold"
                            }`}
                          >
                            {gifted ? (
                              <LockKeyholeOpen className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                            )}
                            <span className="sr-only">
                              {gifted ? "Thu hồi quyền đã tặng" : "Tặng quyền Reading"}
                            </span>
                          </button>
                        </form>

                        <form action={toggleAllFeynmanAccessAction.bind(null, s.id)}>
                          <button
                            type="submit"
                            title={
                              grants.feynmanGift.has(s.id)
                                ? "Thu hồi quyền chữa bài Feynman đã tặng"
                                : "Tặng quyền chữa bài Feynman cho toàn bộ bài"
                            }
                            className={`flex h-9 w-9 cursor-pointer items-center justify-center border transition-colors ${
                              grants.feynmanGift.has(s.id)
                                ? "border-success bg-success-pale text-success"
                                : "border-line text-ink-soft hover:border-gold hover:text-gold"
                            }`}
                          >
                            <Brain className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">
                              {grants.feynmanGift.has(s.id)
                                ? "Thu hồi quyền Feynman"
                                : "Tặng quyền Feynman"}
                            </span>
                          </button>
                        </form>

                        <form action={toggleUserActiveAction.bind(null, s.id)}>
                          <button
                            type="submit"
                            title={s.active ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                            className={`flex h-9 w-9 cursor-pointer items-center justify-center border border-line transition-colors ${
                              s.active
                                ? "text-ink-soft hover:border-danger hover:text-danger"
                                : "text-success hover:border-success"
                            }`}
                          >
                            {s.active ? (
                              <UserRoundX className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <UserRoundCheck className="h-4 w-4" aria-hidden="true" />
                            )}
                            <span className="sr-only">
                              {s.active ? "Khóa" : "Mở khóa"}
                            </span>
                          </button>
                        </form>

                        <DeleteUserButton
                          userId={s.id}
                          userEmail={s.email}
                          userName={s.name}
                          attemptCount={s._count.attempts}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 space-y-1.5 font-ui text-xs leading-relaxed text-muted">
        <p>
          <strong>Đặt lại mật khẩu</strong> (chìa khóa) · <strong>Mở khóa bài tập</strong> (ổ khóa) ·{" "}
          <strong>Khóa tài khoản</strong> (người) · <strong>Xóa tài khoản</strong> (thùng rác).
        </p>
        <p>
          Khóa tài khoản chỉ ngăn đăng nhập và có thể mở lại; xóa tài khoản là
          vĩnh viễn và mất toàn bộ bài làm.
        </p>
      </div>
    </section>
  );
}
