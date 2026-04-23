import Link from "next/link";
import { LogOut, PlusCircle, WandSparkles } from "lucide-react";
import type { Project } from "@/types";
import { logoutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProjectSidebar({
  projects,
  currentProjectId,
}: {
  projects: Project[];
  currentProjectId: string;
}) {
  return (
    <aside className="surface hairline flex flex-col rounded-[2rem] p-5 lg:h-[calc(100vh-4rem)] lg:sticky lg:top-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            Shelf
          </p>
          <h2 className="mt-2 text-xl font-semibold">Projects</h2>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <WandSparkles className="size-5" />
        </div>
      </div>
      <div className="mt-6 flex-1 space-y-2 overflow-y-auto pr-1">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className={cn(
              "block rounded-2xl px-4 py-3 text-sm transition",
              currentProjectId === project.id
                ? "bg-[var(--ink)] text-white shadow-lg shadow-black/10"
                : "bg-white/60 text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]",
            )}
          >
            <div className="font-semibold">{project.name}</div>
            <div
              className={cn(
                "mt-1 line-clamp-2 text-xs leading-5",
                currentProjectId === project.id ? "text-white/72" : "text-[var(--muted)]",
              )}
            >
              {project.description ?? "Voice-first planning board"}
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-5 grid gap-3">
        <Link href="/dashboard">
          <Button className="w-full justify-between" variant="secondary">
            New or switch project
            <PlusCircle className="size-4" />
          </Button>
        </Link>
        <form action={logoutAction}>
          <Button className="w-full justify-between" variant="ghost" type="submit">
            Sign out
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </aside>
  );
}
