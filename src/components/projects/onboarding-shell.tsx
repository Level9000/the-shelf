"use client";

import { useRouter } from "next/navigation";
import type { ProjectWithChapters, UserProfile } from "@/types";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";

export function OnboardingShell({
  projects,
  profile,
}: {
  projects: ProjectWithChapters[];
  profile: UserProfile;
}) {
  const router = useRouter();

  return (
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
            Start your first project and meet Cass — your story guide.
          </p>
          <button
            type="button"
            onClick={() => router.push("/projects/new")}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-80"
          >
            Start your first project →
          </button>
        </div>
      </div>
    </ProjectShellFrame>
  );
}
