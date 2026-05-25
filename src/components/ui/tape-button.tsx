"use client";

import { useState } from "react";

// Both-edge torn tape — used for full button shapes
const TAPE_CLIP = "polygon(3px 0%, calc(100% - 2px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 2px) 100%, 3px 100%, 0% 72%, 2px 48%, 0% 22%)";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT_STYLES: Record<Variant, {
  bg: string;
  color: string;
  hoverShadow: string;
  baseShadow: string;
}> = {
  primary: {
    bg: "#f5c84a",
    color: "#1a0e00",
    hoverShadow: "0 0 30px rgba(245,200,74,0.75), 0 8px 24px rgba(0,0,0,0.5)",
    baseShadow: "0 2px 8px rgba(0,0,0,0.3)",
  },
  secondary: {
    bg: "#e8dfc0",
    color: "#3a2a0a",
    hoverShadow: "0 0 28px rgba(245,200,74,0.6), 0 8px 24px rgba(0,0,0,0.45)",
    baseShadow: "0 2px 8px rgba(0,0,0,0.25)",
  },
  danger: {
    bg: "#8b2020",
    color: "#ffd8d8",
    hoverShadow: "0 0 26px rgba(248,113,113,0.65), 0 8px 24px rgba(0,0,0,0.5)",
    baseShadow: "0 2px 8px rgba(0,0,0,0.35)",
  },
  ghost: {
    bg: "transparent",
    color: "#f5c84a",
    hoverShadow: "none",
    baseShadow: "none",
  },
};

const SIZE_STYLES: Record<Size, { fontSize: string; padding: string }> = {
  sm: { fontSize: "16px", padding: "4px 18px 6px" },
  md: { fontSize: "20px", padding: "6px 26px 8px" },
  lg: { fontSize: "24px", padding: "8px 36px 11px" },
};

export function TapeButton({
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  type = "button",
  children,
  className,
}: {
  variant?: Variant;
  size?: Size;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  children: React.ReactNode;
  className?: string;
}) {
  const [hover, setHover] = useState(false);
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];

  if (variant === "ghost") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={className}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          fontFamily: "'Caveat', cursive",
          fontSize: s.fontSize,
          fontWeight: 700,
          color: hover ? "#f5c84a" : "rgba(245,200,74,0.65)",
          background: "none",
          border: "none",
          borderBottom: `2px solid ${hover ? "#f5c84a" : "rgba(245,200,74,0.4)"}`,
          cursor: disabled ? "not-allowed" : "pointer",
          padding: "2px 2px 1px",
          opacity: disabled ? 0.4 : 1,
          lineHeight: 1.2,
          transition: "color 0.15s, border-color 0.15s",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontFamily: "'Caveat', cursive",
        fontSize: s.fontSize,
        fontWeight: 700,
        color: v.color,
        background: v.bg,
        padding: s.padding,
        clipPath: TAPE_CLIP,
        boxShadow: hover && !disabled ? v.hoverShadow : v.baseShadow,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        textTransform: "uppercase",
        opacity: disabled ? 0.45 : 1,
        transform: hover && !disabled ? "translateY(-2px)" : "translateY(0)",
        transition: "box-shadow 0.2s, transform 0.15s",
        whiteSpace: "nowrap",
        letterSpacing: "0.01em",
      }}
    >
      {children}
    </button>
  );
}
