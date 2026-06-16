"use client";

import { useEffect, useState } from "react";
import { CassRecorder } from "./CassRecorder";

type Phase = "entering" | "visible" | "exiting";

export function CassFirstChapterIntro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("entering");

  // Play pre-recorded intro audio when Cass slides in
  useEffect(() => {
    if (phase !== "entering") return;
    const audio = new Audio("/audio/cass-chapter-intro.mp3");
    audio.play().catch(() => {}); // silent fail if file not yet present
    return () => { audio.pause(); };
  }, [phase]);

  // After exit animation, hand off to the board
  useEffect(() => {
    if (phase !== "exiting") return;
    const t = setTimeout(onComplete, 850);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  function handleContinue() {
    setPhase("exiting");
  }

  const cassStyle: React.CSSProperties =
    phase === "entering"
      ? { animation: "cass-intro-enter 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards" }
      : phase === "exiting"
      ? { animation: "cass-intro-exit 0.8s cubic-bezier(0.64, 0, 0.78, 0) forwards" }
      : {};

  return (
    <>
      <style>{`
        @keyframes cass-intro-enter {
          from { transform: translateX(110vw); }
          to   { transform: translateX(0); }
        }
        @keyframes cass-intro-exit {
          from { transform: translateX(0); }
          to   { transform: translateX(-110vw); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(8, 8, 8, 0.94)",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: phase === "exiting" ? 0 : 1,
          transition: phase === "exiting" ? "opacity 0.55s ease 0.3s" : "none",
          pointerEvents: phase === "exiting" ? "none" : "auto",
        }}
      >
        {/* Cass + message — moves together */}
        <div
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: "32px", padding: "0 32px", maxWidth: "400px", width: "100%",
            ...cassStyle,
          }}
        >
          <CassRecorder animState="talking" size="lg" />

          <div style={{ textAlign: "center" }}>
              <p style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "17px", lineHeight: "1.7",
                color: "#f8f8f6", margin: "0 0 28px",
              }}>
                Your board is almost ready. When it is, you can add tasks by hitting the plus button. We&apos;ll capture the story for you as you build.
              </p>
              <button
                type="button"
                onClick={handleContinue}
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "15px", fontWeight: 700,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  background: "#f5c84a", color: "#1a0e00",
                  border: "none", borderRadius: "28px",
                  padding: "13px 36px", cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f0c040"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#f5c84a"; }}
              >
                Got it →
              </button>
          </div>
        </div>
      </div>
    </>
  );
}
