"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export function SideDrawer({
  open,
  onClose,
  side = "right",
  children,
  footer,
}: {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  side?: "left" | "right";
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        pointerEvents: open ? "auto" : "none",
      }}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          opacity: open ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "absolute",
          [side === "left" ? "left" : "right"]: 0,
          top: 0,
          bottom: 0,
          width: "min(320px, 90vw)",
          background: isDark ? "#181818" : "#faf9f4",
          borderLeft: side === "right" ? `1px solid ${isDark ? "#282828" : "rgba(0,0,0,0.08)"}` : "none",
          borderRight: side === "left" ? `1px solid ${isDark ? "#282828" : "rgba(0,0,0,0.08)"}` : "none",
          boxShadow: side === "right"
            ? (isDark ? "-8px 0 40px rgba(0,0,0,0.8)" : "-8px 0 40px rgba(0,0,0,0.12)")
            : (isDark ? "8px 0 40px rgba(0,0,0,0.8)" : "8px 0 40px rgba(0,0,0,0.12)"),
          transform: open
            ? "translateX(0)"
            : side === "right" ? "translateX(100%)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header — tape logo centered, X at right */}
        <div style={{
          background: isDark ? "#0a0a0a" : "#f0ebe0",
          borderBottom: `1px solid ${isDark ? "#1e1e1e" : "rgba(0,0,0,0.08)"}`,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          flexShrink: 0,
        }}>
          <img
            src="/icons/authored-by-tape-icon.png"
            alt="Authored By"
            style={{ height: "40px", width: "auto", objectFit: "contain" }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              right: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: isDark ? "rgba(248,248,246,0.3)" : "rgba(26,14,0,0.3)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? "rgba(248,248,246,0.8)" : "rgba(26,14,0,0.8)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "rgba(248,248,246,0.3)" : "rgba(26,14,0,0.3)"; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
          {children}
        </div>

        {/* Pinned footer */}
        {footer && (
          <div style={{
            flexShrink: 0,
            padding: "14px 16px 20px",
            borderTop: `1px solid ${isDark ? "#222" : "rgba(0,0,0,0.08)"}`,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
