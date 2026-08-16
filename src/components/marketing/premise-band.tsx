"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { TypewriterQuote } from "./typewriter-quote";

/// The parchment band between the hero and the tour: Cass's line typing itself
/// out, with Cass arriving to record it.
///
/// One observer drives both. They used to be separate — the quote watched
/// itself, Cass watched the passage she sits beside — with different root
/// margins on differently-sized elements, so they fired at different scroll
/// positions and the two halves of a single moment drifted apart. Here the
/// band owns the trigger and hands it to both.
///
/// Cass is rendered twice, and the two are genuinely different placements
/// rather than one box that moves. On desktop she rides the right-hand margin
/// beside a 42rem column, vertically centred, entering from the right. On a
/// phone there is no margin to ride, so she sits in reserved space at the
/// bottom left, half off the edge, entering from the left. Both are hidden
/// from assistive tech; the quote beside them is the content.
export function PremiseBand({ quote }: { quote: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [typed, setTyped] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      // The middle 40% of the viewport: she arrives when the line is actually
      // being read, not while the band is still sliding up from the bottom.
      { threshold: 0, rootMargin: "-30% 0px -30% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Stable, so TypewriterQuote's effect doesn't see a new callback each render.
  const handleDone = useCallback(() => setTyped(true), []);

  // Recording while the words appear, then a calm roll once the line lands.
  //
  // Not `recording` throughout, though that is the more obviously energetic
  // choice. The tour carousel already made this call for the same reason and
  // wrote it down: the 1.2s record spin "would fidget on a page you're meant
  // to read". Three seconds of it while the sentence types is a flourish that
  // ends; a minute of it beside a paragraph is a distraction. `listening`
  // keeps the reels turning at 3s for as long as she's on screen, which is the
  // tape still rolling, just not shouting about it.
  const animState = !inView ? "idle" : typed ? "listening" : "recording";

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[42rem] pb-32 xl:pb-0">
      {/* Phone: bottom left, bleeding off the edge. The page root clips
          overflow-x, so her parked position off-screen costs no scrollbar. */}
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

      {/* Desktop: the right-hand margin beside the column. 325px puts her at
          about half the band's height, and that only fits once the margin
          beside 42rem is wide enough, which is ~1440px. */}
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

      <TypewriterQuote
        text={quote}
        durationMs={3000}
        start={inView}
        onDone={handleDone}
        className="font-typewriter text-center text-[20px] sm:text-[26px]"
        style={{ lineHeight: 1.6, color: "var(--story-ink)" }}
      />
      <p
        className="font-cass mt-6 text-center text-[17px]"
        style={{ color: "var(--gold-emphasis)" }}
      >
        Cass
      </p>
    </div>
  );
}
