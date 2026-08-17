"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { TypewriterQuote } from "./typewriter-quote";

/// The last thing on the page: the ask, typed out, with Cass arriving beside it
/// to see the reader off.
///
/// She enters here the same way she enters the parchment band near the top —
/// same two placements, same easing, same classes — so the page opens and closes
/// with her. The band was hello; this is goodbye.
///
/// One observer drives both the typing and her entrance, rather than an
/// observer each on two different elements: they are one moment and have to
/// start together. The band does the same thing for the same reason.
export function ClosingAsk({
  line,
  children,
}: {
  line: string;
  /// The download button and the price line under it. They live in the page so
  /// the button and the prices stay next to the rest of the page's copy.
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [typed, setTyped] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        // Once only. This is the foot of the page, where a reader scrolling back
        // up to re-read the FAQ would otherwise send her out and back in.
        observer.disconnect();
      },
      // The middle of the viewport: she arrives when the ask is actually being
      // read, not while it is still climbing up from the bottom edge.
      { threshold: 0, rootMargin: "-25% 0px -25% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const done = useCallback(() => setTyped(true), []);

  // Talking while she puts the question, then listening for the answer — which
  // is what the line is actually asking for. Not the record spin: the tour
  // carousel already made that call and wrote down why, that the 1.2s spin
  // "would fidget on a page you're meant to read".
  const animState = !inView ? "idle" : typed ? "listening" : "talking";

  return (
    // The bottom padding is her room on a phone, and it has to clear her whole
    // height or she reaches up into the type. At w-[150px] the recorder's
    // 200x260 viewBox renders ~195px tall.
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-[42rem] pb-[210px] xl:pb-0"
    >
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

      {/* Desktop: the margin beside the column, which is only wide enough for
          her from about 1440px. */}
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
        as="h2"
        text={line}
        start={inView}
        onDone={done}
        className="font-literata text-balance text-[30px] font-bold leading-[1.15] sm:text-[40px]"
        // Names its own colour, like everything else inside a .on-dark band
        // has to. Inheritance carries the *resolved* value down, so a
        // declaration-free element here keeps the light palette's near-black
        // ink from the page root and goes invisible on the dark surface.
        style={{ letterSpacing: "-0.02em", color: "var(--ink)" }}
      />

      {children}
    </div>
  );
}
