"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { TypewriterQuote } from "./typewriter-quote";

/// Where the first page hands over to the second, as a fraction of the runway.
/// The first is gone by 0.45 and the second starts arriving at 0.5, leaving a
/// short dead beat so the trade reads as a handover rather than a flicker.
const PAGE_ONE_OUT = 0.45;
const PAGE_TWO_IN = 0.5;
const PAGE_TWO_FADE = 0.25;

/// The parchment band: Cass introducing herself, then telling you what happens
/// next, with the recorder rolling beside her.
///
/// Pinned with a runway, on the same reasoning as the hero. Cass has two
/// things to say and they are sequential, so the band has to hold still long
/// enough for both to be read; without that, one momentum flick would carry
/// straight past the second before it finished typing.
///
/// One scroll position drives everything here: which page is showing, when the
/// second line starts typing, and what the reels are doing. Cass and the words
/// used to run off separate observers with different root margins and drifted
/// apart; there is a single source of truth now.
///
/// Cass is rendered twice, and the two are genuinely different placements
/// rather than one box that moves. On desktop she rides the right-hand margin
/// beside a 42rem column, vertically centred, entering from the right. On a
/// phone there is no margin to ride, so she sits in reserved space at the
/// bottom left, half off the edge, entering from the left. Both are hidden
/// from assistive tech; the words beside them are the content.
export function PremiseBand({
  lineOne,
  lineTwo,
}: {
  lineOne: string;
  lineTwo: string;
}) {
  const runwayRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [progress, setProgress] = useState(0);
  const [typedOne, setTypedOne] = useState(false);
  const [typedTwo, setTypedTwo] = useState(false);

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

  const doneOne = useCallback(() => setTypedOne(true), []);
  const doneTwo = useCallback(() => setTypedTwo(true), []);

  const out = Math.min(1, progress / PAGE_ONE_OUT);
  const inn = Math.min(
    1,
    Math.max(0, (progress - PAGE_TWO_IN) / PAGE_TWO_FADE),
  );
  const onPageTwo = progress >= PAGE_TWO_IN;

  // Recording while either line is being typed, a calm roll the rest of the
  // time she is on screen, stopped when she isn't. Not the record spin
  // throughout: the tour carousel already made that call and wrote down why,
  // that the 1.2s spin "would fidget on a page you're meant to read".
  const typing = (inView && !typedOne) || (onPageTwo && !typedTwo);
  const animState = !inView ? "idle" : typing ? "recording" : "listening";

  return (
    <div ref={runwayRef}>
      <div className="sticky top-0 flex min-h-svh items-center px-5">
        {/* The bottom padding is Cass's room on a phone, and it has to clear
            her whole height or she reaches up into the text. At w-[150px] the
            recorder's 200x260 viewBox renders ~195px tall, so 128px of padding
            left her overlapping the last two lines of the introduction, which
            is longer than the single line that used to live here. */}
        <div className="relative mx-auto w-full max-w-[42rem] pb-[210px] xl:pb-0">
          {/* Phone: bottom left, bleeding off the edge. The page root clips
              overflow-x, so her parked position costs no scrollbar. */}
          <div
            aria-hidden
            className="cass-slide-left absolute -left-8 bottom-0 w-[150px] xl:hidden"
            style={{
              transform: inView ? "translateX(0)" : "translateX(-140%)",
              opacity: inView ? 1 : 0,
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
              opacity: inView ? 1 : 0,
            }}
          >
            <CassRecorder animState={animState} size="lg" />
          </div>

          {/* Both lines share one cell, so the taller sets the height once and
              nothing reflows as they trade. Neither is hidden from assistive
              tech: a screen reader gets both, in order. */}
          <div className="grid">
            <div
              className="[grid-area:1/1]"
              style={{
                opacity: 1 - out,
                pointerEvents: out > 0.5 ? "none" : undefined,
                transition: "opacity 120ms linear",
              }}
            >
              <TypewriterQuote
                text={lineOne}
                durationMs={3000}
                start={inView}
                onDone={doneOne}
                className="font-typewriter text-center text-[20px] sm:text-[26px]"
                style={{ lineHeight: 1.6, color: "var(--story-ink)" }}
              />
            </div>

            <div
              className="flex [grid-area:1/1] items-center justify-center"
              style={{
                opacity: inn,
                pointerEvents: inn < 0.5 ? "none" : undefined,
                transition: "opacity 120ms linear",
              }}
            >
              <TypewriterQuote
                text={lineTwo}
                // Shorter line, shorter type. Holding it to the same three
                // seconds as the introduction would make a seven word sentence
                // crawl out at a third of the pace of the one before it.
                durationMs={1400}
                start={onPageTwo}
                onDone={doneTwo}
                className="font-typewriter text-center text-[22px] sm:text-[30px]"
                style={{ lineHeight: 1.6, color: "var(--story-ink)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* The runway both pages are pinned against. Desktop is much longer for
          the same reason the hero's is: macOS momentum carries a single
          gesture well past a thousand pixels. */}
      <div aria-hidden className="h-[700px] md:h-[1500px]" />
    </div>
  );
}
