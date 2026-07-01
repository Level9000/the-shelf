"use client";

import { useEffect, useState } from "react";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { TypewriterText } from "@/components/cass/CassSpeechBubble";
import { useTheme } from "@/lib/theme-context";

/**
 * Full-screen Cass loading state for route transitions that hit the server
 * (e.g. board <-> story tab switches, which each do their own data fetch).
 * Cass slides in from the bottom, settles center, then a typewriter line
 * plays underneath.
 */
export function CassLoadingScreen({
  message = "Hang tight while I get things ready.",
}: {
  message?: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "var(--app-bg)" }}
    >
      <div
        style={{
          transform: settled ? "translateY(0)" : "translateY(40px)",
          opacity: settled ? 1 : 0,
          transition: "transform 0.5s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease-out",
        }}
      >
        <CassRecorder animState="talking" size="md" />
      </div>

      <span
        className="mt-3"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: isDark ? "rgba(248,248,246,0.35)" : "rgba(26,14,0,0.35)",
          opacity: settled ? 1 : 0,
          transition: "opacity 0.4s ease-out 0.2s",
        }}
      >
        Cass · Story Guide
      </span>

      <div
        className="mt-5 max-w-xs px-6 text-center"
        style={{
          minHeight: "1.6em",
          opacity: settled ? 1 : 0,
          transition: "opacity 0.4s ease-out 0.3s",
        }}
      >
        <p
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "15px",
            lineHeight: 1.5,
            color: "var(--ink)",
          }}
        >
          {settled ? <TypewriterText text={message} speed={28} /> : null}
        </p>
      </div>
    </div>
  );
}
