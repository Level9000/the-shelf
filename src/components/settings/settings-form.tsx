"use client";

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import type { UserProfile } from "@/types";
import { updateUserProfileAction } from "@/lib/actions/profile-actions";
import { useTheme } from "@/lib/theme-context";


export function SettingsForm({ profile }: { profile: UserProfile }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const savedName = profile.displayName ?? "";
  const isDirty = displayName.trim() !== savedName && displayName.trim().length > 0;

  // Theme-aware styles
  const labelColor = isDark ? "rgba(232,223,192,0.45)" : "rgba(26,14,0,0.45)";
  const inputBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(26,14,0,0.03)";
  const inputColor = isDark ? "rgba(232,223,192,0.85)" : "rgba(26,14,0,0.85)";
  const inputBorderNormal = isDark ? "rgba(232,223,192,0.15)" : "rgba(26,14,0,0.15)";
  const inputBorderDirty = isDark ? "rgba(245,200,74,0.45)" : "rgba(200,120,0,0.45)";
  const inputBorderFocus = isDark ? "rgba(232,223,192,0.3)" : "rgba(26,14,0,0.3)";
  const successColor = isDark ? "rgba(74,222,128,0.8)" : "rgba(22,163,74,0.9)";

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "Verdana, Geneva, sans-serif",
    fontSize: "11px",
    color: labelColor,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "6px",
  };

  function handleSave() {
    if (!isDirty || isPending) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await updateUserProfileAction({ displayName });
        setSuccess("Saved.");
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to update profile.");
      }
    });
  }

  return (
    <div>
      {/* Profile section heading */}
      <div style={{ padding: "18px 16px 6px" }}>
        <span style={{
          fontFamily: "'Literata', Georgia, serif",
          fontSize: "17px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
        }}>
          Profile
        </span>
      </div>

      <div style={{ padding: "10px 16px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Display name with inline save button */}
        <div>
          <label style={labelStyle}>Display name</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setSuccess(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              placeholder="Alex Morgan"
              maxLength={80}
              style={{
                width: "100%",
                background: inputBg,
                border: `1px solid ${isDirty ? inputBorderDirty : inputBorderNormal}`,
                borderRadius: "8px",
                padding: "9px 58px 9px 12px",
                fontFamily: "Verdana, Geneva, sans-serif",
                fontSize: "13px",
                color: inputColor,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                if (!isDirty) e.currentTarget.style.borderColor = inputBorderFocus;
              }}
              onBlur={(e) => {
                if (!isDirty) e.currentTarget.style.borderColor = inputBorderNormal;
              }}
            />
            {(isDirty || isPending) && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                aria-label="Save display name"
                style={{
                  position: "absolute",
                  right: "6px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "linear-gradient(135deg, #f5c84a, #d4a820)",
                  border: "none",
                  cursor: isPending ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontFamily: "Verdana, Geneva, sans-serif",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#1a0e00",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.15s",
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                {isPending ? <LoaderCircle size={11} style={{ animation: "spin 1s linear infinite" }} /> : null}
                {isPending ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </div>

        {error && (
          <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "12px", color: "#f87171", margin: 0 }}>{error}</p>
        )}
        {success && (
          <p style={{ fontFamily: "Verdana, Geneva, sans-serif", fontSize: "12px", color: successColor, margin: 0 }}>{success}</p>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
