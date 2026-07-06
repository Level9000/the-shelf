import type { SupabaseClient } from "@supabase/supabase-js";
import { runLiveDraftStoryGeneration } from "@/lib/ai/anthropic";

/**
 * Regenerates the live, in-progress draft for an active (non-retro'd) chapter
 * from its daily_testimonial fragments. Called after each daily check-in is
 * saved (see CassDailyTestimonialChat.tsx's saveAndClose). Never throws —
 * failures are logged and swallowed so a live-draft hiccup never blocks the
 * author's daily check-in flow (mirrors refreshBackstoryGapSignal).
 */
export async function refreshLiveDraftStory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string,
  chapterId: string,
): Promise<void> {
  const [{ data: board }, { data: fragments }] = await Promise.all([
    supabase
      .from("boards")
      .select("name, goal, why_it_matters, confirmed_thesis, retro_completed_at")
      .eq("id", chapterId)
      .maybeSingle(),
    supabase
      .from("story_fragments")
      .select("content, created_at")
      .eq("chapter_id", chapterId)
      .eq("source", "daily_testimonial")
      .order("created_at", { ascending: true }),
  ]);

  if (!board || board.retro_completed_at) return; // only active chapters get a live draft
  if (!fragments || fragments.length === 0) return; // nothing to synthesize yet

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .maybeSingle();

  let draft: string;
  try {
    draft = await runLiveDraftStoryGeneration({
      projectName: String(project?.name ?? ""),
      chapterName: String(board.name),
      chapterGoal: (board.goal as string | null) ?? null,
      whyItMatters: (board.why_it_matters as string | null) ?? null,
      confirmedThesis: (board.confirmed_thesis as string | null) ?? null,
      testimonials: fragments.map((f) => ({
        date: new Date(f.created_at as string).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        content: String(f.content),
      })),
    });
  } catch (err) {
    console.error("refreshLiveDraftStory: generation failed", err);
    return;
  }

  const { error } = await supabase
    .from("boards")
    .update({ live_draft_story: draft, live_draft_updated_at: new Date().toISOString() })
    .eq("id", chapterId);

  if (error) console.error("refreshLiveDraftStory: failed to save draft", error);
}
