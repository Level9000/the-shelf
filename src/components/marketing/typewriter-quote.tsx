"use client";

import { Fragment, useEffect, useRef, useState } from "react";

/// Cass's line, typed out when the reader reaches it.
///
/// Every character is in the DOM from the start, with the untyped ones at
/// `opacity: 0`. That is the whole trick: appending text character by
/// character would re-wrap the block on nearly every frame and shove the
/// section below it around for three solid seconds. Holding the final layout
/// and revealing into it means the line types without a single reflow.
///
/// The caret is zero-width and absolutely positioned inside a marker span, so
/// it can sit between the typed and untyped halves without occupying a column
/// of its own and nudging the wrap.
///
/// Timing runs off elapsed time in a rAF loop rather than a per-character
/// interval, so the line always finishes in `durationMs` whatever the frame
/// rate does. A dropped frame costs smoothness, never duration.
/// Zero-width so it can sit between two characters without claiming a column
/// and shifting the wrap. The visible bar is absolutely positioned out of it.
function Caret() {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: 0,
        verticalAlign: "baseline",
      }}
    >
      <span
        className="tw-caret"
        style={{
          position: "absolute",
          left: 0,
          bottom: "-0.08em",
          width: "0.07em",
          height: "1.05em",
          background: "currentColor",
        }}
      />
    </span>
  );
}

export function TypewriterQuote({
  text,
  durationMs = 3000,
  className,
  style,
}: {
  text: string;
  durationMs?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLQuoteElement>(null);
  const [started, setStarted] = useState(false);
  const [typed, setTyped] = useState(0);
  const [reduced, setReduced] = useState(false);

  // Read once on mount rather than at module scope: this renders on the server
  // too, where matchMedia doesn't exist.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          // Once only. Re-typing every time the quote scrolls back into view
          // turns a moment into a tic, and on a short viewport the line can
          // cross the trigger several times in normal reading.
          observer.disconnect();
        }
      },
      // Fires when the quote is genuinely being read, not when its first pixel
      // clears the bottom edge and it is still sliding up.
      { threshold: 0, rootMargin: "-20% 0px -20% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || reduced) return;

    let frame = 0;
    // Started on the first delivered frame, not here. A hidden tab suspends
    // rAF entirely, so a clock started at effect time would spend the whole
    // three seconds while nothing was on screen and then snap to finished the
    // moment the reader came back. This way the line always takes three
    // seconds of *visible* time.
    let start = 0;

    const tick = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / durationMs);
      setTyped(Math.round(progress * text.length));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, reduced, durationMs, text.length]);

  // Reduced motion gets the finished line, no animation, no caret.
  const revealed = reduced ? text.length : typed;
  // `i === revealed` never matches once every character is typed, so the caret
  // retires on its own at the end of the line.
  const showCaret = started && !reduced && revealed < text.length;

  return (
    <blockquote ref={ref} className={className} style={style}>
      {/* The real line, for assistive tech. Reading it out one character at a
          time as the spans flip on would be unusable, so the animated copy is
          hidden from the accessibility tree entirely and this carries it. */}
      <span className="sr-only">{text}</span>

      <span aria-hidden>
        {text.split("").map((char, i) => (
          // The caret is emitted *before* the first untyped character rather
          // than after the whole string, so it rides the typing position. Put
          // after the map it would park at the end of the last line and sit
          // there for the full three seconds.
          <Fragment key={i}>
            {showCaret && i === revealed && <Caret />}
            <span
              style={{
                opacity: i < revealed ? 1 : 0,
                // Short enough to feel like a key strike rather than a fade.
                transition: reduced ? undefined : "opacity 90ms linear",
              }}
            >
              {char}
            </span>
          </Fragment>
        ))}
      </span>
    </blockquote>
  );
}
