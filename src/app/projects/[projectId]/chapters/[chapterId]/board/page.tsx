import {
  getCurrentUserProfile,
  getProjectBoardSnapshot,
  getProjectsWithChapters,
} from "@/lib/supabase/queries";
import { ProjectWorkspaceShell } from "@/components/projects/project-workspace-shell";

export default async function ChapterBoardPage({
  params,
}: {
  params: Promise<{ projectId: string; chapterId: string }>;
}) {
  const { projectId, chapterId } = await params;
  const [snapshot, projects, profile] = await Promise.all([
    getProjectBoardSnapshot(projectId, chapterId),
    getProjectsWithChapters(),
    getCurrentUserProfile(),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <ProjectWorkspaceShell
        snapshot={snapshot}
        projects={projects}
        profile={profile}
        currentProjectId={projectId}
        currentChapterId={chapterId}
      />
    </main>
  );
}
