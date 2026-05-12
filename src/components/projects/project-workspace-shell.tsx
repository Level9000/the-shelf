"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BoardSnapshot, ProjectWithChapters, UserProfile } from "@/types";
import { ProjectBoardClient } from "@/components/board/project-board-client";
import { ChapterRetroChat } from "@/components/board/chapter-retro-chat";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";

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

  const retroAvailable =
    Boolean(snapshot.board.kickoffCompletedAt) && !snapshot.board.retroCompletedAt;

  const { completedTasks, remainingTasks } = useMemo(
    () => classifyTasks(snapshot),
    [snapshot],
  );

  function handleEndChapterConfirmed(_nextChapterId: string | null) {
    setEndChapterOpen(false);
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
      retroAvailable={retroAvailable}
      onEndChapter={() => setEndChapterOpen(true)}
    >
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
          />
        </div>
      )}
    </ProjectShellFrame>
  );
}
