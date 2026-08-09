import { notFound } from "next/navigation";
import { AlertTriangle, Wallet, Coins, Activity } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { features } from "@/lib/features";
import { readFeynmanAiConfig } from "@/lib/feynman-ai/config";
import { loadFeynmanAiStats } from "@/lib/feynman-ai/admin-stats";
import { hasPricing, microUsdToVnd, COST_TABLE_VERSION } from "@/lib/feynman-ai/cost";

/**
 * Trang theo dõi Feynman AI.
 *
 * Ba câu hỏi trang này phải trả lời được trong mười giây: hôm nay tốn bao nhiêu
 * tiền, có bản chấm nào hỏng không, và có cảnh báo nào đang chờ người xem.
 *
 * Số tiền ở đây là ƯỚC TÍNH theo bảng giá công khai, KHÔNG phải hóa đơn. Mục
 * đích là phát hiện sớm khi một tài khoản hoặc một dạng câu hỏi đốt tiền bất
 * thường, chứ không phải để đối soát với OpenAI.
 */

export const metadata = { title: "Feynman AI — Theo dõi" };
export const dynamic = "force-dynamic";

const SEVERITY_STYLE: Record<string, string> = {
  HIGH: "border-danger bg-danger-pale text-danger",
  MEDIUM: "border-gold bg-gold-pale text-ink",
  LOW: "border-line-strong bg-cream-deep text-ink-soft",
};

const KIND_LABEL: Record<string, string> = {
  SAI_KET_LUAN: "Kết luận sai",
  SAI_TRICH_DAN: "Trích dẫn không có trong bài",
  KHONG_HIEU: "Nhận xét khó hiểu",
  LOI_KHAC: "Lỗi khác",
  PASSAGE_MAU_THUAN: "Nghi passage mâu thuẫn đáp án",
};

