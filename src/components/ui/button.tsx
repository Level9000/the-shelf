import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-[var(--ink)] text-white shadow-lg shadow-black/10 hover:-translate-y-0.5 hover:bg-black",
        variant === "secondary" &&
          "bg-white/80 text-[var(--ink)] ring-1 ring-black/8 hover:bg-white",
        variant === "ghost" &&
          "bg-transparent text-[var(--muted)] hover:bg-white/60 hover:text-[var(--ink)]",
        variant === "danger" &&
          "bg-[var(--danger)] text-white hover:bg-[#8b372f]",
        className,
      )}
      {...props}
    />
  );
}
