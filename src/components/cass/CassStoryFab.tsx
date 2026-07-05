"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme-context";
import { CassRecorder } from "@/components/cass/CassRecorder";

// CassRecorder at size="sm" renders 120×156 — the smallest built-in size —
// so the FAB scales it down further (25% smaller) via CSS transform rather
// than a size prop.
const RECORDER_W = 120;
const RECORDER_H = 156;
const FAB_SCALE = 0.75;
const SCALED_W = RECORDER_W * FAB_SCALE;
const SCALED_H = RECORDER_H * FAB_SCALE;

function testimonialSeenKey(chapterId: string) {
  return `cass-fab-testimonial-seen:${chapterId}`;
}

/** Has the FAB already been opened today for this chapter? Resets automatically at midnight. */
function wasTestimonialSeenToday(chapterId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(testimonialSeenKey(chapterId)) === new Date().toDateString();
  } catch {
    return false;
  }
}

function markTestimonialSeenToday(chapterId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(testimonialSeenKey(chapterId), new Date().toDateString());
  } catch {
    // Private browsing / storage full — badge just won't persist its dismissal. Not worth surfacing.
  }
}

/**
 * The single Cass entry point on the Story tab, replacing the old "+" FAB.
 * When nothing needs attention, tapping goes straight into today's daily
 * testimonial. Otherwise it opens a short menu — pending nudge (if any),
 * the daily testimonial (worded depending on whether it's already done),
 * and "Add something new" for ad-hoc task capture. A dot signals there's
 * something to do without forcing the menu open.
 *
 * The badge itself (not the underlying menu items) dismisses once the FAB
 * has been opened: the backstory/voice nudge badge for the rest of this
 * session only (it reappears next visit if still incomplete), the daily
 * testimonial badge for the rest of the calendar day (it resets tomorrow).
 */
export function CassStoryFab({
  chapterId,
  hasPendingNudge,
  nudgeLabel,
  dailyTestimonialDone,
  onSelectNudge,
  onSelectTestimonial,
  onSelectAddSomething,
  disabled = false,
  onDisabledClick,
}: {
  chapterId: string;
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

  const [nudgeSeenThisSession, setNudgeSeenThisSession] = useState(false);
  const [testimonialSeenToday, setTestimonialSeenToday] = useState(false);

  useEffect(() => {
    setTestimonialSeenToday(wasTestimonialSeenToday(chapterId));
  }, [chapterId]);

  const nothingPending = !hasPendingNudge && !dailyTestimonialDone;
  const notificationCount =
    (hasPendingNudge && !nudgeSeenThisSession ? 1 : 0) +
    (!dailyTestimonialDone && !testimonialSeenToday ? 1 : 0);

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
    // Opening the FAB — whether it lands on the menu or jumps straight to the
    // testimonial — is what dismisses the badge, independent of the menu items
    // themselves (which stay driven by the real, un-dismissed state).
    setNudgeSeenThisSession(true);
    markTestimonialSeenToday(chapterId);
    setTestimonialSeenToday(true);
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
            bottom: `${SCALED_H + 12}px`,
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
          width: `${SCALED_W}px`,
          height: `${SCALED_H}px`,
          background: "none",
          border: "none",
          padding: 0,
          display: "block",
          cursor: "pointer",
          fontFamily: "'Literata', Georgia, serif",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          transition: "transform 0.12s ease",
        }}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)";
        }}
        onPointerUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
        onPointerLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: `${RECORDER_W}px`,
            height: `${RECORDER_H}px`,
            transform: `scale(${FAB_SCALE})`,
            transformOrigin: "bottom right",
            filter: isDark
              ? "drop-shadow(10px 14px 20px rgba(0,0,0,0.55)) drop-shadow(4px 5px 8px rgba(0,0,0,0.4))"
              : "drop-shadow(10px 14px 20px rgba(0,0,0,0.3)) drop-shadow(4px 5px 8px rgba(0,0,0,0.2))",
          }}
        >
          <CassRecorder
            animState="idle"
            size="sm"
            label={notificationCount > 0 ? `${notificationCount} message${notificationCount === 1 ? "" : "s"}` : undefined}
          />
          {notificationCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "11px",
                right: "15px",
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "#f5c84a",
                border: "2.5px solid var(--app-bg)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "15px",
                fontWeight: 700,
                color: "#1a0e00",
                lineHeight: 1,
              }}
            >
              {notificationCount}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
