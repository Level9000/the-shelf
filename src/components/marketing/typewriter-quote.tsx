"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
/// were and the introduction now matches them. It paces the *longest wrapped
/// line* rather than the whole string — see below, where the lines all type at
/// once — so a block takes as long as one line of it, which is what makes a
/// three-line sentence feel like a single line rather than three of them.
export const TYPE_MS_PER_CHAR = 46;

/// A character's place in the laid-out block: which wrapped line it landed on,
/// and how far along that line it sits.
type Wrap = {
  /// Line index per character.
  lineOf: number[];
  /// Position within that line per character.
  posInLine: number[];
  /// Character count per line.
  lens: number[];
};

/// Absolutely positioned, so it is out of flow entirely and cannot affect where
/// the text breaks.
///
/// It used to be a zero-width `inline-block` sitting between two characters.
/// That was survivable while there was one of them at the end of the typed
/// text, and stopped being survivable the moment every wrapped line had its own:
/// an inline-block is an atomic inline, so each one is a break opportunity in
/// the middle of a word, and five of them rewrapped the block while it typed.
/// The reveal is driven by a measured map of which character sits on which line,
/// so a block that rewraps mid-animation reveals characters scattered across it.
///
/// Rendered inside its character's own `position: relative` box, so `left: 0` is
/// that character's left edge — the typing position — without occupying it.
function Caret() {
  return (
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
  );
}

