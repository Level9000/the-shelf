"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
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

  const loginWidget = (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{subtitle}</p>
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
          <Input name="password" type="password" placeholder="At least 8 characters" required />
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
  );

  return (
    <div className="flex min-h-screen bg-white lg:items-center lg:justify-center lg:p-8">

      {/* Card */}
      <div className="relative w-full overflow-hidden lg:max-w-6xl lg:rounded-[3rem] lg:border lg:border-black/10 lg:shadow-2xl lg:shadow-black/20 lg:grid lg:grid-cols-2 lg:min-h-[680px]">

        {/* Left panel — cassette hero */}
        <div className="flex flex-col items-center justify-center bg-white px-8 py-12 sm:px-12">

          {/* Cassette image */}
          <Image
            src="/icons/authored_by_transparent.png"
            alt="Authored By"
            width={440}
            height={330}
            className="w-full max-w-[340px] lg:max-w-[400px] h-auto"
            priority
          />

          {/* Tagline — desktop only */}
          <p className="mt-6 hidden text-center text-sm leading-relaxed text-[var(--muted)] lg:block">
            Helping you tell your founders story, while you build.
          </p>

          {/* Login form — mobile only */}
          <div className="mt-10 w-full lg:hidden">
            {loginWidget}
          </div>
        </div>

        {/* Right panel — login form, desktop only */}
        <div className="hidden items-center justify-center border-l border-black/6 bg-white px-12 py-16 lg:flex">
          {loginWidget}
        </div>

      </div>
    </div>
  );
}
