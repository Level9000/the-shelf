import { redirect } from "next/navigation";
import { getProjects } from "@/lib/supabase/queries";

export default async function WelcomePage() {
  const projects = await getProjects();

  // First-time user: no projects yet — go straight to onboarding
  if (projects.length === 0) {
    redirect("/projects/new");
  }

  // Returning user: straight into the app — /projects/[projectId]'s own
  // loading screen ("Getting your story ready") covers the wait, no need
  // for a separate splash screen first.
  redirect("/projects");
}
