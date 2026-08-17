"use client";

import { useEffect, useRef, useState } from "react";
import { DeviceFrame } from "./device-frame";
import { TypewriterQuote } from "./typewriter-quote";

/// The three clauses of the headline, one per beat of the sequence.
const LINES = ["Set your goals.", "Track your journey.", "Shape your story."];

/// Where each beat fires, as a fraction of the runway.
///
/// The first is nearly zero: the pin has only just taken hold there, so the
/// stage is on screen and there is nothing to wait for. The other two are far
/// enough apart that a reader scrolling at reading pace gets the beats in
/// sequence rather than all at once.
const GATES = [0.02, 0.3, 0.6];

/// How long a phone takes to come down. Also how long the second phone's clip
/// waits before it starts, so the video begins on the table and not in mid-air.
const DROP_MS = 760;

/// Far enough above its resting place to be clear of the top of the stage,
/// which clips it — so the phone enters the picture rather than fading up in
/// the middle of the room. The taller of the two phones sits with its top at
/// ~20% of the stage and is ~70% of it tall, so 150% of its own height is
/// comfortably outside.
const DROP_FROM = "translateY(-150%)";

/// The island, sized to the one burned into the footage rather than to a
/// resting one.
///
/// Both clips were recorded on the phone itself, so every frame carries the
/// *expanded* island the system shows while a recording is running: 44% of the
/// screen wide, spanning x 27.1%..71.1% and y 1.35%..5.64%, with the red
/// recording dot inside it at x 30.4%..33.3%. The frame's own resting island is
/// centred and 31% wide, so it starts at 34.5% — to the right of that dot,
/// leaving it showing. Matching the burned-in shape instead covers the dot, and
/// lands on black that is already there, so nothing reads as doubled.
///
/// Drawn a little larger than the shape it is covering — 26%..73% against the
/// footage's 27.15%..71.1% — so it has margin on every side instead of sitting
/// flush with it. Flush is enough in theory and was measurably enough here, but
/// it leaves a sub-pixel seam to lose at small sizes, and the thing behind the
/// seam is a red dot. The overdraw is about 2-3px of black over cream at phone
/// size and clears the clock (ends 22.1%) and the battery (starts 86.5%) either
/// side, so nothing in the status bar is covered by it.
///
/// The honest fix is a re-record from a Mac over QuickTime, which never puts an
/// indicator on the screen. Then this goes back to the resting default.
const RECORDING_ISLAND = "left-[26%] top-[1.15%] h-[4.7%] w-[47%]";

/// Standing on wood, under a window on the right: short, warm, thrown left.
/// The frame's own default is a card-on-a-page shadow, which floats here.
const TABLE_SHADOW =
  "-10px 16px 30px rgba(58,40,22,0.30), 0 2px 5px rgba(58,40,22,0.32)";

/// Park a clip on its last frame without playing it.
///
/// Two callers, and they want it for the same reason: reduced motion, where the
/// sequence is skipped and the end state is shown outright, and a refused
/// autoplay, where there is no sequence to be had. What the reader is meant to
/// end up looking at is the finished screen, so that is what they get.
function holdLastFrame(video: HTMLVideoElement) {
  const seek = () => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    // A hair short of the end. Seeking exactly to `duration` is allowed to
    // fire `ended`, and some browsers rewind to the start when it does.
    video.currentTime = Math.max(0, video.duration - 0.05);
  };

  if (video.readyState >= 1) seek();
  else video.addEventListener("loadedmetadata", seek, { once: true });
}

