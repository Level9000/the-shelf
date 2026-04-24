"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  className,
  fullScreenOnMobile = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  fullScreenOnMobile?: boolean;
}) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-black/25 px-4 py-6 backdrop-blur-sm sm:items-center",
        fullScreenOnMobile && "items-stretch px-0 py-0 sm:px-4 sm:py-6",
      )}
    >
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        className={cn(
          "surface-card hairline relative z-10 w-full max-w-2xl rounded-[2rem] p-6",
          fullScreenOnMobile &&
            "min-h-full rounded-none p-5 sm:min-h-0 sm:rounded-[2rem] sm:p-6",
          className,
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full bg-black/5 text-[var(--muted)] transition hover:bg-black/8 hover:text-[var(--ink)]"
          aria-label="Close modal"
        >
          <X className="size-4" />
        </button>
        <div className="pr-10">
          <h2 className="text-xl font-semibold">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
