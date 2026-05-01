import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/supabase/queries";
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

  if (!projectName) {
    redirect("/projects");
  }

  return <ProjectKickoffChat projectName={projectName} />;
}
