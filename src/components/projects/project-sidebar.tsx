"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
  PlusCircle,
  Settings,
} from "lucide-react";
import type { ProjectWithChapters } from "@/types";
import { logoutAction } from "@/lib/actions/auth-actions";
import { Modal } from "@/components/ui/modal";
import { CreateChapterModal } from "@/components/projects/create-chapter-modal";
import { ProjectCreateForm } from "@/components/projects/project-create-form";
import { cn } from "@/lib/utils";

// A curated palette of book cover colors — rich, saturated, distinct.
const BOOK_PALETTE = [
  { cover: "#2C3E2D", label: "#8fbfa4", ribbon: "#5a9b78" }, // forest
  { cover: "#3B2A4A", label: "#b8a0d4", ribbon: "#8b6ab8" }, // plum
  { cover: "#4A2525", label: "#d49696", ribbon: "#b86060" }, // burgundy
  { cover: "#1E3049", label: "#90aed4", ribbon: "#5880b8" }, // navy
  { cover: "#3A3020", label: "#c5b882", ribbon: "#9e8d50" }, // antique
  { cover: "#2A3B3A", label: "#8fbfbb", ribbon: "#5a9b98" }, // teal
  { cover: "#49291E", label: "#d4aa96", ribbon: "#b87d60" }, // rust
  { cover: "#243040", label: "#94a8c8", ribbon: "#5e7aac" }, // slate
];

function bookColor(index: number) {
  return BOOK_PALETTE[index % BOOK_PALETTE.length];
}

// ─── Closed book (other projects) ───────────────────────────────────────────

function ClosedBook({
  name,
  href,
  colorIndex,
  onClick,
}: {
  name: string;
  href: string;
  colorIndex: number;
  onClick?: () => void;
}) {
  const c = bookColor(colorIndex);
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group block rounded-[3px] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: `linear-gradient(105deg, ${c.cover}f0 0%, ${c.cover} 40%, ${c.cover}e0 100%)`,
        boxShadow:
          "0 4px 18px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
      title={name}
    >
      <div className="flex items-center gap-3 px-3.5 py-3.5">
        {/* Binding ribbon */}
        <div
          className="w-[3px] self-stretch rounded-full shrink-0"
          style={{ background: c.ribbon, opacity: 0.7 }}
        />
        <span
          className="flex-1 text-[13px] font-semibold leading-tight line-clamp-2 tracking-tight"
          style={{ color: c.label }}
        >
          {name}
        </span>
      </div>
    </Link>
  );
}

// ─── "New Story" book (bottom of stack) ──────────────────────────────────────

function NewStoryBook({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-[3px] text-left transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background:
          "linear-gradient(105deg, #c4a87a 0%, #d4b88a 40%, #c0a070 100%)",
        boxShadow:
          "0 4px 18px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.20)",
      }}
    >
      <div className="flex items-center gap-3 px-3.5 py-3.5">
        <div
          className="w-[3px] self-stretch rounded-full shrink-0"
          style={{ background: "#f0d5a0", opacity: 0.6 }}
        />
        <span className="flex-1 text-[13px] font-semibold tracking-tight text-[#6B4820]">
          New Story
        </span>
        <Plus className="size-3.5 shrink-0 text-[#8B6030] opacity-80" />
      </div>
    </button>
  );
}

// ─── Open book (current project) ─────────────────────────────────────────────

function OpenBook({
  project,
  currentChapterId,
  onNavigate,
  onAddChapter,
}: {
  project: ProjectWithChapters;
  currentChapterId?: string | null;
  onNavigate?: () => void;
  onAddChapter: () => void;
}) {
  return (
    <div
      className="rounded-[3px] overflow-hidden shrink-0"
      style={{
        background: "#fdfaf6",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.32), 0 2px 6px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      {/* Book header — the "cover" showing through */}
      <div
        className="px-4 pt-3 pb-2.5"
        style={{
          background:
            "linear-gradient(to bottom, #e8d9c0, #dfd0b4)",
          borderBottom: "1px solid rgba(0,0,0,0.10)",
        }}
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9C7A4A] mb-0.5">
          Currently reading
        </p>
        <Link
          href={`/projects/${project.id}`}
          onClick={onNavigate}
          className="block text-[13px] font-semibold leading-snug text-[#2C1A08] hover:text-[#4a3010] transition line-clamp-2 tracking-tight"
        >
          {project.name}
        </Link>
      </div>

      {/* Chapter list */}
      <div>
        {/* Overview */}
        <Link
          href={`/projects/${project.id}`}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium transition",
            !currentChapterId
              ? "text-[var(--accent)] font-semibold bg-[var(--accent-soft)]"
              : "text-[#5C4030] hover:text-[#2C1A08] hover:bg-black/5",
          )}
        >
          Overview
        </Link>

        {/* Chapters */}
        {project.chapters.map((chapter, i) => (
          <Link
            key={chapter.id}
            href={`/projects/${project.id}/chapters/${chapter.id}`}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium transition border-t border-black/[0.05]",
              currentChapterId === chapter.id
                ? "text-[var(--accent)] font-semibold bg-[var(--accent-soft)]"
                : "text-[#5C4030] hover:text-[#2C1A08] hover:bg-black/5",
            )}
          >
            <span className="line-clamp-1">{chapter.name}</span>
          </Link>
        ))}

        {/* Add chapter */}
        <button
          type="button"
          onClick={onAddChapter}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[11.5px] font-medium text-[#9C7A50] transition hover:text-[#5C4030] hover:bg-black/5 border-t border-black/[0.05]"
        >
          <PlusCircle className="size-3 shrink-0" />
          New chapter
        </button>
      </div>
    </div>
  );
}

