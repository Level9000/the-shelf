"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { TapeButton } from "@/components/ui/tape-button";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { TypewriterRecorder } from "@/components/ui/TypewriterRecorder";

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
  "Unlimited chapters and projects",
  "Chapter kickoffs and retros",
  "Cass — your AI story guide",
  "Voice capture and brain dump",
  "Your full story, always accessible",
  "Invite authors and contributors",
];

// ── Alternating Cass / Ty pop-out ────────────────────────────────────────────

function CharacterPopout() {
  const [visible, setVisible]     = useState(false);
  const [isCass,  setIsCass]      = useState(true); // Cass goes first

  useEffect(() => {
    let currentIsCass = true;

    function cycle() {
      const slideIn = setTimeout(() => {
        // Step 1: mount the new character off-screen (visible=false)
        setIsCass(currentIsCass);

        // Step 2: after one frame, trigger the entry transition
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setVisible(true);
          });
        });

        const slideOut = setTimeout(() => {
          setVisible(false);
          // Flip for next cycle after slide-out completes
          currentIsCass = !currentIsCass;
        }, 3000);

        return slideOut;
      }, 600);

      return slideIn;
    }

    const first = cycle();
    const interval = setInterval(cycle, 15000);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  if (isCass) {
    return (
      <div
        className="absolute right-0 pointer-events-none"
        style={{
          top: "28%",
          marginTop: "-78px",
          transform: visible
            ? "translateX(30%) rotate(-30deg)"
            : "translateX(160%) rotate(-30deg)",
          transformOrigin: "bottom right",
          transition: "transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)",
          filter: "drop-shadow(0 0 14px rgba(200,168,107,0.55))",
        }}
      >
        <CassRecorder animState={visible ? "talking" : "idle"} size="sm" />
      </div>
    );
  }

  return (
    <div
      className="absolute left-0 pointer-events-none"
      style={{
        top: "28%",
        marginTop: "-60px",
        transform: visible
          ? "translateX(-30%) rotate(25deg)"
          : "translateX(-160%) rotate(25deg)",
        transformOrigin: "bottom left",
        transition: "transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)",
        filter: "drop-shadow(0 0 14px rgba(206,199,187,0.60))",
      }}
    >
      <TypewriterRecorder animState={visible ? "typing" : "idle"} size="sm" />
    </div>
  );
}

// ── PaywallModal ──────────────────────────────────────────────────────────────

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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-[2rem] bg-[var(--surface)] shadow-2xl ring-1 ring-black/8 overflow-hidden">

        {/* Alternating Cass / Ty pop-out */}
        <CharacterPopout />

        {/* Header */}
        <div className="bg-[var(--accent-soft)] px-7 pt-8 pb-6 text-center rounded-t-[2rem]">
          <h2 className="text-2xl font-bold text-[var(--ink)] font-literata">Your free trial is complete</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            You&apos;ve experienced the full Authored By story loop. To continue writing new content, select from one of our subscription offerings.
          </p>
        </div>

        <div className="px-7 py-6 space-y-6 rounded-b-[2rem] bg-[var(--surface)]">
          {/* Features */}
          <ul className="space-y-2 flex flex-col items-center">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-[var(--ink)] w-64">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)]">
                  <Check className="size-3 text-[var(--accent)]" />
                </div>
                {feature}
              </li>
            ))}
          </ul>

          {/* Plan selector */}
          <div className="flex flex-col gap-3 items-center">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative rounded-[1.4rem] p-4 text-center ring-1 transition w-[70%] overflow-hidden ${
                  selectedPlan === plan.id
                    ? "bg-[var(--accent-soft)] ring-[var(--accent)]/40"
                    : "bg-white/60 ring-black/8 hover:bg-white"
                }`}
              >
                {plan.highlight ? (
                  <span
                    className="absolute top-[18px] -right-[16px] whitespace-nowrap px-5 py-1 text-[10px] uppercase tracking-wider text-[#3a2a0a]"
                    style={{
                      fontFamily: "var(--font-cass)",
                      fontWeight: 700,
                      background: "#e8dfc0",
                      transform: "rotate(45deg)",
                      clipPath: "polygon(4px 0%, calc(100% - 4px) 0%, 100% 22%, calc(100% - 3px) 55%, 100% 78%, calc(100% - 4px) 100%, 4px 100%, 0% 72%, 3px 48%, 0% 22%)",
                    }}
                  >
                    Best value
                  </span>
                ) : null}
                <p className={`text-base font-bold font-literata ${selectedPlan === plan.id ? "text-[var(--ink)]" : "text-[#1a1a1a]"}`}>
                  {plan.label}
                </p>
                <p className={`mt-1 text-2xl font-bold ${selectedPlan === plan.id ? "text-[var(--ink)]" : "text-[#1a1a1a]"}`}>
                  {plan.price}
                  <span className={`text-sm font-normal ${selectedPlan === plan.id ? "text-[var(--muted)]" : "text-[#555]"}`}>{plan.period}</span>
                </p>
                <p className={`mt-1 text-xs ${selectedPlan === plan.id ? "text-[var(--muted)]" : "text-[#555]"}`}>{plan.description}</p>
              </button>
            ))}
          </div>

          {error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          ) : null}

          {/* CTA */}
          <div className="flex justify-center">
            <TapeButton
              variant="primary"
              size="lg"
              onClick={handleSubscribe}
              disabled={isPending}
              className="justify-center"
            >
              {isPending ? "Redirecting to checkout..." : `Start ${selectedPlan === "builderAnnual" ? "Annual" : "Monthly"} Subscription`}
            </TapeButton>
          </div>

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
