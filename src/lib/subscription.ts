/**
 * Subscription & trial utilities.
 *
 * Trial rule:
 *   A user on the free tier exhausts their trial when they complete the
 *   kickoff session on their 2nd track (across all their projects).
 *
 *   - Track 1 kickoff done  → still in trial
 *   - Track 1 retro done    → still in trial
 *   - Track 2 kickoff done  → trial exhausted → show paywall
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type SubscriptionStatus =
  | "active"       // paid and current
  | "trial"        // free tier, within trial limits
  | "trial_ended"  // free tier, trial exhausted — show paywall
  | "grace_period" // payment failed but still accessible
  | "expired"      // cancelled / lapsed
  | "free";        // no subscription row yet (shouldn't happen post-migration)

export type UserSubscription = {
  status: SubscriptionStatus;
  planId: string | null;
  platform: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};

/**
 * Fetch the user's subscription row and compute the effective access status.
 * Pass a Supabase client that is already scoped to the authenticated user.
 */
export async function getUserSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserSubscription> {
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("status, plan_id, platform, cancel_at_period_end, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const rawStatus: string = sub?.status ?? "free";
  const platform: string = sub?.platform ?? "none";

  // Paid or grace_period — always allow access
  if (rawStatus === "active" || rawStatus === "grace_period" || rawStatus === "paused") {
    return {
      status: rawStatus as SubscriptionStatus,
      planId: sub?.plan_id ?? null,
      platform,
      cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
      currentPeriodEnd: sub?.current_period_end ?? null,
    };
  }

  // Expired / cancelled
  if (rawStatus === "cancelled" || rawStatus === "expired") {
    return {
      status: "expired",
      planId: null,
      platform,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    };
  }

  // Free tier — check whether the trial is still valid
  const trialStatus = await computeTrialStatus(supabase, userId);
  return {
    status: trialStatus,
    planId: null,
    platform,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  };
}

/**
 * Count how many of the user's own tracks have a completed kickoff.
 * Trial ends when that count reaches 2.
 */
async function computeTrialStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<"trial" | "trial_ended"> {
  // Get all projects owned by this user
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId);

  if (!projects || projects.length === 0) return "trial";

  const projectIds = projects.map((p: { id: string }) => p.id);

  // Count boards that have been started (have a retro or are in-progress)
  const { count } = await supabase
    .from("boards")
    .select("id", { count: "exact", head: true })
    .in("project_id", projectIds);

  return (count ?? 0) >= 2 ? "trial_ended" : "trial";
}

/**
 * Returns true if the user has full authorship access (active sub or within trial).
 */
export function hasAuthorAccess(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trial" || status === "grace_period";
}

/**
 * Returns true if the user can view previously completed work (always true except hard block).
 */
export function hasReadAccess(status: SubscriptionStatus): boolean {
  return true; // completed work is always viewable
}
