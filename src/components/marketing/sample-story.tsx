import { TornTape } from "@/components/ui/torn-tape";

/// The one switch. `false` keeps the whole section off the page; the home page
/// checks this before rendering it, and the placeholder chrome below is drawn
/// from the same flag, so there is nothing else to remember.
///
/// To publish: fill in SAMPLE with the real chapter, flip this to `true`. That
/// is the entire ritual. Nothing else needs editing, here or in marketing-home.
export const SAMPLE_STORY_READY = false;

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER CONTENT — NOT ON THE PAGE
//
// Hidden rather than deleted, because the layout is finished and only the
// article is missing. The strings are stand-ins sized to the real thing, so
// flipping the flag above shows a section that is already the right shape.
//
// It must be a genuinely app-generated chapter. The seeded "Chapter 1 — The
// Spark" in the dev account reads like output but was hand-written into
// authored-by-mobile/supabase/seeds/erik_authored_by_seed.sql, so it cannot
// stand here: this section's whole claim is that the app wrote it.
//
// The shape below is not invented for marketing. It is exactly what the app
// produces and what /story/[slug] already renders for a shared chapter:
// chapter number and project, chapter title, the opening line as a taped pull
// quote, the four-field chapter overview (goal / why it matters / success
// looks like / done when), then the chapter story itself. Keeping the same
// fields is the whole argument of the section, so add nothing here that the
// app cannot actually generate.
//
// Voice check before pasting: Cass, Ty and Press are all forbidden em dashes
// (see CASS_VOICE / TY_VOICE / PRESS_VOICE in src/lib/ai/prompts.ts). Real
// output will not contain one, so neither should this.
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLE = {
  project: "Small Machines AI",
  chapterNumber: 4,
  title: "[Chapter title, four or five words]",

  // The chapter's opening line. Rides on tape, same as it does in the app.
  pullQuote: "[The one line from this chapter worth quoting back]",

  overview: [
    { label: "Goal", value: "[What this chapter was for, one sentence]" },
    { label: "Why it matters", value: "[Why it had to happen now, one sentence]" },
    { label: "Success looks like", value: "[What had to be true, one sentence]" },
    { label: "Done when", value: "[What completion looked like, one sentence]" },
  ],

  // Five or six paragraphs is the length a real chapter story runs. These are
  // sized to that, so the card's height here is the height it will ship at.
  paragraphs: [
    "[Paragraph one. The opening beat: where things stood when the chapter started, in the author's own words as Cass captured them. Roughly forty to sixty words, which is the length the narrative engine tends to land on for an opener.]",
    "[Paragraph two. The work itself. Specific, dated, concrete. This is the part that reads as evidence rather than reflection, and it is the reason a stranger believes the rest of it.]",
    "[Paragraph three. The turn. Something did not go the way it was planned, and this is where that gets said plainly instead of being smoothed over.]",
    "[Paragraph four. What it cost and what it took. Names, hours, the thing that nearly did not ship.]",
    "[Paragraph five. The landing. What is true now that was not true at the start of the chapter, stated without a moral attached.]",
  ],

  // The provenance line is what turns this from a testimonial into proof: it
  // says how much raw material the chapter was written from.
  provenance: "[Written by Ty from NN check-ins across NN weeks]",
};

