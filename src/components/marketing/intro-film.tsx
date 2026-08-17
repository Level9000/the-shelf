"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { DeviceFrame } from "./device-frame";

// The same object the app streams during onboarding (see
// onboarding_intro_video.dart) — public in the `app-content` Storage bucket,
// so there is nothing to re-host here. The `#t=0.1` fragment is the poster:
// it makes the browser seek and paint a real frame on `preload="metadata"`
// instead of showing a black rectangle.
const FILM_URL =
  "https://api.authoredby.app/storage/v1/object/public/app-content/authored-by-onboarding.mp4";

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
    <div className="mx-auto w-full max-w-[268px] sm:max-w-[288px]">
      {/* The frame's screen is 9:19.5, taller than the 9:16 film, so the picture
          letterboxes inside it — which is exactly what the app does with this
          same file. The island lands on the top letterbox bar as a result, and
          never covers picture. */}
      <DeviceFrame>
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
      </DeviceFrame>
    </div>
  );
}
