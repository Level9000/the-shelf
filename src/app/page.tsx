import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/supabase/queries";
import { MarketingHome } from "@/components/marketing/marketing-home";

export const metadata: Metadata = {
  title: "Authored By: you are on an epic journey",
  description:
    "A two-minute check-in a day becomes the story of what you're building, written down for you chapter by chapter.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const { preview } = await searchParams;
  const user = await getOptionalUser();

  // `/?preview` shows the marketing page to a signed-in developer, so working
  // on it doesn't mean signing out and back in every time. Gated on the dev
  // server the same way /dev-login is, so a production build ignores it
  // entirely and the redirect below is the only behaviour that ships.
  const previewing =
    preview !== undefined && process.env.NODE_ENV === "development";

  // Signed in, this route has always meant "take me to my work" — leave that
  // alone. Signed out it used to bounce to /login, which meant an App Store
  // reviewer (or anyone else who hadn't heard of this yet) hit a locked door.
  // They get the marketing page instead; they reach sign-in from the app.
  if (user && !previewing) redirect("/projects");

  return <MarketingHome />;
}
