"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

// Flat left edge, torn right edge — sits flush against the left wall of the drawer
const TAPE_CLIP = "polygon(0% 0%, calc(100% - 2px) 0%, 100% 20%, calc(100% - 4px) 48%, 100% 72%, calc(100% - 2px) 100%, 0% 100%)";

export function SideDrawer({
  open,
  title,
  description: _description,
  onClose,
  side = "right",
  children,
  footer,
}: {
  open: boolean;
  title: string;
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

  const panelBg = isDark ? "#0d1109" : "#faf9f4";
  const panelBorder = isDark ? "#3a3010" : "rgba(26,14,0,0.10)";
  const panelShadow = isDark
    ? (side === "right"
        ? "-8px 0 40px rgba(0,0,0,0.95), inset 1px 0 0 rgba(255,180,30,0.04)"
        : "8px 0 40px rgba(0,0,0,0.95), inset -1px 0 0 rgba(255,180,30,0.04)")
    : (side === "right"
        ? "-8px 0 40px rgba(0,0,0,0.12)"
        : "8px 0 40px rgba(0,0,0,0.12)");
  const headerBorder = isDark ? "1px solid #1a1608" : "1px solid rgba(26,14,0,0.10)";
  const closeColor = isDark ? "#7a6a2e" : "rgba(26,14,0,0.4)";

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
          background: panelBg,
          borderLeft: side === "right" ? `1.5px solid ${panelBorder}` : "none",
          borderRight: side === "left" ? `1.5px solid ${panelBorder}` : "none",
          boxShadow: panelShadow,
          transform: open
            ? "translateX(0)"
            : side === "right" ? "translateX(100%)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header — only rendered when a title is provided */}
        {title ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px 8px 0",
            borderBottom: headerBorder,
            flexShrink: 0,
          }}>
            <span style={{
              display: "inline-block",
              fontFamily: "'Caveat', cursive",
              fontSize: "18px",
              fontWeight: 700,
              color: "#1a0e00",
              background: "#f5c84a",
              padding: "3px 22px 5px 14px",
              clipPath: TAPE_CLIP,
              boxShadow: "3px 1px 5px rgba(0,0,0,0.35)",
              textTransform: "uppercase",
            }}>
              {title}
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: closeColor,
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "10px 12px 8px",
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: closeColor,
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </div>

        {/* Pinned footer */}
        {footer && (
          <div style={{ flexShrink: 0, padding: "16px 16px 20px" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
