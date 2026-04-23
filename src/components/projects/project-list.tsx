import Link from "next/link";
import { ArrowUpRight, FolderOpen } from "lucide-react";
import type { Project } from "@/types";
import { formatDate } from "@/lib/utils";

export function ProjectList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="surface-card hairline rounded-[2rem] p-6">
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
    <div className="grid gap-4 md:grid-cols-2">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="surface-card hairline group rounded-[2rem] p-6 transition duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Project
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                {project.name}
              </h3>
            </div>
            <div className="rounded-full bg-black/5 p-2 text-[var(--muted)] transition group-hover:bg-black/8 group-hover:text-[var(--ink)]">
              <ArrowUpRight className="size-4" />
            </div>
          </div>
          <p className="mt-4 min-h-12 text-sm leading-6 text-[var(--muted)]">
            {project.description ?? "A focused board for spoken capture and clean execution."}
          </p>
          <p className="mt-5 font-mono text-xs text-[var(--muted)]">
            Updated {formatDate(project.updatedAt)}
          </p>
        </Link>
      ))}
    </div>
  );
}
