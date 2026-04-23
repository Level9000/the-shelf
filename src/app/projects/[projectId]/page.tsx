import { getProjectBoardSnapshot, getProjects } from "@/lib/supabase/queries";
import { ProjectWorkspaceShell } from "@/components/projects/project-workspace-shell";

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
      <ProjectWorkspaceShell
        snapshot={snapshot}
        projects={projects}
        currentProjectId={projectId}
      />
    </main>
  );
}
