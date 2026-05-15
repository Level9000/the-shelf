"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BoardSnapshot, ProjectWithChapters, Task, UserProfile } from "@/types";
import { ArrowLeft } from "lucide-react";
import { ChapterKickoffChat } from "@/components/board/chapter-kickoff-chat";
import { ChapterOverviewPanel } from "@/components/board/chapter-overview-panel";
import { ChapterOverviewRefiner } from "@/components/board/chapter-overview-refiner";
import { ChapterRetroChat } from "@/components/board/chapter-retro-chat";
import { EndChapterModal } from "@/components/board/end-chapter-modal";
import { StoryHub } from "@/components/board/story-hub";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";

type KickoffMode = "full" | "confirmation" | false;

function chapterKickoffMode(snapshot: BoardSnapshot): KickoffMode {
  const { board } = snapshot;
  if (board.kickoffCompletedAt) return false;
  if (board.kickoffPrefilledAt) return "confirmation";
  return (
    !board.goal?.trim() &&
    !board.whyItMatters?.trim() &&
    !board.successLooksLike?.trim() &&
    !board.doneDefinition?.trim()
  )
    ? "full"
    : false;
}

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

export function ChapterOverviewShell({
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
  const kickoffMode = chapterKickoffMode(snapshot);
  const [kickoffDismissed, setKickoffDismissed] = useState(false);
  const [refining, setRefining] = useState(false);
  const [retroOpen, setRetroOpen] = useState(false);
  const [endChapterModalOpen, setEndChapterModalOpen] = useState(false);
  const [activeShareFormat, setActiveShareFormat] = useState<string | null>(null);

  const showKickoff = kickoffMode !== false && !kickoffDismissed;

  const { completedTasks, remainingTasks } = useMemo(
    () => classifyTasks(snapshot),
    [snapshot],
  );

  function handleEndChapterConfirmed(_nextChapterId: string | null) {
    setEndChapterModalOpen(false);
    setRetroOpen(true);
  }

  function handleRetroComplete() {
    setRetroOpen(false);
    router.refresh();
  }

  return (
    <>
      <ProjectShellFrame
        projects={projects}
        profile={profile}
        currentProjectId={currentProjectId}
        currentChapterId={currentChapterId}
        mobileEyebrow={snapshot.board.name}
        mobileTitle={snapshot.project.name}
        activeNav="story"
        onPlanChapters={() => router.push(`/projects/${currentProjectId}?plan=true`)}
      >
        <div className="flex h-full min-h-0 flex-col">
          {showKickoff ? (
            <ChapterKickoffChat
              project={snapshot.project}
              board={snapshot.board}
              columns={snapshot.columns}
              onComplete={() => setKickoffDismissed(true)}
              isPrefilled={kickoffMode === "confirmation"}
            />
          ) : retroOpen ? (
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
          ) : refining ? (
            <ChapterOverviewRefiner
              project={snapshot.project}
              board={snapshot.board}
              onClose={() => setRefining(false)}
            />
          ) : activeShareFormat ? (
            <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
              <button
                type="button"
                onClick={() => setActiveShareFormat(null)}
                className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
              >
                <ArrowLeft className="size-4" />
                Back to chapter
              </button>
              <StoryHub
                board={snapshot.board}
                project={{
                  id: snapshot.project.id,
                  name: snapshot.project.name,
                  accumulativeStory: snapshot.project.accumulativeStory,
                }}
                completedTasks={completedTasks}
                remainingTasks={remainingTasks}
                initialFormat={activeShareFormat}
              />
            </div>
          ) : (
            <ChapterOverviewPanel
              board={snapshot.board}
              projectId={currentProjectId}
              chapterId={currentChapterId}
              tasks={snapshot.tasks}
              columns={snapshot.columns}
              projectName={snapshot.project.name}
              northStar={snapshot.project.northStar}
              onRefine={() => setRefining(true)}
              onStartRetro={() => setRetroOpen(true)}
              onEndChapter={() => setEndChapterModalOpen(true)}
              onSelectShareFormat={setActiveShareFormat}
              activeChapterUrl={(() => {
                const currentProject = projects.find((p) => p.id === currentProjectId);
                const activeChapter = currentProject?.chapters.find((c) => !c.retroCompletedAt);
                return activeChapter
                  ? `/projects/${currentProjectId}/chapters/${activeChapter.id}/board`
                  : null;
              })()}
            />
          )}
        </div>
      </ProjectShellFrame>

      <EndChapterModal
        open={endChapterModalOpen}
        onClose={() => setEndChapterModalOpen(false)}
        onConfirm={handleEndChapterConfirmed}
        projectId={currentProjectId}
        boardId={currentChapterId}
        incompleteTasks={{
          count: remainingTasks.length,
          titles: remainingTasks.map((t) => t.title),
        }}
      />
    </>
  );
}
