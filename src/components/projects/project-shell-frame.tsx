"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme-context";
import type { ProjectWithChapters, UserProfile } from "@/types";
import { ProjectAppHeader } from "@/components/projects/project-app-header";
import { SettingsDrawer } from "@/components/settings/settings-drawer";

// ── Shell frame ──────────────────────────────────────────────────────────────

export function ProjectShellFrame({
  projects,
  profile,
  hasActiveSubscription,
  currentProjectId,
  currentChapterId = null,
  mobileEyebrow,
  mobileTitle: _mobileTitle,
  mobileBanner,
  onPlanChapters,
  onOpenShare,
  currentBoardId,
  currentBoardGoal,
  currentBoardCreatedAt,
  activeChapterId,
  activeChapterDaysLeft,
  activeChapterProgress,
  children,
}: {
  projects: ProjectWithChapters[];
  profile: UserProfile;
  hasActiveSubscription?: boolean;
  currentProjectId: string;
  currentChapterId?: string | null;
  mobileEyebrow: string;
  mobileTitle: string;
  /** Full-width banner rendered between the header and scrollable content */
  mobileBanner?: React.ReactNode;
  onPlanChapters?: () => void;
  /** Opens the share flow — drives the header's top-right share icon */
  onOpenShare?: () => void;
  currentBoardId?: string | null;
  currentBoardGoal?: string | null;
  currentBoardCreatedAt?: string | null;
  /** The chapter currently being worked on — drives the header's Active/days-left pills and progress bar */
  activeChapterId?: string | null;
  activeChapterDaysLeft?: number | null;
  activeChapterProgress?: { completed: number; total: number } | null;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [focusedChapterId, setFocusedChapterId] = useState<string | null>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const chapterIndex =
    currentProject?.chapters.findIndex((ch) => ch.id === currentChapterId) ?? -1;

  const currentChapterName =
    currentProject?.chapters.find((ch) => ch.id === currentChapterId)?.name ?? null;
  const currentProjectName = currentProject?.name ?? null;

  // Single scroll-tracking source of truth for the Story tab: drives both the
  // header's chapter-focus label and each chapter's focus/dim treatment.
  // Owned here (not in ProjectOverviewShell) because the header and the
  // scrollable chapter list are siblings under this component — this is the
  // one place with access to both.
  useEffect(() => {
    if (!currentProject) return;
    const scrollRoot = scrollContainerRef.current;
    if (!scrollRoot) return;

    const chapterEls = currentProject.chapters
      .map((ch) => document.getElementById(`chapter-${ch.id}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (chapterEls.length === 0) return;

    // IntersectionObserver callbacks only report entries whose state *changed*
    // in that batch, not the full current state of every observed element —
    // so we track intersection state per element ourselves across batches.
    const intersecting = new Map<string, DOMRectReadOnly>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            intersecting.set(entry.target.id, entry.boundingClientRect);
          } else {
            intersecting.delete(entry.target.id);
          }
        });

        let focusedId: string | null = null;
        let lowestTop = -Infinity;
        for (const [id, rect] of intersecting) {
          if (rect.top > lowestTop) {
            lowestTop = rect.top;
            focusedId = id;
          }
        }

        setFocusedChapterId(focusedId ? focusedId.replace("chapter-", "") : null);

        chapterEls.forEach((el) => {
          el.style.transition = "opacity 0.4s ease";
          el.style.opacity = el.id === focusedId ? "1" : "0.55";
        });
      },
      { root: scrollRoot, rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    chapterEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [currentProject]);

  return (
    <>
      <div className="flex h-dvh flex-col overflow-hidden">
        {/* ── Unified header (metallic LED panel) — same on mobile + desktop ── */}
        <ProjectAppHeader
          projects={projects}
          currentProjectId={currentProjectId}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenShare={onOpenShare}
          focusedChapterId={focusedChapterId}
          activeChapterId={activeChapterId}
          activeChapterDaysLeft={activeChapterDaysLeft}
          activeChapterProgress={activeChapterProgress}
        />

        {mobileBanner}

        {/* Chapter title strip — mobile only */}
        {chapterIndex >= 0 && mobileEyebrow && (
          <div
            className="shrink-0 border-b px-4 py-3 lg:hidden"
            style={
              theme === "dark"
                ? { background: "#161616", borderColor: "rgba(255,255,255,0.07)" }
                : { borderColor: "rgba(0,0,0,0.06)" }
            }
          >
            <p
              className="mt-0.5 leading-tight"
              style={{
                fontFamily: "'Literata', Georgia, serif",
                fontSize: "18px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: theme === "dark" ? "rgba(232,224,208,0.92)" : "rgba(22,19,15,0.88)",
              }}
            >
              {mobileEyebrow}
            </p>
          </div>
        )}

        {/* Scrollable content */}
        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto"
          style={{ background: theme === "dark" ? "#1a1814" : "#f0ebe0" }}
        >
          <div className="mx-auto h-full w-full max-w-[1600px]">{children}</div>
        </div>
      </div>

      {/* Settings drawer (right side, all screen sizes) */}
      <SettingsDrawer
        open={settingsOpen}
        profile={profile}
        hasActiveSubscription={hasActiveSubscription}
        onClose={() => setSettingsOpen(false)}
        projects={projects}
        currentProjectId={currentProjectId}
        currentProjectName={currentProjectName}
        currentChapterId={currentChapterId}
        currentChapterName={currentChapterName}
        currentBoardId={currentBoardId}
        currentBoardGoal={currentBoardGoal}
        currentBoardCreatedAt={currentBoardCreatedAt}
      />
    </>
  );
}
