"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const NUDGE_KEY = "cass-nudge-last-shown";
const NUDGE_INTERVAL_MS = 3.5 * 24 * 60 * 60 * 1000;

export function OnboardingNudge({
  projectId,
  missingCount,
}: {
  projectId: string;
  missingCount: number;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (missingCount === 0) return;
    try {
      const last = localStorage.getItem(NUDGE_KEY);
      if (!last || Date.now() - parseInt(last) > NUDGE_INTERVAL_MS) {
        setVisible(true);
        localStorage.setItem(NUDGE_KEY, String(Date.now()));
      }
    } catch {
      // ignore
    }
  }, [missingCount]);

  if (!visible || dismissed || missingCount === 0) return null;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      background: "rgba(200,168,107,0.05)",
      border: "1px solid rgba(200,168,107,0.15)",
      borderRadius: "8px",
      padding: "10px 14px",
      marginBottom: "12px",
    }}>
      <span style={{
        fontFamily: "'Literata', Georgia, serif",
        fontSize: "13px",
        color: "rgba(212,206,196,0.6)",
        lineHeight: 1.5,
        flex: 1,
      }}>
        Cass is missing {missingCount} piece{missingCount > 1 ? "s" : ""} of your project story.{" "}
        <button
          type="button"
          onClick={() => router.push(`/projects/${projectId}/brief`)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontFamily: "'Literata', Georgia, serif",
            fontSize: "13px",
            color: "#c8a86b",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Fill in now
        </button>
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(200,168,107,0.3)",
          fontSize: "14px",
          lineHeight: 1,
          padding: "2px",
          fontFamily: "'Literata', Georgia, serif",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(200,168,107,0.6)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(200,168,107,0.3)"; }}
      >
        ✕
      </button>
    </div>
  );
}
