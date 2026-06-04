"use client";

import { useRef } from "react";
import { useTheme } from "@/lib/theme-context";

export function CassInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Tell me anything. A sentence is fine.",
  submitLabel = "SUBMIT",
  disabled = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  submitLabel?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const ref = useRef<HTMLTextAreaElement>(null);

  const isDisabled = disabled || !value.trim();

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        style={{
          width: "100%",
          background: isDark ? "rgba(255,255,255,0.05)" : "var(--surface-muted, rgba(0,0,0,0.04))",
          border: "1px solid rgba(200,168,107,0.25)",
          borderRadius: "8px",
          padding: "14px 16px",
          fontFamily: "'Literata', Georgia, serif",
          fontSize: "14px",
          color: isDark ? "#d4cec4" : "var(--ink)",
          outline: "none",
          resize: "none",
          minHeight: "70px",
          lineHeight: "1.5",
          transition: "border-color 0.2s",
          caretColor: "#c8a86b",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(200,168,107,0.5)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "rgba(200,168,107,0.25)";
        }}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={isDisabled}
        style={{
          alignSelf: "flex-end",
          background: isDisabled
            ? (isDark ? "#333" : "rgba(0,0,0,0.10)")
            : "#c8a86b",
          color: isDisabled
            ? "var(--muted)"
            : "#0a0a0a",
          border: "none",
          borderRadius: "6px",
          padding: "10px 22px",
          fontFamily: "var(--font-cass)",
          fontSize: "13px",
          letterSpacing: "1px",
          cursor: isDisabled ? "default" : "pointer",
          transition: "background 0.2s, transform 0.1s",
        }}
        onMouseEnter={(e) => {
          if (!isDisabled) e.currentTarget.style.background = "#d9bb7e";
        }}
        onMouseLeave={(e) => {
          if (!isDisabled) e.currentTarget.style.background = "#c8a86b";
        }}
        onMouseDown={(e) => {
          if (!disabled && value.trim()) e.currentTarget.style.transform = "scale(0.97)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {submitLabel}
      </button>
    </div>
  );
}
