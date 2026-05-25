"use client";

import { useEffect, useRef, useState } from "react";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { useTheme } from "@/lib/theme-context";

// ── Typewriter helpers ────────────────────────────────────────────────────────

const TYPEWRITER_MS = 38;

function startTypewriter(
  text: string,
  setCount: (n: number) => void,
  intervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
  onComplete?: () => void,
) {
  let i = 0;
  intervalRef.current = setInterval(() => {
    i++;
    setCount(i);
    if (i >= text.length) {
      clearInterval(intervalRef.current!);
      intervalRef.current = null;
      onComplete?.();
    }
  }, TYPEWRITER_MS);
}

function stopTypewriter(
  intervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
  delayRef:    React.MutableRefObject<ReturnType<typeof setTimeout>  | null>,
  setCount: (n: number) => void,
) {
  if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  if (delayRef.current)    { clearTimeout(delayRef.current);    delayRef.current = null; }
  setCount(0);
}

// ── Glow colour ───────────────────────────────────────────────────────────────

function glowColor(ringColor: "gold" | "amber" | "green", strong: boolean) {
  if (ringColor === "amber") return `rgba(251,146,60,${strong ? "0.65" : "0.28"})`;
  if (ringColor === "green") return `rgba(74,222,128,${strong ? "0.60" : "0.22"})`;
  return `rgba(200,168,107,${strong ? "0.65" : "0.28"})`;
}

// ── CassFab ───────────────────────────────────────────────────────────────────

export function CassFab({
  onClick,
  hoverText,
  teaserText,
  ringColor = "gold",
}: {
  onClick: () => void;
  hoverText: string;
  teaserText?: string;
  expandedWidth?: string;
  teaserExpandedWidth?: string;
  ringColor?: "gold" | "amber" | "green";
  label?: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const btnRef = useRef<HTMLButtonElement>(null);
  const [showingTeaser, setShowingTeaser] = useState(!!teaserText);
  const [typedChars, setTypedChars]       = useState(0);
  // isFading drives the opacity-out on the pill before it unmounts
  const [isFading, setIsFading]           = useState(false);
  // isPulsing drives the glow animation on the recorder during the teaser
  const [isPulsing, setIsPulsing]         = useState(false);

  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const lingerRef     = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const fadeRef       = useRef<ReturnType<typeof setTimeout>  | null>(null);

  useEffect(() => {
    if (!teaserText) return;

    // 700ms pause → start typewriting, begin pulse
    const startDelay = setTimeout(() => {
      setIsPulsing(true);

      delayRef.current = setTimeout(() => {
        delayRef.current = null;

        startTypewriter(teaserText, setTypedChars, typewriterRef, () => {
          // Typewriting finished → linger for 5 s then fade out
          lingerRef.current = setTimeout(() => {
            setIsFading(true);
            // After 700ms fade transition, fully clear
            fadeRef.current = setTimeout(() => {
              setIsFading(false);
              setIsPulsing(false);
              setShowingTeaser(false);
              setTypedChars(0);
            }, 700);
          }, 5000);
        });
      }, 320);
    }, 700);

    return () => {
      clearTimeout(startDelay);
      if (typewriterRef.current) clearInterval(typewriterRef.current);
      if (delayRef.current)      clearTimeout(delayRef.current);
      if (lingerRef.current)     clearTimeout(lingerRef.current);
      if (fadeRef.current)       clearTimeout(fadeRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeText = showingTeaser && teaserText ? teaserText : hoverText;
  const labelText  = activeText.slice(0, typedChars);
  const showLabel  = typedChars > 0;

  // Pill colours — inverted for contrast:
  //   dark mode  → warm cream pill with dark text (pops against dark page)
  //   light mode → near-black pill with gold text (pops against light page)
  const pillBg     = isDark ? "rgba(232,223,192,0.95)" : "rgba(14,11,4,0.90)";
  const pillText   = isDark ? "rgba(26,14,0,0.85)"     : "#c8a86b";
  const pillBorder = isDark ? "rgba(26,14,0,0.12)"     : "rgba(200,168,107,0.35)";

  // Inline keyframe for the pulsing glow — keyed to ringColor
  const glowKeyframes = `
    @keyframes cassFabGlowPulse {
      0%, 100% { filter: drop-shadow(0 0 10px ${glowColor(ringColor, false)}); }
      50%       { filter: drop-shadow(0 0 30px ${glowColor(ringColor, true)}); }
    }
  `;

  return (
    <>
      <style>{glowKeyframes}</style>

      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 40,
          display: "flex",
          alignItems: "flex-end",
          gap: "12px",
          pointerEvents: "none",
        }}
      >
        {/* Floating typewriter label */}
        {showLabel && (
          <div
            style={{
              pointerEvents: "none",
              background: pillBg,
              border: `1px solid ${pillBorder}`,
              borderRadius: "999px",
              padding: "8px 18px",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "12.5px",
              lineHeight: "1.45",
              letterSpacing: "0.5px",
              color: pillText,
              whiteSpace: "nowrap",
              boxShadow: isDark
                ? "0 4px 16px rgba(0,0,0,0.18)"
                : "0 4px 20px rgba(0,0,0,0.45)",
              marginBottom: "28px",
              // Fade-out transition
              opacity: isFading ? 0 : 1,
              transition: isFading ? "opacity 0.7s ease" : "opacity 0.15s ease",
            }}
          >
            {labelText}
          </div>
        )}

        {/* Full recorder button */}
        <button
          ref={btnRef}
          type="button"
          onClick={onClick}
          aria-label={hoverText}
          style={{
            pointerEvents: "auto",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            // Pulsing animation while teaser is active; hover overrides via inline style
            animation: isPulsing ? "cassFabGlowPulse 1.6s ease-in-out infinite" : "none",
            filter: isPulsing ? undefined : `drop-shadow(0 0 10px ${glowColor(ringColor, false)})`,
            transform: "translateY(0)",
            transition: isPulsing ? "transform 0.15s ease" : "filter 0.22s ease, transform 0.15s ease",
          }}
          onMouseEnter={(e) => {
            // Interrupt teaser: stop typewriter, clear pulse, stop linger
            stopTypewriter(typewriterRef, delayRef, setTypedChars);
            if (lingerRef.current) { clearTimeout(lingerRef.current); lingerRef.current = null; }
            if (fadeRef.current)   { clearTimeout(fadeRef.current);   fadeRef.current = null; }
            setIsFading(false);
            setIsPulsing(false);
            setShowingTeaser(false);

            e.currentTarget.style.animation = "none";
            e.currentTarget.style.filter = `drop-shadow(0 0 22px ${glowColor(ringColor, true)})`;
            e.currentTarget.style.transform = "translateY(-3px)";

            delayRef.current = setTimeout(() => {
              delayRef.current = null;
              startTypewriter(hoverText, setTypedChars, typewriterRef);
            }, 80);
          }}
          onMouseLeave={(e) => {
            stopTypewriter(typewriterRef, delayRef, setTypedChars);

            e.currentTarget.style.animation = "none";
            e.currentTarget.style.filter = `drop-shadow(0 0 10px ${glowColor(ringColor, false)})`;
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <CassRecorder animState="idle" size="sm" />
        </button>
      </div>
    </>
  );
}