// ─── Collapsed mode book dot ──────────────────────────────────────────────────

function CollapsedBook({
  name,
  href,
  colorIndex,
  active,
  onClick,
}: {
  name: string;
  href: string;
  colorIndex: number;
  active: boolean;
  onClick?: () => void;
}) {
  const c = bookColor(colorIndex);
  return (
    <Link
      href={href}
      onClick={onClick}
      title={name}
      className="flex size-11 shrink-0 items-center justify-center rounded-[3px] text-[11px] font-bold tracking-wide transition hover:scale-105 active:scale-95"
      style={
        active
          ? {
              background: "#faf6ef",
              color: "#2C1A08",
              boxShadow: "0 2px 8px rgba(0,0,0,0.30)",
            }
          : {
              background: `${c.cover}`,
              color: c.label,
              boxShadow: "0 2px 8px rgba(0,0,0,0.30)",
            }
      }
    >
      {name.slice(0, 2).toUpperCase()}
    </Link>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

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
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const chapterProject =
    projects.find((project) => project.id === chapterProjectId) ?? null;

  const currentProject = projects.find((p) => p.id === currentProjectId);
  // Other projects — preserve original ordering for consistent color assignment
  const otherProjects = projects
    .map((p, i) => ({ project: p, originalIndex: i }))
    .filter(({ project }) => project.id !== currentProjectId);

  return (
    <>
      <aside
        className={cn(
          "surface hairline relative flex h-full flex-col rounded-[2rem] transition-all duration-300 overflow-hidden",
        )}
      >
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-0 top-5 z-20 hidden h-9 w-7 items-center justify-center rounded-l-xl text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)] lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronLeft className="size-3.5" />
          )}
        </button>

        {/* ── Header ── */}
        <div className={cn("relative z-10 px-4 pt-4 pb-3 shrink-0", collapsed && "px-2.5")}>
          <Link
            href="/projects"
            onClick={onNavigate}
            className={cn(
              "flex items-center overflow-hidden rounded-xl transition hover:bg-black/5",
              collapsed ? "justify-center p-1.5" : "gap-2 px-2 py-1.5",
            )}
            title="The Shelf"
          >
            <Image
              src="/icons/authored_by_icon_512.png"
              alt="Shelf"
              width={32}
              height={32}
              className="size-8 shrink-0 rounded-lg"
            />
            {!collapsed && (
              <span
                className="font-literata text-[1.35rem] leading-none tracking-tight text-[var(--ink)]"
              >
                The Shelf
              </span>
            )}
          </Link>
        </div>

        {/* ── Scrollable book stack ── */}
        <div
          className={cn(
            "relative z-10 min-h-0 flex-1 overflow-y-auto",
            collapsed ? "flex flex-col items-center gap-2 px-2 pb-3" : "space-y-2 px-3 pb-3",
          )}
        >
          {collapsed ? (
            // ── Collapsed: mini book dots ──────────────────────────────────
            <>
              {projects.map((project, i) => (
                <CollapsedBook
                  key={project.id}
                  name={project.name}
                  href={`/projects/${project.id}`}
                  colorIndex={i}
                  active={project.id === currentProjectId}
                  onClick={onNavigate}
                />
              ))}
              <button
                type="button"
                onClick={() => setCreateProjectOpen(true)}
                title="New Story"
                className="flex size-11 shrink-0 items-center justify-center rounded-[3px] transition hover:scale-105 active:scale-95"
                style={{
                  background: "#c4a87a",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.30)",
                }}
              >
                <Plus className="size-4 text-[#6B4820]" />
              </button>
            </>
          ) : (
            // ── Expanded: open book + closed book stack ────────────────────
            <>
              {/* Open book — current project */}
              {currentProject && (
                <OpenBook
                  project={currentProject}
                  currentChapterId={currentChapterId}
                  onNavigate={onNavigate}
                  onAddChapter={() => setChapterProjectId(currentProject.id)}
                />
              )}

              {/* Closed books — other projects */}
              {otherProjects.map(({ project, originalIndex }) => (
                <ClosedBook
                  key={project.id}
                  name={project.name}
                  href={`/projects/${project.id}`}
                  colorIndex={originalIndex}
                  onClick={onNavigate}
                />
              ))}

              {/* New Story — bottom of stack */}
              <NewStoryBook onClick={() => setCreateProjectOpen(true)} />
            </>
          )}
        </div>

        {/* ── Bottom actions ── */}
        <div
          className={cn(
            "relative z-10 shrink-0 border-t border-[var(--stroke)] px-3 pb-3 pt-2",
            collapsed ? "flex flex-col items-center gap-1" : "flex gap-1",
          )}
        >
          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings"
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-[11.5px] font-medium text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]",
              collapsed ? "justify-center" : "flex-1",
            )}
          >
            <Settings className="size-3.5 shrink-0" />
            {!collapsed && "Settings"}
          </button>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-[11.5px] font-medium text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]",
                collapsed ? "justify-center" : "flex-1",
              )}
            >
              <LogOut className="size-3.5 shrink-0" />
              {!collapsed && "Sign out"}
            </button>
          </form>
        </div>
      </aside>

      {/* ── Modals ── */}
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
