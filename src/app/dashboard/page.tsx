import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentUserProfile, getProjects, getAuthenticatedUser } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserSubscription } from "@/lib/subscription";

export default async function DashboardPage() {
  const [projects, profile, { user }] = await Promise.all([
    getProjects(),
    getCurrentUserProfile(),
    getAuthenticatedUser(),
  ]);

  const supabase = await createSupabaseServerClient();
  const subscription = await getUserSubscription(supabase, user.id);
  const hasActiveSubscription = subscription.status === "active" || subscription.status === "grace_period";

  return <DashboardShell projects={projects} profile={profile} hasActiveSubscription={hasActiveSubscription} />;
}
