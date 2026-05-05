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

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-8">

      {/* Two-column card */}
      <div className="relative grid w-full max-w-6xl grid-cols-2 overflow-hidden rounded-[3rem] border border-black/10 shadow-2xl shadow-black/20" style={{ minHeight: "680px" }}>

        {/* Left — hero text bottom-left */}
        <div className="relative flex flex-col px-12 py-12">
          <Image
            src="/images/paper.png"
            alt=""
            fill
            sizes="50vw"
            className="object-cover object-center"
            priority
          />
          <div className="flex-1" />
          <div className="relative">
            <h1
              className="text-5xl font-bold leading-[1.35]"
              style={{ fontFamily: literata.style.fontFamily }}
            >
              <span className="box-decoration-clone bg-white px-2 py-0.5">
                Welcome to Authored By.
              </span>
            </h1>
            <p
              className="mt-3 text-xl font-medium leading-[1.4]"
              style={{ fontFamily: literata.style.fontFamily }}
            >
              <span className="box-decoration-clone bg-white px-2 py-0.5">
                Helping you tell your story, while you build.
              </span>
            </p>
          </div>
        </div>

        {/* Right — login widget centered, frosted white panel */}
        <div className="relative flex items-center justify-center bg-white px-12 py-16">
          <div className="w-full max-w-md">
            <div className="flex flex-col items-center gap-3">
              <div className="shrink-0 overflow-hidden rounded-[22px] drop-shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
                <Image
                  src="/icons/authored_by_icon_512.png"
                  alt="Authored by"
                  width={68}
                  height={68}
                  className="object-cover"
                />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            </div>
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
        </div>

      </div>
    </div>
  );
}