/// Cass's line, typed out when the reader reaches it.
///
/// Every character is in the DOM from the start, with the untyped ones at
/// `opacity: 0`. That is the whole trick: appending text character by
/// character would re-wrap the block on nearly every frame and shove the
/// section below it around for the whole of the animation. Holding the final
/// layout and revealing into it means the line types without a single reflow.
///
/// Every wrapped line types **at the same time**. A sentence the browser broke
/// over three lines fills all three left to right at once and finishes them
/// together, rather than filling one and starting the next — so it arrives as
/// one gesture, the way it reads, instead of three. A line that doesn't wrap is
/// the same thing with one line in it and behaves exactly as it always did.
///
/// That means the lines run at different rates: a short line and a long one both
/// start and stop together, so the short one lays its characters down slower.
/// The rate above paces the longest line, so the block's cadence is the cadence
/// of a single line of it.
///
/// Which characters share a line is a question about layout, not about the
/// string — the same sentence wraps differently at 375px and 1440px, in a
/// heading and in a quote. So it is measured from the rendered characters after
/// layout, and measured again when the box changes width or the webfont lands.
/// Until that first measurement the block is treated as one line, which is both
/// a safe fallback and exactly what it is for most of the lines on the page.
///
/// The caret is zero-width and absolutely positioned inside a marker span, so
/// it can sit between the typed and untyped halves without occupying a column
/// of its own and nudging the wrap. There is one per line still typing, because
/// there is genuinely a typing position on each.
///
/// Timing runs off elapsed time in a rAF loop rather than a per-character
/// interval, so the block always finishes in its duration whatever the frame
/// rate does. A dropped frame costs smoothness, never duration.
export function TypewriterQuote({
  text,
  durationMs,
  className,
  style,
  start,
  onDone,
  rootMargin = "-20% 0px -20% 0px",
  as = "blockquote",
}: {
  text: string;
  /// Defaults to the longest wrapped line at the page's one typing speed, which
  /// is what every caller wants. Only pass this to make a line deliberately
  /// break step with the others.
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
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [wrap, setWrap] = useState<Wrap | null>(null);

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

  /// Group the rendered characters into the lines they actually landed on.
  ///
  /// A character starts a new line when it sits lower than the one before it.
  /// The comparison has a 2px tolerance because sub-pixel layout puts characters
  /// on one line a fraction of a pixel apart, while the gap between two lines is
  /// a whole line-height — there is no ambiguity to resolve at that scale.
  ///
  /// A space that falls at a line break collapses and has no box at all, so it
  /// reports a zero rect. It stays on the line it followed, which costs nothing:
  /// revealing a space changes nothing on screen either way.
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const chars = el.querySelectorAll<HTMLElement>("[data-tw-char]");
    if (!chars.length) return;

    const lineOf: number[] = [];
    const posInLine: number[] = [];
    const lens: number[] = [];
    let line = -1;
    let lineTop = -Infinity;

    chars.forEach((char) => {
      const { top } = char.getBoundingClientRect();
      if (top > lineTop + 2) {
        line += 1;
        lens[line] = 0;
        lineTop = top;
      }
      // Guards the very first character if it somehow reports a zero rect: a
      // block with no lines would divide by zero below.
      if (line < 0) {
        line = 0;
        lens[0] = 0;
      }
      lineOf.push(line);
      posInLine.push(lens[line]);
      lens[line] += 1;
    });

    // Bail when nothing moved. `measure` runs on every ResizeObserver
    // callback, and handing back an equal-but-new object would change the
    // duration's identity and restart the reveal from zero mid-animation.
    setWrap((current) =>
      current && current.lens.join() === lens.join()
        ? current
        : { lineOf, posInLine, lens },
    );
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    measure();

    // Width changes rewrap the block, and so does the webfont arriving after
    // the fallback has already been laid out.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    document.fonts?.ready.then(measure).catch(() => {});

    return () => observer.disconnect();
  }, [measure, text]);

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

  // The longest line is what the block is paced by. Before the first
  // measurement there is one notional line holding everything, which is the
  // same number the whole string used to be paced by.
  const longestLine = wrap ? Math.max(...wrap.lens) : text.length;
  const totalMs = durationMs ?? Math.max(1, longestLine) * TYPE_MS_PER_CHAR;

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
    // animation while nothing was on screen and then snap to finished the
    // moment the reader came back. This way the block always takes its full
    // duration of *visible* time.
    let startedAt = 0;

    const tick = (now: number) => {
      if (!startedAt) startedAt = now;
      const elapsed = Math.min(1, (now - startedAt) / totalMs);
      setProgress(elapsed);
      if (elapsed < 1) frame = requestAnimationFrame(tick);
      else onDoneRef.current?.();
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, reduced, totalMs]);

  // Reduced motion gets the finished block, no animation, no caret.
  const shown = reduced ? 1 : progress;
  const typing = started && !reduced && shown < 1;

  // How far along each line is, in characters. Every line is the same fraction
  // done at any instant, which is what lands them together.
  const revealedInLine = (line: number) =>
    Math.round(shown * (wrap ? wrap.lens[line] : text.length));

  // Narrowed to one tag so the ref and the props keep a concrete type. All
  // four allowed values take the same attributes and the observer only ever
  // needs an Element, so the tag it actually renders makes no difference here.
  const Tag = as as "blockquote";

  return (
    <Tag ref={ref} className={className} style={style}>
      {/* The real line, for assistive tech. Reading it out one character at a
          time as the spans flip on would be unusable, so the animated copy is
          hidden from the accessibility tree entirely and this carries it. */}
      <span className="sr-only">{text}</span>

      <span aria-hidden>
        {text.split("").map((char, i) => {
          const line = wrap ? wrap.lineOf[i] : 0;
          const pos = wrap ? wrap.posInLine[i] : i;
          const reached = revealedInLine(line);
          const lineLength = wrap ? wrap.lens[line] : text.length;

          return (
            // The caret is emitted *before* the first untyped character of its
            // line rather than after the whole string, so it rides the typing
            // position. Put after the map it would park at the end of the last
            // line and sit there for the whole animation. One line still typing
            // means one caret; a line that has finished drops its own.
            <span key={i} data-tw-char style={{ position: "relative" }}>
              {/* The glyph carries the opacity, not the box around it, so the
                  caret sitting on the next character to be typed is visible
                  while that character is still hidden. */}
              <span
                style={{
                  opacity: pos < reached ? 1 : 0,
                  // Short enough to feel like a key strike rather than a fade.
                  transition: reduced ? undefined : "opacity 90ms linear",
                }}
              >
                {char}
              </span>
              {typing && pos === reached && reached < lineLength && <Caret />}
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
