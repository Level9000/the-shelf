import {
  getCurrentUserProfile,
  getProjectBoardSnapshot,
  getProjectsWithChapters,
  getAuthenticatedUser,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserSubscription, hasAuthorAccess } from "@/lib/subscription";
import { ProjectWorkspaceShell } from "@/components/projects/project-workspace-shell";

export default async function ChapterBoardPage({
  params,
}: {
  params: Promise<{ projectId: string; chapterId: string }>;
}) {
  const { projectId, chapterId } = await params;
  const [snapshot, projects, profile, { user }] = await Promise.all([
    getProjectBoardSnapshot(projectId, chapterId),
    getProjectsWithChapters(),
    getCurrentUserProfile(),
    getAuthenticatedUser(),
  ]);

  const supabase = await createSupabaseServerClient();
  const subscription = await getUserSubscription(supabase, user.id);

  // User is an author on this project if they're the owner or have the author role
  const memberEntry = snapshot.projectMembers.find((m) => m.userId === user.id);
  const isProjectAuthor =
    snapshot.project.userId === user.id ||
    memberEntry?.role === "author";

  const canAuthor = isProjectAuthor && hasAuthorAccess(subscription.status);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] lg:p-0" style={{ background: "#0a0a0a" }}>
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
