"use client";

import { useEffect, useRef, useState } from "react";
import { CassRecorder } from "@/components/cass/CassRecorder";

/// Cass's recorder, riding in the premise's right-hand margin while her own
/// monologue is on screen. She slides in from the right as the section
/// arrives, turns over while it's being read, and leaves the way she came.
///
/// Only from `lg`: the premise column is 42rem, so below about 1024px the
/// margin beside it isn't wide enough to hold her without pushing past the
/// viewport. Decorative, and the text she sits beside is the actual content,
/// so she's hidden from assistive tech.
export function PremiseCass() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Watch the passage she sits beside, never herself: her resting state is
    // parked off the right edge, so observing her own box would report "not
    // visible" forever and she'd never be asked to come in.
    const el = ref.current?.parentElement;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      // Not "any part of it is on screen" — that fires while the section is
      // still sliding up from the bottom and she arrives before the reader
      // does. The negative margins shrink the trigger area to the middle 40%
      // of the viewport, so she comes in once the passage is actually being
      // read, and leaves once it isn't.
      { threshold: 0, rootMargin: "-30% 0px -30% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      // Width, not the size prop: the SVG has a viewBox, so CSS can scale it
      // past the prop's fixed steps and give her a share of the section
      // height. What's available is the margin beside a 42rem column, which
      // is why this steps up with the viewport rather than being one number.
      // 325px puts her at ~50% of the section's height. That only fits once
      // the margin beside the 42rem column is wide enough, which is ~1440px;
      // between xl and there she takes the widest that clears the viewport.
      className="cass-slide absolute left-full top-1/2 ml-4 hidden w-[265px] xl:block min-[1440px]:w-[325px]"
      style={{
        transform: `translateY(-50%) translateX(${visible ? "0%" : "150%"})`,
        opacity: visible ? 1 : 0,
      }}
    >
      <CassRecorder animState={visible ? "talking" : "idle"} size="lg" />
    </div>
  );
}
