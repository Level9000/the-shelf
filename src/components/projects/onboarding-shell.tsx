"use client";

import { useState } from "react";
import type { ProjectWithChapters, UserProfile } from "@/types";
import { Modal } from "@/components/ui/modal";
import { ProjectCreateForm } from "@/components/projects/project-create-form";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";

export function OnboardingShell({
  projects,
  profile,
}: {
  projects: ProjectWithChapters[];
  profile: UserProfile;
}) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <ProjectShellFrame
        projects={projects}
        profile={profile}
        currentProjectId=""
        mobileEyebrow="Welcome"
        mobileTitle="The Shelf"
      >
        <div className="surface hairline flex h-full min-h-[60dvh] items-center justify-center rounded-[2rem] p-8 text-center">
          <div className="max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome to The Shelf
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Create your first project to get started. Every project comes with
              a voice-ready board.
            </p>
          </div>
        </div>
      </ProjectShellFrame>

      <Modal
        open={open}
        title="Start your first project"
        description="Name your project and Shelf AI will walk you through setting your north star and workplan."
        onClose={() => setOpen(false)}
      >
        <ProjectCreateForm
          showHeader={false}
          submitLabel="Start kickoff →"
          className="space-y-0"
        />
      </Modal>
    </>
  );
}
