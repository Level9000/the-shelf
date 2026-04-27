"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/queries";

export async function updateUserProfileAction(input: { displayName: string }) {
  const displayName = input.displayName.trim();

  if (!displayName) {
    throw new Error("Name is required.");
  }

  if (displayName.length > 80) {
    throw new Error("Name must be 80 characters or fewer.");
  }

  const { supabase, user } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("user_profiles")
    .upsert({
      id: user.id,
      email: user.email ?? "",
      display_name: displayName,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/projects");
}
