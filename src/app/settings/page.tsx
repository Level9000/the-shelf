import { Settings } from "lucide-react";
import { SettingsForm } from "@/components/settings/settings-form";
import { getCurrentUserProfile } from "@/lib/supabase/queries";

export default async function SettingsPage() {
  const profile = await getCurrentUserProfile();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
      <section className="mb-8 surface hairline rounded-[2.25rem] p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          <Settings className="size-3.5" />
          Settings
        </div>
        <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Account settings
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
          Set the name other people see when they assign work to you or share a project.
        </p>
      </section>

      <SettingsForm profile={profile} />
    </main>
  );
}
