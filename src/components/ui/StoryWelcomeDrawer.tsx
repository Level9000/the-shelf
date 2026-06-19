"use client";

import { useEffect, useState } from "react";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { TypewriterRecorder } from "@/components/ui/TypewriterRecorder";

export function StoryWelcomeDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Ty slides in after a short delay once the drawer is open
  const [tyVisible, setTyVisible] = useState(false);

  useEffect(() => {
    if (!open) { setTyVisible(false); return; }
    const t = setTimeout(() => setTyVisible(true), 600);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <>
      <style>{`
        @keyframes storyDrawerTySlideIn {
          from { opacity: 0; transform: translateX(32px) scale(0.88); }
          to   { opacity: 0.75; transform: translateX(0) scale(0.82); }
        }
        @keyframes storyDrawerFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 lg:hidden"
        style={{
          background: "rgba(0,0,0,0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
        onClick={onClose}
      />

      {/* Drawer panel — identical shell to cass-board-drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col lg:w-[38%] lg:min-w-[420px]"
        style={{
          background: "#0a0a0a",
          backgroundImage:
            "radial-gradient(ellipse at 20% 50%, rgba(200,168,107,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(42,107,58,0.05) 0%, transparent 50%)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: open ? "-8px 0 40px rgba(0,0,0,0.4)" : "none",
        }}
        aria-hidden={!open}
      >
        {/* Authored By header */}
        <div style={{
          background: "#0a0a0a", borderBottom: "1px solid #1e1e1e",
          padding: "8px 16px", display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <img
            src="/icons/authored-by-tape-icon.png"
            alt="Authored By"
            style={{ width: "auto", height: "52px", objectFit: "contain" }}
          />
        </div>
        <div style={{
          background: "#242424", padding: "6px 16px",
          display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(248,248,246,0.25)",
          }}>
            Onboarding
          </span>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "32px 16px 40px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "24px",
          maxWidth: "600px", width: "100%", margin: "0 auto",
          boxSizing: "border-box",
          scrollbarWidth: "none",
        }}>

          {/* Cass + Ty duo — matches slide 4 of onboarding */}
          <div style={{
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            gap: "32px", padding: "8px 0 4px", width: "100%",
          }}>
            {/* Cass — front and center */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.7))",
              animation: open ? "storyDrawerFadeUp 0.35s ease forwards" : "none",
            }}>
              <CassRecorder animState="talking" size="sm" />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(248,248,246,0.65)",
              }}>Cass</span>
            </div>

            {/* Ty — slides in from the right after delay */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
              transform: "scale(0.82) translateY(4px)",
              transformOrigin: "bottom center",
              opacity: tyVisible ? 0.75 : 0,
              filter: "brightness(0.8)",
              animation: tyVisible ? "storyDrawerTySlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards" : "none",
            }}>
              <TypewriterRecorder animState="typing" size="sm" />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: "10px", fontWeight: 600,
                letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(248,248,246,0.4)",
              }}>Ty</span>
            </div>
          </div>

          {/* Message — plain text, no bubble */}
          <div style={{
            maxWidth: "85%", width: "100%",
            animation: "storyDrawerFadeUp 0.35s ease 0.15s both",
          }}>
            <p style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "15px", lineHeight: "1.65",
              color: "#f8f8f6", margin: 0,
            }}>
              Welcome to the story tab. Here you can read the story we&apos;ve captured so far, including every chat you&apos;ve had along the way.
            </p>
            <p style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "15px", lineHeight: "1.65",
              color: "#f8f8f6", margin: "18px 0 0",
            }}>
              When you are ready to share something with the world, click the share button in the corner and I&apos;ll have Ty craft the perfect narrative for your audience.
            </p>
          </div>

          {/* Got it chip */}
          <div style={{ animation: "storyDrawerFadeUp 0.35s ease 0.5s both" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: "inline-flex", alignItems: "center",
                background: "#f5c84a",
                border: "1px solid #f5c84a",
                borderRadius: "28px", padding: "12px 28px",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "15px", fontWeight: 600, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "#1a0e00", cursor: "pointer",
                transition: "background 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f0c040"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f5c84a"; }}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
