"use client";

import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import type { FormState } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const literata = localFont({
  src: "../../../public/fonts/Literata.ttf",
});

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
      {/* Mobile header — hero text with highlights replaces title/subtitle */}
      <div className="mb-6 lg:hidden" style={{ fontFamily: literata.style.fontFamily }}>
        <h1 className="text-3xl font-bold leading-[1.35]">
          <span className="box-decoration-clone bg-[#fef9c3] px-2 py-0.5">
            Welcome to Authored By.
          </span>
        </h1>
        <p className="mt-3 text-base font-medium leading-[1.4]">
          <span className="box-decoration-clone bg-black px-2 py-0.5 text-white">
            Helping you tell your founders story, while you build.
          </span>
        </p>
      </div>
      {/* Desktop header */}
      <h1 className="hidden text-3xl font-semibold tracking-tight lg:block">{title}</h1>
      <p className="mt-2 hidden text-sm leading-6 text-[var(--muted)] lg:block">{subtitle}</p>
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
    <div className="flex min-h-screen bg-neutral-100 lg:items-center lg:justify-center lg:p-8">

      {/* Card */}
      <div className="relative w-full overflow-hidden lg:max-w-6xl lg:rounded-[3rem] lg:border lg:border-black/10 lg:shadow-2xl lg:shadow-black/20 lg:grid lg:grid-cols-2 lg:min-h-[680px]">

        {/* Hero panel — full screen on mobile (with login widget inside), left half on desktop */}
        <div className="relative flex min-h-screen flex-col px-8 py-10 sm:px-12 sm:py-12 lg:min-h-0">
          <Image
            src="/images/paper.png"
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-top"
            priority
          />

          {/* Login form floats in the middle on mobile only */}
          <div className="relative flex flex-1 items-center justify-center lg:hidden">
            <div className="w-full rounded-[1.5rem] bg-white/92 p-7 shadow-xl backdrop-blur-md">
              {loginWidget}
            </div>
          </div>

          {/* Hero text — desktop only, pinned to bottom */}
          <div className="relative hidden lg:block">
            <h1
              className="text-3xl font-bold leading-[1.35] sm:text-4xl lg:text-5xl"
              style={{ fontFamily: literata.style.fontFamily }}
            >
              <span className="box-decoration-clone bg-white px-2 py-0.5">
                Welcome to Authored By.
              </span>
            </h1>
            <p
              className="mt-3 text-base font-medium leading-[1.4] sm:text-xl"
              style={{ fontFamily: literata.style.fontFamily }}
            >
              <span className="box-decoration-clone bg-black px-2 py-0.5 text-white">
                Helping you tell your founders story, while you build.
              </span>
            </p>
          </div>
        </div>

        {/* Login panel — desktop only */}
        <div className="relative hidden items-center justify-center bg-white px-12 py-16 lg:flex">
          {loginWidget}
        </div>

      </div>
    </div>
  );
}
