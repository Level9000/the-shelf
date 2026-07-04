"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme-context";
import { CassRecorder } from "@/components/cass/CassRecorder";

// CassRecorder at size="sm" renders 120×156. Scaled to fit the FAB circle,
// then nudged up slightly so the window+reels (its most recognizable part)
// land centered in the visible circle instead of the recorder's true middle.
const RECORDER_W = 120;
const RECORDER_H = 156;

/** The real Cass avatar, scaled down and clipped into the FAB's circle. */
function CassAvatarFace({ size }: { size: number }) {
  const scale = size / RECORDER_W;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "#3c3c3c",
        border: "1.5px solid #5a5a5a",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: RECORDER_W,
          height: RECORDER_H,
          transform: `translate(-50%, -50%) scale(${scale}) translateY(-12px)`,
        }}
      >
        <CassRecorder animState="idle" size="sm" />
      </div>
    </div>
  );
}

/**
 * The single Cass entry point on the Story tab, replacing the old "+" FAB.
 * When nothing needs attention, tapping goes straight into today's daily
 * testimonial. Otherwise it opens a short menu — pending nudge (if any),
 * the daily testimonial (worded depending on whether it's already done),
 * and "Add something new" for ad-hoc task capture. A dot signals there's
 * something to do without forcing the menu open.
 */
export function CassStoryFab({
  hasPendingNudge,
  nudgeLabel,
  dailyTestimonialDone,
  onSelectNudge,
  onSelectTestimonial,
  onSelectAddSomething,
  disabled = false,
  onDisabledClick,
}: {
  hasPendingNudge: boolean;
  nudgeLabel?: string;
  dailyTestimonialDone: boolean;
  onSelectNudge: () => void;
  onSelectTestimonial: () => void;
  onSelectAddSomething: () => void;
  disabled?: boolean;
  onDisabledClick?: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const nothingPending = !hasPendingNudge && !dailyTestimonialDone;
  const showDot = hasPendingNudge || !dailyTestimonialDone;

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  function handleClick() {
    if (disabled) {
      onDisabledClick?.();
      return;
    }
    if (nothingPending) {
      onSelectTestimonial();
      return;
    }
    setMenuOpen((v) => !v);
  }

  const menuBg = isDark ? "rgba(20,16,10,0.97)" : "rgba(255,253,247,0.98)";
  const menuBorder = isDark ? "rgba(200,168,107,0.28)" : "rgba(200,168,107,0.35)";
  const menuText = isDark ? "#e8dfc0" : "rgba(26,14,0,0.85)";

  const menuItemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    padding: "11px 16px",
    fontFamily: "'Literata', Georgia, serif",
    fontSize: "14px",
    color: menuText,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div ref={wrapperRef} style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 40 }}>
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "68px",
            right: 0,
            minWidth: "230px",
            background: menuBg,
            border: `1px solid ${menuBorder}`,
            borderRadius: "14px",
            boxShadow: "0 6px 24px rgba(0,0,0,0.22)",
            overflow: "hidden",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          {hasPendingNudge && nudgeLabel && (
            <button
              type="button"
              style={{ ...menuItemStyle, borderBottom: `1px solid ${menuBorder}` }}
              onClick={() => { setMenuOpen(false); onSelectNudge(); }}
            >
              {nudgeLabel}
            </button>
          )}
          <button
            type="button"
            style={{ ...menuItemStyle, borderBottom: `1px solid ${menuBorder}` }}
            onClick={() => { setMenuOpen(false); onSelectTestimonial(); }}
          >
            {dailyTestimonialDone ? "Add another daily testimonial" : "Share today's update"}
          </button>
          <button
            type="button"
            style={menuItemStyle}
            onClick={() => { setMenuOpen(false); onSelectAddSomething(); }}
          >
            Add something new
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        aria-label="Open Cass"
        style={{
          position: "relative",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "none",
          border: "none",
          padding: 0,
          boxShadow: "0 4px 16px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontFamily: "'Literata', Georgia, serif",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          transition: "transform 0.12s ease, box-shadow 0.12s ease",
        }}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.93)";
        }}
        onPointerUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
        onPointerLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        <CassAvatarFace size={56} />
        {showDot && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#f5c84a",
              border: "2px solid var(--ink)",
            }}
          />
        )}
      </button>
    </div>
  );
}
