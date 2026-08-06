"use client";

import { useActionState } from "react";
import { Download, Trash2, ShieldOff } from "lucide-react";
import {
  requestExportAction,
  requestDeletionAction,
  withdrawConsentAction,
  type DataRightsState,
} from "@/lib/actions/data-rights";
import { ErrorBanner, SubmitButton } from "@/components/ui";

/**
 * Ba nút thực hiện quyền dữ liệu.
 *
 * Mỗi nút một form riêng và một trạng thái riêng: ba việc này khác hẳn nhau về
 * hậu quả, gộp chung phản hồi thì người dùng không biết cái nào vừa chạy.
 *
 * Nút xoá cố ý KHÔNG dùng màu nguy hiểm và KHÔNG có hộp thoại doạ nạt. Đây là
 * quyền của họ, không phải hành động cần can ngăn. Hậu quả được nói bằng chữ
 * ngay bên cạnh, và trung tâm còn một bước xác nhận nữa trước khi thực hiện.
 */

function Feedback({ state }: { state: DataRightsState }) {
  if (!state) return null;
  return (
    <div className="mt-3">
      {state.error && <ErrorBanner message={state.error} />}
      {state.success && (
        <p role="status" className="font-ui text-sm text-jade-ink">
          {state.success}
        </p>
      )}
    </div>
  );
}

function RightForm({
  action,
  icon: Icon,
  label,
  description,
}: {
  action: () => Promise<DataRightsState>;
  icon: typeof Download;
  label: string;
  description: string;
}) {
  const [state, formAction, pending] = useActionState<DataRightsState, FormData>(
    async () => action(),
    undefined,
  );

  return (
    <div className="border border-line bg-paper p-6">
      <p className="flex items-center gap-2 font-ui text-sm font-semibold text-navy-deep">
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </p>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{description}</p>
      <form action={formAction} className="mt-4">
        <SubmitButton variant="outline" disabled={pending}>
          {pending ? "Đang gửi..." : "Gửi yêu cầu"}
        </SubmitButton>
      </form>
      <Feedback state={state} />
    </div>
  );
}

export function DataRightsForms() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <RightForm
        action={requestExportAction}
        icon={Download}
        label="Xem dữ liệu của tôi"
        description="Trung tâm gửi bản sao đầy đủ dữ liệu đang lưu về bạn, qua email đăng ký."
      />
      <RightForm
        action={requestDeletionAction}
        icon={Trash2}
        label="Yêu cầu xoá"
        description="Xoá dữ liệu cá nhân. Một phần phải giữ lại theo nghĩa vụ tuân thủ — xem bảng bên dưới."
      />
      <RightForm
        action={withdrawConsentAction}
        icon={ShieldOff}
        label="Rút đồng ý"
        description="Bạn sẽ không dự được kỳ thi cần xác minh danh tính cho tới khi đồng ý lại."
      />
    </div>
  );
}
