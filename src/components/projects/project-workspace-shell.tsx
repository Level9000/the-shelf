"use client";

import { useEffect, useMemo, useState } from "react";
import { useAvatar } from "@/lib/avatar-context";
import { useRouter } from "next/navigation";
import type { BoardSnapshot, ProjectWithChapters, UserProfile } from "@/types";
import type { SubscriptionStatus } from "@/lib/subscription";
import { ProjectBoardClient } from "@/components/board/project-board-client";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { TapeButton } from "@/components/ui/tape-button";
import { OnboardingNudge } from "@/components/cass/OnboardingNudge";
import { X, ArrowRight } from "lucide-react";

function classifyTasks(snapshot: BoardSnapshot) {
  const doneColumnId = snapshot.columns.find(
    (col) => col.name.toLowerCase() === "done",
  )?.id;
  const completedTasks = doneColumnId
    ? snapshot.tasks.filter((t) => t.columnId === doneColumnId)
    : [];
  const remainingTasks = doneColumnId
    ? snapshot.tasks.filter((t) => t.columnId !== doneColumnId)
    : snapshot.tasks;
  return { completedTasks, remainingTasks };
}

export function ProjectWorkspaceShell({
  snapshot,
  projects,
  profile,
  currentProjectId,
  currentChapterId,
  canAuthor = true,
  subscriptionStatus = "trial",
}: {
  snapshot: BoardSnapshot;
  projects: ProjectWithChapters[];
  profile: UserProfile;
  currentProjectId: string;
  currentChapterId: string;
  /** True if the current user is an owner/author AND has an active subscription or trial */
  canAuthor?: boolean;
  subscriptionStatus?: SubscriptionStatus;
}) {
  const router = useRouter();
  const { setActiveAvatar } = useAvatar();
  const [mounted, setMounted] = useState(false);

  // RT-02: Board tab → Cass
  useEffect(() => { setActiveAvatar("cass"); }, [setActiveAvatar]);

  // Fade in on mount
  useEffect(() => { const t = setTimeout(() => setMounted(true), 30); return () => clearTimeout(t); }, []);

  const [retroOpen, setRetroOpen] = useState(false);
  const [allDoneDismissed, setAllDoneDismissed] = useState(false);

  // ── Kickoff gate ─────────────────────────────────────────────────────────────
  // kickoffNeeded is only true for authors with active access — contributors and
  // expired users skip straight to the board (read/task-only mode).
  const kickoffNeeded = !snapshot.board.kickoffCompletedAt && canAuthor;
  const [paywallOpen, setPaywallOpen] = useState(
    subscriptionStatus === "trial_ended" || subscriptionStatus === "expired",
  );
  const currentProjectChapters = useMemo(
    () => projects.find((p) => p.id === currentProjectId)?.chapters ?? [],
    [projects, currentProjectId],
  );
  const chapterIndex = currentProjectChapters.findIndex((c) => c.id === currentChapterId);
  const chapterNumber = chapterIndex >= 0 ? chapterIndex + 1 : 1;

  const retroAvailable =
    canAuthor && Boolean(snapshot.board.kickoffCompletedAt) && !snapshot.board.retroCompletedAt;

  const { completedTasks, remainingTasks } = useMemo(
    () => classifyTasks(snapshot),
    [snapshot],
  );

  const allDone =
    retroAvailable &&
    completedTasks.length > 0 &&
    remainingTasks.length === 0;

  const showAllDoneModal = allDone && !allDoneDismissed && !retroOpen;

  // When the user has dismissed the "all done" modal without starting the retro,
  // lock the board in a nudge state until they actually kick off the retro.
  const retroNudge = allDone && allDoneDismissed && !retroOpen;

  // Determine which mode the Cass drawer should open in (kickoff takes priority)
  const drawerMode: "kickoff" | "retro" | undefined =
    kickoffNeeded ? "kickoff" : retroOpen ? "retro" : undefined;

  function handleAllDoneStartRetro() {
    setAllDoneDismissed(true);
    setRetroOpen(true);
  }

  function handleRetroComplete() {
    setRetroOpen(false);
    router.refresh();
  }

  const currentProject = projects.find((p) => p.id === currentProjectId);

  const missingCount = [
    snapshot.project.projectGoal,
    snapshot.project.northStar,
    snapshot.project.projectAudience,
    snapshot.project.projectSuccess,
    snapshot.project.projectBiggestRisk,
  ].filter((v) => !v || v.trim() === "").length;

  return (
    <div style={{
      opacity: mounted ? 1 : 0,
      transition: "opacity 0.6s ease",
    }}>
    <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    <ProjectShellFrame
      projects={projects}
      profile={profile}
      hasActiveSubscription={subscriptionStatus === "active" || subscriptionStatus === "grace_period"}
      currentProjectId={currentProjectId}
      currentChapterId={currentChapterId}
      mobileEyebrow={snapshot.board.name}
      mobileTitle={snapshot.project.name}
      activeNav="board"
      onPlanChapters={() => router.push(`/projects/${currentProjectId}?plan=true`)}
    >
      {showAllDoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setAllDoneDismissed(true)}
            aria-hidden="true"
          />
          {/* Modal */}
          <div className="relative z-10 w-full max-w-lg rounded-[2rem] bg-[var(--surface)] shadow-2xl ring-1 ring-black/8 overflow-hidden">
            {/* Header */}
            <div className="bg-[var(--accent-soft)] px-7 pt-8 pb-6 text-center rounded-t-[2rem] relative">
              <button
                type="button"
                onClick={() => setAllDoneDismissed(true)}
                aria-label="Close"
                style={{ fontFamily: "'Literata', Georgia, serif" }}
                className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full bg-black/5 text-[var(--muted)] transition hover:bg-black/8 hover:text-[var(--ink)]"
              >
                <X className="size-4" />
              </button>
              <h2 className="text-2xl font-bold text-[var(--ink)] font-literata">The work is done.</h2>
            </div>
            {/* Body */}
            <div className="px-7 py-6 space-y-4 rounded-b-[2rem] bg-[var(--surface)]">
              <p className="text-sm leading-6 text-[var(--muted)] text-center">
                You finished every task that you had planned for this chapter. Let&apos;s reflect on the hard work and write your chapter&apos;s ending.
              </p>
              <div className="flex justify-center pt-2">
                <TapeButton variant="primary" size="lg" onClick={handleAllDoneStartRetro} className="justify-center">
                  <ArrowRight className="size-4" />
                  Start the recap
                </TapeButton>
              </div>
              <TapeButton
                variant="ghost"
                size="sm"
                onClick={() => setAllDoneDismissed(true)}
                className="flex w-full items-center justify-center gap-1.5"
              >
                <X className="size-3" />
                Not right now
              </TapeButton>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {canAuthor && missingCount > 0 && (
          <OnboardingNudge projectId={currentProjectId} missingCount={missingCount} />
        )}
        <ProjectBoardClient
          snapshot={snapshot}
          chapterProjectId={currentProjectId}
          chapterId={currentChapterId}
          initialDrawerMode={drawerMode}
          chapterNumber={chapterNumber}
          retroNudge={retroNudge}
          onStartRetro={handleAllDoneStartRetro}
          onKickoffComplete={() => router.refresh()}
          onRetroComplete={handleRetroComplete}
          onNavigateToStory={() => router.push(`/projects/${currentProjectId}/chapters/${currentChapterId}`)}
          activeChapterUrl={(() => {
            const activeChapter = currentProject?.chapters.find((c) => !c.retroCompletedAt);
            return activeChapter
              ? `/projects/${currentProjectId}/chapters/${activeChapter.id}/board`
              : null;
          })()}
          futureChapters={(() => {
            if (!currentProject) return [];
            const idx = currentProject.chapters.findIndex((c) => c.id === currentChapterId);
            return currentProject.chapters
              .slice(idx + 1)
              .filter((c) => !c.retroCompletedAt);
          })()}
          allChaptersCount={currentProject?.chapters.length ?? 0}
          subscriptionStatus={subscriptionStatus}
        />
      </div>
    </ProjectShellFrame>
    </div>
  );
}
