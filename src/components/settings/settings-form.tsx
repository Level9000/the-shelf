"use client";

import { useState, useTransition } from "react";
import { Crown, Save, UserRound } from "lucide-react";
import type { UserProfile } from "@/types";
import { updateUserProfileAction } from "@/lib/actions/profile-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SettingsForm({ profile }: { profile: UserProfile }) {
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await updateUserProfileAction({ displayName });
        setSuccess("Profile updated.");
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Failed to update profile.",
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="surface hairline rounded-[2rem] p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <UserRound className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              This name appears across task assignment and collaboration.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink)]">
              Display name
            </label>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Alex Morgan"
              maxLength={80}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink)]">
              Email
            </label>
            <Input value={profile.email} disabled />
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}

        <div className="sticky bottom-0 mt-6 flex justify-center border-t border-black/6 bg-[var(--surface)]/95 pt-4 backdrop-blur">
          <Button onClick={handleSave} disabled={isPending || !displayName.trim()}>
            <Save className="mr-2 size-4" />
            {isPending ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </section>

      <section className="surface hairline rounded-[2rem] p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-black text-white">
            <Crown className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Pro membership</h2>
              <Badge>Placeholder</Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Billing and access logic can plug in here later.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.6rem] bg-[var(--surface-muted)] p-5">
          <p className="text-sm font-semibold text-[var(--ink)]">Free plan</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            You are currently on the default plan. Pro upgrades will appear here
            once membership logic is implemented.
          </p>
          <Button className="mt-4" disabled>
            Become Pro
          </Button>
        </div>
      </section>
    </div>
  );
}
