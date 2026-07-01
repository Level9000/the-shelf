import { redirect } from "next/navigation";
import { ProjectOverviewShell } from "@/components/projects/project-overview-shell";
import {
  getCurrentUserProfile,
  getProjectAccessSnapshot,
  getProjectsWithChapters,
  getTasksForProject,
  getAuthenticatedUser,
} from "@/lib/supabase/queries";
import { getUserSubscription } from "@/lib/subscription";
import { ensureMinDuration } from "@/lib/utils";

// Keeps the Cass loading screen on-screen long enough to read the
// typewriter message, even when the fetch resolves quickly.
const MIN_LOADING_MS = 4000;

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ chapter?: string; plan?: string }>;
}) {
  const start = Date.now();
  const [{ projectId }, { chapter, plan }] = await Promise.all([params, searchParams]);

  // getAuthenticatedUser() is React-cache()'d, so this dedupes with the
  // internal auth lookups made by the queries below into a single auth call.
  const { supabase, user } = await getAuthenticatedUser();

  const [projects, profile, access, projectTasks, subscription] = await Promise.all([
    getProjectsWithChapters(),
    getCurrentUserProfile(),
    getProjectAccessSnapshot(projectId),
    getTasksForProject(projectId),
    getUserSubscription(supabase, user.id),
  ]);

  await ensureMinDuration(start, MIN_LOADING_MS);

  const project = projects.find((item) => item.id === projectId) ?? null;

  if (!project) {
    redirect("/projects");
  }

  // Validate that the chapter param actually belongs to this project,
  // or fall back to the first chapter so the Board toggle is never disabled.
  const lastChapterId =
    chapter && project.chapters.some((ch) => ch.id === chapter)
      ? chapter
      : (project.chapters[0]?.id ?? null);

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
