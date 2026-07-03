"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/queries";

/**
 * Called once per Story-tab mount. Shows the nudge once the project has at
 * least one chapter and no voice profile yet, unless the author already
 * dismissed it once (dismissal is permanent — settings is always there).
 */
export async function checkVoiceProfileNudgeAction(
  projectId: string,
): Promise<{ show: boolean }> {
  const { supabase } = await getAuthenticatedUser();

  const [{ data: project }, { count: chapterCount }] = await Promise.all([
    supabase
      .from("projects")
      .select("voice_profile, voice_profile_dismissed_at")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("boards")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
  ]);

  if (!project) return { show: false };

  const hasProfile = Boolean((project.voice_profile as string | null)?.trim());
  const dismissed = Boolean(project.voice_profile_dismissed_at);
  const hasChapter = (chapterCount ?? 0) > 0;

  return { show: hasChapter && !hasProfile && !dismissed };
}

/**
 * Called when the author closes the auto-opened tone-of-voice drawer without
 * finishing. Permanently stops the nudge from auto-opening again. If they engaged
 * at all, the partial conversation is saved so it isn't lost (and so a future
 * "Edit voice profile" session in settings has it to build on).
 */
export async function dismissVoiceProfileNudgeAction(
  projectId: string,
  conversation?: Array<{ role: string; content: string }>,
): Promise<void> {
  const { supabase } = await getAuthenticatedUser();
  const patch: Record<string, unknown> = { voice_profile_dismissed_at: new Date().toISOString() };
  if ((conversation ?? []).some((m) => m.role === "user")) {
    patch.voice_profile_conversation = conversation;
  }

  const { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId);

  if (error) throw new Error(error.message);
}

export async function getVoiceProfileSummaryAction(
  projectId: string,
): Promise<{ voiceProfile: string | null; voiceProfileUpdatedAt: string | null }> {
  const { supabase } = await getAuthenticatedUser();
  const { data: project } = await supabase
    .from("projects")
    .select("voice_profile, voice_profile_updated_at")
    .eq("id", projectId)
    .maybeSingle();

  return {
    voiceProfile: (project?.voice_profile as string | null) ?? null,
    voiceProfileUpdatedAt: (project?.voice_profile_updated_at as string | null) ?? null,
  };
}

export async function saveVoiceProfileAction(input: {
  projectId: string;
  voiceProfile: string;
  conversation: Array<{ role: string; content: string }>;
}): Promise<void> {
  const voiceProfile = input.voiceProfile.trim();
  if (!voiceProfile) throw new Error("Voice profile cannot be empty.");

  const { supabase } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("projects")
    .update({
      voice_profile: voiceProfile,
      voice_profile_conversation: input.conversation,
      voice_profile_updated_at: new Date().toISOString(),
      voice_profile_dismissed_at: null,
    })
    .eq("id", input.projectId);

  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${input.projectId}`);
}
