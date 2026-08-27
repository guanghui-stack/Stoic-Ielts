import { Tag } from "lucide-react";
import { normalizeTags } from "@/lib/forum/tags";

export function ForumTags({ tags }: { tags: readonly string[] }) {
  const values = normalizeTags(tags);
  if (values.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Chủ đề">
      {values.map((value) => (
        <span
          key={value}
          className="inline-flex items-center gap-1 border border-stoic-primary/20 bg-stoic-primary-soft px-2 py-1 font-ui text-[0.68rem] font-semibold text-stoic-primary-deep"
        >
          <Tag className="h-3 w-3" aria-hidden="true" />
          #{value.replace(/\s+/g, "-")}
        </span>
      ))}
    </div>
  );
}
