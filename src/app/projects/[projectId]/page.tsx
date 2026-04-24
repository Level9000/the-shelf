import { redirect } from "next/navigation";
import { getLatestChapterId } from "@/lib/supabase/queries";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const latestChapterId = await getLatestChapterId(projectId);

  if (!latestChapterId) {
    redirect("/dashboard");
  }

  redirect(`/projects/${projectId}/chapters/${latestChapterId}`);
}
