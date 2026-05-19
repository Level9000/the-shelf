"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { BoardSnapshot, ProjectWithChapters, UserProfile } from "@/types";
import { ProjectBoardClient } from "@/components/board/project-board-client";
import { ChapterRetroChat } from "@/components/board/chapter-retro-chat";
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
  const [endChapterOpen, setEndChapterOpen] = useState(false);
  const [retroOpen, setRetroOpen] = useState(false);
  const [allDoneDismissed, setAllDoneDismissed] = useState(false);

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

  const showAllDoneModal = allDone && !allDoneDismissed && !retroOpen && !endChapterOpen;

  function handleEndChapterConfirmed(_nextChapterId: string | null) {
    setEndChapterOpen(false);
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

  const boardMobileBanner = snapshot.board.retroCompletedAt ? (() => {
    const date = new Date(snapshot.board.retroCompletedAt).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
    const activeChapter = projects
      .find((p) => p.id === currentProjectId)
      ?.chapters.find((c) => !c.retroCompletedAt);
    const activeChapterUrl = activeChapter
      ? `/projects/${currentProjectId}/chapters/${activeChapter.id}`
      : null;
    return (
      <div className="flex w-full shrink-0 items-center justify-between gap-3 border-b border-green-200 bg-green-50 px-4 py-3">
        <p className="text-sm text-green-800">
          completed on <span className="font-semibold">{date}</span>.
        </p>
        {activeChapterUrl && (
          <Link
            href={activeChapterUrl}
            className="flex shrink-0 items-center gap-1 text-xs font-semibold text-green-700 transition hover:text-green-900"
          >
            Current chapter
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
    );
  })() : null;

  return (
    <ProjectShellFrame
      projects={projects}
      profile={profile}
      currentProjectId={currentProjectId}
      currentChapterId={currentChapterId}
      mobileEyebrow={snapshot.board.name}
      mobileTitle={snapshot.project.name}
      activeNav="board"
      retroAvailable={retroAvailable}
      mobileBanner={boardMobileBanner}
      onEndChapter={() => setEndChapterOpen(true)}
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

      {retroOpen ? (
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
            endChapterOpen={endChapterOpen}
            onEndChapterClose={() => setEndChapterOpen(false)}
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
