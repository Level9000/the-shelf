import Link from "next/link";
import { Download } from "lucide-react";
import { Analytics } from "@vercel/analytics/next";
import { TornTape } from "@/components/ui/torn-tape";
import { IntroFilm } from "./intro-film";
import { TourClip } from "./tour-clip";

// TODO: replace with the real listing URL once the app is live in App Store
// Connect — this is the only placeholder on the page.
const APP_STORE_URL = "#";

const SUPPORT_EMAIL = "support@authoredby.app";

// Cass's lines, verbatim from `onboardingSlides` in the mobile app
// (lib/screens/onboarding/onboarding_tour.dart). She already says this better
// than a feature list would, and she says it in the app in the same order.
const TOUR = [
  {
    src: "/onboarding/01-check-in.webp",
    width: 620,
    height: 592,
    line:
      "With Authored By, we use daily check-ins to capture the details of your story.",
    alt: "Cass's daily check-in open in the app, asking “What's on your mind today?” while the recorder listens.",
  },
  {
    src: "/onboarding/02-chapter.webp",
    width: 620,
    height: 710,
    line: "Over time, I'll turn those check-ins into chapters you can actually read.",
    alt: "The app writing Chapter 4 from two weeks of check-ins.",
  },
  {
    src: "/onboarding/04-share.webp",
    width: 620,
    height: 570,
    line: "If it's worth telling, you can share your story with one tap.",
    alt: "A finished story page with its masthead and backstory, ready to share.",
  },
  {
    src: "/onboarding/03-dream-team.webp",
    width: 620,
    height: 802,
    line: "Stuck? Talk it through with your dream team and get some clarity.",
    alt: "A dream team meeting in the app, with a roster of advisors and options to plan, adjust the goal, or talk it out.",
  },
  // From `newProjectSlides` — the second-project tour. It isn't part of the
  // core loop, but as a panel in its own right it no longer has to compete
  // with the four above for attention the way the old footnote card did.
  {
    src: "/onboarding/05-switch-projects.webp",
    width: 620,
    height: 594,
    line:
      "Running more than one? Keep as many going as you want, and switch between them from the Settings tab.",
    alt: "The Settings tab in the app, with a list of projects to switch between.",
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
      className="min-h-screen bg-[var(--app-bg)] text-[var(--ink)]"
    >
      {/* No app bar. A landing page doesn't need one, and there's no sign-in
          link to hang off it while the web app isn't ready to be shown —
          /login still exists and works, it just isn't advertised. The
          wordmark moved into the hero below, where it can be the size it
          deserves. */}
      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:pt-16">
          <div className="grid gap-12 md:grid-cols-2 md:items-center md:gap-14">
            <div>
              {/* Capped at the headline's own measure — the h1's rendered
                  lines run ~335px, so the tape sits directly over the title
                  rather than over the (wider) column it lives in. On a phone
                  the same cap is simply the full content width. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- the
                  wordmark is a photographed strip of tape; it ships as-is. */}
              <img
                src="/icons/authored-by-tape-icon.png"
                alt="Authored By"
                width={801}
                height={295}
                className="mb-6 block h-auto w-full max-w-[336px]"
              />
              <h1
                className="font-literata text-balance text-[38px] font-bold leading-[1.08] sm:text-[52px]"
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
                style={{ lineHeight: 1.75, color: "var(--muted)" }}
              >
                Authored By turns a two-minute check-in a day into the story of
                what you&rsquo;re building — written down for you, chapter by
                chapter, by a story guide named Cass.
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
            </div>

            <IntroFilm />
          </div>
        </section>

        {/* ── The premise ──────────────────────────────────────────────── */}
        {/* The film's argument, in her words, on the parchment reading
            surface — the same page the chapters themselves are set on. */}
        <section
          className="px-5 py-16 sm:py-24"
          style={{ background: "var(--story-bg)" }}
        >
          <div className="mx-auto w-full max-w-[42rem]">
            <TornTape size="sm">The premise</TornTape>

            <div className="mt-8 space-y-6">
              <p
                className="font-story text-[17px] sm:text-[19px]"
                style={{ lineHeight: 1.75, color: "var(--story-ink)" }}
              >
                Maybe you&rsquo;re building a company, or training for
                something, or learning something you&rsquo;ve never done
                before. It doesn&rsquo;t matter what it is. What matters is,
                it&rsquo;s important enough to you that you keep showing up for
                it.
              </p>
              <p
                className="font-story text-[17px] sm:text-[19px]"
                style={{ lineHeight: 1.75, color: "var(--story-ink)" }}
              >
                And one day, you are going to achieve those goals you set for
                yourself. Which is exciting! It&rsquo;s a story worth
                capturing. Worth documenting. Worth sharing.
              </p>
              <p
                className="font-story text-[17px] sm:text-[19px]"
                style={{ lineHeight: 1.75, color: "var(--story-ink)" }}
              >
                And this is where I can help. My name is Cass, and I am going
                to guide you through this app. Together we&rsquo;ll set goals
                and have daily check-ins to capture your progress. As you keep
                checking in, a story starts to take shape, and I will be
                writing it down for you, chapter by chapter.
              </p>
            </div>

            <p
              className="font-cass mt-7 text-[17px]"
              style={{ color: "var(--gold-emphasis)" }}
            >
              — Cass
            </p>

            <blockquote
              className="font-typewriter mt-12 border-t pt-10 text-center text-[20px] sm:text-[24px]"
              style={{
                lineHeight: 1.6,
                color: "var(--story-ink)",
                borderColor: "var(--gold-border)",
              }}
            >
              &ldquo;Before long, you&rsquo;ll have an epic story you
              can&rsquo;t wait to share with your circles.&rdquo;
            </blockquote>
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

          {/* data-snap-pages turns on the viewport's scroll-snapping while
              this page is mounted, and only from 768px up — each <li> becomes
              a snap target sized to one screen. Below that breakpoint none of
              it applies and this stays a plain stacked list. See the rule in
              globals.css. */}
          <ol data-snap-pages className="mt-14 space-y-16 md:mt-6 md:space-y-0">
            {TOUR.map((step, i) => (
              <li
                key={step.src}
                data-snap-page
                className={`grid gap-7 md:min-h-svh md:grid-cols-2 md:content-center md:items-center md:gap-12 md:py-10 ${
                  i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <span
                    className="font-label text-[12px] font-bold uppercase"
                    style={{ letterSpacing: "0.22em", color: "var(--gold-emphasis)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                    <span className="opacity-50"> / {String(TOUR.length).padStart(2, "0")}</span>
                  </span>
                  <p
                    className="font-story mt-3 max-w-[26ch] text-[20px] sm:text-[24px]"
                    style={{ lineHeight: 1.55 }}
                  >
                    {step.line}
                  </p>
                </div>
                <TourClip
                  src={step.src}
                  alt={step.alt}
                  width={step.width}
                  height={step.height}
                  maxViewportHeight={52}
                  className="mx-auto w-full max-w-[340px] md:max-w-none"
                />
              </li>
            ))}
          </ol>
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
              alt="Two iPhones standing on a desk beside a cork board of pinned notes. The left shows the Goals screen — a highlighted goal, a vision image, and the actions to take next. The right shows a finished chapter, A Dream Is a Dream, with a highlighted pull quote."
              width={1520}
              height={2027}
              loading="lazy"
              decoding="async"
              className="mt-8 aspect-[3/4] w-full object-cover object-center sm:mt-10 sm:aspect-[2200/952]"
            />
          </picture>
        </section>

        {/* ── Close ────────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-5xl px-5 pb-20 text-center">
          <h2
            className="font-literata text-balance text-[30px] font-bold leading-[1.15] sm:text-[40px]"
            style={{ letterSpacing: "-0.02em" }}
          >
            So what do you say? Are you ready to get started?
          </h2>
          <div className="mt-8 flex justify-center">
            <DownloadButton />
          </div>
        </section>
      </main>

      <footer
        className="px-5 py-12"
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
            Questions, trouble with the app, or anything about your account —
            email{" "}
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
