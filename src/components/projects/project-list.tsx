import Link from "next/link";
import { ArrowUpRight, FolderOpen } from "lucide-react";
import type { Project } from "@/types";
import { formatDate } from "@/lib/utils";

export function ProjectList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="flex h-full min-h-56 flex-col justify-center rounded-[1.75rem] border border-dashed border-black/10 bg-white/50 p-6">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <FolderOpen className="size-5" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">No projects yet</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
          Start with one project and let voice capture turn loose thoughts into a
          structured board.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="group flex items-start gap-4 rounded-[1.5rem] border border-black/[0.06] bg-white/70 px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:border-black/10 hover:bg-white hover:shadow-lg hover:shadow-black/5"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
                  Project
                </p>
                <h3 className="mt-2 truncate text-lg font-semibold tracking-tight">
                  {project.name}
                </h3>
              </div>
              <div className="rounded-full bg-black/5 p-2 text-[var(--muted)] transition group-hover:bg-black/8 group-hover:text-[var(--ink)]">
                <ArrowUpRight className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {project.description ??
                "A focused board for spoken capture and clean execution."}
            </p>
            <p className="mt-4 font-mono text-[11px] text-[var(--muted)]">
              Updated {formatDate(project.updatedAt)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
