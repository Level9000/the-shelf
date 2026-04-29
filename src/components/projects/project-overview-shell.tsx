"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Flag,
  PencilLine,
  Save,
  Settings2,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppUser, ProjectMember, ProjectWithChapters, UserProfile } from "@/types";
import { updateProjectOverviewAction } from "@/lib/actions/project-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProjectOverviewRefiner } from "@/components/projects/project-overview-refiner";
import { ProjectOverviewSettingsDrawer } from "@/components/projects/project-overview-settings-drawer";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";
import { cn } from "@/lib/utils";

function copyOrFallback(value: string | null, fallback: string) {
  return value?.trim() || fallback;
}

export function ProjectOverviewShell({
  project,
  projects,
  profile,
  currentUser,
  projectMembers,
}: {
  project: ProjectWithChapters;
  projects: ProjectWithChapters[];
  profile: UserProfile;
  currentUser: AppUser;
  projectMembers: ProjectMember[];
}) {
  const router = useRouter();
  const [refining, setRefining] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const firstChapter = project.chapters[0] ?? null;
  const latestChapter = project.chapters.at(-1) ?? null;
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? "",
    goal: project.goal ?? "",
    whyItMatters: project.whyItMatters ?? "",
    successLooksLike: project.successLooksLike ?? "",
    doneDefinition: project.doneDefinition ?? "",
  });

  function handleChange(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCancelEdit() {
    setForm({
      name: project.name,
      description: project.description ?? "",
      goal: project.goal ?? "",
      whyItMatters: project.whyItMatters ?? "",
      successLooksLike: project.successLooksLike ?? "",
      doneDefinition: project.doneDefinition ?? "",
    });
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateProjectOverviewAction({
          projectId: project.id,
          ...form,
        });
        setEditing(false);
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Failed to save the overview.",
        );
      }
    });
  }

  return (
    <>
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
          <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto">
          <section className="surface hairline shrink-0 rounded-[2rem] p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  <Sparkles className="size-3.5" />
                  Story overview
                </div>
                {editing ? (
                  <div className="mt-5 space-y-4">
                    <Input
                      value={form.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      placeholder="Project title"
                      className="text-2xl font-semibold sm:text-3xl"
                    />
                    <Textarea
                      value={form.description}
                      onChange={(event) =>
                        handleChange("description", event.target.value)
                      }
                      placeholder="Project description"
                      className="min-h-[120px] max-w-2xl rounded-[1.75rem] text-base leading-7 sm:text-lg"
                    />
                  </div>
                ) : (
                  <>
                    <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                      {project.name}
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                      {copyOrFallback(
                        project.description,
                        "Use this overview to define the framing for the work before the chapters start to branch into execution.",
                      )}
                    </p>
                  </>
                )}
              </div>
              <div className="flex flex-col items-start gap-4 lg:max-w-sm lg:items-end">
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    className="size-11 rounded-full p-0"
                    onClick={() => setSettingsOpen(true)}
                    aria-label="Open project settings"
                  >
                    <Settings2 className="size-4" />
                  </Button>
                  {!editing ? (
                    <Button
                      variant="secondary"
                      className="size-11 rounded-full p-0"
                      onClick={() => setEditing(true)}
                      aria-label="Quick edit project overview"
                    >
                      <PencilLine className="size-4" />
                    </Button>
                  ) : null}
                </div>
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
                {editing ? (
                  <div className="flex flex-wrap gap-3">
                    <Button variant="secondary" onClick={handleCancelEdit} disabled={isPending}>
                      <X className="mr-2 size-4" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isPending}>
                      <Save className="mr-2 size-4" />
                      {isPending ? "Saving..." : "Save edits"}
                    </Button>
                  </div>
                ) : null}
                {latestChapter && latestChapter.id !== firstChapter?.id ? (
                  <Link
                    href={`/projects/${project.id}/chapters/${latestChapter.id}`}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200",
                      "bg-white/80 text-[var(--ink)] ring-1 ring-black/8 hover:bg-white",
                    )}
                  >
                    Go to latest chapter
                    <ArrowRight className="size-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          {error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <section className="grid flex-1 auto-rows-fr gap-4 xl:grid-cols-2">
            <article className="surface-card hairline h-full rounded-[1.75rem] p-5 sm:p-6">
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
              {editing ? (
                <Textarea
                  value={form.goal}
                  onChange={(event) => handleChange("goal", event.target.value)}
                  placeholder="Define the concrete change you want this project to create so each chapter can move the same outcome forward."
                  className="mt-4 min-h-[180px] rounded-[1.5rem]"
                />
              ) : (
                <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                  {copyOrFallback(
                    project.goal,
                    "Define the concrete change you want this project to create so each chapter can move the same outcome forward.",
                  )}
                </p>
              )}
            </article>

            <article className="surface-card hairline h-full rounded-[1.75rem] p-5 sm:p-6">
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
              {editing ? (
                <Textarea
                  value={form.whyItMatters}
                  onChange={(event) =>
                    handleChange("whyItMatters", event.target.value)
                  }
                  placeholder="Capture the importance of this work so the team can make better decisions when priorities compete."
                  className="mt-4 min-h-[180px] rounded-[1.5rem]"
                />
              ) : (
                <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                  {copyOrFallback(
                    project.whyItMatters,
                    "Capture the importance of this work so the team can make better decisions when priorities compete.",
                  )}
                </p>
              )}
            </article>

            <article className="surface-card hairline h-full rounded-[1.75rem] p-5 sm:p-6">
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
              {editing ? (
                <Textarea
                  value={form.successLooksLike}
                  onChange={(event) =>
                    handleChange("successLooksLike", event.target.value)
                  }
                  placeholder="Describe the end state that would make you confident this project worked in the real world, not just on paper."
                  className="mt-4 min-h-[180px] rounded-[1.5rem]"
                />
              ) : (
                <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                  {copyOrFallback(
                    project.successLooksLike,
                    "Describe the end state that would make you confident this project worked in the real world, not just on paper.",
                  )}
                </p>
              )}
            </article>

            <article className="surface-card hairline h-full rounded-[1.75rem] p-5 sm:p-6">
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
              {editing ? (
                <Textarea
                  value={form.doneDefinition}
                  onChange={(event) =>
                    handleChange("doneDefinition", event.target.value)
                  }
                  placeholder="Set a concrete finish line so chapters can stop cleanly instead of drifting into endless iteration."
                  className="mt-4 min-h-[180px] rounded-[1.5rem]"
                />
              ) : (
                <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                  {copyOrFallback(
                    project.doneDefinition,
                    "Set a concrete finish line so chapters can stop cleanly instead of drifting into endless iteration.",
                  )}
                </p>
              )}
            </article>
          </section>
          </div>
        )}
      </ProjectShellFrame>

      <ProjectOverviewSettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          project={project}
          currentUser={currentUser}
          members={projectMembers}
      />
    </>
  );
}
