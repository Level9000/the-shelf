import * as React from "react";
import { TapeButton } from "./tape-button";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  onClick,
  className,
  children,
}: ButtonProps) {
  return (
    <TapeButton
      variant={variant}
      size={size}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {children}
    </TapeButton>
  );
}
