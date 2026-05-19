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

/**
 * Fixed bottom-right Cass FAB.
 *
 * On mount, if `teaserText` is provided the pill auto-expands (to `teaserExpandedWidth`)
 * showing the teaser — a one-time contextual message.  After ~4 s it collapses and any
 * subsequent hover shows the normal `hoverText` action label.
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

  const shadowNormal = makeShadow(ringColor, false);
  const shadowHover  = makeShadow(ringColor, true);

  // Auto-expand on mount then collapse
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    btn.style.boxShadow = shadowNormal;
    const autoWidth = teaserText ? (teaserExpandedWidth ?? expandedWidth) : expandedWidth;
    const expand   = setTimeout(() => { btn.style.width = autoWidth; }, 700);
    const collapse = setTimeout(() => {
      if (!btn.matches(":hover")) btn.style.width = "64px";
      setShowingTeaser(false);
    }, 4700);
    return () => { clearTimeout(expand); clearTimeout(collapse); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        background: "#1f1a10",
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
        // User takes control — stop showing teaser, switch to action text
        setShowingTeaser(false);
        e.currentTarget.style.width = expandedWidth;
        e.currentTarget.style.boxShadow = shadowHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.width = "64px";
        e.currentTarget.style.boxShadow = shadowNormal;
      }}
    >
      {/* Recorder circle — fixed 64 px, never shrinks */}
      <span style={{
        width: "64px", height: "64px", flexShrink: 0,
        position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0,
          transformOrigin: "top left",
          transform: "scale(0.5333) translateY(-6.5px)",
          filter: "brightness(1.8) contrast(1.1)",
        }}>
          <CassRecorder animState="idle" size="sm" />
        </div>
      </span>

      {/* Label — teaser text during auto-expand, hover text thereafter */}
      <span style={{
        whiteSpace: "nowrap",
        paddingRight: "20px",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "11px",
        letterSpacing: "0.5px",
        color: "#c8a86b",
      }}>
        {showingTeaser && teaserText ? teaserText : hoverText}
      </span>
    </button>
  );
}
