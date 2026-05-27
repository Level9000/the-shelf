"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { BoardSnapshot, ProjectWithChapters, UserProfile } from "@/types";
import { ProjectBoardClient } from "@/components/board/project-board-client";
import { ChapterRetroChat } from "@/components/board/chapter-retro-chat";
import { CassChapterKickoff } from "@/components/cass/CassChapterKickoff";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

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
}: {
  snapshot: BoardSnapshot;
  projects: ProjectWithChapters[];
  profile: UserProfile;
  currentProjectId: string;
  currentChapterId: string;
}) {
  const router = useRouter();
  const [retroOpen, setRetroOpen] = useState(false);
  const [allDoneDismissed, setAllDoneDismissed] = useState(false);

  // ── Kickoff gate ─────────────────────────────────────────────────────────────
  const kickoffNeeded = !snapshot.board.kickoffCompletedAt;
  const currentProjectChapters = useMemo(
    () => projects.find((p) => p.id === currentProjectId)?.chapters ?? [],
    [projects, currentProjectId],
  );
  const chapterIndex = currentProjectChapters.findIndex((c) => c.id === currentChapterId);
  const chapterNumber = chapterIndex >= 0 ? chapterIndex + 1 : 1;

  const retroAvailable =
    Boolean(snapshot.board.kickoffCompletedAt) && !snapshot.board.retroCompletedAt;

  const { completedTasks, remainingTasks } = useMemo(
    () => classifyTasks(snapshot),
    [snapshot],
  );

  const allDone =
    retroAvailable &&
    completedTasks.length > 0 &&
    remainingTasks.length === 0;

  const showAllDoneModal = allDone && !allDoneDismissed && !retroOpen;

  function handleEndChapterConfirmed(_nextChapterId: string | null) {
    setRetroOpen(true);
  }

  function handleAllDoneStartRetro() {
    setAllDoneDismissed(true);
    setRetroOpen(true);
  }

  function handleRetroComplete() {
    setRetroOpen(false);
    router.refresh();
  }


  return (
    <ProjectShellFrame
      projects={projects}
      profile={profile}
      currentProjectId={currentProjectId}
      currentChapterId={currentChapterId}
      mobileEyebrow={snapshot.board.name}
      mobileTitle={snapshot.project.name}
      activeNav="board"
      onPlanChapters={() => router.push(`/projects/${currentProjectId}?plan=true`)}
    >
      <Modal
        open={showAllDoneModal}
        title="Chapter complete!"
        description="Every task is in the done column."
        onClose={() => setAllDoneDismissed(true)}
      >
        <p className="text-sm leading-6 text-[var(--muted)]">
          You finished everything you set out to do. Time to reflect on the
          work and write this chapter&apos;s story.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => setAllDoneDismissed(true)}>
            Not yet
          </Button>
          <Button onClick={handleAllDoneStartRetro} className="gap-2">
            <ArrowRight className="size-4" />
            Start the retro
          </Button>
        </div>
      </Modal>

      {kickoffNeeded ? (
        <div className="flex h-full min-h-0 flex-col">
          <CassChapterKickoff
            project={snapshot.project}
            board={snapshot.board}
            columns={snapshot.columns}
            chapterNumber={chapterNumber}
            onComplete={() => router.refresh()}
            onDismiss={undefined}
            isPrefilled={!!snapshot.board.kickoffPrefilledAt}
          />
        </div>
      ) : retroOpen ? (
        <div className="flex h-full min-h-0 flex-col">
          <ChapterRetroChat
            project={{
              id: snapshot.project.id,
              name: snapshot.project.name,
              accumulativeStory: snapshot.project.accumulativeStory,
            }}
            board={snapshot.board}
            completedTasks={completedTasks}
            remainingTasks={remainingTasks}
            onComplete={handleRetroComplete}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <ProjectBoardClient
            snapshot={snapshot}
            chapterProjectId={currentProjectId}
            chapterId={currentChapterId}
            onEndChapterConfirmed={handleEndChapterConfirmed}
            onNavigateToStory={() => router.push(`/projects/${currentProjectId}/chapters/${currentChapterId}`)}
            activeChapterUrl={(() => {
              const currentProject = projects.find((p) => p.id === currentProjectId);
              const activeChapter = currentProject?.chapters.find((c) => !c.retroCompletedAt);
              return activeChapter
                ? `/projects/${currentProjectId}/chapters/${activeChapter.id}/board`
                : null;
            })()}
            futureChapters={(() => {
              const currentProject = projects.find((p) => p.id === currentProjectId);
              if (!currentProject) return [];
              const idx = currentProject.chapters.findIndex((c) => c.id === currentChapterId);
              return currentProject.chapters
                .slice(idx + 1)
                .filter((c) => !c.retroCompletedAt);
            })()}
            allChaptersCount={projects.find((p) => p.id === currentProjectId)?.chapters.length ?? 0}
          />
        </div>
      )}
    </ProjectShellFrame>
  );
}
