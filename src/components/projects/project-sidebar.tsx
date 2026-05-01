"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FolderPlus,
  LogOut,
  PlusCircle,
  Settings,
} from "lucide-react";
import type { ProjectWithChapters } from "@/types";
import { logoutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CreateChapterModal } from "@/components/projects/create-chapter-modal";
import { ProjectCreateForm } from "@/components/projects/project-create-form";
import { cn } from "@/lib/utils";

export function ProjectSidebar({
  projects,
  currentProjectId,
  currentChapterId,
  collapsed,
  onToggle,
  onOpenSettings,
  onNavigate,
}: {
  projects: ProjectWithChapters[];
  currentProjectId: string;
  currentChapterId?: string | null;
  collapsed: boolean;
  onToggle: () => void;
  onOpenSettings?: () => void;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [chapterProjectId, setChapterProjectId] = useState<string | null>(null);
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const chapterProject =
    projects.find((project) => project.id === chapterProjectId) ?? null;

  function toggleProject(projectId: string) {
    setCollapsedProjects((current) => ({
      ...current,
      [projectId]: !current[projectId],
    }));
  }

  return (
    <>
      <aside
        className={cn(
          "surface hairline relative flex h-full flex-col rounded-[2rem] p-4 transition-all duration-300",
          collapsed ? "lg:px-3" : "lg:p-5",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "absolute right-0 top-0 hidden h-full w-8 items-center justify-center rounded-r-[2rem] text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)] lg:flex",
            collapsed && "w-7",
          )}
          aria-label={collapsed ? "Expand projects sidebar" : "Collapse projects sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-white/80 shadow-sm shadow-black/5">
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </span>
        </button>
        <Link
          href="/projects"
          onClick={onNavigate}
          className={cn(
            "inline-flex w-full items-stretch overflow-hidden rounded-2xl text-sm font-semibold transition",
            collapsed
              ? "justify-center p-0"
              : "justify-start gap-0 p-0 pr-6",
            "bg-white/75 text-[var(--ink)] ring-1 ring-black/8 hover:bg-white",
          )}
          title={collapsed ? "The Shelf" : undefined}
        >
          {collapsed ? (
            <Image
              src="/icons/authored_by_icon_512.png"
              alt="Shelf"
              width={64}
              height={64}
              className="h-full w-auto rounded-md"
            />
          ) : (
            <>
              <Image
                src="/icons/authored_by_icon_512.png"
                alt="Shelf"
                width={64}
                height={64}
                className="h-full w-auto shrink-0"
              />
              <span className="font-literata flex items-center px-3 text-3xl leading-none tracking-tight">
                The Shelf
              </span>
            </>
          )}
        </Link>
        <div
          className={cn(
            "mt-4 flex-1 space-y-2 overflow-y-auto",
            collapsed ? "pr-0" : "pr-1",
          )}
        >
          {projects.map((project) => (
            <div
              key={project.id}
              className={cn(
                "rounded-2xl bg-white/45",
                collapsed ? "flex justify-center p-0" : "overflow-hidden p-0",
              )}
            >
              {collapsed ? (
                <Link
                  href={`/projects/${project.id}`}
                  onClick={onNavigate}
                  className={cn(
                    "block rounded-2xl text-sm transition",
                    "flex size-16 items-center justify-center lg:text-center",
                    currentProjectId === project.id
                      ? "bg-[var(--ink)] text-white shadow-lg shadow-black/10"
                      : "bg-white/60 text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]",
                  )}
                  title={project.name}
                >
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-white/10 font-semibold">
                    {project.name.slice(0, 2).toUpperCase()}
                  </div>
                </Link>
              ) : (
                <>
                  <div
                    className={cn(
                      "flex items-start gap-2 px-4 py-3",
                      currentProjectId === project.id
                        ? "bg-[var(--ink)] text-white shadow-lg shadow-black/10"
                        : "bg-white/60 text-[var(--muted)]",
                    )}
                  >
                    <Link
                      href={`/projects/${project.id}`}
                      onClick={onNavigate}
                      className="min-w-0 flex-1"
                    >
                      <div className="font-semibold">{project.name}</div>
                      <div
                        className={cn(
                          "mt-1 line-clamp-2 text-xs leading-5",
                          currentProjectId === project.id
                            ? "text-white/72"
                            : "text-[var(--muted)]",
                        )}
                      >
                        {project.description ?? "Voice-first planning board"}
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleProject(project.id)}
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-xl transition",
                        currentProjectId === project.id
                          ? "hover:bg-white/10"
                          : "hover:bg-white",
                      )}
                      aria-label={
                        collapsedProjects[project.id]
                          ? `Expand ${project.name}`
                          : `Collapse ${project.name}`
                      }
                      title={
                        collapsedProjects[project.id]
                          ? "Expand project"
                          : "Collapse project"
                      }
                    >
                      {collapsedProjects[project.id] ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronUp className="size-4" />
                      )}
                    </button>
                  </div>
                  {collapsedProjects[project.id] ? null : (
                    <div className="border-t border-black/6 bg-white/35">
                      <Link
                        href={`/projects/${project.id}`}
                        onClick={onNavigate}
                        className={cn(
                          "block border-b border-black/6 px-4 py-3 text-xs font-medium transition",
                          !currentChapterId && currentProjectId === project.id
                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "text-[var(--muted)] hover:bg-white/70 hover:text-[var(--ink)]",
                        )}
                      >
                        Overview
                      </Link>
                      {project.chapters.map((chapter) => (
                        <Link
                          key={chapter.id}
                          href={`/projects/${project.id}/chapters/${chapter.id}`}
                          onClick={onNavigate}
                          className={cn(
                            "block border-b border-black/6 px-4 py-3 text-xs font-medium transition last:border-b-0",
                            currentChapterId === chapter.id
                              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                              : "text-[var(--muted)] hover:bg-white/70 hover:text-[var(--ink)]",
                          )}
                        >
                          {chapter.name}
                        </Link>
                      ))}
                      <button
                        type="button"
                        onClick={() => setChapterProjectId(project.id)}
                        className="flex w-full items-center gap-2 px-4 py-3 text-xs font-medium text-[var(--muted)] transition hover:bg-white/70 hover:text-[var(--ink)]"
                      >
                        <PlusCircle className="size-3.5" />
                        New chapter
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          <Button
            className={cn(
              "w-full",
              collapsed ? "justify-center px-0" : "justify-between",
            )}
            variant="secondary"
            title={collapsed ? "Start new project" : undefined}
            onClick={() => setCreateProjectOpen(true)}
          >
            {collapsed ? (
              <FolderPlus className="size-4" />
            ) : (
              <>
                Start new project
                <FolderPlus className="size-4" />
              </>
            )}
          </Button>
          <Button
            className={cn(
              "w-full",
              collapsed ? "justify-center px-0" : "justify-between",
            )}
            variant="secondary"
            title={collapsed ? "Settings" : undefined}
            onClick={onOpenSettings}
          >
            {collapsed ? (
              <Settings className="size-4" />
            ) : (
              <>
                Settings
                <Settings className="size-4" />
              </>
            )}
          </Button>
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
      <Modal
        open={createProjectOpen}
        title="Start a new project"
        description="Name your project and Shelf AI will walk you through setting your north star and workplan."
        onClose={() => setCreateProjectOpen(false)}
      >
        <ProjectCreateForm
          showHeader={false}
          submitLabel="Start kickoff →"
          className="space-y-0"
        />
      </Modal>
    </>
  );
}
