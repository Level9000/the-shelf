import { redirect } from "next/navigation";
import { getCurrentUserProfile, getProjectsWithChapters } from "@/lib/supabase/queries";
import { OnboardingShell } from "@/components/projects/onboarding-shell";

export default async function ProjectsPage() {
  const [projects, profile] = await Promise.all([
    getProjectsWithChapters(),
    getCurrentUserProfile(),
  ]);

  // Send user to the active chapter board (most recently updated project first,
  // then the first chapter that hasn't had its retro completed yet).
  for (const project of projects) {
    const activeChapter = project.chapters.find((c) => !c.retroCompletedAt);
    if (activeChapter) {
      redirect(`/projects/${project.id}/chapters/${activeChapter.id}/board`);
    }
  }

  // All chapters are wrapped up — fall back to the first available chapter
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
    <main className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:p-0">
      <OnboardingShell projects={[]} profile={profile} />
    </main>
  );
}
