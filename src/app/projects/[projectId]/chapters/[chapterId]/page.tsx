import {
  getCurrentUserProfile,
  getProjectBoardSnapshot,
  getProjectsWithChapters,
} from "@/lib/supabase/queries";
import { ChapterOverviewShell } from "@/components/projects/chapter-overview-shell";

export default async function ChapterPage({
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
    <main className="mx-auto min-h-screen w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:p-0">
      <ChapterOverviewShell
        snapshot={snapshot}
        projects={projects}
        profile={profile}
        currentProjectId={projectId}
        currentChapterId={chapterId}
      />
    </main>
  );
}
