"use client";

import { useEffect, useRef, useState } from "react";

/// One of the onboarding tour clips.
///
/// These are animated WebP with **loop count 1** — about two seconds, then
/// they hold on the last frame (see the README beside them in the mobile
/// repo). That format is the whole reason this is a component rather than a
/// bare `<img>`: everything on the page mounts at once, so left alone every
/// clip would have played and stopped long before the reader scrolled down to
/// it, and they'd arrive at four still screenshots.
///
/// `loading="lazy"` handles most of it — the fetch doesn't start until the
/// clip is near the viewport, so the first play lands roughly where it should
/// even with JavaScript off. The observer covers the rest: remounting the
/// `<img>` hands the browser a fresh element, which restarts the animation
/// from frame 0. The bytes come out of cache, so a replay costs no download.
export function TourClip({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [play, setPlay] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let armed = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          armed = true; // re-arm, so scrolling back up plays it again
          return;
        }
        // Not loaded yet means lazy-loading is only now fetching it and it
        // will play by itself as soon as it decodes — nothing to restart.
        if (armed && imgRef.current?.complete) setPlay((n) => n + 1);
        armed = false;
      },
      { threshold: 0.5 },
    );

    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className={`overflow-hidden rounded-2xl ${className ?? ""}`}
      style={{
        border: "1px solid var(--gold-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* width/height are what hold the box open: the browser derives the
          intrinsic ratio from them, so the slot is the right size before the
          bytes arrive and keeps that size across a remount. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- animated WebP;
          next/image would need `unoptimized` to leave the animation alone, and
          a plain tag is what the app itself renders these with. */}
      <img
        key={play}
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full"
      />
    </div>
  );
}
