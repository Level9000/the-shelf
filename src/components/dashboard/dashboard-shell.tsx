"use client";

import { useState } from "react";
import { Plus, Settings } from "lucide-react";
import type { Project, UserProfile } from "@/types";
import { SettingsDrawer } from "@/components/settings/settings-drawer";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
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
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <section className="surface hairline overflow-hidden rounded-[2.25rem] p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_25rem] lg:gap-10">
            <div className="flex min-h-full flex-col">
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

            <aside className="surface-card hairline flex h-full flex-col rounded-[2rem] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    Your projects
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    Open an existing board or start a new one.
                  </p>
                </div>
                <Button
                  className="shrink-0"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="mr-2 size-4" />
                  Create new board
                </Button>
              </div>

              <div className="mt-6 min-h-0 flex-1">
                <ProjectList projects={projects} />
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Modal
        open={createOpen}
        title="Create a new board"
        description="Create a project and land directly in its default voice-ready board."
        onClose={() => setCreateOpen(false)}
      >
        <ProjectCreateForm
          showHeader={false}
          submitLabel="Create board"
          className="space-y-0"
        />
      </Modal>

      <SettingsDrawer
        open={settingsOpen}
        profile={profile}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
