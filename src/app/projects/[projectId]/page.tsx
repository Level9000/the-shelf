import { getProjectBoardSnapshot, getProjects } from "@/lib/supabase/queries";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { ProjectBoardClient } from "@/components/board/project-board-client";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [snapshot, projects] = await Promise.all([
    getProjectBoardSnapshot(projectId),
    getProjects(),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <ProjectSidebar projects={projects} currentProjectId={projectId} />
        <ProjectBoardClient snapshot={snapshot} />
      </div>
    </main>
  );
}
