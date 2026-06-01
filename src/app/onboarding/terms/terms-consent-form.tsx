"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { acceptTermsAction } from "./actions";
import { TapeButton } from "@/components/ui/tape-button";

export function TermsConsentForm() {
  const [accepted, setAccepted] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      setShowError(true);
      return;
    }
    startTransition(async () => {
      await acceptTermsAction();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => {
            setAccepted(e.target.checked);
            if (e.target.checked) setShowError(false);
          }}
          className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 accent-zinc-900"
        />
        <span className="text-sm leading-snug text-zinc-600">
          I agree to the{" "}
          <Link
            href="/terms"
            target="_blank"
            className="font-medium text-zinc-900 underline underline-offset-2"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="font-medium text-zinc-900 underline underline-offset-2"
          >
            Privacy Policy
          </Link>
        </span>
      </label>

      {showError && (
        <p className="text-xs text-rose-600">
          Please agree to the terms before continuing.
        </p>
      )}

      <TapeButton
        variant="primary"
        size="md"
        type="submit"
        disabled={isPending || !accepted}
        className="w-full justify-center"
      >
        {isPending ? "Saving..." : "Continue to Authored By"}
      </TapeButton>
    </form>
  );
}