function fmt(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default async function AdminFeynmanAiPage() {
  await requireAdmin();
  // Cờ tắt thì trang không tồn tại, không phải "tồn tại nhưng báo chưa bật" —
  // một trang quản trị nửa vời dễ bị hiểu là hỏng.
  if (!features.feynmanAi) notFound();

  const config = readFeynmanAiConfig();
  const stats = await loadFeynmanAiStats();
  const { alerts, recent, wallet } = stats;

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <p className="label-caps">Quản trị</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep">
        Feynman AI
      </h1>
      <div className="rule-gold mt-5" />

      {!config.enabled && (
        <p className="mt-6 flex items-center gap-2.5 border-l-4 border-gold bg-gold-pale px-5 py-4 font-ui text-sm text-ink">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Tính năng đang TẮT với học viên. Số liệu bên dưới là của giai đoạn đã
          chạy trước đó.
        </p>
      )}

      {/* ---- Bốn con số cần biết ngay ---- */}
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<Activity className="h-4 w-4" aria-hidden="true" />}
          label={`Lượt chấm ${stats.windowDays} ngày`}
          value={String(stats.completedCount)}
          note={
            stats.failedCount > 0
              ? `${stats.failedCount} lượt hỏng`
              : "Không có lượt hỏng"
          }
          tone={stats.failedCount > 0 ? "warn" : "normal"}
        />
        <Stat
          icon={<Coins className="h-4 w-4" aria-hidden="true" />}
          label={`Chi phí ước tính ${stats.windowDays} ngày`}
          value={
            hasPricing(config.model)
              ? `${microUsdToVnd(stats.costMicroUsd).toLocaleString("vi-VN")}đ`
              : "Chưa có bảng giá"
          }
          note={`${(stats.costMicroUsd / 1_000_000).toFixed(2)} USD · bảng giá ${COST_TABLE_VERSION}`}
        />
        <Stat
          icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
          label="Ví lượt toàn hệ thống"
          value={`${wallet.remaining} lượt`}
          note={`Đã bán ${wallet.granted} · đã dùng ${wallet.used}`}
        />
        <Stat
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          label="Cảnh báo đang mở"
          value={String(alerts.length)}
          note={alerts.length > 0 ? "Cần người xem lại" : "Không có gì chờ"}
          tone={alerts.length > 0 ? "warn" : "normal"}
        />
      </dl>

      <p className="mt-4 font-ui text-[0.8rem] leading-relaxed text-muted">
        Chi phí là ƯỚC TÍNH theo bảng giá công khai của OpenAI, không phải hóa
        đơn. Hóa đơn thật vẫn là thứ OpenAI gửi. Model đang dùng:{" "}
        <strong className="text-ink">{config.model}</strong>. Trung bình{" "}
        {stats.avgLatencyMs}ms mỗi lượt, mức tương đồng trung bình{" "}
        {stats.avgSimilarityPercent}%.
      </p>

      {/* ---- Hàng đợi cảnh báo ---- */}
      <h2 className="mt-12 font-display text-xl font-bold text-navy-deep">
        Cảnh báo đang chờ
      </h2>
      {alerts.length === 0 ? (
        <p className="mt-3 font-ui text-sm text-muted">
          Không có cảnh báo nào đang mở.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={`border-l-4 px-5 py-4 ${
                SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.LOW
              }`}
            >
              <p className="font-ui text-sm font-semibold">
                {KIND_LABEL[alert.kind] ?? alert.kind}
                <span className="ml-3 font-normal text-muted">
                  {alert.source === "STUDENT" ? "Học viên báo" : "AI tự báo"} ·{" "}
                  {fmt(alert.createdAt)}
                </span>
              </p>
              {alert.questionCode && (
                <p className="mt-1 font-ui text-[0.8rem] text-muted">
                  Câu {alert.questionCode}
                </p>
              )}
              {alert.detail && (
                <p className="mt-2 text-[0.9rem] leading-relaxed">
                  {alert.detail}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ---- Lượt chấm gần nhất ---- */}
      <h2 className="mt-12 font-display text-xl font-bold text-navy-deep">
        Lượt chấm gần nhất
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse font-ui text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-muted">
              <Th>Thời điểm</Th>
              <Th>Trạng thái</Th>
              <Th>Kết quả</Th>
              <Th>Tương đồng</Th>
              <Th>Tin cậy</Th>
              <Th>Độ trễ</Th>
              <Th>Chi phí</Th>
            </tr>
          </thead>
          <tbody>
            {recent.map((row) => (
              <tr key={row.id} className="border-b border-line">
                <Td>{fmt(row.createdAt)}</Td>
                <Td>
                  {row.status === "FAILED" ? (
                    <span className="text-danger">
                      Hỏng{row.errorCode ? ` · ${row.errorCode}` : ""}
                    </span>
                  ) : (
                    row.status
                  )}
                </Td>
                <Td>
                  {row.verdict === "DAT"
                    ? "Đạt"
                    : row.verdict === "KHONG_DAT"
                      ? "Chưa đạt"
                      : "—"}
                </Td>
                <Td>{row.similarityPercent ?? "—"}%</Td>
                <Td>{row.confidence ?? "—"}%</Td>
                <Td>{row.latencyMs ? `${row.latencyMs}ms` : "—"}</Td>
                <Td>
                  {row.estimatedCostMicroUsd
                    ? `${microUsdToVnd(row.estimatedCostMicroUsd).toLocaleString("vi-VN")}đ`
                    : "—"}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {recent.length === 0 && (
          <p className="mt-3 font-ui text-sm text-muted">Chưa có lượt chấm nào.</p>
        )}
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  note,
  tone = "normal",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tone?: "normal" | "warn";
}) {
  return (
    <div
      className={`border px-5 py-4 ${
        tone === "warn" ? "border-gold bg-gold-pale" : "border-line-strong bg-paper"
      }`}
    >
      <dt className="flex items-center gap-2 font-ui text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-2 font-display text-2xl font-bold text-navy-deep">
        {value}
      </dd>
      <p className="mt-1 font-ui text-[0.78rem] text-muted">{note}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 font-semibold uppercase tracking-[0.08em] text-[0.72rem]">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2.5 text-ink-soft">{children}</td>;
}
