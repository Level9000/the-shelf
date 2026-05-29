"use client";

import { useState, useTransition } from "react";
import { BookOpen, Check, Sparkles, X } from "lucide-react";

const PLANS = [
  {
    id: "builderMonthly" as const,
    label: "Builder Monthly",
    price: "$12",
    period: "/month",
    description: "Full access, billed monthly.",
  },
  {
    id: "builderAnnual" as const,
    label: "Builder Annual",
    price: "$99",
    period: "/year",
    description: "Save 30% — billed once a year.",
    highlight: true,
  },
];

const FEATURES = [
  "Unlimited tracks and projects",
  "Chapter kickoffs and retros",
  "Cass — your AI story guide",
  "Voice capture and brain dump",
  "Your full story, always accessible",
  "Invite authors and contributors",
];

export function PaywallModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<"builderMonthly" | "builderAnnual">("builderAnnual");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: selectedPlan }),
        });
        const data = await res.json() as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          setError(data.error ?? "Something went wrong. Please try again.");
          return;
        }
        window.location.href = data.url;
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — not dismissible, this is a hard gate */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-lg rounded-[2rem] bg-[var(--surface)] shadow-2xl ring-1 ring-black/8 overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--accent-soft)] px-7 pt-8 pb-6 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/20">
            <BookOpen className="size-7 text-[var(--accent)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--ink)]">Your free trial is complete</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            You&apos;ve experienced the full Authored By story loop. Subscribe to keep writing your story.
          </p>
        </div>

        <div className="px-7 py-6 space-y-6">
          {/* Features */}
          <ul className="space-y-2">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-[var(--ink)]">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)]">
                  <Check className="size-3 text-[var(--accent)]" />
                </div>
                {feature}
              </li>
            ))}
          </ul>

          {/* Plan selector */}
          <div className="grid grid-cols-2 gap-3">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative rounded-[1.4rem] p-4 text-left ring-1 transition ${
                  selectedPlan === plan.id
                    ? "bg-[var(--accent-soft)] ring-[var(--accent)]/40"
                    : "bg-white/60 ring-black/8 hover:bg-white"
                }`}
              >
                {plan.highlight ? (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Best value
                  </span>
                ) : null}
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {plan.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-[var(--ink)]">
                  {plan.price}
                  <span className="text-sm font-normal text-[var(--muted)]">{plan.period}</span>
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">{plan.description}</p>
              </button>
            ))}
          </div>

          {error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          ) : null}

          {/* CTA */}
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-[1.4rem] bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            <Sparkles className="size-4" />
            {isPending ? "Redirecting to checkout..." : "Start subscription"}
          </button>

          {/* View-only escape hatch */}
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)] transition"
          >
            <X className="size-3" />
            View completed work only
          </button>
        </div>
      </div>
    </div>
  );
}
