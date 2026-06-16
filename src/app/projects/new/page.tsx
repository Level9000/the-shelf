import { redirect } from "next/navigation";
import { getOptionalUser, getProjects, getCurrentUserProfile } from "@/lib/supabase/queries";
import { CassOnboardingChat } from "@/components/cass/CassOnboardingChat";
import { CassNewProjectPage } from "@/components/cass/CassNewProjectPage";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const user = await getOptionalUser();
  if (!user) {
    redirect("/login");
  }

  const { name } = await searchParams;
  const projectName = (name ?? "").trim();

  // Legacy name-param path — redirect to the clean new-project flow
  if (projectName) {
    redirect("/projects/new");
  }

  const [existingProjects, profile] = await Promise.all([
    getProjects(),
    getCurrentUserProfile(),
  ]);
  const hasExistingProjects = existingProjects.length > 0;

  // First-time user → full onboarding (intro slides + interview)
  if (!hasExistingProjects) {
    return (
      <CassOnboardingChat existingDraft={profile.onboardingDraft ?? null} />
    );
  }

  // Returning user with a draft in progress → resume the interview directly
  if (profile.onboardingDraft) {
    return (
      <CassOnboardingChat
        hasExistingProjects
        existingDraft={profile.onboardingDraft}
      />
    );
  }

  // Returning user, fresh start → cinematic transition then straight to interview
  return <CassNewProjectPage />;
}
