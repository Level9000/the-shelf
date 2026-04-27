"use client";

import { useState } from "react";
import { Mic, Settings, Sparkles } from "lucide-react";
import type { Project, UserProfile } from "@/types";
import { SettingsDrawer } from "@/components/settings/settings-drawer";
import { Button } from "@/components/ui/button";
import { ProjectCreateForm } from "@/components/projects/project-create-form";
import { ProjectList } from "@/components/projects/project-list";

export function DashboardShell({
  projects,
  profile,
}: {
  projects: Project[];
  profile: UserProfile;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <section className="surface hairline rounded-[2.25rem] p-6 sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                <Sparkles className="size-3.5" />
                Voice-first kanban
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
                Clear your head by talking. Let the board become the plan.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                Shelf turns spoken thoughts into structured tasks with a calm review
                flow, a lightweight project system, and a board that stays out of
                your way.
              </p>
              <div className="mt-5">
                <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
                  <Settings className="mr-2 size-4" />
                  Settings
                </Button>
              </div>
            </div>
            <div className="surface-card hairline flex items-center gap-4 rounded-[1.75rem] px-5 py-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Mic className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{projects.length} active projects</p>
                <p className="text-sm text-[var(--muted)]">
                  Each one starts with a voice-ready default board.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <ProjectCreateForm />
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Your projects</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Jump back into an active board or start a new capture lane.
              </p>
            </div>
            <ProjectList projects={projects} />
          </div>
        </section>
      </main>

      <SettingsDrawer
        open={settingsOpen}
        profile={profile}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
