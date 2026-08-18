"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { TypewriterQuote } from "./typewriter-quote";

/// Where the hand-off to the tour begins, as a fraction of the runway. Over
/// this last stretch Cass fades out and the parchment fades to the page's own
/// surface, so the band has already become the tour's background by the time
/// it releases and the change of section isn't a hard edge.
const HANDOFF_START = 0.7;

/// The parchment band: Cass introducing herself, with the recorder rolling
/// beside her.
///
/// She used to have a second page here, saying "I'll show you how this works"
/// before the tour. That line is the tour's header now and types itself into
/// place there instead. It was two elements pretending to be one — a sticky
/// element cannot outlive its own section, so the copy in this band had to
/// leave the screen at the boundary and the tour's had to arrive, however
/// exactly their positions were matched. Giving the sentence one home solves
/// what no amount of alignment could.
///
/// Pinned with a runway, on the same reasoning as the hero: without it a
/// momentum flick carries straight past her introduction before it has
/// finished typing.
///
/// Cass is rendered twice, and the two are genuinely different placements
/// rather than one box that moves. On desktop she rides the right-hand margin
/// beside a 42rem column, vertically centred, entering from the right. On a
/// phone there is no margin to ride, so she sits in reserved space at the
/// bottom left, half off the edge, entering from the left. Both are hidden
/// from assistive tech; the words beside them are the content.
export function PremiseBand({ line }: { line: string }) {
  const runwayRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [progress, setProgress] = useState(0);
  const [typed, setTyped] = useState(false);

  useEffect(() => {
    const el = runwayRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      // The middle of the viewport: she arrives when the band is actually
      // being read, not while it is still sliding up from the bottom.
      { threshold: 0, rootMargin: "-30% 0px -30% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = runwayRef.current;
    if (!el) return;

    let frame = 0;
    const read = () => {
      frame = 0;
      const span = el.offsetHeight - window.innerHeight;
      if (span <= 0) return;
      const travelled = -el.getBoundingClientRect().top;
      setProgress(Math.min(1, Math.max(0, travelled / span)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    read();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const done = useCallback(() => setTyped(true), []);

  // 0 until the last stretch of the runway, then 0 -> 1 as the band gives way.
  const handoff = Math.min(
    1,
    Math.max(0, (progress - HANDOFF_START) / (1 - HANDOFF_START)),
  );

  // Recording while she is typing, a calm roll the rest of the time she is on
  // screen, stopped when she isn't. Not the record spin throughout: the tour
  // carousel already made that call and wrote down why, that the 1.2s spin
  // "would fidget on a page you're meant to read".
  const animState = !inView ? "idle" : typed ? "listening" : "recording";

  return (
    <div ref={runwayRef} className="relative">
      {/* The parchment giving way to the page's own surface. An overlay rather
          than an interpolated background colour, because the two are CSS
          variables and there is nothing to interpolate between; fading one
          over the other gets the same result and keeps both values in the
          palette where they belong. */}
      <div
        aria-hidden
        className="pointer-events-none sticky top-0 h-svh"
        style={{
          background: "var(--app-bg)",
          opacity: handoff,
          marginBottom: "-100svh",
        }}
      />

      <div className="sticky top-0 flex min-h-svh items-center px-5">
        {/* The bottom padding is Cass's room on a phone, and it has to clear
            her whole height or she reaches up into the text. At w-[150px] the
            recorder's 200x260 viewBox renders ~195px tall. */}
        <div className="relative mx-auto w-full max-w-[42rem] pb-[210px] xl:pb-0">
          {/* Phone: centred under the line, in the room the wrapper's bottom
              padding holds for her. She used to sit at the bottom left, half off
              the edge.

              Centred with auto margins rather than a -translate-x-1/2, because
              the reduced-motion rule pins .cass-slide-left's transform to
              `none` — a centre that lived in the transform would be thrown to
              one side exactly there. This leaves the transform free to carry
              her entrance, which is unchanged. */}
          <div
            aria-hidden
            className="cass-slide-left absolute inset-x-0 bottom-0 mx-auto w-[150px] xl:hidden"
            style={{
              transform: inView ? "translateX(0)" : "translateX(-140%)",
              // Gone by the time the tour arrives, so it doesn't open with a
              // recorder sliding away underneath it.
              opacity: inView ? 1 - handoff : 0,
            }}
          >
            <CassRecorder animState={animState} size="lg" />
          </div>

          {/* Desktop: the margin beside the column, which is only wide enough
              for her from about 1440px. */}
          <div
            aria-hidden
            className="cass-slide absolute left-full top-1/2 ml-4 hidden w-[265px] xl:block min-[1440px]:w-[325px]"
            style={{
              transform: `translateY(-50%) translateX(${inView ? "0%" : "150%"})`,
              opacity: inView ? 1 - handoff : 0,
            }}
          >
            <CassRecorder animState={animState} size="lg" />
          </div>

          <div style={{ opacity: 1 - handoff }}>
            <TypewriterQuote
              text={line}
              start={inView}
              onDone={done}
              // Literata, bold, in the page's own ink. The typewriter face and
              // the softened story ink it used to be set in were doing an
              // impression of a page from the app, which is not what this band
              // is — she is talking to the reader here, in the site's voice.
              //
              // The weight is the tell: every line on the page that types
              // itself out is Cass, and they all have to look alike for that to
              // read as one voice rather than three effects. Same treatment as
              // the payoff shot's headline — change one, change all three.
              className="font-literata text-center text-[20px] font-bold sm:text-[26px]"
              style={{ lineHeight: 1.6, color: "var(--ink)" }}
            />
          </div>
        </div>
      </div>

      {/* The runway she is pinned against. Desktop is much longer for the same
          reason the hero's is: macOS momentum carries a single gesture well
          past a thousand pixels. One page to read now rather than two, so both
          are shorter than they were. */}
      <div aria-hidden className="h-[520px] md:h-[1000px]" />
    </div>
  );
}
