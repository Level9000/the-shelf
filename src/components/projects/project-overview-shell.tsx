"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Flag, Sparkles, Target } from "lucide-react";
import type { ProjectWithChapters, UserProfile } from "@/types";
import { ProjectOverviewRefiner } from "@/components/projects/project-overview-refiner";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";
import { cn } from "@/lib/utils";

function copyOrFallback(value: string | null, fallback: string) {
  return value?.trim() || fallback;
}

export function ProjectOverviewShell({
  project,
  projects,
  profile,
}: {
  project: ProjectWithChapters;
  projects: ProjectWithChapters[];
  profile: UserProfile;
}) {
  const [refining, setRefining] = useState(false);
  const firstChapter = project.chapters[0] ?? null;
  const latestChapter = project.chapters.at(-1) ?? null;

  return (
    <ProjectShellFrame
      projects={projects}
      profile={profile}
      currentProjectId={project.id}
      mobileEyebrow="Overview"
      mobileTitle={project.name}
    >
      {refining ? (
        <ProjectOverviewRefiner
          project={project}
          onClose={() => setRefining(false)}
        />
      ) : (
        <div className="space-y-6 lg:h-full">
          <section className="surface hairline rounded-[2rem] p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  <Sparkles className="size-3.5" />
                  Story overview
                </div>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {project.name}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                  {copyOrFallback(
                    project.description,
                    "Use this overview to define the framing for the work before the chapters start to branch into execution.",
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:max-w-xs lg:justify-end">
                <button
                  type="button"
                  onClick={() => setRefining(true)}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200",
                    "bg-[var(--ink)] text-white shadow-lg shadow-black/10 hover:-translate-y-0.5 hover:bg-black",
                  )}
                >
                  Refine this page with chat
                </button>
                {latestChapter && latestChapter.id !== firstChapter?.id ? (
                  <Link
                    href={`/projects/${project.id}/chapters/${latestChapter.id}`}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200",
                      "bg-white/80 text-[var(--ink)] ring-1 ring-black/8 hover:bg-white",
                    )}
                  >
                    Latest chapter
                    <ArrowRight className="size-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <article className="surface-card hairline rounded-[1.75rem] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Target className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">What the goal is</h2>
                  <p className="text-sm text-[var(--muted)]">
                    The specific outcome this story is meant to produce.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                {copyOrFallback(
                  project.goal,
                  "Define the concrete change you want this project to create so each chapter can move the same outcome forward.",
                )}
              </p>
            </article>

            <article className="surface-card hairline rounded-[1.75rem] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Flag className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Why the work matters</h2>
                  <p className="text-sm text-[var(--muted)]">
                    The reason this deserves time, attention, and tradeoffs.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                {copyOrFallback(
                  project.whyItMatters,
                  "Capture the importance of this work so the team can make better decisions when priorities compete.",
                )}
              </p>
            </article>

            <article className="surface-card hairline rounded-[1.75rem] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">What success looks like</h2>
                  <p className="text-sm text-[var(--muted)]">
                    The visible state you want to reach when the work lands well.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                {copyOrFallback(
                  project.successLooksLike,
                  "Describe the end state that would make you confident this project worked in the real world, not just on paper.",
                )}
              </p>
            </article>

            <article className="surface-card hairline rounded-[1.75rem] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">How we know we are done</h2>
                  <p className="text-sm text-[var(--muted)]">
                    The completion signal that closes the loop on the story.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                {copyOrFallback(
                  project.doneDefinition,
                  "Set a concrete finish line so chapters can stop cleanly instead of drifting into endless iteration.",
                )}
              </p>
            </article>
          </section>
        </div>
      )}
    </ProjectShellFrame>
  );
}
