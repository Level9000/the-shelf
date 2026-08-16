"use client";

import { useEffect, useState } from "react";

/// How far the reader scrolls to get from the first block to the second, in
/// px. Deliberately short. The block travels up by exactly this distance while
/// the swap runs, and the phone app bar occupies the top ~58px, so a longer
/// swap finishes with the new paragraph's first line already tucked under the
/// bar. At 100 it lands with the whole paragraph still clear of it.
const SWAP_DISTANCE = 100;

/// The hero's two pages of copy, crossfaded by scroll position.
///
/// The problem this solves is that the hero said four things at once — a
/// tagline, a headline, a promise and an explanation — and a reader landing
/// cold met all of them in the same glance. Now it opens with the emotional
/// beat and hands over to the plain description as they start moving.
///
/// Not pinned, and that is a measurement rather than a preference. Holding the
/// hero in frame to swap text inside it needs the hero to fit the frame; on a
/// 375x812 phone it is 1341px tall, the film alone being 564px of that. The
/// crossfade gets the same effect without requiring a viewport it cannot have.
///
/// Both blocks sit in the same grid cell, so the taller one sets the height
/// once and nothing reflows as they trade places. Both stay in the DOM and
/// neither is hidden from assistive tech: a screen reader gets the tagline,
/// the headline and the explanation, in order, the way a reader who scrolled
/// would have.
export function HeroCopy({
  tagline,
  headline,
  promise,
  description,
}: {
  tagline: string;
  headline: string;
  promise: string;
  description: React.ReactNode;
}) {
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setProgress(Math.min(1, Math.max(0, window.scrollY / SWAP_DISTANCE)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Covers a restored scroll position on reload, where no scroll event fires.
    read();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // The two overlap in the middle rather than handing over at a hard midpoint:
  // the first is gone by 60% and the second starts arriving at 35%, so there is
  // a beat where neither is fully present and the swap reads as a dissolve
  // instead of a flicker.
  const out = Math.min(1, progress / 0.6);
  const inn = Math.max(0, (progress - 0.35) / 0.65);

  // Reduced motion keeps the swap (it is what makes the hero readable) but
  // drops the travel, so nothing slides.
  const shift = (px: number) => (reduced ? "none" : `translateY(${px}px)`);

  return (
    <div className="grid">
      <div
        className="[grid-area:1/1]"
        style={{
          opacity: 1 - out,
          transform: shift(-10 * out),
          pointerEvents: out > 0.5 ? "none" : undefined,
          transition: "opacity 120ms linear",
        }}
      >
        <p
          className="font-label text-[13px] font-bold uppercase"
          style={{ letterSpacing: "0.2em", color: "var(--gold-emphasis)" }}
        >
          {tagline}
        </p>
        <h1
          className="font-literata text-balance mt-4 text-[38px] font-bold leading-[1.08] sm:text-[52px]"
          style={{ letterSpacing: "-0.02em", color: "var(--ink)" }}
        >
          {headline}
        </h1>
        <p
          className="font-story mt-5 text-[18px] italic sm:text-[20px]"
          style={{ lineHeight: 1.6, color: "var(--gold-emphasis)" }}
        >
          {promise}
        </p>
      </div>

      <div
        className="flex [grid-area:1/1] items-center"
        style={{
          opacity: inn,
          transform: shift(10 * (1 - inn)),
          pointerEvents: inn < 0.5 ? "none" : undefined,
          transition: "opacity 120ms linear",
        }}
      >
        <p
          className="font-story max-w-[46ch] text-[18px] sm:text-[20px]"
          style={{ lineHeight: 1.75, color: "var(--ink)", opacity: 0.86 }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
