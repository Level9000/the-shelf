"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { TourClip } from "./tour-clip";

/// A step is either one of the onboarding clips or, for the check-in step,
/// Cass's recorder itself — the same SVG the app puts under the FAB, reels
/// turning. It is a drawing rather than a screenshot, so it stays sharp at
/// any size and needs no bytes.
export type TourStep = {
  title: string;
  line: string;
} & (
  | {
      kind: "clip";
      src: string;
      width: number;
      height: number;
      alt: string;
      /// Show the frame and skip the animation. For steps whose last frame is
      /// the whole point.
      still?: boolean;
    }
  | { kind: "recorder"; alt: string }
);

/// How much page scroll advances one slide, in vh. The runway below is sized
/// from this, so it is the single number that controls how fast the tour
/// pages: bigger is slower and more deliberate, smaller is snappier.
const SCROLL_PER_SLIDE_VH = 60;

const DESKTOP = "(min-width: 768px)";

/// The five tour steps.
///
/// On a phone this is a plain stacked list — a thumb flick is a blunt
/// instrument and the steps read fine one after another.
///
/// From `md` up it becomes a carousel that the page scroll drives. The frame
/// sticks to the viewport while the reader scrolls through a runway behind
/// it, and that scroll position maps to a slide index, so scrolling pages the
/// tour instead of moving past it. Once the runway is spent the frame
/// releases and the page carries on normally.
///
/// Page scroll is deliberately the *only* driver on desktop: the arrows and
/// dots scroll the window rather than the track, so there is one source of
/// truth and nothing can fight the scroll position for control of the frame.
export function TourCarousel({
  steps,
  heading,
  progress,
  onGoTo,
}: {
  steps: TourStep[];
  /// Drive the slide index from outside, 0 to 1 across the tour's share of a
  /// runway this component does not own.
  ///
  /// Passing this puts it in "bare" mode: no runway, no sticky frame, just the
  /// slides. StoryStage uses that to hold one instance of Cass's line across
  /// both her pages and the tour, which is impossible while the tour pins
  /// itself — a sticky element cannot outlive its own section, so a header
  /// living in the tour's frame necessarily leaves the screen and comes back
  /// at the boundary.
  progress?: number;
  /// Bare mode has no runway to scroll, so the arrows and dots hand navigation
  /// back to whoever owns it.
  onGoTo?: (index: number) => void;
  /// The section's tape label and headline, rendered *inside* the pinned area.
  ///
  /// They used to sit above this component, and that is where the section's
  /// worst gap came from: the sticky child is a full-viewport-height box that
  /// centres the frame inside itself, so before it pins there is half a
  /// viewport of nothing between the headline and the frame. Moving the
  /// heading in means the two are one block, centred together and travelling
  /// together, and the reader keeps the section title in view for the whole
  /// pin instead of losing it at the first scroll.
  heading?: React.ReactNode;
}) {
  const runwayRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // What we last told the track to show. Guards against re-issuing the same
  // scroll on every one of the many scroll events a single gesture fires.
  const shownRef = useRef(0);
  const [ownIndex, setOwnIndex] = useState(0);

  const bare = progress !== undefined;
  const index = bare
    ? Math.max(
        0,
        Math.min(steps.length - 1, Math.round(progress * (steps.length - 1))),
      )
    : ownIndex;

  // Bare mode: the index is handed to us, so the only job left is moving the
  // track to match it. Same guard as the owned path, so a gesture that reports
  // the same slide fifty times issues one scroll.
  useEffect(() => {
    if (!bare) return;
    const track = trackRef.current;
    if (!track || !window.matchMedia(DESKTOP).matches) return;
    if (index === shownRef.current) return;
    shownRef.current = index;
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  }, [bare, index]);

  useEffect(() => {
    if (bare) return;
    const runway = runwayRef.current;
    const track = trackRef.current;
    if (!runway || !track) return;

    const desktop = window.matchMedia(DESKTOP);
    let frame = 0;

    const sync = () => {
      // Below md the frame isn't pinned and the slides are a plain column,
      // so there is nothing to drive.
      if (!desktop.matches) return;

      const span = runway.offsetHeight - window.innerHeight;
      if (span <= 0) return;

      const pinStart = runway.getBoundingClientRect().top + window.scrollY;
      const progress = (window.scrollY - pinStart) / span;
      const clamped = Math.max(0, Math.min(1, progress));
      const target = Math.round(clamped * (steps.length - 1));

      if (target === shownRef.current) return;
      shownRef.current = target;
      setOwnIndex(target);
      track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    sync();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [bare, steps.length]);

  // Arrows and dots move the *page*, which then drives the track through the
  // handler above. Scrolling the track directly would leave the page scroll
  // saying one thing and the frame showing another.
  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, steps.length - 1));
      if (onGoTo) {
        onGoTo(clamped);
        return;
      }
      const runway = runwayRef.current;
      const track = trackRef.current;
      if (!runway || !track) return;

      if (window.matchMedia(DESKTOP).matches) {
        const span = runway.offsetHeight - window.innerHeight;
        const pinStart = runway.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: pinStart + (span * clamped) / (steps.length - 1),
          behavior: "smooth",
        });
      } else {
        track.scrollTo({
          left: clamped * track.clientWidth,
          behavior: "smooth",
        });
      }
    },
    [onGoTo, steps.length],
  );

  const inner = (
    <div className="w-full">
          {/* Sticky on phones, because there is no pin here below md — the
              steps are a plain stacked column — and the heading is Cass's line
              carried over from the band above, which is supposed to stay put
              and be the header rather than scroll off with the first step.
              From md up the whole block is already pinned, so it holds without
              help and this goes back to being an ordinary heading.

              It needs the opaque background: sticking a line of type over
              scrolling cards without one leaves the two overlapping. */}
          {heading ? (
            <div
              // PremiseBand finds this to work out where its second line has
              // to land, so the sentence arrives exactly on the header instead
              // of near it. Desktop can't use a constant: the block is centred
              // in a viewport-height frame, so the header's resting position
              // moves with the window.
              data-tour-header
              className="sticky top-[58px] z-10 mb-8 py-3 md:static md:mb-7 md:py-0"
              style={{ background: "var(--app-bg)" }}
            >
              {heading}
              {/* The header's bottom edge otherwise slices whatever is
                  scrolling underneath it, so a step number arrives as a row of
                  clipped glyph tops before it clears. A short fade lets that
                  content dissolve into the header instead of being cut by it.
                  Phone only, since from md up nothing passes under this. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-full h-6 md:hidden"
                style={{
                  background:
                    "linear-gradient(to bottom, var(--app-bg), transparent)",
                }}
              />
            </div>
          ) : null}
          {/* The arrows centre on this wrapper, which holds the track alone —
              if the dots were inside it too, `top-1/2` would sit them below
              the frame's actual middle. */}
          <div className="relative">
            <div
              ref={trackRef}
              tabIndex={0}
              role="group"
              aria-roledescription="carousel"
              aria-label="How Authored By works, in five steps"
              className="tour-track flex flex-col gap-16 md:snap-x md:snap-mandatory md:flex-row md:gap-0 md:overflow-x-auto"
            >
              {steps.map((step, i) => (
                <div
                  key={step.line}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Step ${i + 1} of ${steps.length}`}
                  // px on desktop keeps the content clear of the arrows, which
                  // sit in the gutter rather than on top of the picture.
                  className="md:w-full md:flex-none md:snap-center md:snap-always md:px-16"
                >
                  <div className="grid gap-7 md:grid-cols-2 md:items-center md:gap-12">
                    <div>
                      <span
                        className="font-label text-[12px] font-bold uppercase"
                        style={{
                          letterSpacing: "0.22em",
                          color: "var(--gold-emphasis)",
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                        <span className="opacity-50">
                          {" "}
                          / {String(steps.length).padStart(2, "0")}
                        </span>
                      </span>
                      {/* Title carries the slide, Cass's line explains it —
                          so the title takes Literata (the headline face) and
                          her sentence stays in the story serif underneath. */}
                      <h3
                        className="font-literata mt-3 text-[24px] font-bold sm:text-[28px]"
                        style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
                      >
                        {step.title}
                      </h3>
                      <p
                        className="font-story mt-3 max-w-[28ch] text-[17px] sm:text-[19px]"
                        style={{ lineHeight: 1.65, color: "var(--muted)" }}
                      >
                        {step.line}
                      </p>
                    </div>
                    {step.kind === "recorder" ? (
                      <div
                        role="img"
                        aria-label={step.alt}
                        className="flex justify-center"
                      >
                        {/* `listening` is the check-in state — a calm 3s
                            rotation rather than the 1.2s record spin, which
                            would fidget on a page you're meant to read. */}
                        <CassRecorder animState="listening" size="lg" />
                      </div>
                    ) : (
                      <TourClip
                        src={step.src}
                        alt={step.alt}
                        width={step.width}
                        height={step.height}
                        still={step.still}
                        maxViewportHeight={40}
                        className="mx-auto w-full max-w-[340px] md:max-w-none"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <CarouselArrow
              side="left"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
            />
            <CarouselArrow
              side="right"
              onClick={() => goTo(index + 1)}
              disabled={index === steps.length - 1}
            />

          </div>

          <div className="mt-6 hidden justify-center gap-3 md:flex">
            {steps.map((step, i) => (
              <button
                key={step.line}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show step ${i + 1}`}
                aria-current={i === index}
                className="h-2.5 w-2.5 rounded-full transition-colors"
                style={{
                  background: i === index ? "var(--gold)" : "transparent",
                  border: `1px solid ${i === index ? "var(--gold)" : "var(--gold-border)"}`,
                }}
              />
            ))}
          </div>
    </div>
  );

  // Bare: someone else owns the runway and the pin, and is holding a header
  // above these slides that has to outlive them both.
  if (bare) return inner;

  return (
    <div
      ref={runwayRef}
      className="md:h-[var(--tour-runway)]"
      style={
        {
          "--tour-runway": `calc(100svh + ${(steps.length - 1) * SCROLL_PER_SLIDE_VH}svh)`,
        } as React.CSSProperties
      }
    >
      <div className="md:sticky md:top-0 md:flex md:h-svh md:items-center">
        {inner}
      </div>
    </div>
  );
}

function CarouselArrow({
  side,
  onClick,
  disabled,
}: {
  side: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous step" : "Next step"}
      // Inset from the frame's edge so the button sits inside the slide's
      // px gutter rather than straddling the border.
      className={`absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-opacity md:flex ${
        side === "left" ? "left-4" : "right-4"
      } ${disabled ? "cursor-default opacity-25" : "opacity-80 hover:opacity-100"}`}
      style={{
        border: "1px solid var(--gold-border)",
        background: "var(--app-bg)",
        color: "var(--gold-emphasis)",
      }}
    >
      <Icon size={20} />
    </button>
  );
}
