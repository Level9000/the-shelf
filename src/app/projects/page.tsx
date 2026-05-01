import { redirect } from "next/navigation";
import { getCurrentUserProfile, getProjectsWithChapters } from "@/lib/supabase/queries";
import { OnboardingShell } from "@/components/projects/onboarding-shell";

export default async function ProjectsPage() {
  const [projects, profile] = await Promise.all([
    getProjectsWithChapters(),
    getCurrentUserProfile(),
  ]);

  // Send user directly to the first board they have access to
  const projectWithChapter = projects.find((p) => p.chapters.length > 0);
  if (projectWithChapter) {
    redirect(
      `/projects/${projectWithChapter.id}/chapters/${projectWithChapter.chapters[0].id}/board`,
    );
  }

  // Has projects but no chapters yet — go to the first project overview
  if (projects.length > 0) {
    redirect(`/projects/${projects[0].id}`);
  }

  // No projects — show onboarding with create modal forced open
  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <OnboardingShell projects={[]} profile={profile} />
    </main>
  );
}
