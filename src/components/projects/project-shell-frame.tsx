"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme-context";
import type { ProjectWithChapters, UserProfile } from "@/types";
import { ProjectAppHeader } from "@/components/projects/project-app-header";
import { SettingsDrawer } from "@/components/settings/settings-drawer";
import { cn } from "@/lib/utils";

// ── Shell frame ──────────────────────────────────────────────────────────────

export function ProjectShellFrame({
  projects,
  profile,
  hasActiveSubscription,
  currentProjectId,
  currentChapterId = null,
  lastChapterId = null,
  mobileEyebrow,
  mobileTitle: _mobileTitle,
  activeNav,
  mobileBanner,
  onPlanChapters,
  currentBoardId,
  currentBoardGoal,
  currentBoardCreatedAt,
  children,
}: {
  projects: ProjectWithChapters[];
  profile: UserProfile;
  hasActiveSubscription?: boolean;
  currentProjectId: string;
  currentChapterId?: string | null;
  /** The chapter to return to when navigating to the Story overview */
  lastChapterId?: string | null;
  mobileEyebrow: string;
  mobileTitle: string;
  activeNav?: "overview" | "story" | "board";
  /** Full-width banner rendered between the header and scrollable content */
  mobileBanner?: React.ReactNode;
  onPlanChapters?: () => void;
  currentBoardId?: string | null;
  currentBoardGoal?: string | null;
  currentBoardCreatedAt?: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      router.push(`/projects/${currentProjectId}`);
    } else if (dx > 0 && activeNav === "story" && navChapterId) {
      router.push(`/projects/${currentProjectId}/chapters/${navChapterId}/board`);
    } else if (dx > 0 && activeNav === "overview" && navChapterId) {
      router.push(`/projects/${currentProjectId}/chapters/${navChapterId}`);
    }
  }, [activeNav, navChapterId, currentProjectId, router]);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const chapterIndex =
    currentProject?.chapters.findIndex((ch) => ch.id === currentChapterId) ?? -1;

  const currentChapterName =
    currentProject?.chapters.find((ch) => ch.id === currentChapterId)?.name ?? null;
  const currentProjectName = currentProject?.name ?? null;

  return (
    <>
      <div className="flex h-dvh flex-col overflow-hidden">
        {/* ── Unified header (metallic LED panel) — same on mobile + desktop ── */}
        <ProjectAppHeader
          projects={projects}
          currentProjectId={currentProjectId}
          currentChapterId={currentChapterId}
          navChapterId={navChapterId}
          onOpenSettings={() => setSettingsOpen(true)}
          activeNav={activeNav}
          onPlanChapters={onPlanChapters}
        />

        {mobileBanner}

        {/* Chapter title strip — mobile only, shown on story + board tabs */}
        {(activeNav === "story" || activeNav === "board") && chapterIndex >= 0 && mobileEyebrow && (
          <div
            className="shrink-0 border-b px-4 py-3 lg:hidden"
            style={
              theme === "dark"
                ? { background: "#161616", borderColor: "rgba(255,255,255,0.07)" }
                : { borderColor: "rgba(0,0,0,0.06)" }
            }
          >
            {activeNav === "board" && currentProject ? (
              /* Board tab — show "Project name: Chapter N" to match desktop header */
              <p
                className="mt-0.5 leading-tight"
                style={{
                  fontFamily: "'Literata', Georgia, serif",
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: theme === "dark" ? "rgba(232,223,192,0.55)" : "rgba(26,14,0,0.45)",
                }}
              >
                {currentProject.name}: Track {chapterIndex + 1}
              </p>
            ) : (
              /* Story tab — Literata heading */
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
            )}
          </div>
        )}

        {/* Scrollable content */}
        <div
          className="min-h-0 flex-1 overflow-y-auto"
          style={theme === "dark" ? { background: "#161616" } : undefined}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {children}
        </div>
      </div>

      {/* Settings drawer (right side, all screen sizes) */}
      <SettingsDrawer
        open={settingsOpen}
        profile={profile}
        hasActiveSubscription={hasActiveSubscription}
        onClose={() => setSettingsOpen(false)}
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
