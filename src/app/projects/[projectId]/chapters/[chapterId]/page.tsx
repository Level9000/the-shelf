import {
  getCurrentUserProfile,
  getProjectBoardSnapshot,
  getProjectsWithChapters,
} from "@/lib/supabase/queries";
import { ChapterOverviewShell } from "@/components/projects/chapter-overview-shell";

export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; chapterId: string }>;
  searchParams: Promise<{ format?: string }>;
}) {
  const [{ projectId, chapterId }, { format }] = await Promise.all([params, searchParams]);
  const [snapshot, projects, profile] = await Promise.all([
    getProjectBoardSnapshot(projectId, chapterId),
    getProjectsWithChapters(),
    getCurrentUserProfile(),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] lg:p-0">
      <ChapterOverviewShell
        snapshot={snapshot}
        projects={projects}
        profile={profile}
        currentProjectId={projectId}
        currentChapterId={chapterId}
        initialShareFormat={format ?? null}
      />
    </main>
  );
}
