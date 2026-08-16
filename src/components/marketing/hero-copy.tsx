"use client";

import { useEffect, useState } from "react";

/// How far the reader scrolls to get from the first block to the second, in
/// px, per breakpoint.
///
/// Each one is roughly 40% of the runway its hero is pinned against, so the
/// swap occupies a real share of the pin and the rest is dwell time on the
/// second page. Keep them in step with those runways: the phone spacer inside
/// the copy column, and the desktop spacer under the pinned section, both in
/// marketing-home.tsx.
///
/// Desktop is much longer than phone because macOS momentum scrolling is much
/// longer than a thumb flick. A single trackpad gesture can carry well past a
/// thousand pixels, and at 190 the whole transition was spent inside the first
/// moments of one.
const SWAP_DISTANCE = { base: 190, desktop: 560 };

const DESKTOP = "(min-width: 768px)";

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
    // Read per frame rather than captured once: a window resized across the
    // breakpoint swaps which hero is pinned, and the distance has to follow.
    const distance = () =>
      window.matchMedia(DESKTOP).matches
        ? SWAP_DISTANCE.desktop
        : SWAP_DISTANCE.base;

    const read = () => {
      frame = 0;
      setProgress(Math.min(1, Math.max(0, window.scrollY / distance())));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Covers a restored scroll position on reload, where no scroll event fires.
    read();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // The first block is fully gone before the second starts arriving. They
  // deliberately do NOT overlap: these are two different paragraphs stacked in
  // one cell, and any moment where both carry opacity renders them as ghosts
  // through each other, which is illegible rather than elegant. A true
  // crossfade works for images and not for text.
  //
  // The dead beat between them is 10% of the swap, short enough to read as a
  // handover rather than a gap.
  const out = Math.min(1, progress / 0.45);
  const inn = Math.max(0, (progress - 0.55) / 0.45);

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
