import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { ExerciseForm } from "@/components/admin/exercise-form";
import { AdminPageShell } from "@/components/admin/admin-page-shell";

export const metadata = { title: "Tạo đề Reading mới" };

export default async function NewExercisePage() {
  await requireAdmin();
  return (
    <AdminPageShell
      eyebrow="Ngân hàng đề"
      title="Tạo đề Reading mới"
      width="medium"
      actions={
        <Link
          href="/quan-tri/bai-tap"
          className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-navy hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Danh sách bài tập
        </Link>
      }
    >
      <div className="mt-10 border border-line bg-paper p-8 shadow-card">
        <ExerciseForm />
      </div>
    </AdminPageShell>
  );
}
