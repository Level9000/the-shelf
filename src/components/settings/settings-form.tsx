"use client";

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import type { UserProfile } from "@/types";
import { updateUserProfileAction } from "@/lib/actions/profile-actions";
import { TapeButton } from "@/components/ui/tape-button";
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
      {/* Section header — matches DrawerSection style */}
      <div style={{ padding: "20px 16px 8px" }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: isDark ? "rgba(245,200,74,0.45)" : "rgba(160,100,10,0.55)",
        }}>
          Profile
        </span>
      </div>

      <div style={{ padding: "6px 16px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div>
          <label style={{
            display: "block",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: isDark ? "rgba(248,248,246,0.35)" : "rgba(26,14,0,0.4)",
            marginBottom: "6px",
          }}>
            Display name
          </label>
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
                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                border: `1px solid ${isDirty ? (isDark ? "rgba(245,200,74,0.4)" : "rgba(160,100,10,0.4)") : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)")}`,
                borderRadius: "8px",
                padding: "9px 58px 9px 12px",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "13px",
                color: isDark ? "rgba(248,248,246,0.85)" : "rgba(26,14,0,0.85)",
                caretColor: isDark ? "#f5c84a" : "#8b5e0a",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                if (!isDirty) e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";
              }}
              onBlur={(e) => {
                if (!isDirty) e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";
              }}
            />
            {(isDirty || isPending) && (
              <div style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)" }}>
                <TapeButton
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                >
                  {isPending ? <LoaderCircle size={11} style={{ animation: "spin 1s linear infinite" }} /> : null}
                  {isPending ? "Saving…" : "Save"}
                </TapeButton>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "#f87171", margin: 0 }}>{error}</p>
        )}
        {success && (
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "12px", color: "rgba(110,231,183,0.8)", margin: 0 }}>{success}</p>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
