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
  fullScreen = false,
  progress,
  hideHeader = false,
  growWithContent = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  fullScreenOnMobile?: boolean;
  fullScreen?: boolean;
  /** 0–1 progress value. When set, shows a thin bar at the top of the modal panel. */
  progress?: number;
  /** When true, hides the title/description header so content starts immediately. */
  hideHeader?: boolean;
  /** When true, removes the fixed max-height so the modal grows with its content. */
  growWithContent?: boolean;
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
        "fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 py-6 backdrop-blur-sm",
        fullScreen && "items-stretch px-0 py-0 sm:px-0 sm:py-0",
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
          "surface-card hairline relative z-10 mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-[2rem]",
          !growWithContent && "max-h-[calc(100dvh-3rem)]",
          hideHeader ? "p-0" : "p-6",
          fullScreen &&
            "flex min-h-full max-w-none flex-col overflow-hidden rounded-none p-5 sm:p-6",
          fullScreenOnMobile &&
            "min-h-full max-h-full rounded-none p-5 sm:min-h-0 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[2rem] sm:p-6",
          className,
        )}
      >
        {progress !== undefined && (
          <div className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-[2rem] bg-black/8">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-700 ease-out"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex size-[34px] items-center justify-center rounded-[6px] border border-black/9 bg-black/4 text-[var(--muted)] transition hover:bg-black/8 hover:text-[var(--ink)]"
          aria-label="Close modal"
        >
          <X className="size-4" />
        </button>
        {!hideHeader && (
          <div className="pr-10 text-center">
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-cass)" }}>{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
            ) : null}
          </div>
        )}
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            !hideHeader && "mt-5",
            fullScreen && "flex min-h-0 flex-1 flex-col overflow-hidden",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
