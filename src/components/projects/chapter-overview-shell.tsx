"use client";

import { useState } from "react";
import type { BoardSnapshot, ProjectWithChapters, UserProfile } from "@/types";
import { ChapterOverviewPanel } from "@/components/board/chapter-overview-panel";
import { ChapterOverviewRefiner } from "@/components/board/chapter-overview-refiner";
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

  return (
    <ProjectShellFrame
      projects={projects}
      profile={profile}
      currentProjectId={currentProjectId}
      currentChapterId={currentChapterId}
      mobileEyebrow={snapshot.board.name}
      mobileTitle={snapshot.project.name}
    >
      <div className="space-y-5 lg:h-full">
        {refining ? (
          <ChapterOverviewRefiner
            project={snapshot.project}
            board={snapshot.board}
            onClose={() => setRefining(false)}
          />
        ) : (
          <ChapterOverviewPanel
            project={snapshot.project}
            board={snapshot.board}
            projectId={currentProjectId}
            chapterId={currentChapterId}
            onRefine={() => setRefining(true)}
          />
        )}
      </div>
    </ProjectShellFrame>
  );
}
