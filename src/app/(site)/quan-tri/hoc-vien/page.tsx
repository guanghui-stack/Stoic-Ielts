import { UserRoundCheck, UserRoundX, LockKeyholeOpen, LockKeyhole } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import {
  toggleUserActiveAction,
  toggleAllExerciseAccessAction,
} from "@/lib/actions/admin";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";
import { DeleteUserButton } from "@/components/admin/delete-user-button";

export const metadata = { title: "Quản lý học viên" };

function fmt(d: Date) {
  return d.toLocaleDateString("vi-VN");
}

export default async function AdminStudentsPage() {
  await requireAdmin();

  const [students, restrictedCount] = await Promise.all([
    db.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { attempts: true, exerciseAccess: true } },
      },
    }),
    db.exercise.count({ where: { accessLevel: "RESTRICTED" } }),
  ]);

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
        thường, mở khóa các bài tập cần cấp quyền, hoặc xóa vĩnh viễn tài khoản.
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
                <th className="px-4 py-3 text-center font-semibold">Bài đã mở khóa</th>
                <th className="px-4 py-3 text-center font-semibold">Trạng thái</th>
                <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.map((s) => {
                const unlocked = s._count.exerciseAccess;
                const allUnlocked = restrictedCount > 0 && unlocked >= restrictedCount;
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
                    <td className="px-4 py-3 text-center tabular-nums">
                      {restrictedCount === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span className={allUnlocked ? "font-semibold text-success" : "text-ink-soft"}>
                          {unlocked}/{restrictedCount}
                        </span>
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

                        <form action={toggleAllExerciseAccessAction.bind(null, s.id)}>
                          <button
                            type="submit"
                            disabled={restrictedCount === 0}
                            title={
                              restrictedCount === 0
                                ? "Chưa có bài tập nào cần mở khóa"
                                : allUnlocked
                                  ? "Thu hồi toàn bộ bài tập đã mở khóa"
                                  : "Mở khóa toàn bộ bài tập cần cấp quyền"
                            }
                            className={`flex h-9 w-9 cursor-pointer items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                              allUnlocked
                                ? "border-success bg-success-pale text-success"
                                : "border-line text-ink-soft hover:border-gold hover:text-gold"
                            }`}
                          >
                            {allUnlocked ? (
                              <LockKeyholeOpen className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                            )}
                            <span className="sr-only">
                              {allUnlocked ? "Thu hồi bài tập" : "Mở khóa bài tập"}
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
