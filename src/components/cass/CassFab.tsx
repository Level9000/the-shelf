"use client";

import { useEffect, useRef } from "react";
import { CassRecorder } from "@/components/cass/CassRecorder";

const SHADOW_NORMAL = "0 0 0 2px rgba(200,168,107,0.75), 0 0 14px rgba(200,168,107,0.2), 0 8px 32px rgba(0,0,0,0.5)";
const SHADOW_HOVER  = "0 0 0 2.5px rgba(200,168,107,0.95), 0 0 20px rgba(200,168,107,0.3), 0 10px 40px rgba(0,0,0,0.6)";

/**
 * Fixed bottom-right Cass FAB.
 * Starts as a 64 px circle; on hover (or briefly on mount) expands into a
 * pill that reveals `hoverText` — the same mechanic used in the task-detail modal.
 */
export function CassFab({
  onClick,
  hoverText,
  expandedWidth = "260px",
  label,
}: {
  onClick: () => void;
  hoverText: string;
  expandedWidth?: string;
  label?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  // Auto-expand briefly on mount so the user notices the hint, then collapse
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const expand   = setTimeout(() => { btn.style.width = expandedWidth; }, 700);
    const collapse = setTimeout(() => { if (!btn.matches(":hover")) btn.style.width = "64px"; }, 4700);
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
        boxShadow: SHADOW_NORMAL,
        border: "none",
        cursor: "pointer",
        padding: 0,
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        transition: "width 300ms ease, box-shadow 200ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.width = expandedWidth;
        e.currentTarget.style.boxShadow = SHADOW_HOVER;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.width = "64px";
        e.currentTarget.style.boxShadow = SHADOW_NORMAL;
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

      {/* Hover label — clipped until pill expands */}
      <span style={{
        whiteSpace: "nowrap",
        paddingRight: "20px",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "11px",
        letterSpacing: "0.5px",
        color: "#c8a86b",
      }}>
        {hoverText}
      </span>
    </button>
  );
}