/// One phone on the table: a clip in the hand-built frame, dropped into place.
function Phone({
  src,
  label,
  landed,
  play,
  playDelayMs = 0,
  reduced,
  className,
}: {
  src: string;
  label: string;
  /// Down on the table. Drives the drop, which runs on its own clock once the
  /// scroll has triggered it.
  landed: boolean;
  play: boolean;
  playDelayMs?: number;
  reduced: boolean;
  /// Where this phone stands, as percentages of the stage, per breakpoint.
  className: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (reduced) {
      holdLastFrame(video);
      return;
    }
    if (!play) return;

    const begin = () => {
      video.currentTime = 0;
      // iOS autoplays muted, inline video — until Low Power Mode, which refuses
      // it outright. Nothing to recover, so show the end of the clip instead of
      // a frozen first frame.
      video.play().catch(() => holdLastFrame(video));
    };

    if (!playDelayMs) {
      begin();
      return;
    }
    const timer = window.setTimeout(begin, playDelayMs);
    return () => window.clearTimeout(timer);
  }, [play, playDelayMs, reduced]);

  return (
    <div
      className={`absolute ${className}`}
      style={{
        transform: landed ? "translateY(0)" : DROP_FROM,
        // Ends just past its resting place and settles back, which is what
        // reads as being set down rather than arriving on a rail.
        transition: reduced
          ? undefined
          : `transform ${DROP_MS}ms cubic-bezier(0.22,1.12,0.36,1)`,
      }}
    >
      <DeviceFrame islandClassName={RECORDING_ISLAND} boxShadow={TABLE_SHADOW}>
        <video
          ref={videoRef}
          // The fragment makes the browser seek and paint a real frame on
          // `preload="metadata"`, so a phone that has landed but not started
          // yet shows its screen rather than a black rectangle.
          src={`${src}#t=0.05`}
          width={720}
          height={1560}
          // The recordings are 720x1560 — the screen's own 9:19.5 — so cover
          // and contain come to the same thing here, and cover guarantees no
          // hairline of black at an edge from a rounded percentage.
          className="h-full w-full object-cover"
          preload="metadata"
          playsInline
          muted
          // No loop, and nothing to do at the end: a video that has finished
          // holds its last frame by itself, which is the state this whole
          // section is here to arrive at.
          aria-label={label}
        />
      </DeviceFrame>
    </div>
  );
}

