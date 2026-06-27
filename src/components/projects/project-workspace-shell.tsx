"use client";

import { useEffect, useMemo, useState } from "react";
import { useAvatar } from "@/lib/avatar-context";
import { useTheme } from "@/lib/theme-context";
import { useRouter } from "next/navigation";
import type { BoardSnapshot, ProjectWithChapters, UserProfile } from "@/types";
import type { SubscriptionStatus } from "@/lib/subscription";
import { ProjectBoardClient } from "@/components/board/project-board-client";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { Modal } from "@/components/ui/modal";
import { TapeButton } from "@/components/ui/tape-button";
import { OnboardingNudge } from "@/components/cass/OnboardingNudge";
import { CassRecorder } from "@/components/cass/CassRecorder";
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [mounted, setMounted] = useState(false);

  // RT-02: Board tab → Cass
  useEffect(() => { setActiveAvatar("cass"); }, [setActiveAvatar]);

  // Fade in on mount
  useEffect(() => { const t = setTimeout(() => setMounted(true), 30); return () => clearTimeout(t); }, []);

  const [retroOpen, setRetroOpen] = useState(false);
  const [allDoneDismissed, setAllDoneDismissed] = useState(false);
  const [newChapterPromptOpen, setNewChapterPromptOpen] = useState(false);

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
    canAuthor && !snapshot.board.retroCompletedAt;

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

  const drawerMode: "retro" | "new_chapter" | undefined = retroOpen
    ? "retro"
    : newChapterPromptOpen
    ? "new_chapter"
    : undefined;

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
      onPlanChapters={() => setNewChapterPromptOpen(true)}
      currentBoardId={snapshot.board.id}
      currentBoardGoal={snapshot.board.goal ?? null}
      currentBoardCreatedAt={snapshot.board.createdAt ?? null}
    >
      <Modal
        open={showAllDoneModal}
        onClose={() => setAllDoneDismissed(true)}
        title="Time to wrap up this chapter."
        hideHeader
      >
        <div className="px-6 pt-6 text-center">
          {/* Cass avatar — same treatment as the chat drawer's header avatar */}
          <div className="flex flex-col items-center gap-2">
            <CassRecorder animState="talking" size="sm" />
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: isDark ? "rgba(248,248,246,0.35)" : "rgba(26,14,0,0.35)",
              }}
            >
              Cass · Story Guide
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-semibold" style={{ fontFamily: "var(--font-cass)" }}>
            Time to wrap up this chapter.
          </h1>
          <p
            style={{ fontFamily: "'Lora', Georgia, serif" }}
            className="mt-2 text-sm leading-6 text-[var(--muted)]"
          >
            You finished every task that you had planned for this chapter. Let&apos;s reflect on the hard work and write your chapter&apos;s ending.
          </p>
        </div>

        <div className="space-y-3 px-6 pb-6 pt-5">
          <div className="flex justify-center">
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
      </Modal>

      <div className="space-y-5">
        {canAuthor && missingCount > 0 && (
          <OnboardingNudge projectId={currentProjectId} missingCount={missingCount} />
        )}
        <ProjectBoardClient
          snapshot={snapshot}
          chapterProjectId={currentProjectId}
          chapterId={currentChapterId}
          initialDrawerMode={drawerMode}
          onDrawerClosed={() => setNewChapterPromptOpen(false)}
          chapterNumber={chapterNumber}
          retroNudge={retroNudge}
          onStartRetro={handleAllDoneStartRetro}
          onRetroComplete={handleRetroComplete}
          onNavigateToStory={() => router.push(`/projects/${currentProjectId}/chapters/${currentChapterId}`)}
          activeChapterUrl={(() => {
            const activeChapter = currentProject?.chapters.find((c) => !c.retroCompletedAt);
            return activeChapter
              ? `/projects/${currentProjectId}/chapters/${activeChapter.id}/board`
              : null;
          })()}
          isLocked={(() => {
            if (snapshot.board.retroCompletedAt) return false;
            const activeChapter = currentProject?.chapters.find((c) => !c.retroCompletedAt);
            return Boolean(activeChapter && activeChapter.id !== currentChapterId);
          })()}
          activeChapterName={currentProject?.chapters.find((c) => !c.retroCompletedAt)?.name ?? null}
          subscriptionStatus={subscriptionStatus}
        />
      </div>
    </ProjectShellFrame>
    </div>
  );
}
