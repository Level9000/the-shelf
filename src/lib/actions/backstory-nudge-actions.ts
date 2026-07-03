"use server";

import { getAuthenticatedUser } from "@/lib/supabase/queries";
import { BACKSTORY_NUDGE_SESSION_CAP } from "@/lib/constants";

/**
 * Called once per Story-tab mount. Increments the session counter and, if the cap is
 * reached and a gap is currently on file, resets the counter and returns it so the
 * drawer can auto-open. Once dismissed, stays dismissed — never re-prompts.
 */
export async function checkBackstoryNudgeAction(
  projectId: string,
): Promise<{ gap: string | null }> {
  const { supabase } = await getAuthenticatedUser();

  const { data: project } = await supabase
    .from("projects")
    .select("backstory_gap_note, backstory_nudge_session_count, backstory_nudge_dismissed_at")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { gap: null };
  if (project.backstory_nudge_dismissed_at) return { gap: null };

  const gap = (project.backstory_gap_note as string | null) ?? null;
  if (!gap) return { gap: null };

  const nextCount = ((project.backstory_nudge_session_count as number | null) ?? 0) + 1;
  const eligible = nextCount >= BACKSTORY_NUDGE_SESSION_CAP;

  await supabase
    .from("projects")
    .update({ backstory_nudge_session_count: eligible ? 0 : nextCount })
    .eq("id", projectId);

  return { gap: eligible ? gap : null };
}

/**
 * Called when the author closes the auto-opened backstory drawer without finishing.
 * Permanently stops the nudge from auto-opening again. If they engaged at all, the
 * partial conversation is saved as a story_fragments row so the material isn't lost.
 */
export async function dismissBackstoryNudgeAction(
  projectId: string,
  conversation?: Array<{ role: string; content: string }>,
): Promise<void> {
  const { supabase, user } = await getAuthenticatedUser();

  const { error } = await supabase
    .from("projects")
    .update({ backstory_nudge_dismissed_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) throw new Error(error.message);

  const hasContent = (conversation ?? []).some((m) => m.role === "user");
  if (!hasContent) return;

  const content = (conversation ?? [])
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n");

  const { error: fragmentError } = await supabase.from("story_fragments").insert({
    user_id: user.id,
    project_id: projectId,
    chapter_id: null,
    source: "foundation",
    content,
    conversation,
  });

  if (fragmentError) console.error("Failed to save partial backstory fragment", fragmentError);
}
