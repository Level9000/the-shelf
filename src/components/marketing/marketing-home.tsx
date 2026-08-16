import Link from "next/link";
import { Download } from "lucide-react";
import { Analytics } from "@vercel/analytics/next";
import { TornTape } from "@/components/ui/torn-tape";
import { IntroFilm } from "./intro-film";
import { PremiseCass } from "./premise-cass";
import { TourCarousel, type TourStep } from "./tour-carousel";

// TODO: replace with the real listing URL once the app is live in App Store
// Connect — this is the only placeholder on the page.
const APP_STORE_URL = "#";

const SUPPORT_EMAIL = "support@authoredby.app";

// Kept next to each other so the hero line and the FAQ answer can never drift
// apart. These are the store-facing prices; the Stripe price IDs they
// correspond to live in env (STRIPE_PRICE_BUILDER_MONTHLY / _ANNUAL).
const PRICE_MONTHLY = "$12";
const PRICE_ANNUAL = "$99";

// Cass's lines, verbatim from `onboardingSlides` in the mobile app
// (lib/screens/onboarding/onboarding_tour.dart). She already says this better
// than a feature list would, and she says it in the app in the same order.
const TOUR: TourStep[] = [
  // The check-in step shows Cass's recorder itself rather than a screenshot of
  // it — the same SVG that sits under the FAB in the app, reels turning.
  {
    kind: "recorder",
    title: "Daily Check-Ins",
    line:
      "With Authored By, we use daily check-ins to capture the details of your story.",
    alt: "Cass's tape recorder, reels turning as she listens to a daily check-in.",
  },
  {
    kind: "clip",
    title: "Generated Chapters",
    src: "/onboarding/02-chapter.webp",
    width: 620,
    height: 710,
    line: "Over time, I'll turn those check-ins into chapters you can actually read.",
    alt: "The app writing Chapter 4 from two weeks of check-ins.",
  },
  {
    kind: "clip",
    title: "Guidance",
    src: "/onboarding/03-dream-team.webp",
    width: 620,
    height: 802,
    line: "Stuck? Talk it through with your dream team and get some clarity.",
    alt: "A dream team meeting in the app, with a roster of advisors and options to plan, adjust the goal, or talk it out.",
  },
  {
    kind: "clip",
    title: "Sharing",
    src: "/onboarding/04-share.webp",
    width: 620,
    height: 570,
    line: "If it's worth telling, you can share your story with one tap.",
    alt: "A finished story page with its masthead and backstory, ready to share.",
  },
  // From `newProjectSlides` — the second-project tour, and the natural last
  // beat: everything above is one story, this is how you run several.
  {
    kind: "clip",
    title: "Story Management",
    src: "/onboarding/05-switch-projects.webp",
    width: 620,
    height: 594,
    line:
      "Running more than one? Keep as many going as you want, and switch between them from the Settings tab.",
    alt: "The Settings tab in the app, with a list of projects to switch between.",
  },
];

