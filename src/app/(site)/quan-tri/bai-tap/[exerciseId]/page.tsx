import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ExerciseForm } from "@/components/admin/exercise-form";

export const metadata = { title: "Sửa bài tập" };

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  await requireAdmin();
  const { exerciseId } = await params;

  const ex = await db.exercise.findUnique({ where: { id: exerciseId } });
  if (!ex || ex.skill !== "READING") redirect("/quan-tri/bai-tap");

  const defaults = {
    readingType: ex.readingType,
    title: ex.title,
    description: ex.description,
    durationMinutes: ex.durationMinutes,
    published: ex.published,
    content: JSON.stringify(JSON.parse(ex.content), null, 2),
  };

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
        Sửa bài tập
      </h1>
      <p className="mt-2 font-ui text-sm text-muted">{ex.title}</p>
      <div className="rule-gold mt-5" />
      <div className="mt-10 border border-line bg-paper p-8 shadow-card">
        <ExerciseForm exerciseId={ex.id} defaults={defaults} />
      </div>
    </section>
  );
}
