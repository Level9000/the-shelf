"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { acceptTermsAction } from "./actions";

export function TermsConsentForm() {
  const [accepted, setAccepted] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      setShowError(true);
      return;
    }
    startTransition(async () => {
      await acceptTermsAction();
    });
  }

  const btnBase: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "14px 24px",
    borderRadius: "50px",
    fontSize: "16px",
    fontWeight: 600,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    cursor: accepted ? "pointer" : "not-allowed",
    border: "1.5px solid rgba(255, 255, 255, 0.18)",
    background: "rgba(255, 255, 255, 0.08)",
    color: accepted ? "#fff" : "rgba(255,255,255,0.35)",
    transition: "background 0.15s, border-color 0.15s",
    boxShadow: "none",
    opacity: isPending ? 0.6 : 1,
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>

      <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => {
            setAccepted(e.target.checked);
            if (e.target.checked) setShowError(false);
          }}
          style={{ marginTop: "2px", accentColor: "#c8a86b", flexShrink: 0 }}
        />
        <span style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: "12px",
          color: "rgba(255, 255, 255, 0.42)",
          lineHeight: 1.5,
        }}>
          I agree to the{" "}
          <Link href="/terms" target="_blank" style={{ color: "rgba(255,255,255,0.65)", textDecoration: "underline" }}>Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" target="_blank" style={{ color: "rgba(255,255,255,0.65)", textDecoration: "underline" }}>Privacy Policy</Link>
        </span>
      </label>

      {showError && (
        <p style={{
          borderRadius: "12px",
          background: "rgba(255, 80, 60, 0.1)",
          border: "1px solid rgba(255, 80, 60, 0.28)",
          padding: "10px 14px",
          fontSize: "13px",
          color: "#ff6b5b",
          margin: 0,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          textAlign: "center",
        }}>
          Please agree to the terms before continuing.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !accepted}
        style={btnBase}
        onMouseEnter={(e) => {
          if (accepted) {
            e.currentTarget.style.background = "rgba(255,255,255,0.14)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.32)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
        }}
      >
        {isPending ? "Saving..." : "Continue to Authored By"}
      </button>

    </form>
  );
}
