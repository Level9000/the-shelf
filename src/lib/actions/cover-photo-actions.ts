"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/queries";

const BUCKET = "chapter-photos";
const MAX_BYTES = 8 * 1024 * 1024;

function coverPhotoPath(projectId: string, chapterId?: string | null) {
  // No file extension in the stored path — contentType on upload is what
  // actually drives how it's served, and a fixed path means re-uploading
  // always overwrites the same object instead of orphaning the old one.
  return chapterId ? `${projectId}/chapters/${chapterId}` : `${projectId}/cover`;
}

export async function uploadCoverPhotoAction(formData: FormData): Promise<{ url: string }> {
  const { supabase } = await getAuthenticatedUser();

  const projectId = formData.get("projectId");
  const chapterId = formData.get("chapterId");
  const file = formData.get("file");

  if (typeof projectId !== "string" || !projectId) throw new Error("Missing project id");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided");
  if (!file.type.startsWith("image/")) throw new Error("File must be an image");
  if (file.size > MAX_BYTES) throw new Error("Image must be under 8MB");

  const path = coverPhotoPath(projectId, typeof chapterId === "string" ? chapterId : null);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Cache-bust: upsert reuses the same path, so the URL itself never changes.
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const table = typeof chapterId === "string" && chapterId ? "boards" : "projects";
  const targetId = typeof chapterId === "string" && chapterId ? chapterId : projectId;
  const { error } = await supabase.from(table).update({ cover_image_url: url }).eq("id", targetId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
  return { url };
}

export async function removeCoverPhotoAction(input: {
  projectId: string;
  chapterId?: string | null;
}): Promise<void> {
  const { supabase } = await getAuthenticatedUser();

  const path = coverPhotoPath(input.projectId, input.chapterId);
  await supabase.storage.from(BUCKET).remove([path]);

  const table = input.chapterId ? "boards" : "projects";
  const targetId = input.chapterId ?? input.projectId;
  const { error } = await supabase.from(table).update({ cover_image_url: null }).eq("id", targetId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${input.projectId}`);
}
