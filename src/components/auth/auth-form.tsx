"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import type { FormState } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: FormState = {};

export function AuthForm({
  title,
  subtitle,
  submitLabel,
  secondaryHref,
  secondaryLabel,
  secondaryPrompt,
  action,
  nextPath,
}: {
  title: string;
  subtitle: string;
  submitLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  secondaryPrompt: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  nextPath?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="surface hairline grid min-h-screen grid-cols-1 overflow-hidden lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_45%),linear-gradient(180deg,_rgba(47,111,103,0.94),_rgba(24,68,63,0.96))] p-10 text-white lg:flex lg:flex-col">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-medium backdrop-blur-sm">
          <Sparkles className="size-4" />
          Shelf
        </div>
        <div className="mt-auto max-w-xl">
          <p className="text-sm uppercase tracking-[0.25em] text-white/60">
            Spoken thoughts into organized motion
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.02] text-balance">
            Talk it out. Watch the board fill itself in.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/78">
            Shelf is a voice-first AI kanban experience for people who think out
            loud and want their next actions captured without friction.
          </p>
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md rounded-[2rem] border border-black/6 bg-white/88 p-8 shadow-2xl shadow-black/5 backdrop-blur-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)] lg:hidden">
            <Sparkles className="size-3.5" />
            Shelf
          </div>
          <div className="mt-6">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {subtitle}
            </p>
          </div>
          <form action={formAction} className="mt-8 space-y-4">
            <input type="hidden" name="next" value={nextPath ?? "/projects"} />
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--ink)]">
                Email
              </label>
              <Input name="email" type="email" placeholder="you@company.com" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--ink)]">
                Password
              </label>
              <Input
                name="password"
                type="password"
                placeholder="At least 8 characters"
                required
              />
            </div>
            {state.error ? (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {state.error}
              </p>
            ) : null}
            <Button className="w-full" type="submit" disabled={pending}>
              {pending ? "Working..." : submitLabel}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </form>
          <p className="mt-6 text-sm text-[var(--muted)]">
            {secondaryPrompt}{" "}
            <Link className="font-semibold text-[var(--ink)]" href={secondaryHref}>
              {secondaryLabel}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