/// What you end up with: two phones placed on the table, a clip running in
/// each, while the headline types itself out a clause at a time.
///
/// This replaced a pair of flat renders that had the phones and the headline
/// baked into the picture. The words are live text again as a result — the
/// reason they were ever in the image was that the image was all there was, and
/// with the phones now drawn in the page there is nothing left holding them
/// there.
///
/// Pinned with a runway, on the same reasoning as the hero and Cass's band:
/// there are three beats and about eleven seconds of clip here, and without a
/// runway a single momentum flick fires all three before the first has drawn.
/// The beats are gated on scroll; each animation then runs on its own clock, so
/// a reader who stops halfway still sees the clip play and the line type.
///
/// Beats only ever advance. Scrolling back up and down again re-firing the
/// drops would turn the moment into a tic, and on a short viewport the gates
/// get crossed more than once in ordinary reading.
export function PayoffShot() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const [beat, setBeat] = useState(0);
  const [reduced, setReduced] = useState(false);

  // Read on mount rather than at module scope: this renders on the server too,
  // where matchMedia doesn't exist.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = runwayRef.current;
    if (!el) return;

    let frame = 0;
    const read = () => {
      frame = 0;
      const span = el.offsetHeight - window.innerHeight;
      // A viewport taller than the whole runway never scrolls through it, so
      // there is no sequence to drive — show the finished composition.
      if (span <= 0) {
        setBeat(LINES.length);
        return;
      }
      const progress = Math.min(
        1,
        Math.max(0, -el.getBoundingClientRect().top / span),
      );
      const reached = GATES.filter((gate) => progress >= gate).length;
      setBeat((current) => Math.max(current, reached));
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

  // Reduced motion gets the end of the sequence and none of the sequence: both
  // phones already standing, both clips on their last frame. The typewriter
  // makes the same call about its own text on its own.
  const reached = reduced ? LINES.length : beat;

  return (
    <div ref={runwayRef} className="relative">
      <div className="sticky top-0 flex min-h-svh flex-col items-center justify-center">
        <h2
          className="font-literata px-5 text-center text-[28px] font-bold leading-[1.15] sm:text-[36px]"
          style={{ letterSpacing: "-0.02em" }}
        >
          {LINES.map((line, i) => (
            <TypewriterQuote
              key={line}
              // Three spans in one heading, rather than three headings or three
              // quotes nested in one: the clauses are one sentence and one
              // heading, they just arrive a clause at a time.
              as="span"
              text={line}
              start={reached > i}
              className="block"
            />
          ))}
        </h2>

        {/* The stage: the table, and the phones standing on it.

            Width is capped against the viewport height so the whole
            composition — heading included — fits on one screen at any size the
            pin can be held at. `min()` caps the *width* and lets the aspect
            ratio derive the height from it, rather than capping the height and
            letting the picture crop: the phones are positioned as percentages
            of this box, so a crop would move the table out from under them.

            Both aspect ratios are the files' own pixel dimensions, and the
            breakpoint is the <source> media query exactly, so the box always
            matches the file the browser actually fetched. Get these wrong and
            the table sits somewhere other than where the phones are standing. */}
        <div
          className="relative mt-7 w-[min(100%,calc(64svh*1792/2400))] overflow-hidden aspect-[1792/2400] sm:mt-9 sm:w-[min(100%,calc(68svh*3168/1344))] sm:aspect-[3168/1344]"
        >
          <picture>
            <source
              media="(min-width: 640px)"
              srcSet="/marketing/table-wide.webp"
              width={3168}
              height={1344}
            />
            {/* Art direction across two crops, which is what <picture> is for.
                next/image would fetch one of them and reflow the other. */}
            <img
              src="/marketing/table-portrait.webp"
              alt="An empty desk in a bright room, a laptop closed at one end, a cork board of pinned notes and photographs on the wall behind it."
              width={1792}
              height={2400}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>

          {/* Where the two phones stand, in percentages of the stage.

              On a phone they overlap, and height is what forces it: the table
              runs from 74% to 97% of the portrait crop, so a phone standing on
              it has about 400px to be tall in at a 375px viewport, which caps it
              at ~185px wide. Two of those do not go side by side across 375px.
              Overlapping buys a little size back and reads as two objects at
              different depths rather than a row of two.

              The story phone is the nearer one — larger, lower on the table, and
              in front — which is also the one that arrives second, so the second
              drop lands in front of the first instead of behind it.

              The pair is centred on the stage rather than set clear of the
              laptop at the left end of the desk: 14% + 41% wide and 41% + 45%
              wide span 14%..86%, which centres on 50%. Standing them to the
              right of the laptop instead left the pair visibly heavy on that
              side, and the back phone crossing the corner of a closed laptop is
              the more ordinary sight of the two. Move one of these four numbers
              and the composition goes off-centre again.

              The wide crop has the room to stand them apart, so it does. */}
          <Phone
            src="/marketing/phone-goals.mp4"
            label="The Goals screen in the app: a goal picked out with the vision behind it and the actions to take next."
            landed={reached >= 1}
            play={reached >= 2}
            reduced={reduced}
            className="bottom-[21%] left-[14%] w-[41%] sm:bottom-[12%] sm:left-[37%] sm:w-[13%]"
          />
          <Phone
            src="/marketing/phone-story.mp4"
            label="The story tab in the app, open on a written chapter."
            landed={reached >= 3}
            play={reached >= 3}
            // Starts on the table rather than on the way down.
            playDelayMs={DROP_MS}
            reduced={reduced}
            className="bottom-[9.5%] left-[41%] z-10 w-[45%] sm:bottom-[9%] sm:left-[55%] sm:w-[14%]"
          />
        </div>
      </div>

      {/* The runway the sequence is pinned against. Desktop is longer for the
          reason the hero's is: macOS momentum carries one gesture well past a
          thousand pixels, and there are three beats to get through. */}
      <div aria-hidden className="h-[900px] md:h-[1400px]" />
    </div>
  );
}
