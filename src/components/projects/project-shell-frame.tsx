"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BookOpen, ChevronDown, Menu, Plus, Sparkles, SquareKanban } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProjectWithChapters, UserProfile } from "@/types";
import { ProjectAppHeader } from "@/components/projects/project-app-header";
import { SettingsContent, SettingsDrawer } from "@/components/settings/settings-drawer";
import { SideDrawer } from "@/components/ui/side-drawer";
import { cn } from "@/lib/utils";

// ── Simple dropdown for mobile (used inside the left panel) ──────────────────

function MobileDropdown({
  label,
  displayValue,
  options,
  onSelect,
  actionLabel,
  onAction,
  bottomActionLabel,
  onBottomAction,
}: {
  label: string;
  displayValue: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  actionLabel?: string;
  onAction?: () => void;
  bottomActionLabel?: string;
  onBottomAction?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col items-start text-left"
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          {label}
        </span>
        <span className="flex items-center gap-1">
          <span className="max-w-[130px] truncate text-sm font-semibold text-[var(--ink)]">
            {displayValue}
          </span>
          <ChevronDown className="size-3 shrink-0 text-[var(--muted)]" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2xl shadow-black/20">
          {actionLabel && onAction && (
            <>
              <button
                type="button"
                onMouseDown={() => {
                  onAction();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-[var(--accent)] transition hover:bg-black/5"
              >
                <Plus className="size-3.5 shrink-0" />
                {actionLabel}
              </button>
              <div className="mx-3 border-t border-black/8" />
            </>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
              className="flex w-full items-center px-4 py-3 text-left text-sm font-medium text-[var(--ink)] transition hover:bg-black/5"
            >
              <span className="line-clamp-1">{opt.label}</span>
            </button>
          ))}
          {bottomActionLabel && onBottomAction && (
            <>
              <div className="mx-3 border-t border-black/8" />
              <button
                type="button"
                onMouseDown={() => {
                  onBottomAction();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-[var(--accent)] transition hover:bg-black/5"
              >
                <Sparkles className="size-3.5 shrink-0" />
                {bottomActionLabel}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shell frame ──────────────────────────────────────────────────────────────

export function ProjectShellFrame({
  projects,
  profile,
  currentProjectId,
  currentChapterId = null,
  lastChapterId = null,
  mobileEyebrow: _mobileEyebrow,
  mobileTitle: _mobileTitle,
  activeNav,
  mobileBanner,
  onPlanChapters,
  children,
}: {
  projects: ProjectWithChapters[];
  profile: UserProfile;
  currentProjectId: string;
  currentChapterId?: string | null;
  /** The chapter to return to when navigating to the Story overview */
  lastChapterId?: string | null;
  mobileEyebrow: string;
  mobileTitle: string;
  activeNav?: "overview" | "story" | "board";
  /** Full-width banner rendered between the header and scrollable content on mobile */
  mobileBanner?: React.ReactNode;
  onPlanChapters?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // The chapter used for Story/Board pill links — current chapter, or the last
  // visited chapter when navigating to the Story overview.
  const navChapterId = currentChapterId ?? lastChapterId;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    // Only trigger if horizontal swipe dominates and exceeds threshold
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    // Board handles its own swipe-off via the inner swiper
    if (activeNav === "board") return;
    if (dx < 0 && activeNav === "story" && navChapterId) {
      // Story → Chronicle (swipe left = go further out)
      router.push(`/projects/${currentProjectId}`);
    } else if (dx > 0 && activeNav === "story" && navChapterId) {
      // Story → Board (swipe right = go back to detail)
      router.push(`/projects/${currentProjectId}/chapters/${navChapterId}/board`);
    } else if (dx > 0 && activeNav === "overview" && navChapterId) {
      // Chronicle → Story (swipe right = go back in)
      router.push(`/projects/${currentProjectId}/chapters/${navChapterId}`);
    }
  }, [activeNav, navChapterId, currentProjectId, router]);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const navChapterIndex =
    currentProject?.chapters.findIndex((ch) => ch.id === navChapterId) ?? -1;
  const chapterIndex =
    currentProject?.chapters.findIndex((ch) => ch.id === currentChapterId) ?? -1;
  const chapterDisplayValue =
    chapterIndex >= 0 ? `Chapter ${chapterIndex + 1}` : navChapterIndex >= 0 ? `Chapter ${navChapterIndex + 1}` : "Select";

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const chapterOptions = [
    ...(currentProject?.chapters.map((ch, i) => ({
      value: ch.id,
      label: `Chapter ${i + 1}`,
    })) ?? []),
  ];

  const currentChapterName =
    projects
      .find((p) => p.id === currentProjectId)
      ?.chapters.find((ch) => ch.id === currentChapterId)?.name ?? null;

  const currentProjectName = currentProject?.name ?? null;

  return (
    <>
      {/* ── Desktop layout (lg+) ── */}
      <div className="hidden lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
        <ProjectAppHeader
          projects={projects}
          currentProjectId={currentProjectId}
          currentChapterId={currentChapterId}
          navChapterId={navChapterId}
          onOpenSettings={() => setSettingsOpen(true)}
          activeNav={activeNav}
          onPlanChapters={onPlanChapters}
        />
        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto"
          style={(activeNav === "overview" || activeNav === "story") ? { background: "#0a0a0a" } : undefined}
        >{children}</div>
      </div>

      {/* ── Mobile layout (<lg) ── */}
      <div className="flex h-dvh flex-col lg:hidden">
        {/* Header: hamburger + tab pills in a single row */}
        <div className="z-30 shrink-0 border-b border-black/6 bg-white">
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Hamburger — opens left-side panel */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
            >
              <Menu className="size-5" />
            </button>

            {/* Chapter label — shown on chapter pages only */}
            {currentChapterId && chapterIndex >= 0 && (
              <span className="shrink-0 text-sm font-semibold text-[var(--ink)]">
                Chapter {chapterIndex + 1}
              </span>
            )}

            {/* Tab pills — pushed to the right */}
            <div className="flex flex-1 justify-end">
              <div className="inline-flex gap-1 rounded-full bg-black/6 p-1 shadow-sm">
                {navChapterId ? (
                  /* Chapter pages: Story + Board only */
                  <>
                    <Link
                      href={`/projects/${currentProjectId}/chapters/${navChapterId}`}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition",
                        activeNav === "story"
                          ? "bg-white text-[var(--ink)] shadow-sm"
                          : "text-[var(--muted)]",
                      )}
                    >
                      <BookOpen className="size-3.5" />
                      Story
                    </Link>
                    <Link
                      href={`/projects/${currentProjectId}/chapters/${navChapterId}/board`}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition",
                        activeNav === "board"
                          ? "bg-white text-[var(--ink)] shadow-sm"
                          : "text-[var(--muted)]",
                      )}
                    >
                      <SquareKanban className="size-3.5" />
                      Board
                    </Link>
                  </>
                ) : (
                  /* Project overview: single Chronicle pill */
                  <Link
                    href={`/projects/${currentProjectId}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition",
                      activeNav === "overview"
                        ? "bg-white text-[var(--ink)] shadow-sm"
                        : "text-[var(--muted)]",
                    )}
                  >
                    <BookOpen className="size-3.5" />
                    Chronicle
                  </Link>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Full-width banner slot (e.g. chapter completed) */}
        {mobileBanner}

        {/* Page content — scrollable area below the header */}
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto pb-4",
            activeNav === "board" ? "px-0" : "px-4",
          )}
          style={(activeNav === "overview" || activeNav === "story") ? { background: "#0a0a0a" } : undefined}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {children}
        </div>
      </div>

      {/* ── Mobile left-side panel: project + chapter nav + settings ── */}
      <SideDrawer
        open={menuOpen}
        title={currentProject?.name ?? "Navigation"}
        onClose={() => setMenuOpen(false)}
        side="left"
      >
        {/* Project selector */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Project
          </p>
          <div className="mt-2 flex flex-col gap-0.5">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { router.push(`/projects/${p.id}`); setMenuOpen(false); }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition",
                  p.id === currentProjectId
                    ? "bg-black/5 font-semibold text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-black/5",
                )}
              >
                <span>{p.name}</span>
                {p.id === currentProjectId && (
                  <span className="text-[10px] font-semibold text-[var(--accent)]">here</span>
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { router.push("/projects/new"); setMenuOpen(false); }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--accent)] transition hover:bg-black/5"
            >
              <Plus className="size-3.5 shrink-0" />
              New project
            </button>
          </div>
        </div>

        {/* Chapter selector */}
        {currentProject && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Chapter
            </p>
            <div className="mt-2 flex flex-col gap-0.5">
              {currentProject.chapters.map((ch, i) => {
                const isComplete = Boolean(ch.retroCompletedAt);
                const isCurrent = Boolean(ch.kickoffCompletedAt) && !isComplete;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      router.push(`/projects/${currentProjectId}/chapters/${ch.id}`);
                      setMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition",
                      ch.id === currentChapterId
                        ? "bg-black/5 font-semibold text-[var(--ink)]"
                        : "text-[var(--muted)] hover:bg-black/5",
                    )}
                  >
                    <span>Chapter {i + 1}</span>
                    {isComplete ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">complete</span>
                    ) : isCurrent ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">current</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">planned</span>
                    )}
                  </button>
                );
              })}
              {onPlanChapters && (
                <button
                  type="button"
                  onClick={() => { onPlanChapters(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--accent)] transition hover:bg-black/5"
                >
                  <Sparkles className="size-3.5 shrink-0" />
                  Plan new chapters
                </button>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-black/8" />

        {/* Settings */}
        <SettingsContent
          profile={profile}
          currentProjectId={currentProjectId}
          currentProjectName={currentProjectName}
          currentChapterId={currentChapterId}
          currentChapterName={currentChapterName}
          onClose={() => setMenuOpen(false)}
        />
      </SideDrawer>

      {/* ── Desktop settings drawer (right side) ── */}
      <SettingsDrawer
        open={settingsOpen}
        profile={profile}
        onClose={() => setSettingsOpen(false)}
        currentProjectId={currentProjectId}
        currentProjectName={currentProjectName}
        currentChapterId={currentChapterId}
        currentChapterName={currentChapterName}
      />
    </>
  );
}
