"use client";

import { useRef } from "react";
import { useTheme } from "@/lib/theme-context";
import { TapeButton } from "@/components/ui/tape-button";

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
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(200,168,107,0.25)",
          borderRadius: "8px",
          padding: "14px 16px",
          fontFamily: "'Literata', Georgia, serif",
          fontSize: "14px",
          color: "#d4cec4",
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
      <TapeButton
        variant="primary"
        size="sm"
        onClick={onSubmit}
        disabled={isDisabled}
        className="self-end"
      >
        {submitLabel}
      </TapeButton>
    </div>
  );
}
