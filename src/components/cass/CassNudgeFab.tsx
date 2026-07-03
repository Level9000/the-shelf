"use client";

import { useEffect, useRef, useState } from "react";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { useTheme } from "@/lib/theme-context";

const TYPEWRITER_MS = 38;
const POP_OUT_DELAY_MS = 500;
const TYPEWRITER_START_DELAY_MS = 280;

// Same footprint as CassFab's "sm" recorder, so the resting peek lines up
// the same way relative to the viewport corner.
const FAB_W = 120;
const FAB_H = 156;
const FAB_MARGIN = 24;
const REST_TX = Math.round((FAB_W + FAB_MARGIN - 36) * 0.5);
const REST_TY = Math.round((FAB_H + FAB_MARGIN - 28) * 0.5);

// Sits above MobileFab (z-index 40) so Cass renders in front of it.
const NUDGE_Z = 45;

/**
 * A persistent Cass corner nudge — slides out from its resting peek, types
 * out a message, then stays expanded with two explicit actions until the
 * user picks one. Unlike CassFab, this never auto-collapses; the parent
 * decides when to stop rendering it (e.g. once the user responds).
 */
export function CassNudgeFab({
  message,
  acceptLabel = "Sure",
  declineLabel = "Not now",
  onAccept,
  onDecline,
}: {
  message: string;
  acceptLabel?: string;
  declineLabel?: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [expanded, setExpanded] = useState(false);
  const [typedChars, setTypedChars] = useState(0);
  const [hiding, setHiding] = useState(false);

  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const popOut = setTimeout(() => setExpanded(true), POP_OUT_DELAY_MS);
    return () => clearTimeout(popOut);
  }, []);

  useEffect(() => {
    if (!expanded) return;

    const startDelay = setTimeout(() => {
      let i = 0;
      typewriterRef.current = setInterval(() => {
        i++;
        setTypedChars(i);
        if (i >= message.length) {
          clearInterval(typewriterRef.current!);
          typewriterRef.current = null;
        }
      }, TYPEWRITER_MS);
    }, TYPEWRITER_START_DELAY_MS);

    return () => {
      clearTimeout(startDelay);
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const showLabel = typedChars > 0;
  const labelText = message.slice(0, typedChars);
  const doneTyping = typedChars >= message.length;

  function handleAccept() {
    setHiding(true);
    setTimeout(onAccept, 180);
  }

  function handleDecline() {
    setHiding(true);
    setTimeout(onDecline, 180);
  }

  const pillBg = isDark ? "rgba(232,223,192,0.95)" : "rgba(14,11,4,0.90)";
  const pillText = isDark ? "rgba(26,14,0,0.85)" : "#c8a86b";
  const pillBorder = isDark ? "rgba(26,14,0,0.12)" : "rgba(200,168,107,0.35)";

  return (
    <>
      {showLabel && (
        <div
          style={{
            position: "fixed",
            bottom: `${FAB_MARGIN + 28}px`,
            right: `${FAB_MARGIN + FAB_W + 12}px`,
            zIndex: NUDGE_Z,
            opacity: hiding ? 0 : 1,
            transition: "opacity 0.18s ease",
            maxWidth: `min(280px, calc(100vw - ${FAB_MARGIN + FAB_W + 12 + 20}px))`,
          }}
        >
          <div
            style={{
              background: pillBg,
              border: `1px solid ${pillBorder}`,
              borderRadius: "18px",
              padding: "12px 16px",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: isDark
                ? "0 2px 12px rgba(0,0,0,0.12)"
                : "0 2px 16px rgba(0,0,0,0.10)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "'Literata', Georgia, serif",
                fontSize: "13px",
                lineHeight: "1.45",
                letterSpacing: "0.3px",
                color: pillText,
                wordBreak: "break-word",
              }}
            >
              {labelText}
            </p>
            {doneTyping && (
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={handleAccept}
                  style={{
                    flex: 1,
                    background: "#c8a86b",
                    color: "#1a0e00",
                    border: "none",
                    borderRadius: "10px",
                    padding: "7px 12px",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {acceptLabel}
                </button>
                <button
                  type="button"
                  onClick={handleDecline}
                  style={{
                    flex: 1,
                    background: "transparent",
                    color: pillText,
                    border: `1px solid ${pillBorder}`,
                    borderRadius: "10px",
                    padding: "7px 12px",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {declineLabel}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: `${FAB_MARGIN}px`,
          right: `${FAB_MARGIN}px`,
          zIndex: NUDGE_Z,
          pointerEvents: "none",
          opacity: hiding ? 0 : 1,
          transform: expanded ? "translate(0, 0)" : `translate(${REST_TX}px, ${REST_TY}px)`,
          transition: "transform 0.42s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.18s ease",
        }}
      >
        <CassRecorder animState={showLabel ? "talking" : "idle"} size="sm" />
      </div>
    </>
  );
}
