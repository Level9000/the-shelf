"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CassRecorder } from "./CassRecorder";

const REMINDER_KEY = "cass-reminder-last-shown";
const REMINDER_INTERVAL_MS = 3.5 * 24 * 60 * 60 * 1000; // 3.5 days

type MissingField = {
  label: string;
  field: string;
};

export function OnboardingReminderBanner({
  projectId,
  missingFields,
}: {
  projectId: string;
  missingFields: MissingField[];
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (missingFields.length === 0) return;
    try {
      const last = localStorage.getItem(REMINDER_KEY);
      if (!last || Date.now() - parseInt(last) > REMINDER_INTERVAL_MS) {
        setVisible(true);
        localStorage.setItem(REMINDER_KEY, String(Date.now()));
      }
    } catch {
      // localStorage unavailable
    }
  }, [missingFields.length]);

  if (!visible || dismissed || missingFields.length === 0) return null;

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "14px",
      background: "rgba(200,168,107,0.06)",
      border: "1px solid rgba(200,168,107,0.2)",
      borderRadius: "12px",
      padding: "16px 18px",
      margin: "0 0 16px",
      position: "relative",
    }}>
      <div style={{ flexShrink: 0, marginTop: "2px" }}>
        <CassRecorder animState="talking" size="sm" />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{
          fontFamily: "'Literata', Georgia, serif",
          fontSize: "14px",
          lineHeight: 1.6,
          color: "#d4cec4",
          margin: "0 0 6px",
        }}>
          Hey — your project brief is still missing a few pieces. The more context I have, the better I can capture your story.
        </p>
        <p style={{
          fontFamily: "var(--font-cass)",
          fontSize: "10px",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: "rgba(200,168,107,0.5)",
          margin: "0 0 12px",
        }}>
          Missing: {missingFields.map((f) => f.label).join(" · ")}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/projects/${projectId}/brief`)}
          style={{
            background: "#c8a86b",
            color: "#1a0e00",
            fontFamily: "'Literata', Georgia, serif",
            fontSize: "13px",
            fontWeight: 600,
            padding: "7px 16px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Fill in now →
        </button>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(200,168,107,0.3)",
          fontSize: "16px",
          lineHeight: 1,
          padding: "2px",
          fontFamily: "'Literata', Georgia, serif",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(200,168,107,0.7)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(200,168,107,0.3)"; }}
      >
        ✕
      </button>
    </div>
  );
}
