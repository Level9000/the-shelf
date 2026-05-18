"use client";

import { useEffect, useRef, useState } from "react";

// ── TypewriterText ─────────────────────────────────────────────────────────────

export function TypewriterText({
  text,
  onComplete,
  speed = 26,
}: {
  text: string;
  onComplete?: () => void;
  speed?: number;
}) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const idx = useRef(0);
  // Reset when text changes
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
    setDisplayed("");
    setDone(false);
    idx.current = 0;

    const interval = setInterval(() => {
      if (idx.current < textRef.current.length) {
        setDisplayed(textRef.current.slice(0, idx.current + 1));
        idx.current++;
      } else {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && (
        <span
          style={{
            display: "inline-block",
            color: "#c8a86b",
            animation: "cass-blink 0.7s step-end infinite",
            marginLeft: "2px",
          }}
        >
          ▌
        </span>
      )}
    </span>
  );
}

// ── CassSpeechBubble ──────────────────────────────────────────────────────────

export function CassSpeechBubble({
  text,
  onComplete,
  speed,
  animate = true,
}: {
  text: string;
  onComplete?: () => void;
  speed?: number;
  animate?: boolean;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(200,168,107,0.15)",
        borderRadius: "12px",
        padding: "20px 24px",
        width: "100%",
        minHeight: "64px",
        display: "flex",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* Upward notch */}
      <div
        style={{
          position: "absolute",
          top: "-8px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "14px",
          height: "8px",
          background: "#0a0a0a",
          borderLeft: "1px solid rgba(200,168,107,0.15)",
          borderRight: "1px solid rgba(200,168,107,0.15)",
          borderTop: "1px solid rgba(200,168,107,0.15)",
          clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        }}
      />
      <p
        style={{
          fontFamily: "'Special Elite', cursive",
          fontSize: "17px",
          lineHeight: "1.55",
          color: "#e8e0d0",
          letterSpacing: "0.01em",
          margin: 0,
        }}
      >
        {animate ? (
          <TypewriterText text={text} onComplete={onComplete} speed={speed} />
        ) : (
          text
        )}
      </p>
    </div>
  );
}
