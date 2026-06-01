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

// ── Layout constants ──────────────────────────────────────────────────────────

// CassRecorder sm = 120 × 156 px  (viewBox 200×260, scale 0.6)
const FAB_W      = 120;
const FAB_H      = 156;
const FAB_MARGIN = 24; // gap from viewport edge when fully expanded

// Hover zone: transparent div fixed at the viewport corner covering
// both the expanded button position and the corner-peek area.
const ZONE_W = FAB_W + FAB_MARGIN + 8;  // 152 px
const ZONE_H = FAB_H + FAB_MARGIN + 8;  // 188 px

// Resting offset: ~90 × 104 px of corner visible (50% of original full-hide offset).
const REST_TX = Math.round((FAB_W + FAB_MARGIN - 36) * 0.5);  // 54 px  →  right
const REST_TY = Math.round((FAB_H + FAB_MARGIN - 28) * 0.5);  // 76 px  →  down

// Accordion close duration (ms) — how long the text pill takes to collapse
const ACCORDION_MS = 380;
// Brief pause after accordion before Cass starts sliding back
const ACCORDION_PAUSE_MS = 80;

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
  /** Unused — kept for API compatibility */
  expandedWidth?: string;
  teaserExpandedWidth?: string;
  ringColor?: "gold" | "amber" | "green";
  label?: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const btnRef = useRef<HTMLButtonElement>(null);

  const [showingTeaser,      setShowingTeaser]      = useState(!!teaserText);
  const [typedChars,         setTypedChars]         = useState(0);
  const [isPulsing,          setIsPulsing]          = useState(false);
  // Drives the accordion-close animation on the text bubble
  const [isAccordionClosing, setIsAccordionClosing] = useState(false);

  // Two independent sources of "expanded" — either wins
  const [expandedForTeaser, setExpandedForTeaser] = useState(false);
  const [hovered,           setHovered]           = useState(false);

  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const lingerRef     = useRef<ReturnType<typeof setTimeout>  | null>(null);
  // Step-2 timer: fires after accordion closes, starts Cass slide-back
  const slideRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);
  // Step-3 timer: fires after Cass reaches resting, cleans up state
  const cleanupRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);

  // Cass stays fully visible as long as either source is active.
  // expandedForTeaser goes false AFTER the accordion has closed, which is
  // what makes Cass slide back only once the text is already gone.
  const isExpanded = expandedForTeaser || hovered;

  // ── Teaser sequence ───────────────────────────────────────────────────────
  //
  //  700 ms  →  slide Cass in  →  typewrite text
  //  5 s linger
  //  accordion-close text pill  (ACCORDION_MS)
  //  ACCORDION_PAUSE_MS gap
  //  slide Cass back to resting  (CSS transition 0.42 s)
  //  cleanup

  useEffect(() => {
    if (!teaserText) return;

    const startDelay = setTimeout(() => {
      setExpandedForTeaser(true);
      setIsPulsing(true);

      delayRef.current = setTimeout(() => {
        delayRef.current = null;

        startTypewriter(teaserText, setTypedChars, typewriterRef, () => {
          lingerRef.current = setTimeout(() => {
            lingerRef.current = null;

            // Step 1 — accordion-close the text bubble
            setIsAccordionClosing(true);

            slideRef.current = setTimeout(() => {
              slideRef.current = null;

              // Step 2 — slide Cass back to resting
              setExpandedForTeaser(false);
              setIsPulsing(false);

              // Step 3 — after Cass completes its slide (≈ 420 ms + buffer)
              cleanupRef.current = setTimeout(() => {
                cleanupRef.current = null;
                setIsAccordionClosing(false);
                setShowingTeaser(false);
                setTypedChars(0);
              }, 520);

            }, ACCORDION_MS + ACCORDION_PAUSE_MS);

          }, 5000);
        });
      }, 320);
    }, 700);

    return () => {
      clearTimeout(startDelay);
      if (typewriterRef.current) clearInterval(typewriterRef.current);
      if (delayRef.current)      clearTimeout(delayRef.current);
      if (lingerRef.current)     clearTimeout(lingerRef.current);
      if (slideRef.current)      clearTimeout(slideRef.current);
      if (cleanupRef.current)    clearTimeout(cleanupRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived display values ────────────────────────────────────────────────

  const activeText = showingTeaser && teaserText ? teaserText : hoverText;
  const labelText  = activeText.slice(0, typedChars);
  const showLabel  = typedChars > 0;

  const pillBg     = isDark ? "rgba(232,223,192,0.95)" : "rgba(14,11,4,0.90)";
  const pillText   = isDark ? "rgba(26,14,0,0.85)"     : "#c8a86b";
  const pillBorder = isDark ? "rgba(26,14,0,0.12)"     : "rgba(200,168,107,0.35)";

  const glowKeyframes = `
    @keyframes cassFabGlowPulse {
      0%, 100% { filter: drop-shadow(0 0 10px ${glowColor(ringColor, false)}); }
      50%       { filter: drop-shadow(0 0 30px ${glowColor(ringColor, true)}); }
    }
  `;

  // ── Hover zone handlers ───────────────────────────────────────────────────

  function cancelTeaser() {
    stopTypewriter(typewriterRef, delayRef, setTypedChars);
    if (lingerRef.current)  { clearTimeout(lingerRef.current);  lingerRef.current  = null; }
    if (slideRef.current)   { clearTimeout(slideRef.current);   slideRef.current   = null; }
    if (cleanupRef.current) { clearTimeout(cleanupRef.current); cleanupRef.current = null; }
    setIsAccordionClosing(false);
    setIsPulsing(false);
    setShowingTeaser(false);
    setExpandedForTeaser(false);
  }

  function handleZoneEnter() {
    if (showingTeaser || isAccordionClosing) cancelTeaser();

    setHovered(true);
    if (btnRef.current) {
      btnRef.current.style.animation = "none";
      btnRef.current.style.filter = `drop-shadow(0 0 22px ${glowColor(ringColor, true)})`;
    }
    // Small delay so hover text starts once Cass is mostly slid in
    delayRef.current = setTimeout(() => {
      delayRef.current = null;
      startTypewriter(hoverText, setTypedChars, typewriterRef);
    }, 80);
  }

  function handleZoneLeave() {
    stopTypewriter(typewriterRef, delayRef, setTypedChars);
    setHovered(false);
    if (btnRef.current) {
      btnRef.current.style.animation = "none";
      btnRef.current.style.filter = `drop-shadow(0 0 10px ${glowColor(ringColor, false)})`;
    }
  }

  return (
    <>
      <style>{glowKeyframes}</style>

      {/*
        ── Text bubble ───────────────────────────────────────────────────────
        Two-layer structure for the accordion-close animation:
          outer  —  overflow:hidden wrapper whose max-width collapses left→right
          inner  —  the styled pill, never resized, just clipped by outer
        Because the outer is right-anchored, shrinking max-width eats from the
        left side, giving the left-to-right accordion-close effect.
      */}
      {showLabel && (
        <div
          style={{
            position: "fixed",
            bottom: `${FAB_MARGIN + 28}px`,
            right: `${FAB_MARGIN + FAB_W + 12}px`,
            zIndex: 40,
            pointerEvents: "none",
            overflow: "hidden",
            // Accordion open instantly on first appearance; accordion-close on exit.
            // min() keeps the bubble inside the viewport on narrow screens — right edge
            // sits ${FAB_MARGIN + FAB_W + 12}px = 156px from the right, so subtract
            // that plus 20px breathing room to get the safe left-side boundary.
            maxWidth: isAccordionClosing
              ? "0px"
              : `min(440px, calc(100vw - ${FAB_MARGIN + FAB_W + 12 + 20}px))`,
            transition: isAccordionClosing
              ? `max-width ${ACCORDION_MS}ms ease-in`
              : "none",
          }}
        >
          <div
            style={{
              background: pillBg,
              border: `1px solid ${pillBorder}`,
              borderRadius: "18px",
              padding: "8px 18px",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              fontFamily: "'Literata', Georgia, serif",
              fontSize: "12.5px",
              lineHeight: "1.45",
              letterSpacing: "0.3px",
              color: pillText,
              wordBreak: "break-word",
              boxShadow: isDark
                ? "0 2px 12px rgba(0,0,0,0.12)"
                : "0 2px 16px rgba(0,0,0,0.10)",
            }}
          >
            {labelText}
          </div>
        </div>
      )}

      {/*
        ── Hover zone ────────────────────────────────────────────────────────
        Transparent fixed div pinned to the viewport's bottom-right corner.
        Spans the full area from corner to expanded button's far edge so hover
        is detected reliably regardless of the button's current position.
        The button itself has pointer-events:none — zone owns all interactions.
      */}
      <div
        role="button"
        tabIndex={0}
        aria-label={hoverText}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
        onMouseEnter={handleZoneEnter}
        onMouseLeave={handleZoneLeave}
        onClick={onClick}
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          width: `${ZONE_W}px`,
          height: `${ZONE_H}px`,
          zIndex: 40,
          pointerEvents: "auto",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {/* Cass recorder — slides between resting (corner peek) and expanded */}
        <button
          ref={btnRef}
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          style={{
            position: "absolute",
            bottom: `${FAB_MARGIN}px`,
            right: `${FAB_MARGIN}px`,
            background: "none",
            border: "none",
            padding: 0,
            pointerEvents: "none",
            transform: isExpanded
              ? "translate(0, 0)"
              : `translate(${REST_TX}px, ${REST_TY}px)`,
            transition: "transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)",
            animation: isPulsing ? "cassFabGlowPulse 1.6s ease-in-out infinite" : "none",
            filter: `drop-shadow(0 0 10px ${glowColor(ringColor, false)})`,
          }}
        >
          <CassRecorder
            animState={showLabel ? "talking" : "idle"}
            size="sm"
          />
        </button>
      </div>
    </>
  );
}
