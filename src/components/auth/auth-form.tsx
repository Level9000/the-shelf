"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/actions/auth-actions";
import { signInWithGoogleAction, signInWithAppleAction } from "@/lib/actions/auth-actions";
import { Input } from "@/components/ui/input";
import { TapeButton } from "@/components/ui/tape-button";

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
  oauthError,
}: {
  title: string;
  subtitle: string;
  submitLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  secondaryPrompt: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  nextPath?: string;
  oauthError?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="flex min-h-screen items-start justify-center bg-white px-6 pt-12 pb-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">

        {/* Logo image with depth shadow */}
        <Image
          src="/icons/authored_by_transparent.png"
          alt="Authored By"
          width={300}
          height={225}
          className="h-auto w-full max-w-[260px]"
          style={{
            filter:
              "drop-shadow(0 4px 12px rgba(0,0,0,0.15)) drop-shadow(0 12px 32px rgba(0,0,0,0.10))",
          }}
          priority
        />

        {/* Email / password form */}
        <div className="w-full">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="next" value={nextPath ?? "/projects"} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-900">
                Email
              </label>
              <Input name="email" type="email" placeholder="you@company.com" required className="text-zinc-900" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-900">
                Password
              </label>
              <Input name="password" type="password" placeholder="At least 8 characters" required className="text-zinc-900" />
            </div>
            {(state.error || oauthError) && (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {state.error ?? oauthError}
              </p>
            )}
            <TapeButton variant="primary" size="md" type="submit" disabled={pending} className="w-full">
              {pending ? "Working..." : submitLabel}
            </TapeButton>
          </form>
        </div>

        {/* Social login */}
        <div className="w-full">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-black/10" />
            <span className="text-xs text-zinc-500">or continue with</span>
            <div className="h-px flex-1 bg-black/10" />
          </div>
          <div className="flex flex-col gap-3">
            <form action={signInWithGoogleAction}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-black/12 bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 active:bg-zinc-100"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </form>

            <form action={signInWithAppleAction}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-black/12 bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 active:bg-zinc-700"
              >
                <svg width="16" height="19" viewBox="0 0 16 19" fill="currentColor" aria-hidden="true">
                  <path d="M13.178 10.187c-.02-2.273 1.856-3.373 1.94-3.428-1.057-1.547-2.702-1.758-3.285-1.782-1.394-.142-2.727.828-3.435.828-.71 0-1.796-.808-2.955-.786C3.81 5.04 2.268 5.94 1.424 7.37c-1.73 2.996-.441 7.433 1.237 9.86.823 1.19 1.8 2.524 3.08 2.476 1.24-.05 1.709-.8 3.21-.8 1.498 0 1.928.8 3.236.773 1.333-.022 2.177-1.208 2.986-2.408a11.36 11.36 0 0 0 1.354-2.778c-.031-.012-2.596-1-2.62-3.306ZM10.87 3.18C11.547 2.35 12 1.225 11.867 0c-.952.04-2.119.636-2.8 1.44-.607.712-1.146 1.867-.999 2.969 1.064.08 2.15-.54 2.803-1.228Z"/>
                </svg>
                Continue with Apple
              </button>
            </form>
          </div>
        </div>

        {/* Login / signup toggle */}
        <p className="text-sm text-zinc-500">
          {secondaryPrompt}{" "}
          <Link className="font-semibold text-zinc-900 underline-offset-2 hover:underline" href={secondaryHref}>
            {secondaryLabel}
          </Link>
        </p>

      </div>
    </div>
  );
}
