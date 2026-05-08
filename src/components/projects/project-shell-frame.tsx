"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, LayoutPanelTop, Settings, SquareKanban } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProjectWithChapters, UserProfile } from "@/types";
import { ProjectAppHeader } from "@/components/projects/project-app-header";
import { SettingsDrawer } from "@/components/settings/settings-drawer";
import { cn } from "@/lib/utils";

// ── Simple dropdown for mobile ───────────────────────────────────────────────

function MobileDropdown({
  label,
  displayValue,
  options,
  onSelect,
}: {
  label: string;
  displayValue: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
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
  mobileEyebrow: _mobileEyebrow,
  mobileTitle: _mobileTitle,
  activeNav,
  retroAvailable,
  onEndChapter,
  children,
}: {
  projects: ProjectWithChapters[];
  profile: UserProfile;
  currentProjectId: string;
  currentChapterId?: string | null;
  mobileEyebrow: string;
  mobileTitle: string;
  activeNav?: "overview" | "board";
  retroAvailable?: boolean;
  onEndChapter?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || !currentChapterId || !activeNav) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    // Only trigger if horizontal swipe dominates and exceeds threshold
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && activeNav === "overview") {
      router.push(`/projects/${currentProjectId}/chapters/${currentChapterId}/board`);
    } else if (dx > 0 && activeNav === "board") {
      router.push(`/projects/${currentProjectId}/chapters/${currentChapterId}`);
    }
  }, [activeNav, currentChapterId, currentProjectId, router]);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const chapterIndex =
    currentProject?.chapters.findIndex((ch) => ch.id === currentChapterId) ?? -1;
  const chapterDisplayValue =
    chapterIndex >= 0 ? `Chapter ${chapterIndex + 1}` : "Story";

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const chapterOptions = [
    { value: "", label: "Story" },
    ...(currentProject?.chapters.map((ch, i) => ({
      value: ch.id,
      label: `Chapter ${i + 1}`,
    })) ?? []),
  ];

  return (
    <>
      {/* ── Desktop layout (lg+) ── */}
      <div className="hidden lg:flex lg:min-h-screen lg:flex-col">
        <ProjectAppHeader
          projects={projects}
          currentProjectId={currentProjectId}
          currentChapterId={currentChapterId}
          onOpenSettings={() => setSettingsOpen(true)}
          activeNav={activeNav}
          retroAvailable={retroAvailable}
          onEndChapter={onEndChapter}
        />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>

      {/* ── Mobile layout (<lg) ── */}
      <div className="lg:hidden">
        {/* Sticky header: top bar + tab pills */}
        <div className="sticky top-0 z-30 bg-[var(--app-bg)]">
        {/* Top bar: project + chapter dropdowns + settings gear */}
        <div className="flex items-center gap-3 border-b border-black/6 bg-white px-4 py-3">
          <MobileDropdown
            label="Project"
            displayValue={currentProject?.name ?? "Select"}
            options={projectOptions}
            onSelect={(id) => router.push(`/projects/${id}`)}
          />

          <div className="h-5 w-px shrink-0 bg-black/10" />

          <MobileDropdown
            label="Chapter"
            displayValue={chapterDisplayValue}
            options={chapterOptions}
            onSelect={(val) => {
              if (!val) {
                router.push(`/projects/${currentProjectId}`);
              } else {
                router.push(`/projects/${currentProjectId}/chapters/${val}`);
              }
            }}
          />

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
          >
            <Settings className="size-4" />
          </button>
        </div>

        {/* Story / Board tab row — centered floating pills */}
        {currentChapterId && activeNav && (
          <div className="flex justify-center">
            <div className="my-3 inline-flex gap-1 rounded-full bg-black/6 p-1 shadow-sm">
              <Link
                href={`/projects/${currentProjectId}/chapters/${currentChapterId}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition",
                  activeNav === "overview"
                    ? "bg-white text-[var(--ink)] shadow-sm"
                    : "text-[var(--muted)]",
                )}
              >
                <LayoutPanelTop className="size-3.5" />
                Story
              </Link>
              <Link
                href={`/projects/${currentProjectId}/chapters/${currentChapterId}/board`}
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
            </div>
          </div>
        )}
        </div>{/* end sticky header */}

        {/* Page content — swipeable between Story and Board */}
        <div
          className={cn(
            "pb-4 pt-0",
            activeNav === "board" ? "px-0" : "px-4",
          )}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {children}
        </div>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        profile={profile}
        onClose={() => setSettingsOpen(false)}
        currentProjectId={currentProjectId}
        currentChapterId={currentChapterId}
        currentChapterName={
          projects
            .find((p) => p.id === currentProjectId)
            ?.chapters.find((ch) => ch.id === currentChapterId)?.name ?? null
        }
      />
    </>
  );
}
