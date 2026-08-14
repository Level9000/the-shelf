import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/supabase/queries";
import { MarketingHome } from "@/components/marketing/marketing-home";

export const metadata: Metadata = {
  title: "Authored By — you are on an epic journey",
  description:
    "A two-minute check-in a day becomes the story of what you're building, written down for you chapter by chapter.",
};

export default async function HomePage() {
  const user = await getOptionalUser();

  // Signed in, this route has always meant "take me to my work" — leave that
  // alone. Signed out it used to bounce to /login, which meant an App Store
  // reviewer (or anyone else who hadn't heard of this yet) hit a locked door.
  // They get the marketing page instead; the header still links to /login.
  if (user) redirect("/projects");

  return <MarketingHome />;
}
