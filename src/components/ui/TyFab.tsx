"use client";

import { useEffect, useRef, useState } from "react";
import { TypewriterRecorder } from "@/components/ui/TypewriterRecorder";
import { useTheme } from "@/lib/theme-context";

// ── Typewriter helpers ────────────────────────────────────────────────────────

const TYPEWRITER_MS = 36;

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
  if (delayRef.current)    { clearTimeout(delayRef.current);     delayRef.current    = null; }
  setCount(0);
}

// ── Layout constants ──────────────────────────────────────────────────────────

// TypewriterRecorder sm = 160 × 143 px  (viewBox 280×250, scale ~0.57)
const FAB_W      = 160;
const FAB_H      = 143;
const FAB_MARGIN = 24;

const ZONE_W = FAB_W + FAB_MARGIN + 8;
const ZONE_H = FAB_H + FAB_MARGIN + 8;

// Resting offset: ~half the FAB peeks out of the corner
const REST_TX = Math.round((FAB_W + FAB_MARGIN - 36) * 0.5);
const REST_TY = Math.round((FAB_H + FAB_MARGIN - 28) * 0.5);

const ACCORDION_MS       = 380;
const ACCORDION_PAUSE_MS = 80;

// ── TyFab ─────────────────────────────────────────────────────────────────────

export function TyFab({
  onClick,
  hoverText,
  teaserText,
}: {
  onClick: () => void;
  hoverText: string;
  teaserText?: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const btnRef = useRef<HTMLButtonElement>(null);

  const [showingTeaser,      setShowingTeaser]      = useState(!!teaserText);
  const [typedChars,         setTypedChars]         = useState(0);
  const [isPulsing,          setIsPulsing]          = useState(false);
  const [isAccordionClosing, setIsAccordionClosing] = useState(false);
  const [expandedForTeaser,  setExpandedForTeaser]  = useState(false);
  const [hovered,            setHovered]            = useState(false);

  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const lingerRef     = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const slideRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const cleanupRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);

  const isExpanded = expandedForTeaser || hovered;

  // ── Teaser sequence ───────────────────────────────────────────────────────

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

            setIsAccordionClosing(true);

            slideRef.current = setTimeout(() => {
              slideRef.current = null;

              setExpandedForTeaser(false);
              setIsPulsing(false);

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

  // Ty uses a warm parchment pill instead of Cass's dark/gold
  const pillBg     = isDark ? "rgba(232,223,192,0.95)" : "rgba(14,11,4,0.90)";
  const pillText   = isDark ? "rgba(26,14,0,0.85)"     : "#c8a86b";
  const pillBorder = isDark ? "rgba(26,14,0,0.12)"     : "rgba(200,168,107,0.35)";

  // Warm cream glow instead of gold
  const glowWeak   = "rgba(206,199,187,0.35)";
  const glowStrong = "rgba(206,199,187,0.70)";

  const glowKeyframes = `
    @keyframes tyFabGlowPulse {
      0%, 100% { filter: drop-shadow(0 0 10px ${glowWeak}); }
      50%       { filter: drop-shadow(0 0 28px ${glowStrong}); }
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
      btnRef.current.style.filter    = `drop-shadow(0 0 20px ${glowStrong})`;
    }
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
      btnRef.current.style.filter    = `drop-shadow(0 0 10px ${glowWeak})`;
    }
  }

  return (
    <>
      <style>{glowKeyframes}</style>

      {/* ── Text bubble ───────────────────────────────────────────────────── */}
      {showLabel && (
        <div
          style={{
            position: "fixed",
            bottom: `${FAB_MARGIN + 28}px`,
            right: `${FAB_MARGIN + FAB_W + 12}px`,
            zIndex: 40,
            pointerEvents: "none",
            overflow: "hidden",
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

      {/* ── Hover zone ────────────────────────────────────────────────────── */}
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
            animation: isPulsing ? "tyFabGlowPulse 1.8s ease-in-out infinite" : "none",
            filter: `drop-shadow(0 0 10px ${glowWeak})`,
          }}
        >
          <TypewriterRecorder
            animState={showLabel ? "typing" : "idle"}
            size="sm"
          />
        </button>
      </div>
    </>
  );
}
