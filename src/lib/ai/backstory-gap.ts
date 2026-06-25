import type { SupabaseClient } from "@supabase/supabase-js";
import { runBackstoryGapDetection } from "@/lib/ai/anthropic";
import { loadCassStoryContext, summarizeChapterHighlight } from "@/lib/ai/cass-context";

/**
 * Re-runs backstory-gap detection for a project and updates the stored signal if the
 * result changed. Called after any moment new material was just captured (retro
 * completion, foundation chat, chapter-context chat) — not on every page load, since
 * detection is an AI call and most of the time there's nothing new to find.
 *
 * If the detected gap differs from what's currently stored (including a gap clearing
 * entirely), the nudge session counter resets to 0 — fresh or resolved material means
 * the next Story-tab visit shouldn't have to wait out a cap that was counting toward
 * stale information.
 */
export async function refreshBackstoryGapSignal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string,
): Promise<void> {
  const [{ data: project }, storyContext] = await Promise.all([
    supabase.from("projects").select("backstory_gap_note").eq("id", projectId).maybeSingle(),
    loadCassStoryContext(supabase, projectId),
  ]);

  const chapterHighlights = storyContext.chapterSummaries
    .map(summarizeChapterHighlight)
    .filter((h): h is string => Boolean(h));
  const fragmentContents = storyContext.fragments.map((f) => f.content);

  // Nothing to scan yet — not worth a model call.
  if (chapterHighlights.length === 0 && fragmentContents.length === 0 && !storyContext.accumulativeStory) {
    return;
  }

  let result: { hasGap: boolean; gap: string };
  try {
    result = await runBackstoryGapDetection({
      chapterHighlights,
      fragmentContents,
      accumulativeStory: storyContext.accumulativeStory,
    });
  } catch (err) {
    console.error("refreshBackstoryGapSignal: detection failed", err);
    return;
  }

  const currentGap = (project?.backstory_gap_note as string | null) ?? null;
  const newGap = result.hasGap && result.gap.trim() ? result.gap.trim() : null;

  if (newGap === currentGap) return;

  const { error } = await supabase
    .from("projects")
    .update({
      backstory_gap_note: newGap,
      backstory_gap_detected_at: newGap ? new Date().toISOString() : null,
      backstory_nudge_session_count: 0,
    })
    .eq("id", projectId);

  if (error) console.error("refreshBackstoryGapSignal: failed to update signal", error);
}
