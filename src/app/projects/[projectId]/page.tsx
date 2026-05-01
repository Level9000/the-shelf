import { redirect } from "next/navigation";
import { ProjectOverviewShell } from "@/components/projects/project-overview-shell";
import {
  getCurrentUserProfile,
  getProjectAccessSnapshot,
  getProjectsWithChapters,
} from "@/lib/supabase/queries";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [projects, profile, access] = await Promise.all([
    getProjectsWithChapters(),
    getCurrentUserProfile(),
    getProjectAccessSnapshot(projectId),
  ]);
  const project = projects.find((item) => item.id === projectId) ?? null;

  if (!project) {
    redirect("/projects");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <ProjectOverviewShell
        project={project}
        projects={projects}
        profile={profile}
        currentUser={access.currentUser}
        projectMembers={access.projectMembers}
      />
    </main>
  );
}
