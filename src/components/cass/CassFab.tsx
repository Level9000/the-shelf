"use client";

import { useEffect, useRef, useState } from "react";
import { CassRecorder } from "@/components/cass/CassRecorder";

// ── Ring shadow helpers ───────────────────────────────────────────────────────

function makeShadow(ringColor: "gold" | "amber" | "green", hover: boolean) {
  const ring =
    ringColor === "amber"
      ? `0 0 0 2.5px rgba(251,146,60,${hover ? "1" : "0.9"}), 0 0 ${hover ? "20px" : "14px"} rgba(251,146,60,${hover ? "0.3" : "0.2"})`
      : ringColor === "green"
      ? `0 0 0 2.5px rgba(74,222,128,${hover ? "0.95" : "0.8"}), 0 0 ${hover ? "20px" : "14px"} rgba(74,222,128,${hover ? "0.25" : "0.15"})`
      : `0 0 0 ${hover ? "2.5px" : "2px"} rgba(200,168,107,${hover ? "0.95" : "0.75"}), 0 0 ${hover ? "20px" : "14px"} rgba(200,168,107,${hover ? "0.3" : "0.2"})`;
  return `${ring}, 0 ${hover ? "10px 40px" : "8px 32px"} rgba(0,0,0,${hover ? "0.6" : "0.5"})`;
}

// Typewriter speed — ms per character
const TYPEWRITER_MS = 38;

function startTypewriter(
  text: string,
  setCount: (n: number) => void,
  intervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
) {
  let i = 0;
  intervalRef.current = setInterval(() => {
    i++;
    setCount(i);
    if (i >= text.length) {
      clearInterval(intervalRef.current!);
      intervalRef.current = null;
    }
  }, TYPEWRITER_MS);
}

function stopTypewriter(
  intervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
  delayRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  setCount: (n: number) => void,
) {
  if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  if (delayRef.current)    { clearTimeout(delayRef.current);    delayRef.current = null; }
  setCount(0);
}

/**
 * Fixed bottom-right Cass FAB.
 *
 * Every time the pill opens (auto-teaser or hover) the label typewriters in
 * character by character.  Every time it closes the text is cleared, preventing
 * overflow artifacts on subsequent open/close cycles.
 *
 * `ringColor` tints the outer glow ring: gold (default), amber (warning), green (positive).
 */
export function CassFab({
  onClick,
  hoverText,
  teaserText,
  expandedWidth = "260px",
  teaserExpandedWidth,
  ringColor = "gold",
  label,
}: {
  onClick: () => void;
  hoverText: string;
  teaserText?: string;
  expandedWidth?: string;
  /** Width to use during the auto-expand teaser phase (defaults to expandedWidth) */
  teaserExpandedWidth?: string;
  ringColor?: "gold" | "amber" | "green";
  label?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  // True only during the auto-expand mount phase; any hover cancels it
  const [showingTeaser, setShowingTeaser] = useState(!!teaserText);
  // How many characters are currently visible (0 = empty = pill collapsed appearance)
  const [typedChars, setTypedChars] = useState(0);

  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);

  const shadowNormal = makeShadow(ringColor, false);
  const shadowHover  = makeShadow(ringColor, true);

  // Auto-expand on mount (teaser phase)
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    btn.style.boxShadow = shadowNormal;

    const autoWidth = teaserText ? (teaserExpandedWidth ?? expandedWidth) : expandedWidth;
    const mountTimeouts: ReturnType<typeof setTimeout>[] = [];

    // 1. Expand
    mountTimeouts.push(setTimeout(() => {
      btn.style.width = autoWidth;

      if (teaserText) {
        // 2. Wait for CSS transition then typewrite the teaser
        delayRef.current = setTimeout(() => {
          delayRef.current = null;
          startTypewriter(teaserText, setTypedChars, typewriterRef);
        }, 320);
        mountTimeouts.push(delayRef.current);
      }
    }, 700));

    // 3. Collapse — clear text before shrinking so nothing overflows
    mountTimeouts.push(setTimeout(() => {
      stopTypewriter(typewriterRef, delayRef, setTypedChars);
      if (!btn.matches(":hover")) btn.style.width = "64px";
      setShowingTeaser(false);
    }, 4700));

    return () => {
      mountTimeouts.forEach(clearTimeout);
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The text that is currently visible (empty string = nothing showing)
  const activeText = showingTeaser && teaserText ? teaserText : hoverText;
  const labelText  = activeText.slice(0, typedChars);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      aria-label={label ?? hoverText}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 40,
        width: "64px",
        height: "64px",
        borderRadius: "999px",
        overflow: "hidden",
        background: "#252525",
        boxShadow: shadowNormal,
        border: "none",
        cursor: "pointer",
        padding: 0,
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        transition: "width 300ms ease, box-shadow 200ms ease",
      }}
      onMouseEnter={(e) => {
        // Cancel any in-progress teaser typewriter
        stopTypewriter(typewriterRef, delayRef, setTypedChars);
        setShowingTeaser(false);

        e.currentTarget.style.width = expandedWidth;
        e.currentTarget.style.boxShadow = shadowHover;

        // Wait for the expand transition then typewrite the hover label
        delayRef.current = setTimeout(() => {
          delayRef.current = null;
          startTypewriter(hoverText, setTypedChars, typewriterRef);
        }, 260);
      }}
      onMouseLeave={(e) => {
        // Clear text immediately — no overflow on next open
        stopTypewriter(typewriterRef, delayRef, setTypedChars);

        e.currentTarget.style.width = "64px";
        e.currentTarget.style.boxShadow = shadowNormal;
      }}
    >
      {/* Label — always typewritten in, always cleared on close */}
      {/* Comes first in DOM so it occupies the LEFT side; recorder anchors the RIGHT edge */}
      <span style={{
        flex: 1,
        minWidth: 0,
        overflow: "hidden",
        whiteSpace: "normal",
        wordBreak: "break-word",
        // Zero padding when no text so the recorder stays centred in the collapsed pill
        paddingLeft:  typedChars > 0 ? "20px" : "0",
        paddingRight: typedChars > 0 ? "8px"  : "0",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "11px",
        lineHeight: "1.45",
        letterSpacing: "0.5px",
        color: "#c8a86b",
      }}>
        {labelText}
      </span>

      {/* Recorder circle — fixed 64 px, stays anchored at the right edge */}
      <span style={{
        width: "64px", height: "64px", flexShrink: 0,
        position: "relative", overflow: "hidden",
        background: "#2e2e2e",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          position: "absolute",
          /* Scale 120px→64px = 0.5333. Scaled height = 156×0.5333 = 83.2px.
             Offset top by -(83.2-64)/2 = -9.6px so it's vertically centred. */
          top: "-9.6px", left: 0,
          transformOrigin: "top left",
          transform: "scale(0.5333)",
          filter: "brightness(1.6) contrast(1.1)",
        }}>
          <CassRecorder animState="idle" size="sm" />
        </div>
      </span>
    </button>
  );
}
