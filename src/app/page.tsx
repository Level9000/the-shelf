import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/supabase/queries";
import { MarketingHome } from "@/components/marketing/marketing-home";

const TITLE = "Authored By: set goals, track your journey, shape your story";
const DESCRIPTION =
  "A two-minute check-in a day becomes the story of what you're building, written down for you chapter by chapter by a story guide named Cass.";

// The image and card type are repeated here rather than inherited from the
// root layout. Next replaces `openGraph` and `twitter` wholesale when a page
// declares them instead of merging field by field, so a page that set only
// title and description silently dropped the card image and downgraded the
// Twitter card to `summary`.
const OG_IMAGE = {
  url: "/marketing/og-card.jpg",
  width: 1200,
  height: 630,
  alt: "Two iPhones on a desk showing the Goals screen and a finished chapter.",
};

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Authored By",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
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
