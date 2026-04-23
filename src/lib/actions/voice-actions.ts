"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/queries";

export async function deleteVoiceCaptureAction(input: {
  captureId: string;
  projectId: string;
}) {
  const { supabase } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("voice_captures")
    .delete()
    .eq("id", input.captureId)
    .eq("project_id", input.projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
}
