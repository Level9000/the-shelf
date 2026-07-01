import {
  getCurrentUserProfile,
  getProjectBoardSnapshot,
  getProjectsWithChapters,
  getAuthenticatedUser,
} from "@/lib/supabase/queries";
import { getUserSubscription, hasAuthorAccess } from "@/lib/subscription";
import { ProjectWorkspaceShell } from "@/components/projects/project-workspace-shell";
import { ensureMinDuration } from "@/lib/utils";

// Keeps the Cass loading screen on-screen long enough to read the
// typewriter message, even when the fetch resolves quickly.
const MIN_LOADING_MS = 4000;

export default async function ChapterBoardPage({
  params,
}: {
  params: Promise<{ projectId: string; chapterId: string }>;
}) {
  const start = Date.now();
  const { projectId, chapterId } = await params;

  // getAuthenticatedUser() is React-cache()'d, so this dedupes with the
  // internal auth lookups made by the queries below into a single auth call.
  const { supabase, user } = await getAuthenticatedUser();

  const [snapshot, projects, profile, subscription] = await Promise.all([
    getProjectBoardSnapshot(projectId, chapterId),
    getProjectsWithChapters(),
    getCurrentUserProfile(),
    getUserSubscription(supabase, user.id),
  ]);

  await ensureMinDuration(start, MIN_LOADING_MS);

  // User is an author on this project if they're the owner or have the author role
  const memberEntry = snapshot.projectMembers.find((m) => m.userId === user.id);
  const isProjectAuthor =
    snapshot.project.userId === user.id ||
    memberEntry?.role === "author";

  const canAuthor = isProjectAuthor && hasAuthorAccess(subscription.status);

  return (
    <main className="min-h-screen w-full lg:p-0">
      <ProjectWorkspaceShell
        snapshot={snapshot}
        projects={projects}
        profile={profile}
        currentProjectId={projectId}
        currentChapterId={chapterId}
        canAuthor={canAuthor}
        subscriptionStatus={subscription.status}
      />
    </main>
  );
}
