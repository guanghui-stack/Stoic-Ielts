"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";
import { deleteUserAction, type AdminFormState } from "@/lib/actions/admin";
import { ErrorBanner, SubmitButton } from "@/components/ui";

/**
 * Xóa vĩnh viễn tài khoản học viên. Vì không thể hoàn tác, người dùng phải gõ
 * đúng email để xác nhận (máy chủ cũng kiểm tra lại lần nữa).
 */
export function DeleteUserButton({
  userId,
  userEmail,
  userName,
  attemptCount,
}: {
  userId: string;
  userEmail: string;
  userName: string;
  attemptCount: number;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    deleteUserAction,
    undefined
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Xóa vĩnh viễn tài khoản ${userEmail}`}
        className="motion-press flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-ink-soft hover:border-danger hover:bg-danger-pale hover:text-danger"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Xóa tài khoản</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`delete-user-title-${userId}`}
        className="motion-dialog"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
          <div className="w-full border border-line bg-paper p-7 shadow-lift">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-danger" aria-hidden="true" />
                <div>
                  <h2
                    id={`delete-user-title-${userId}`}
                    className="font-display text-xl font-bold text-navy-deep"
                  >
                    Xóa vĩnh viễn tài khoản?
                  </h2>
                  <p className="mt-1 font-ui text-sm text-ink-soft">
                    {userName} · {userEmail}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="motion-press flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-ink-soft hover:text-danger"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 border-l-4 border-danger bg-danger-pale px-4 py-3 font-ui text-sm text-danger">
              Thao tác này <strong>không thể hoàn tác</strong>. Toàn bộ{" "}
              <strong>{attemptCount} bài làm</strong>, điểm số và nhận xét của
              học viên này sẽ bị xóa theo.
              <br />
              Nếu chỉ muốn ngăn học viên đăng nhập, hãy dùng nút{" "}
              <strong>khóa tài khoản</strong> thay vì xóa.
            </div>

            {state?.success ? (
              <>
                <p className="mt-5 border-l-4 border-success bg-success-pale px-4 py-3 font-ui text-sm text-success">
                  {state.success}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="motion-press mt-5 cursor-pointer border border-navy px-6 py-2.5 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-navy hover:bg-navy hover:text-paper"
                >
                  Đóng
                </button>
              </>
            ) : (
              <form action={formAction} className="mt-5 space-y-4">
                <input type="hidden" name="userId" value={userId} />
                <ErrorBanner message={state?.error} />
                <div>
                  <label
                    htmlFor={`confirm-${userId}`}
                    className="block font-ui text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-ink"
                  >
                    Gõ chính xác email để xác nhận
                  </label>
                  <p className="mt-1 select-all font-ui text-sm text-muted">{userEmail}</p>
                  <input
                    id={`confirm-${userId}`}
                    name="confirmEmail"
                    required
                    autoFocus
                    autoComplete="off"
                    placeholder="Nhập lại email ở trên"
                    className="mt-2 w-full border border-line-strong bg-paper px-4 py-3 font-ui text-[0.95rem] text-ink placeholder:text-muted focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <SubmitButton disabled={pending} variant="danger" className="motion-press">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {pending ? "Đang xóa…" : "Xóa vĩnh viễn"}
                  </SubmitButton>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="motion-press cursor-pointer border border-line px-6 py-3 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-ink-soft hover:border-navy hover:text-navy"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}
          </div>
      </dialog>
    </>
  );
}