// Every answer here is checkable against the code or the privacy policy —
// nothing is aspirational. The AI answer deliberately describes where your
// writing goes rather than promising what Anthropic does with it, because
// that's a claim only the company can make.
const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Who can read what I write?",
    a: (
      <>
        You can. Nothing leaves your account until you decide to share it, and
        when you do, you choose who it&rsquo;s for and how much of the story
        goes with it.
      </>
    ),
  },
  {
    q: "What happens to my check-ins when Cass writes a chapter?",
    a: (
      <>
        They&rsquo;re sent to Anthropic to generate the writing. The AI keys
        never ship inside the app; those calls run through our server and
        require you to be signed in. The{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          privacy policy
        </Link>{" "}
        lists every service involved.
      </>
    ),
  },
  {
    q: "What does it cost?",
    a: (
      <>
        Your first chapter is free. After that it&rsquo;s {PRICE_MONTHLY} a
        month or {PRICE_ANNUAL} a year, billed through the App Store.
      </>
    ),
  },
  {
    q: "Do I have to write every day?",
    a: (
      <>
        No. The check-in takes about two minutes when you want it, and Cass
        writes from whatever you&rsquo;ve given her. Miss a week and the story
        just picks up where you left off.
      </>
    ),
  },
  {
    q: "Can I delete my account and everything in it?",
    a: (
      <>
        Yes, from Settings inside the app, and it removes your account along
        with the stories in it. You can also email{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="underline underline-offset-4"
        >
          {SUPPORT_EMAIL}
        </a>
        .
      </>
    ),
  },
  {
    q: "Is there an Android version?",
    a: (
      <>
        Not yet. Authored By is on iPhone first; Android is planned but
        doesn&rsquo;t have a date worth promising.
      </>
    ),
  },
];

// The app's gold outline pill, ported straight across: 999px, no fill, gold
// border at 55%, a soft gold glow, Literata 14/600, and a label that goes
// tapeGold on dark and ink-on-gold on light. Same numbers as
// lib/widgets/ui/gold_pill_button.dart.
function DownloadButton() {
  return (
    <a
      href={APP_STORE_URL}
      className="font-literata inline-flex items-center justify-center gap-2 rounded-full px-[22px] py-3 text-[14px] font-semibold transition-colors hover:bg-[rgba(200,168,107,0.14)]"
      style={{
        border: "1px solid rgba(200,168,107,0.55)",
        color: "var(--gold-pill-ink)",
        boxShadow: "0 0 18px rgba(200,168,107,0.12)",
      }}
    >
      <Download size={16} aria-hidden />
      Download on the App Store
    </a>
  );
}

export function MarketingHome() {
  return (
    // data-force-light pins this page to the light palette no matter what
    // theme the reader has stored — see the rule it drives in globals.css.
    // /projects, /login and the rest of the app still follow the preference.
    <div
      data-force-light
      className="page-clip-x min-h-screen bg-[var(--app-bg)] text-[var(--ink)]"
    >
      {/* No nav bar — there is nowhere else to go, and no sign-in link to
          hang off one while the web app isn't ready to be shown (/login still
          exists and works, it just isn't advertised). The wordmark below does
          the job an app bar would on desktop, without the chrome. */}
      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        {/* The one band that runs dark. The film is a black object in a black
            phone, the gold pill was designed to glow on dark, and the wordmark
            is white tape that all but disappears on cream. Everything after
            this stays light, because the product footage was all captured in
            light mode and glares on a dark surface. */}
        <div className="on-dark" style={{ background: "var(--app-bg)" }}>
        <section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 md:pt-8">
          {/* One element, two jobs. On a phone it sits in the hero at the
              headline's own measure (the h1's rendered lines run ~335px), so
              the tape reads as part of the title. From md up it centres and
              shrinks into an app-bar mark above both columns — the grid below
              is single-column on mobile and the text block comes first, so
              sitting above the grid puts it in the same place either way and
              this doesn't need to be rendered twice. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- the
              wordmark is a photographed strip of tape; it ships as-is. */}
          <img
            src="/icons/authored-by-tape-icon.png"
            alt="Authored By"
            width={801}
            height={295}
            className="mb-6 block h-auto w-full max-w-[336px] md:mx-auto md:mb-14 md:max-w-[190px]"
          />
          <div className="grid gap-12 md:grid-cols-2 md:items-center md:gap-14">
            <div>
              {/* The plain proposition, first. The headline below is the
                  emotional line and it earns its place, but on its own it
                  never says what the app does, so someone arriving cold from
                  a post or a store listing had to read three more elements
                  before finding out. */}
              <p
                className="font-label text-[13px] font-bold uppercase"
                style={{ letterSpacing: "0.2em", color: "var(--gold-emphasis)" }}
              >
                Set goals. Track your journey. Shape your story.
              </p>
              <h1
                className="font-literata text-balance mt-4 text-[38px] font-bold leading-[1.08] sm:text-[52px]"
                style={{ letterSpacing: "-0.02em" }}
              >
                You are on an epic journey.
              </h1>
              <p
                className="font-story mt-5 text-[18px] italic sm:text-[20px]"
                style={{ lineHeight: 1.6, color: "var(--gold-emphasis)" }}
              >
                And believe me, it&rsquo;s a story worth telling.
              </p>
              <p
                className="font-story mt-5 max-w-[46ch] text-[16px]"
                style={{ lineHeight: 1.75, color: "var(--ink)", opacity: 0.78 }}
              >
                Authored By turns a two-minute check-in a day into the story
                of what you&rsquo;re building. Cass, your story guide, writes it
                down for you, chapter by chapter.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <DownloadButton />
                <a
                  href="#how-it-works"
                  className="font-label text-[13px] font-semibold uppercase underline underline-offset-4"
                  style={{ letterSpacing: "0.14em", color: "var(--muted)" }}
                >
                  See how it works
                </a>
              </div>

              {/* Said up front rather than discovered at the paywall. The free
                  span is the real one from src/lib/subscription.ts: the trial
                  ends when a second chapter is started. */}
              <p
                className="font-story mt-5 text-[14px]"
                style={{ lineHeight: 1.6, color: "var(--muted)" }}
              >
                Free to start. Your first chapter is free, then {PRICE_MONTHLY} a
                month or {PRICE_ANNUAL} a year.
              </p>
            </div>

            <IntroFilm />
          </div>
        </section>
        </div>

        {/* ── One line from the film ───────────────────────────────────── */}
        {/* What's left of the premise. The three-paragraph monologue went:
            it's the film's script verbatim, so anyone who pressed play read
            it twice, and it asked a cold visitor for a page of reading before
            telling them what the app was.

            One line stays rather than nothing, because the film is muted and
            optional — with the passage gone entirely, the whole argument for
            the product would sit behind a click nobody is obliged to make.
            The parchment also keeps a breath between the dark hero and the
            tour, and keeps Cass a margin wide enough to stand in. */}
        <section
          className="flex items-center px-5 py-20 sm:py-24 xl:min-h-[540px]"
          style={{ background: "var(--story-bg)" }}
        >
          <div className="relative mx-auto w-full max-w-[42rem]">
            <PremiseCass />
            <blockquote
              className="font-typewriter text-center text-[20px] sm:text-[26px]"
              style={{ lineHeight: 1.6, color: "var(--story-ink)" }}
            >
              &ldquo;Before long, you&rsquo;ll have an epic story you
              can&rsquo;t wait to share with your circles.&rdquo;
            </blockquote>
            <p
              className="font-cass mt-6 text-center text-[17px]"
              style={{ color: "var(--gold-emphasis)" }}
            >
              Cass
            </p>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section
          id="how-it-works"
          className="mx-auto w-full max-w-5xl scroll-mt-8 px-5 py-16 sm:py-24"
        >
          <TornTape size="sm">How it works</TornTape>
          <h2
            className="font-literata mt-7 max-w-[20ch] text-[28px] font-bold leading-[1.15] sm:text-[36px]"
            style={{ letterSpacing: "-0.02em" }}
          >
            A few quick things before we get started.
          </h2>

          <TourCarousel steps={TOUR} />
        </section>

        {/* ── What you end up with ─────────────────────────────────────── */}
        {/* The payoff shot, between the loop and the ask: the panels explain
            how it works, this is the thing it produces, then the CTA. Runs
            full bleed like the premise band — the page already uses width
            changes to mark a change of register.

            The headline is live text, not the copy that was burned into the
            source image. Baked-in type can't be selected, read aloud, or
            indexed, and it shrinks with the picture until it's unreadable on
            a phone — so it was cropped off and set here instead, same words. */}
        <section className="pb-16 sm:pb-24">
          <h2
            className="font-literata text-balance mx-auto max-w-5xl px-5 text-center text-[26px] font-bold leading-[1.2] sm:text-[36px]"
            style={{ letterSpacing: "-0.02em" }}
          >
            Set Your Goals. Track Your Journey. Shape Your Story
          </h2>
          {/* Two separately composed shots, not one image reflowed: the wide
              one would put the phones at about 100px tall on a handset. The
              <source> media query is the sm breakpoint exactly, and a browser
              fetches only the one that matches — a phone never pulls the
              2200px file down. Each container's aspect ratio equals its own
              image's, so nothing is cropped at either size and neither can
              shift on load. */}
          <picture>
            <source
              media="(min-width: 640px)"
              srcSet="/marketing/goals-and-story.webp"
              width={2200}
              height={952}
            />
            <img
              src="/marketing/goals-and-story-portrait.webp"
              alt="Two iPhones standing on a desk beside a cork board of pinned notes. The left shows the Goals screen, with a highlighted goal, a vision image, and the actions to take next. The right shows a finished chapter, A Dream Is a Dream, with a highlighted pull quote."
              width={1520}
              height={2027}
              loading="lazy"
              decoding="async"
              className="mt-8 aspect-[3/4] w-full object-cover object-center sm:mt-10 sm:aspect-[2200/952]"
            />
          </picture>
        </section>

        {/* ── Questions ────────────────────────────────────────────────── */}
        {/* Sits immediately before the ask, because that is where the
            objections actually surface. Answers are open rather than in
            accordions: they're short, and hiding the privacy answer behind a
            click defeats the point of having it. */}
        <section className="mx-auto w-full max-w-5xl px-5 pb-16 sm:pb-24">
          <TornTape size="sm">Questions</TornTape>
          <h2
            className="font-literata mt-7 max-w-[20ch] text-[28px] font-bold leading-[1.15] sm:text-[36px]"
            style={{ letterSpacing: "-0.02em" }}
          >
            Before you download.
          </h2>

          <dl className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.q}>
                <dt
                  className="font-literata text-[18px] font-bold sm:text-[20px]"
                  style={{ letterSpacing: "-0.01em", lineHeight: 1.3 }}
                >
                  {item.q}
                </dt>
                <dd
                  className="font-story mt-3 max-w-[46ch] text-[16px]"
                  style={{ lineHeight: 1.7, color: "var(--muted)" }}
                >
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Close ────────────────────────────────────────────────────── */}
        {/* Dark again, closing the bookend the hero opened. The last thing on
            the page is the ask, and the gold pill carries further on dark
            than it does on paper. */}
        <div className="on-dark" style={{ background: "var(--app-bg)" }}>
          <section className="mx-auto w-full max-w-5xl px-5 py-20 text-center">
            <h2
              className="font-literata text-balance text-[30px] font-bold leading-[1.15] sm:text-[40px]"
              style={{ letterSpacing: "-0.02em" }}
            >
              So what do you say? Are you ready to get started?
            </h2>
            <div className="mt-8 flex justify-center">
              <DownloadButton />
            </div>
            <p
              className="font-story mt-5 text-[14px]"
              style={{ lineHeight: 1.6, color: "var(--muted)" }}
            >
              Free to start. {PRICE_MONTHLY} a month or {PRICE_ANNUAL} a year
              after your first chapter.
            </p>
          </section>
        </div>
      </main>

      <footer
        className="on-dark px-5 py-12"
        style={{ borderTop: "1px solid var(--stroke)", background: "var(--surface-muted)" }}
      >
        <div className="mx-auto w-full max-w-5xl">
          <p
            className="font-label text-[12px] font-semibold uppercase"
            style={{ letterSpacing: "0.22em", color: "var(--gold-emphasis)" }}
          >
            Support
          </p>
          <p className="font-story mt-3 text-[16px]" style={{ lineHeight: 1.7 }}>
            Questions, trouble with the app, or anything about your account?
            Email{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="underline underline-offset-4"
              style={{ color: "var(--gold-emphasis)" }}
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>

          <div
            className="font-label mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] font-semibold uppercase"
            style={{ letterSpacing: "0.14em" }}
          >
            <Link href="/privacy" className="underline underline-offset-4" style={{ color: "var(--muted)" }}>
              Privacy Policy
            </Link>
            <Link href="/terms" className="underline underline-offset-4" style={{ color: "var(--muted)" }}>
              Terms of Service
            </Link>
          </div>

          <p
            className="font-story mt-8 text-[13px]"
            style={{ lineHeight: 1.7, color: "var(--muted)" }}
          >
            © {new Date().getFullYear()} Small Machines AI LLC · Grand Rapids,
            Michigan
          </p>
        </div>
      </footer>

      {/* Mounted here rather than in the root layout so it only ever runs on
          the public page. Nothing behind /login gets measured, which keeps
          authenticated activity out of it entirely. Vercel Web Analytics is
          cookieless and stores no persistent identifier, so this needs no
          consent banner. It records the referrer and any utm_* params by
          itself — see the tagging scheme in docs/analytics.md, which is what
          makes newsletter traffic distinguishable at all. */}
      <Analytics />
    </div>
  );
}
