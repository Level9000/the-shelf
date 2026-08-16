import type { Metadata } from "next";
import Link from "next/link";
import { TornTape } from "@/components/ui/torn-tape";
import { SUPPORT_EMAIL, COMPANY, COMPANY_LOCATION } from "@/lib/site";

// This is the URL that goes in App Store Connect's Support URL field. Apple
// wants a real page there rather than a mailto:, and review checks that it
// resolves and actually offers help. It also carries the account deletion
// path, which App Store Review Guideline 5.1.1(v) requires an app with
// account creation to document.
export const metadata: Metadata = {
  title: "Support | Authored By",
  description:
    "Get help with Authored By: contact, account deletion, subscriptions, and privacy.",
};

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "Something's broken, or you're stuck",
    body: (
      <>
        Email{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="underline underline-offset-4"
          style={{ color: "var(--gold-emphasis)" }}
        >
          {SUPPORT_EMAIL}
        </a>
        . Tell us what you were doing and what happened instead. If it involves
        a specific chapter, say which one. A real person reads it.
      </>
    ),
  },
  {
    heading: "Deleting your account",
    body: (
      <>
        Open the app, go to the Settings tab, and choose Delete Account. It
        removes your account and every story in it. That is permanent, and it
        is not something we can undo afterwards. If you cannot reach Settings
        for any reason, email{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="underline underline-offset-4"
          style={{ color: "var(--gold-emphasis)" }}
        >
          {SUPPORT_EMAIL}
        </a>{" "}
        from the address on the account and we will do it for you.
      </>
    ),
  },
  {
    heading: "Managing or cancelling your subscription",
    body: (
      <>
        Subscriptions are billed by Apple, so they are managed on your device
        rather than by us: open the Settings app, tap your name, then
        Subscriptions, then Authored By. Cancelling there stops the next
        renewal and leaves your access running until the current period ends.
        Refunds are handled by Apple through reportaproblem.apple.com.
      </>
    ),
  },
  {
    heading: "Getting your writing out",
    body: (
      <>
        Your stories are yours. The share sheet on any finished chapter will
        hand you the text or a PDF, for any chapter or for the whole story, and
        you do not need an active subscription to read or export work you have
        already written.
      </>
    ),
  },
];

export default function SupportPage() {
  return (
    // Pinned to the light palette the same way the home page is, so arriving
    // here from the footer isn't a jarring change of surface.
    <div
      data-force-light
      className="min-h-screen bg-[var(--app-bg)] text-[var(--ink)]"
    >
      <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-24">
        <Link href="/" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- the
              wordmark is a photographed strip of tape; it ships as-is. */}
          <img
            src="/icons/authored-by-tape-icon.png"
            alt="Authored By"
            width={801}
            height={295}
            className="mb-12 block h-auto w-full max-w-[200px]"
          />
        </Link>

        <TornTape size="sm">Support</TornTape>
        <h1
          className="font-literata mt-7 text-[32px] font-bold leading-[1.15] sm:text-[42px]"
          style={{ letterSpacing: "-0.02em" }}
        >
          How can we help?
        </h1>
        <p
          className="font-story mt-5 max-w-[52ch] text-[17px]"
          style={{ lineHeight: 1.75, color: "var(--muted)" }}
        >
          Authored By is made by {COMPANY} in {COMPANY_LOCATION}. It is a small
          operation, which mostly means the person answering your email is the
          person who built the thing.
        </p>

        <div className="mt-14 space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2
                className="font-literata text-[20px] font-bold sm:text-[22px]"
                style={{ letterSpacing: "-0.01em", lineHeight: 1.3 }}
              >
                {section.heading}
              </h2>
              <p
                className="font-story mt-3 max-w-[58ch] text-[16px]"
                style={{ lineHeight: 1.75, color: "var(--muted)" }}
              >
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div
          className="font-label mt-16 flex flex-wrap items-center gap-x-6 gap-y-3 pt-8 text-[13px] font-semibold uppercase"
          style={{
            letterSpacing: "0.14em",
            borderTop: "1px solid var(--stroke)",
          }}
        >
          <Link
            href="/"
            className="underline underline-offset-4"
            style={{ color: "var(--muted)" }}
          >
            Home
          </Link>
          <Link
            href="/privacy"
            className="underline underline-offset-4"
            style={{ color: "var(--muted)" }}
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="underline underline-offset-4"
            style={{ color: "var(--muted)" }}
          >
            Terms of Service
          </Link>
        </div>

        <p
          className="font-story mt-8 text-[13px]"
          style={{ lineHeight: 1.7, color: "var(--muted)" }}
        >
          © {new Date().getFullYear()} {COMPANY} · {COMPANY_LOCATION}
        </p>
      </main>
    </div>
  );
}
