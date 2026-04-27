import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentUserProfile, getProjects } from "@/lib/supabase/queries";

export default async function DashboardPage() {
  const [projects, profile] = await Promise.all([
    getProjects(),
    getCurrentUserProfile(),
  ]);

  return <DashboardShell projects={projects} profile={profile} />;
}
