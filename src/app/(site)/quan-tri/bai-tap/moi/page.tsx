import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { ExerciseForm } from "@/components/admin/exercise-form";

export const metadata = { title: "Tạo đề Reading mới" };

export default async function NewExercisePage() {
  await requireAdmin();
  return (
    <section className="motion-page-entry mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/quan-tri/bai-tap"
        className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-navy hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Danh sách bài tập
      </Link>
      <p className="label-caps mt-6">Ngân hàng đề</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-navy-deep">
        Tạo đề Reading mới
      </h1>
      <div className="rule-gold mt-5" />
      <div className="mt-10 border border-line bg-paper p-8 shadow-card">
        <ExerciseForm />
      </div>
    </section>
  );
}
