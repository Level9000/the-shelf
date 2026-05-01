"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function SideDrawer({
  open,
  title,
  description,
  onClose,
  side = "right",
  children,
  className,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  side?: "left" | "right";
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60]",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute inset-y-0 h-full w-[90vw] max-w-none overflow-y-auto bg-[var(--app-bg)] p-4 shadow-2xl shadow-black/20 transition-transform duration-300 sm:w-[90vw] lg:w-[30vw]",
          side === "left" && "left-0",
          side === "right" && "right-0",
          side === "left" && (open ? "translate-x-0" : "-translate-x-full"),
          side === "right" && (open ? "translate-x-0" : "translate-x-full"),
          className,
        )}
      >
        <div className={cn("mb-4 flex", side === "left" ? "justify-start" : "justify-end")}>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/80 text-[var(--ink)] shadow-lg shadow-black/10"
            aria-label="Close drawer"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
            ) : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
