"use client";

import { useEffect, useMemo, useState } from "react";
import { useAvatar } from "@/lib/avatar-context";
import { useRouter } from "next/navigation";
import type { BoardSnapshot, ProjectWithChapters, UserProfile } from "@/types";
import type { SubscriptionStatus } from "@/lib/subscription";
import { ProjectBoardClient } from "@/components/board/project-board-client";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { Modal } from "@/components/ui/modal";
import { TapeButton } from "@/components/ui/tape-button";

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

  // RT-02: Board tab → Cass
  useEffect(() => { setActiveAvatar("cass"); }, [setActiveAvatar]);

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

  return (
    <>
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
      <Modal
        open={showAllDoneModal}
        title="Track complete!"
        onClose={() => setAllDoneDismissed(true)}
      >
        <p className="text-sm leading-6 text-[var(--muted)]">
          You finished everything you set out to do. Time to reflect on the
          work and finish writing this track&apos;s story.
        </p>
        <div className="mt-8 flex justify-center">
          <TapeButton variant="primary" size="md" onClick={handleAllDoneStartRetro}>
            Start the retro
          </TapeButton>
        </div>
      </Modal>

      <div className="space-y-5">
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
    </>
  );
}