/// The card. Deliberately the same furniture as a shared chapter at
/// /story/[slug], because the claim being made is "this is the artifact, not a
/// mockup of one" and a bespoke marketing layout would quietly undercut it.
function StoryCard() {
  return (
    <article
      className="relative mx-auto w-full max-w-[42rem] rounded-[24px] px-6 py-9 sm:px-10 sm:py-12"
      style={{
        background: "var(--surface-strong)",
        // The dashed ring is the placeholder tell. Once the flag flips this
        // becomes the ordinary hairline the rest of the page uses.
        border: SAMPLE_STORY_READY
          ? "1px solid var(--stroke)"
          : "2px dashed var(--gold-border)",
        boxShadow: SAMPLE_STORY_READY ? "var(--shadow-card)" : undefined,
      }}
    >
      {!SAMPLE_STORY_READY && (
        <span className="absolute -top-3 left-6">
          <TornTape size="sm" background="#f5c84a">
            Placeholder
          </TornTape>
        </span>
      )}

      <header>
        <p
          className="font-label text-[12px] font-bold uppercase"
          style={{ letterSpacing: "0.22em", color: "var(--gold-emphasis)" }}
        >
          Chapter {SAMPLE.chapterNumber} · {SAMPLE.project}
        </p>
        <h3
          className="font-literata mt-3 text-[26px] font-bold sm:text-[32px]"
          style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          {SAMPLE.title}
        </h3>

        {/* The opening line, on tape. Same yellow, same torn edge, same
            typewriter face the app uses for it on the chapter itself. */}
        <p className="mt-5">
          <span
            className="font-cass inline-block text-[17px] sm:text-[20px]"
            style={{
              background: "#f5c84a",
              color: "#1a0e00",
              lineHeight: 1.35,
              padding: "4px 14px 6px",
              clipPath:
                "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)",
              boxShadow: "2px 2px 5px rgba(0,0,0,0.3)",
            }}
          >
            &ldquo;{SAMPLE.pullQuote}&rdquo;
          </span>
        </p>

        <div
          className="mt-8"
          style={{ height: "1px", background: "var(--stroke)" }}
        />
      </header>

      {/* The chapter's four questions, answered at kickoff and carried through
          to the finished chapter. They are on the card rather than summarised
          away because they are what makes the story checkable: the bet is
          stated up front, and the paragraphs below are the settlement. */}
      <dl className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {SAMPLE.overview.map((item) => (
          <div key={item.label}>
            <dt
              className="font-label text-[11px] font-bold uppercase"
              style={{ letterSpacing: "0.18em", color: "var(--muted)" }}
            >
              {item.label}
            </dt>
            <dd
              className="font-story mt-2 text-[15px]"
              style={{ lineHeight: 1.6, color: "var(--ink)", opacity: 0.86 }}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div
        className="mt-8"
        style={{ height: "1px", background: "var(--stroke)" }}
      />

      <div className="mt-8 space-y-5">
        {SAMPLE.paragraphs.map((paragraph, i) => (
          <p
            key={i}
            className="font-story text-[16px] sm:text-[17px]"
            style={{ lineHeight: 1.8, color: "var(--ink)", opacity: 0.88 }}
          >
            {paragraph}
          </p>
        ))}
      </div>

      <footer
        className="mt-10 pt-6"
        style={{ borderTop: "1px solid var(--stroke)" }}
      >
        <p
          className="font-label text-[12px] font-semibold uppercase"
          style={{ letterSpacing: "0.16em", color: "var(--muted)" }}
        >
          {SAMPLE.provenance}
        </p>
      </footer>
    </article>
  );
}

/// Section 4: the proof. Sits between the mechanics and the ask, on the same
/// parchment band the premise uses, so the page's width and colour changes
/// keep marking every change of register.
export function SampleStory() {
  return (
    <section
      id="sample-story"
      className="scroll-mt-8 px-5 py-16 sm:py-24"
      style={{ background: "var(--story-bg)" }}
    >
      <div className="mx-auto w-full max-w-5xl">
        <TornTape size="xl">Sample chapter</TornTape>

        {/* TODO(copy): headline and standfirst below are the section's framing,
            not the story. They are written; the article is what is missing. */}
        <h2
          className="font-literata mt-7 max-w-[20ch] text-[28px] font-bold leading-[1.15] sm:text-[36px]"
          style={{ letterSpacing: "-0.02em" }}
        >
          Here&rsquo;s one I didn&rsquo;t write.
        </h2>
        <p
          className="font-story mt-5 max-w-[52ch] text-[17px]"
          style={{ lineHeight: 1.75, color: "var(--muted)" }}
        >
          I used Authored By to launch Small Machines AI, my delivery studio.
          This is a chapter out of that story, exactly as it came out of the
          app. I did the work and the check-ins. Cass and Ty did the rest.
        </p>

        <div className="mt-12">
          <StoryCard />
        </div>
      </div>
    </section>
  );
}
