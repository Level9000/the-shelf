"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";

// The same object the app streams during onboarding (see
// onboarding_intro_video.dart) — public in the `app-content` Storage bucket,
// so there is nothing to re-host here. The `#t=0.1` fragment is the poster:
// it makes the browser seek and paint a real frame on `preload="metadata"`
// instead of showing a black rectangle.
const FILM_URL =
  "https://api.authoredby.app/storage/v1/object/public/app-content/authored-by-onboarding.mp4";

/// One of the four side rails. Drawn as a sliver protruding from the band
/// rather than an outline, which is all that reads at this size.
function SideButton({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`absolute w-[2px] rounded-[1px] ${className}`}
      style={{
        background: "linear-gradient(180deg, #4a4a4d, #6a6a6f, #3d3d40)",
      }}
    />
  );
}

/// The intro film, in a handset. Starts muted and silent — it only ever plays
/// with sound after someone asks for sound.
export function IntroFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function start() {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.currentTime = 0;
    setStarted(true);
    video.play().catch(() => {
      // A browser that won't attribute the unmuted play to this click is
      // still better served silently than not at all.
      video.muted = true;
      void video.play();
    });
  }

  return (
    // The device. Corner radii are elliptical (x / y) rather than a single
    // percentage: a percentage radius resolves against each axis separately,
    // so on a shape this tall one number would give badly stretched corners.
    // The pair keeps them close to round.
    <div className="mx-auto w-full max-w-[268px] sm:max-w-[288px]">
      <div
        className="relative p-[2.7%]"
        style={{
          borderRadius: "15.8% / 7.5%",
          // Titanium band: the light catches the two long edges and falls off
          // through the middle, which is what reads as a rounded metal rail.
          background:
            "linear-gradient(145deg, #3a3a3c 0%, #5c5c60 16%, #2c2c2e 48%, #56565b 84%, #333336 100%)",
          boxShadow: "0 26px 60px rgba(0,0,0,0.32), 0 2px 6px rgba(0,0,0,0.28)",
        }}
      >
        <SideButton className="left-[-2px] top-[17%] h-[5%]" />
        <SideButton className="left-[-2px] top-[26%] h-[8.5%]" />
        <SideButton className="left-[-2px] top-[37%] h-[8.5%]" />
        <SideButton className="right-[-2px] top-[28%] h-[12%]" />

        <div
          className="relative overflow-hidden bg-black"
          style={{
            borderRadius: "14.4% / 6.7%",
            // A real handset is about 9:19.5, taller than the 9:16 film, so
            // the picture letterboxes inside it — which is exactly what the
            // app does with this same file. Reserved up front, so nothing
            // below shifts when the metadata lands.
            aspectRatio: "9 / 19.5",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.6)",
          }}
        >
          <video
            ref={videoRef}
            src={`${FILM_URL}#t=0.1`}
            width={1080}
            height={1920}
            // Fit, never fill. The picture is 1080x1920 with the captions burned
            // in and running close to the edges; the app cropped this to cover
            // once and cut ~11% off each side, taking the ends of every caption
            // with it (onboarding_intro_video.dart:169).
            className="h-full w-full object-contain"
            preload="metadata"
            playsInline
            muted
            controls={started}
            controlsList="nodownload"
            onEnded={() => setStarted(false)}
            aria-label="The Authored By intro film. Cass calls out to someone on a park bench and tells them their work is a story worth telling. Captions are burned into the picture."
          />

          {!started && (
            <button
              type="button"
              onClick={start}
              className="group absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/35 transition-colors hover:bg-black/20"
            >
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-105"
                style={{
                  background: "var(--gold)",
                  color: "var(--ink-on-gold)",
                  boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
                }}
              >
                <Play size={26} fill="currentColor" style={{ marginLeft: 3 }} />
              </span>
              <span
                className="font-label text-[12px] font-semibold uppercase"
                style={{ letterSpacing: "0.18em", color: "#f0ebe0" }}
              >
                Play with sound
              </span>
            </button>
          )}

          {/* Dynamic island. Sits over the top letterbox bar, so it never
              covers picture, and above the controls so it stays put. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[1.6%] h-[4.2%] w-[31%] -translate-x-1/2 rounded-full bg-black"
          />
        </div>
      </div>
    </div>
  );
}
