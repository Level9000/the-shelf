"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/queries";
import { stripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OnboardingDraft } from "@/types";

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
  revalidatePath("/projects");
}

export async function saveOnboardingDraftAction(draft: OnboardingDraft) {
  const { supabase, user } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("user_profiles")
    .upsert({
      id: user.id,
      email: user.email ?? "",
      onboarding_draft: { ...draft, updated_at: new Date().toISOString() },
    });
  if (error) throw new Error(error.message);
}

export async function clearOnboardingDraftAction() {
  const { supabase, user } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("user_profiles")
    .update({ onboarding_draft: null })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
}

export async function deleteAccountAction() {
  const { supabase, user } = await getAuthenticatedUser();

  // Cancel active Stripe subscription if one exists
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("platform_subscription_id, platform, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (sub?.platform === "stripe" && sub?.platform_subscription_id && sub.status === "active") {
    try {
      await stripe.subscriptions.cancel(sub.platform_subscription_id);
    } catch (err) {
      console.error("[deleteAccount] Stripe cancel failed:", err);
      // Don't block deletion if Stripe cancel fails — webhook will clean up
    }
  }

  // Delete from auth.users — cascades to user_profiles and all user data via FK constraints
  const adminSupabase = await createSupabaseServerClient();
  const { error } = await adminSupabase.auth.admin.deleteUser(user.id);

  if (error) {
    throw new Error("Failed to delete account: " + error.message);
  }

  redirect("/login");
}
