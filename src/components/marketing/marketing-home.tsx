import Link from "next/link";
import { Download } from "lucide-react";
import { Analytics } from "@vercel/analytics/next";
import { TornTape } from "@/components/ui/torn-tape";
import { SUPPORT_EMAIL } from "@/lib/site";
import { IntroFilm } from "./intro-film";
import { MobileAppBar } from "./mobile-app-bar";
import { PremiseBand } from "./premise-band";
import { SampleStory, SAMPLE_STORY_READY } from "./sample-story";
import { TourCarousel, type TourStep } from "./tour-carousel";

// TODO: replace with the real listing URL once the app is live in App Store
// Connect — this is the only placeholder on the page.
const APP_STORE_URL = "#";

// Shared with /support, which is the URL App Store Connect points at.


// Kept next to each other so the hero line and the FAQ answer can never drift
// apart. These are the store-facing prices; the Stripe price IDs they
// correspond to live in env (STRIPE_PRICE_BUILDER_MONTHLY / _ANNUAL).
const PRICE_MONTHLY = "$12";
const PRICE_ANNUAL = "$99";

// Typed out on scroll rather than set as static text. Kept as one plain
// string, curly punctuation and all, because the typewriter reveals it one
// character at a time and JSX entities would arrive as multi-character escapes.
const CASS_QUOTE =
  "“Before long, you’ll have an epic story you can’t wait to share with your circles.”";

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
  // The last three are stills, not clips. Each one's closing frame is the
  // frame that carries the information — the seated roster, the full list of
  // share formats, both projects side by side — and the couple of seconds of
  // motion ahead of it only pulls the eye off the sentence beside it. These
  // are the animations' final frames, extracted rather than re-shot, so they
  // are exactly what the clip used to settle on.
  {
    kind: "clip",
    still: true,
    title: "Guidance",
    src: "/onboarding/03-dream-team-final.webp",
    width: 620,
    height: 802,
    line: "Stuck? Talk it through with your dream team and get some clarity.",
    alt: "A dream team meeting in the app: the seated roster of advisors, and the choices to plan the next action items, adjust the goal, or talk it out together.",
  },
  {
    kind: "clip",
    still: true,
    title: "Sharing",
    src: "/onboarding/04-share-final.webp",
    width: 620,
    height: 570,
    line: "If it's worth telling, you can share your story with one tap.",
    alt: "The share sheet asking who you'd like to share the story with, offering an important email, a blog post for your professional network, or a PDF printed exactly as the story appears in the app.",
  },
  // From `newProjectSlides` — the second-project tour, and the natural last
  // beat: everything above is one story, this is how you run several.
  {
    kind: "clip",
    still: true,
    title: "Story Management",
    src: "/onboarding/05-switch-projects-final.webp",
    width: 620,
    height: 594,
    line:
      "Running more than one? Keep as many going as you want, and switch between them from the Settings tab.",
    alt: "The project switcher in the app, showing Authored By at six chapters alongside Milestone Coach at one, with the current project marked and a link to create a new one.",
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
  // The deletion promise is the load-bearing sentence here, and it is true at
  // the database rather than as a matter of policy: every table that carries a
  // project_id declares `on delete cascade` (grep the migrations, there are no
  // exceptions), and the app's own delete routine clears tasks, boards,
  // voice_captures and members before dropping the project row. Check-ins live
  // in story_fragments and voice_captures, so they go both ways. If a future
  // migration ever adds a project-scoped table without the cascade, this
  // sentence stops being true and has to change with it.
  {
    q: "What happens to my check-ins?",
    a: (
      <>
        We keep them, because they&rsquo;re what your chapters get written
        from. Delete a project and every check-in in it is deleted with it,
        not archived somewhere out of sight.
      </>
    ),
  },
  {
    q: "Does my writing go to an AI?",
    a: (
      <>
        Yes. We use Anthropic&rsquo;s API to do the writing, so your check-ins
        are sent there when a chapter is generated. Anything we store stays
        under the same rule: delete the project and it&rsquo;s gone. The{" "}
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
  // The only forward-looking answer on the page, and the only one that isn't
  // checkable against the code, so it is deliberately conditional: "where I'd
  // like this to go", never a feature, never a date. The last line is not
  // decoration. "Who can read what I write?" three questions up promises that
  // nothing leaves your account, and a hint at publishing can quietly read as
  // "for now" unless the private default is restated right here.
  {
    q: "Can I read other people's stories?",
    a: (
      <>
        Not today. Your story is private by default and goes nowhere you
        don&rsquo;t send it.
        <br />
        <br />
        Where I&rsquo;d like this to go: a place where these stories live,
        where authors publish their chapters and readers follow the work. That
        needs people more than it needs code. If we get there, publishing stays
        a choice you make, never something that happens to your writing.
      </>
    ),
  },
  {
    q: "Is there an Android version?",
    a: (
      <>
        Not yet, but it&rsquo;s in development right now and we hope to have it
        out very soon. iPhone came first; Android is close behind.
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
      {/* Sits outside <main> and outside the dark hero wrapper, so it inherits
          the page's light tokens rather than the hero's inverted ones. It only
          ever appears over light content anyway, the hero being the one dark
          band and the trigger for showing it. */}
      <MobileAppBar href={APP_STORE_URL} />

      {/* Still no desktop nav — there is nowhere else to go. The hero wordmark
          does the job an app bar would there, without the chrome; on a phone
          it hands off to MobileAppBar once it scrolls away. */}
      <main id="top">
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
            id="hero-wordmark"
            src="/icons/authored-by-tape-icon.png"
            alt="Authored By"
            width={801}
            height={295}
            className="mb-6 block h-auto w-full max-w-[336px] md:mx-auto md:mb-14 md:max-w-[190px]"
          />
          <div className="grid gap-12 md:grid-cols-2 md:items-center md:gap-14">
            <div>
              {/* The app's own tagline, verbatim from the login screen
                  (login_screen.dart:444). It replaces the feature triplet
                  that used to sit here, which said what the product does in
                  the position that should be establishing what it is, and
                  then said it again as a section heading further down. */}
              <p
                className="font-label text-[13px] font-bold uppercase"
                style={{ letterSpacing: "0.2em", color: "var(--gold-emphasis)" }}
              >
                Your story. Captured together.
              </p>
              {/* `color` is set here rather than inherited. The page root
                  paints text with `text-[var(--ink)]`, and inheritance passes
                  the *resolved* colour down, so everything inside .on-dark
                  that doesn't name a colour of its own keeps the light
                  palette's near-black ink and disappears against the band. */}
              <h1
                className="font-literata text-balance mt-4 text-[38px] font-bold leading-[1.08] sm:text-[52px]"
                style={{ letterSpacing: "-0.02em", color: "var(--ink)" }}
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
          <PremiseBand quote={CASS_QUOTE} />
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section
          id="how-it-works"
          // scroll-mt clears the fixed bar when "See how it works" jumps here.
          // The bar is phone-only, so the offset is too: from md up the old
          // 8-unit margin is all that's needed.
          // Tighter than the other bands on purpose. The tour pins itself for a
          // 340vh runway, so its own padding is dead space stacked on top of a
          // section that is already generous with room.
          className="mx-auto w-full max-w-5xl scroll-mt-20 px-5 py-12 sm:py-14 md:scroll-mt-8"
        >
          {/* Heading goes to the carousel rather than sitting here, so it is
              inside the pinned block and travels with the frame. */}
          <TourCarousel
            steps={TOUR}
            heading={
              <>
                <TornTape size="xl">How it works</TornTape>
                <h2
                  className="font-literata mt-6 max-w-[20ch] text-[28px] font-bold leading-[1.15] sm:text-[36px]"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  A few quick things before we get started.
                </h2>
              </>
            }
          />
        </section>

        {/* ── What you end up with ─────────────────────────────────────── */}
        {/* The payoff shot, between the loop and the ask: the panels explain
            how it works, this is the thing it produces, then the CTA. Runs
            full bleed like the premise band — the page already uses width
            changes to mark a change of register.

            The headline is set inside both renders rather than living here as
            live text. That is a deliberate trade: burned-in type can't be
            selected or indexed, so the words move into the alt text below to
            keep them available to screen readers and crawlers. There is no
            <h2> here on purpose — with the words in the picture, one would
            say the same sentence twice in a row. */}
        <section className="pb-16 sm:pb-24">
          {/* Two separately composed shots, not one image reflowed: the wide
              one would put the phones at about 100px tall on a handset. The
              <source> media query is the sm breakpoint exactly, and a browser
              fetches only the one that matches — a phone never pulls the
              2688px file down.

              Both aspect ratios are the files' own pixel dimensions rather
              than the tidy ratio they were rendered at. The wide one really is
              21:9, but the portrait came back 1744x2336, which is 0.7466 and
              not the 0.75 that `aspect-[3/4]` would impose. Close enough to
              look fine and far enough to make object-cover shave a sliver off
              the top and bottom, so the container matches the file exactly and
              nothing is cropped or shifted at either size. */}
          <picture>
            <source
              media="(min-width: 640px)"
              srcSet="/marketing/goals-and-story.webp"
              width={2688}
              height={1152}
            />
            <img
              src="/marketing/goals-and-story-portrait.webp"
              alt="Set Your Goals. Track Your Journey. Shape Your Story. Two iPhones stand on a desk beside a cork board of pinned notes. The left shows the Goals screen with a highlighted goal, a vision image, and the actions to take next. The right shows the story tab, open on the backstory: the record of a two-person team that did great work nobody noticed, and built the tool that would have made it impossible to miss."
              width={1744}
              height={2336}
              loading="lazy"
              decoding="async"
              className="mt-8 aspect-[1744/2336] w-full object-cover object-center sm:mt-10 sm:aspect-[21/9]"
            />
          </picture>
        </section>

        {/* ── Proof ────────────────────────────────────────────────────── */}
        {/* The mechanics are done being explained; this is the thing they
            produce, on a real project rather than a demo one.

            Off until there is a genuinely app-generated chapter to put in it.
            A section that claims "this is what the app wrote" cannot launch
            with prose a human wrote, and half-proof is worse than no proof:
            it invites exactly the scrutiny it would fail. Flip
            SAMPLE_STORY_READY in sample-story.tsx to bring it back. */}
        {SAMPLE_STORY_READY && <SampleStory />}

        {/* ── Questions ────────────────────────────────────────────────── */}
        {/* Sits immediately before the ask, because that is where the
            objections actually surface. Answers are open rather than in
            accordions: they're short, and hiding the privacy answer behind a
            click defeats the point of having it. */}
        <section className="mx-auto w-full max-w-5xl px-5 pb-16 sm:pb-24">
          <TornTape size="xl">Questions</TornTape>
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
              style={{ letterSpacing: "-0.02em", color: "var(--ink)" }}
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
          {/* Names its own colour, like everything else inside a .on-dark
              band has to. Inheritance carries the *resolved* value down, so a
              declaration-free element here keeps the light palette's near
              black ink from the page root and lands at 1.02:1 on the footer. */}
          <p
            className="font-story mt-3 text-[16px]"
            style={{ lineHeight: 1.7, color: "var(--ink)" }}
          >
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
            <Link href="/support" className="underline underline-offset-4" style={{ color: "var(--muted)" }}>
              Support
            </Link>
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
