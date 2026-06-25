"use server";

import { getAuthenticatedUser } from "@/lib/supabase/queries";
import { BACKSTORY_NUDGE_SESSION_CAP } from "@/lib/constants";

/**
 * Called once per Story-tab mount. Increments the session counter and, if the cap is
 * reached and a gap is currently on file, resets the counter and returns it so the
 * banner can show. Otherwise just ticks the counter forward silently.
 */
export async function checkBackstoryNudgeAction(
  projectId: string,
): Promise<{ gap: string | null }> {
  const { supabase } = await getAuthenticatedUser();

  const { data: project } = await supabase
    .from("projects")
    .select("backstory_gap_note, backstory_nudge_session_count")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { gap: null };

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
