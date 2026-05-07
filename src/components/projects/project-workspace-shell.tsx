"use client";

import { useState } from "react";
import type { BoardSnapshot, ProjectWithChapters, UserProfile } from "@/types";
import { ProjectBoardClient } from "@/components/board/project-board-client";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";

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
  const [endChapterOpen, setEndChapterOpen] = useState(false);

  const retroAvailable =
    Boolean(snapshot.board.kickoffCompletedAt) && !snapshot.board.retroCompletedAt;

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
      <div className="space-y-5">
        <ProjectBoardClient
          snapshot={snapshot}
          chapterProjectId={currentProjectId}
          chapterId={currentChapterId}
          endChapterOpen={endChapterOpen}
          onEndChapterClose={() => setEndChapterOpen(false)}
        />
      </div>
    </ProjectShellFrame>
  );
}
