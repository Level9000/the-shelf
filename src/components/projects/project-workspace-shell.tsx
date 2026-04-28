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
        <ProjectBoardClient
          snapshot={snapshot}
          chapterProjectId={currentProjectId}
          chapterId={currentChapterId}
        />
      </div>
    </ProjectShellFrame>
  );
}
