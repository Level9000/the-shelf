"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LogOut,
  PlusCircle,
  WandSparkles,
} from "lucide-react";
import type { ProjectWithChapters } from "@/types";
import { logoutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { CreateChapterModal } from "@/components/projects/create-chapter-modal";
import { cn } from "@/lib/utils";

export function ProjectSidebar({
  projects,
  currentProjectId,
  currentChapterId,
  collapsed,
  onToggle,
  onNavigate,
}: {
  projects: ProjectWithChapters[];
  currentProjectId: string;
  currentChapterId: string;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [chapterProjectId, setChapterProjectId] = useState<string | null>(null);
  const chapterProject =
    projects.find((project) => project.id === chapterProjectId) ?? null;

  return (
    <>
      <aside
        className={cn(
          "surface hairline flex flex-col rounded-[2rem] p-4 transition-all duration-300 lg:h-[calc(100vh-4rem)] lg:sticky lg:top-8",
          collapsed ? "lg:px-3" : "lg:p-5",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed ? "justify-center lg:justify-between" : "justify-between",
          )}
        >
          <div className={cn(collapsed && "hidden lg:block")}>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Shelf
            </p>
            {!collapsed ? (
              <h2 className="mt-2 text-xl font-semibold">Projects</h2>
            ) : null}
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <WandSparkles className="size-5" />
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="hidden size-10 items-center justify-center rounded-2xl bg-black/5 text-[var(--muted)] transition hover:bg-black/8 hover:text-[var(--ink)] lg:inline-flex"
            aria-label={collapsed ? "Expand projects sidebar" : "Collapse projects sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </button>
        </div>
        <div
          className={cn(
            "mt-6 flex-1 space-y-2 overflow-y-auto",
            collapsed ? "pr-0" : "pr-1",
          )}
        >
          {projects.map((project) => (
            <div key={project.id} className="rounded-2xl bg-white/45 p-2">
              <Link
                href={
                  project.chapters.at(-1)
                    ? `/projects/${project.id}/chapters/${project.chapters.at(-1)?.id}`
                    : `/projects/${project.id}`
                }
                onClick={onNavigate}
                className={cn(
                  "block rounded-2xl text-sm transition",
                  collapsed
                    ? "px-2 py-2.5 lg:text-center"
                    : "px-4 py-3",
                  currentProjectId === project.id
                    ? "bg-[var(--ink)] text-white shadow-lg shadow-black/10"
                    : "bg-white/60 text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]",
                )}
                title={collapsed ? project.name : undefined}
              >
                {collapsed ? (
                  <div className="flex items-center justify-center">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 font-semibold">
                      {project.name.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-semibold">{project.name}</div>
                    <div
                      className={cn(
                        "mt-1 line-clamp-2 text-xs leading-5",
                        currentProjectId === project.id ? "text-white/72" : "text-[var(--muted)]",
                      )}
                    >
                      {project.description ?? "Voice-first planning board"}
                    </div>
                  </>
                )}
              </Link>
              {!collapsed ? (
                <div className="mt-2 space-y-1 px-2">
                  {project.chapters.map((chapter) => (
                    <Link
                      key={chapter.id}
                      href={`/projects/${project.id}/chapters/${chapter.id}`}
                      onClick={onNavigate}
                      className={cn(
                        "block rounded-xl px-3 py-2 text-xs font-medium transition",
                        currentChapterId === chapter.id
                          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]",
                      )}
                    >
                      {chapter.name}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => setChapterProjectId(project.id)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[var(--muted)] transition hover:bg-white hover:text-[var(--ink)]"
                  >
                    <PlusCircle className="size-3.5" />
                    New chapter
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          <Link href="/dashboard" onClick={onNavigate}>
            <Button
              className={cn(
                "w-full",
                collapsed ? "justify-center px-0" : "justify-between",
              )}
              variant="secondary"
              title={collapsed ? "New or switch project" : undefined}
            >
              {collapsed ? (
                <FolderKanban className="size-4" />
              ) : (
                <>
                  New or switch project
                  <PlusCircle className="size-4" />
                </>
              )}
            </Button>
          </Link>
          <form action={logoutAction}>
            <Button
              className={cn(
                "w-full",
                collapsed ? "justify-center px-0" : "justify-between",
              )}
              variant="ghost"
              type="submit"
              title={collapsed ? "Sign out" : undefined}
            >
              {collapsed ? (
                <LogOut className="size-4" />
              ) : (
                <>
                  Sign out
                  <LogOut className="size-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </aside>
      <CreateChapterModal
        open={Boolean(chapterProject)}
        project={chapterProject}
        onClose={() => setChapterProjectId(null)}
        onCreated={(chapterId) => {
          if (!chapterProject) return;
          onNavigate?.();
          router.push(`/projects/${chapterProject.id}/chapters/${chapterId}`);
          router.refresh();
        }}
      />
    </>
  );
}
