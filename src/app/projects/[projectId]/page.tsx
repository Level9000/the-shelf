import { redirect } from "next/navigation";
import { ProjectOverviewShell } from "@/components/projects/project-overview-shell";
import {
  getCurrentUserProfile,
  getProjectAccessSnapshot,
  getProjectsWithChapters,
  getTasksForProject,
  getAuthenticatedUser,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserSubscription } from "@/lib/subscription";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ chapter?: string; plan?: string }>;
}) {
  const [{ projectId }, { chapter, plan }] = await Promise.all([params, searchParams]);
  const [projects, profile, access, { user }, projectTasks] = await Promise.all([
    getProjectsWithChapters(),
    getCurrentUserProfile(),
    getProjectAccessSnapshot(projectId),
    getAuthenticatedUser(),
    getTasksForProject(projectId),
  ]);

  const supabase = await createSupabaseServerClient();
  const subscription = await getUserSubscription(supabase, user.id);
  const project = projects.find((item) => item.id === projectId) ?? null;

  if (!project) {
    redirect("/projects");
  }

  // Validate that the chapter param actually belongs to this project
  const lastChapterId =
    chapter && project.chapters.some((ch) => ch.id === chapter) ? chapter : null;

  return (
    <main className="min-h-screen w-full lg:p-0">
      <ProjectOverviewShell
        project={project}
        projects={projects}
        profile={profile}
        currentUser={access.currentUser}
        projectMembers={access.projectMembers}
        lastChapterId={lastChapterId}
        initialPlanning={plan === "true"}
        subscriptionStatus={subscription.status}
        projectTasks={projectTasks}
      />
    </main>
  );
}
