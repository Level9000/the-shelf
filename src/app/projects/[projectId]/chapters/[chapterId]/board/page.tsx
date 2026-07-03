import { redirect } from "next/navigation";

// The Kanban board tab was consolidated into the Story tab's To Do/Completed
// list. This route is kept (rather than deleted) so existing bookmarks and
// links still land somewhere, instead of 404ing.
export default async function ChapterBoardPage({
  params,
}: {
  params: Promise<{ projectId: string; chapterId: string }>;
}) {
  const { projectId, chapterId } = await params;
  redirect(`/projects/${projectId}?chapter=${chapterId}`);
}
