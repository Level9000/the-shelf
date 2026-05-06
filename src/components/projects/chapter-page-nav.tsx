import Link from "next/link";
import { LayoutPanelTop, SquareKanban } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChapterPageNav({
  projectId,
  chapterId,
  active,
}: {
  projectId: string;
  chapterId: string;
  active: "overview" | "board";
}) {
  const base = `/projects/${projectId}/chapters/${chapterId}`;

  return (
    <div className="flex w-full flex-wrap gap-2">
      <Link
        href={base}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200",
          active === "overview"
            ? "bg-[var(--ink)] text-white shadow-lg shadow-black/10"
            : "bg-white/75 text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]",
        )}
      >
        <LayoutPanelTop className="size-4" />
        Story
      </Link>
      <Link
        href={`${base}/board`}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200",
          active === "board"
            ? "bg-[var(--ink)] text-white shadow-lg shadow-black/10"
            : "bg-white/75 text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]",
        )}
      >
        <SquareKanban className="size-4" />
        Board
      </Link>
    </div>
  );
}
