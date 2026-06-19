import { redirect } from "next/navigation";
import { getProjects } from "@/lib/supabase/queries";
import { WelcomeBackScreen } from "./WelcomeBackScreen";

export default async function WelcomePage() {
  const projects = await getProjects();

  // First-time user: no projects yet — skip this screen, go straight to onboarding
  if (projects.length === 0) {
    redirect("/projects/new");
  }

  // Returning user: show the welcome back splash
  return <WelcomeBackScreen />;
}
