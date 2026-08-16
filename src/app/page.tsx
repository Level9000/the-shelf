import type { Metadata } from "next";
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

// Nothing to branch on any more. This route used to check for a session and
// send signed-in users to /projects; there is no /projects, no session, and no
// web portal to send anyone to. Everyone who asks for / gets the same page,
// which is also what makes it statically renderable.
export default function HomePage() {
  return <MarketingHome />;
}
