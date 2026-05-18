import { redirect } from "next/navigation";
import { getOptionalUser, getProjects } from "@/lib/supabase/queries";
import { CassOnboardingChat } from "@/components/cass/CassOnboardingChat";
import { ProjectKickoffChat } from "@/components/projects/project-kickoff-chat";

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

  // No name param → Cass onboarding experience (full screen, dark)
  if (!projectName) {
    const existingProjects = await getProjects();
    const hasExistingProjects = existingProjects.length > 0;
    return <CassOnboardingChat hasExistingProjects={hasExistingProjects} />;
  }

  // Name param provided → returning user creating additional project
  return <ProjectKickoffChat projectName={projectName} />;
}
