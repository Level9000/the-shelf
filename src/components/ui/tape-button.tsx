"use client";

import { useState } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT_STYLES: Record<Variant, {
  bg: string;
  color: string;
  border: string;
  hoverBg: string;
  hoverBorder: string;
  hoverShadow: string;
}> = {
  primary: {
    bg: "#c8a86b",
    color: "#1a0e00",
    border: "1px solid #c8a86b",
    hoverBg: "#d9bb7e",
    hoverBorder: "1px solid #d9bb7e",
    hoverShadow: "0 4px 16px rgba(200,168,107,0.35)",
  },
  secondary: {
    bg: "transparent",
    color: "#c8a86b",
    border: "1px solid rgba(200,168,107,0.4)",
    hoverBg: "rgba(200,168,107,0.08)",
    hoverBorder: "1px solid #c8a86b",
    hoverShadow: "0 4px 12px rgba(0,0,0,0.2)",
  },
  danger: {
    bg: "transparent",
    color: "#f87171",
    border: "1px solid rgba(248,113,113,0.35)",
    hoverBg: "rgba(248,113,113,0.08)",
    hoverBorder: "1px solid rgba(248,113,113,0.7)",
    hoverShadow: "0 4px 12px rgba(0,0,0,0.2)",
  },
  ghost: {
    bg: "transparent",
    color: "rgba(200,168,107,0.6)",
    border: "1px solid transparent",
    hoverBg: "transparent",
    hoverBorder: "1px solid transparent",
    hoverShadow: "none",
  },
};

const SIZE_STYLES: Record<Size, { fontSize: string; padding: string; borderRadius: string }> = {
  sm: { fontSize: "13px", padding: "7px 16px",  borderRadius: "8px"  },
  md: { fontSize: "15px", padding: "10px 22px", borderRadius: "10px" },
  lg: { fontSize: "17px", padding: "13px 30px", borderRadius: "12px" },
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

  const isGhost = variant === "ghost";

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
        gap: "6px",
        fontFamily: "'Literata', Georgia, serif",
        fontSize: s.fontSize,
        fontWeight: 600,
        color: isGhost
          ? hover ? "rgba(200,168,107,0.9)" : v.color
          : v.color,
        background: hover && !disabled ? v.hoverBg : v.bg,
        border: hover && !disabled ? v.hoverBorder : v.border,
        borderRadius: isGhost ? "0" : s.borderRadius,
        padding: isGhost ? "2px 0" : s.padding,
        boxShadow: hover && !disabled ? v.hoverShadow : "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transform: hover && !disabled && !isGhost ? "translateY(-1px)" : "translateY(0)",
        transition: "background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, transform 0.15s",
        whiteSpace: "nowrap",
        letterSpacing: "0.01em",
        textDecoration: "none",
      }}
    >
      {children}
    </button>
  );
}
