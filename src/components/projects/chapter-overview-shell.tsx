"use client";

import { useState } from "react";
import type { BoardSnapshot, ProjectWithChapters, UserProfile } from "@/types";
import { ChapterKickoffChat } from "@/components/board/chapter-kickoff-chat";
import { ChapterOverviewPanel } from "@/components/board/chapter-overview-panel";
import { ChapterOverviewRefiner } from "@/components/board/chapter-overview-refiner";
import { ChapterOverviewSettingsDrawer } from "@/components/projects/chapter-overview-settings-drawer";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";

type KickoffMode = "full" | "confirmation" | false;

function chapterKickoffMode(snapshot: BoardSnapshot): KickoffMode {
  const { board } = snapshot;
  if (board.kickoffCompletedAt) return false;
  // Pre-filled from project kickoff — open in confirmation mode
  if (board.kickoffPrefilledAt) return "confirmation";
  // No data at all — full kickoff required
  return (
    !board.goal?.trim() &&
    !board.whyItMatters?.trim() &&
    !board.successLooksLike?.trim() &&
    !board.doneDefinition?.trim()
  )
    ? "full"
    : false;
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
  const kickoffMode = chapterKickoffMode(snapshot);
  const [kickoffDismissed, setKickoffDismissed] = useState(false);
  const [refining, setRefining] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const showKickoff = kickoffMode !== false && !kickoffDismissed;

  return (
    <>
      <ProjectShellFrame
        projects={projects}
        profile={profile}
        currentProjectId={currentProjectId}
        currentChapterId={currentChapterId}
        mobileEyebrow={snapshot.board.name}
        mobileTitle={snapshot.project.name}
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
          ) : refining ? (
            <ChapterOverviewRefiner
              project={snapshot.project}
              board={snapshot.board}
              onClose={() => setRefining(false)}
            />
          ) : (
            <ChapterOverviewPanel
              board={snapshot.board}
              projectId={currentProjectId}
              chapterId={currentChapterId}
              onRefine={() => setRefining(true)}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}
        </div>
      </ProjectShellFrame>

      <ChapterOverviewSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        projectId={currentProjectId}
        board={snapshot.board}
      />
    </>
  );
}
