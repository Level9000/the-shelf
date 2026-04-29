"use client";

import { useState } from "react";
import type { BoardSnapshot, ProjectWithChapters, UserProfile } from "@/types";
import { ChapterOverviewPanel } from "@/components/board/chapter-overview-panel";
import { ChapterOverviewRefiner } from "@/components/board/chapter-overview-refiner";
import { ChapterOverviewSettingsDrawer } from "@/components/projects/chapter-overview-settings-drawer";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";

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
  const [refining, setRefining] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
          {refining ? (
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
