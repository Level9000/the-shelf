"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/queries";

export type StoryFragmentSource = "chapter_capture" | "foundation" | "freeform" | "task_dropped" | "task_completed" | "daily_testimonial";

export async function addStoryFragmentAction(input: {
  projectId: string;
  chapterId?: string | null;
  source: StoryFragmentSource;
  content: string;
  conversation?: Array<{ role: string; content: string }> | null;
  taskTitle?: string | null;
  reason?: string | null;
  feeling?: string | null;
}): Promise<void> {
  const { supabase, user } = await getAuthenticatedUser();

  const content = input.content.trim();
  if (!content) return;

  const { error } = await supabase.from("story_fragments").insert({
    user_id: user.id,
    project_id: input.projectId,
    chapter_id: input.chapterId ?? null,
    source: input.source,
    content,
    conversation: input.conversation ?? null,
    task_title: input.taskTitle ?? null,
    reason: input.reason ?? null,
    feeling: input.feeling ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${input.projectId}`);
}

/** Whether a daily testimonial has already been logged for this chapter today (server-day boundary). */
export async function checkDailyTestimonialDoneTodayAction(chapterId: string): Promise<{ done: boolean }> {
  const { supabase } = await getAuthenticatedUser();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("story_fragments")
    .select("id", { count: "exact", head: true })
    .eq("chapter_id", chapterId)
    .eq("source", "daily_testimonial")
    .gte("created_at", startOfToday.toISOString());

  return { done: (count ?? 0) > 0 };
}
