"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { UserProfile } from "@/types";
import { SettingsForm } from "@/components/settings/settings-form";
import { cn } from "@/lib/utils";

export function SettingsDrawer({
  open,
  profile,
  onClose,
}: {
  open: boolean;
  profile: UserProfile;
  onClose: () => void;
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
          "absolute inset-y-0 left-0 h-full w-[90vw] max-w-none overflow-y-auto bg-[var(--app-bg)] p-4 shadow-2xl shadow-black/20 transition-transform duration-300 sm:w-[90vw] lg:w-[30vw]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-4 flex justify-start">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/80 text-[var(--ink)] shadow-lg shadow-black/10"
            aria-label="Close settings"
          >
            <X className="size-4" />
          </button>
        </div>
        <SettingsForm profile={profile} />
      </div>
    </div>
  );
}
