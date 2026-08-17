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
/// How long one character takes, everywhere on the page.
///
/// The page types at one speed, because everything on it that types itself is
/// Cass and a voice that changes pace between paragraphs isn't one voice. This
/// is a rate rather than a duration for the same reason: a per-line duration has
/// to be re-picked by hand every time a line's length changes, and it drifted
/// exactly that way — the headers landed between 46 and 60ms a character while
/// her introduction, the longest line on the page, ran at 23 and read as a
/// different, faster instrument.
///
/// 46ms is the middle of what the headers already were, so they are where they
/// were and the introduction now matches them.
export const TYPE_MS_PER_CHAR = 46;

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
  durationMs = text.length * TYPE_MS_PER_CHAR,
  className,
  style,
  start,
  onDone,
  rootMargin = "-20% 0px -20% 0px",
  as = "blockquote",
}: {
  text: string;
  /// Defaults to the line's length at the page's one typing speed, which is
  /// what every caller wants. Only pass this to make a line deliberately break
  /// step with the others.
  durationMs?: number;
  className?: string;
  style?: React.CSSProperties;
  /// Drive the start externally instead of self-triggering. Passed when
  /// something else has to move in step with the typing, so the two share one
  /// trigger rather than racing two observers on different elements.
  start?: boolean;
  /// Fires once when the last character lands.
  onDone?: () => void;
  /// Root margin for the self-trigger. The default waits until the line is in
  /// the middle of the viewport, which is right for a line sitting in the
  /// middle of a band the reader is arriving at.
  ///
  /// A line that *sticks* near the top needs "0px" instead. With the default,
  /// the only chance to fire is the transit through the middle of the screen on
  /// the way up, and a snap or a fast flick can skip that entirely — after
  /// which the element is parked above the trigger area and never intersects,
  /// so the typing never starts at all.
  rootMargin?: string;
  /// The element to type into. A quote by default, since that is what Cass's
  /// lines are.
  ///
  /// `h2` is for a section heading that types itself — one element, no wrapper.
  /// `span` is for a heading built from several lines: three of those inside one
  /// <h2> types a headline out clause by clause, where an `h2` each would be
  /// three headings and a blockquote each would be quotes nested in a heading.
  as?: "blockquote" | "span" | "p" | "h2";
}) {
  const ref = useRef<HTMLQuoteElement>(null);
  const [selfStarted, setSelfStarted] = useState(false);
  const [typed, setTyped] = useState(0);
  const [reduced, setReduced] = useState(false);

  const driven = start !== undefined;
  const started = driven ? start : selfStarted;

  // Kept in a ref so a caller passing an inline arrow doesn't restart the
  // animation on every parent render.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

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
    if (driven) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSelfStarted(true);
          // Once only. Re-typing every time the quote scrolls back into view
          // turns a moment into a tic, and on a short viewport the line can
          // cross the trigger several times in normal reading.
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [driven, rootMargin]);

  useEffect(() => {
    if (!started) return;
    // Reduced motion has no frames to wait for; the line is already complete
    // on screen, so anything sequenced off the end of it fires immediately.
    if (reduced) {
      onDoneRef.current?.();
      return;
    }

    let frame = 0;
    // Started on the first delivered frame, not here. A hidden tab suspends
    // rAF entirely, so a clock started at effect time would spend the whole
    // three seconds while nothing was on screen and then snap to finished the
    // moment the reader came back. This way the line always takes three
    // seconds of *visible* time.
    let startedAt = 0;

    const tick = (now: number) => {
      if (!startedAt) startedAt = now;
      const progress = Math.min(1, (now - startedAt) / durationMs);
      setTyped(Math.round(progress * text.length));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else onDoneRef.current?.();
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, reduced, durationMs, text.length]);

  // Reduced motion gets the finished line, no animation, no caret.
  const revealed = reduced ? text.length : typed;
  // `i === revealed` never matches once every character is typed, so the caret
  // retires on its own at the end of the line.
  const showCaret = started && !reduced && revealed < text.length;

  // Narrowed to one tag so the ref and the props keep a concrete type. All
  // three allowed values take the same attributes and the observer only ever
  // needs an Element, so the tag it actually renders makes no difference here.
  const Tag = as as "blockquote";

  return (
    <Tag ref={ref} className={className} style={style}>
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
    </Tag>
  );
}
