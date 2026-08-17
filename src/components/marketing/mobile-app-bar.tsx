"use client";

import { useEffect, useState } from "react";
import { DownloadPill } from "./download-pill";

/// The wordmark's second home. The hero shows the tape at full size; once it
/// scrolls off the top, the same mark reappears here, shrunk into a bar that
/// rides with the reader, with the download pill beside it.
///
/// Phone only, and that is not a compromise. The page is ~6.9 screens tall and
/// the hero and closing CTAs sit ~5.9 screens apart, so for most of the scroll
/// a reader who has decided *yes* has nothing to tap. That gap is the reason
/// this exists. On desktop the tour carousel pins itself to `top-0` for a
/// 340vh runway, and a fixed bar would sit on top of the pinned frame; giving
/// desktop the same treatment means offsetting the carousel's sticky top and
/// trimming its height to match, which is a separate change.
///
/// Visibility is driven off the hero wordmark itself rather than a scroll
/// threshold, so the bar arrives exactly as the big mark leaves and the two
/// read as one object moving, not two marks that briefly coexist.
export function MobileAppBar({ href }: { href: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const wordmark = document.getElementById("hero-wordmark");
    if (!wordmark) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // `top < 0` matters: without it the bar would also show when the
        // wordmark is off the *bottom* of the viewport, which is the state on
        // a restored scroll position or a jump to an anchor. We only want it
        // once the hero has genuinely been scrolled past.
        setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );

    observer.observe(wordmark);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 md:hidden"
      style={{
        transform: shown ? "translateY(0)" : "translateY(-100%)",
        opacity: shown ? 1 : 0,
        transition: "transform 260ms ease-out, opacity 200ms ease-out",
        // Without this the hidden bar still swallows taps across the top of
        // the hero, including the film's play button.
        pointerEvents: shown ? "auto" : "none",
      }}
      aria-hidden={!shown}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5"
        style={{
          background: "var(--app-bg)",
          borderBottom: "1px solid var(--stroke)",
          boxShadow: "0 1px 12px rgba(26,14,0,0.06)",
        }}
      >
        <a href="#top" aria-label="Authored By, back to top">
          {/* eslint-disable-next-line @next/next/no-img-element -- the
              wordmark is a photographed strip of tape; it ships as-is. */}
          <img
            src="/icons/authored-by-tape-icon.png"
            alt="Authored By"
            width={801}
            height={295}
            // 801x295 is 2.72:1, so a 30px cap puts it at ~81px wide. Height
            // is the constrained axis in a bar, so it is the one that's set.
            className="block h-[30px] w-auto"
          />
        </a>

        {/* The page's pill, scaled down — one component, so a restyle of it
            lands here too instead of having to be made twice. The short label
            comes with the size, and why is written down beside it. */}
        <DownloadPill href={href} size="sm" />
      </div>
    </div>
  );
}
