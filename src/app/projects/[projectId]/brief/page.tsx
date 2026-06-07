import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BriefCompletionChat } from "@/components/cass/BriefCompletionChat";

export default async function ProjectBriefPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user } = await getAuthenticatedUser();

  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, project_goal, north_star, project_audience, project_success, project_biggest_risk")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) redirect("/projects");

  // Determine which fields are missing
  const missing = {
    project_goal:        !project.project_goal?.trim(),
    north_star:          !project.north_star?.trim(),
    project_audience:    !project.project_audience?.trim(),
    project_success:     !project.project_success?.trim(),
    project_biggest_risk:!project.project_biggest_risk?.trim(),
  };

  // Nothing missing — send them back
  if (!Object.values(missing).some(Boolean)) {
    redirect(`/projects/${projectId}`);
  }

  return (
    <BriefCompletionChat
      projectId={projectId}
      projectName={project.name}
      missing={missing}
    />
  );
}
