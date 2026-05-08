"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Layers,
  MessageSquare,
  Share2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppUser, Chapter, ProjectMember, ProjectWithChapters, UserProfile } from "@/types";
import { ProjectArcRefiner } from "@/components/projects/project-arc-refiner";
import { ProjectOverviewSettingsDrawer } from "@/components/projects/project-overview-settings-drawer";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function copyOrFallback(value: string | null, fallback: string) {
  return value?.trim() || fallback;
}

function chapterStatus(chapter: Chapter): "complete" | "active" | "upcoming" {
  if (chapter.retroCompletedAt) return "complete";
  if (chapter.kickoffCompletedAt) return "active";
  return "upcoming";
}

// ── Chapter arc card ─────────────────────────────────────────────────────────

function ChapterArcCard({
  chapter,
  index,
  projectId,
  isLast,
}: {
  chapter: Chapter;
  index: number;
  projectId: string;
  isLast: boolean;
}) {
  const status = chapterStatus(chapter);

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            status === "complete" && "bg-green-100 text-green-700",
            status === "active" && "bg-[var(--accent-soft)] text-[var(--accent)]",
            status === "upcoming" && "bg-black/5 text-[var(--muted)]",
          )}
        >
          {status === "complete" ? (
            <CheckCircle2 className="size-4" />
          ) : status === "active" ? (
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--accent)] opacity-50" />
              <span className="relative inline-flex size-2.5 rounded-full bg-[var(--accent)]" />
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-[var(--muted)]">{index + 1}</span>
          )}
        </div>
        {!isLast && (
          <div className="mt-1 w-px flex-1 bg-black/8" />
        )}
      </div>

      {/* Chapter content */}
      <div className={cn("min-w-0 flex-1 pb-6", isLast && "pb-0")}>
        <Link
          href={
            status === "upcoming"
              ? `/projects/${projectId}/chapters/${chapter.id}`
              : `/projects/${projectId}/chapters/${chapter.id}`
          }
          className="group block"
        >
          <div
            className={cn(
              "surface-card hairline rounded-[1.75rem] p-5 transition-all duration-200 group-hover:shadow-md",
              status === "upcoming" && "opacity-50",
            )}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Chapter {index + 1}
                  </span>
                  {status === "complete" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 ring-1 ring-green-200">
                      <BookOpen className="size-2.5" />
                      Story written
                    </span>
                  )}
                  {status === "active" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                      Active
                    </span>
                  )}
                  {chapter.sharedAt && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-200">
                      <Share2 className="size-2.5" />
                      Shared
                    </span>
                  )}
                </div>
                <p className="mt-1 font-semibold text-[var(--ink)]">{chapter.name}</p>
              </div>
            </div>

            {/* The bet */}
            {chapter.goal && (
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                <span className="mr-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink)]/40">Bet</span>
                {chapter.goal}
              </p>
            )}

            {/* Opening line — the narrative seed */}
            {chapter.openingLine && (
              <p className="mt-2 text-sm italic leading-6 text-[var(--ink)]/60">
                &ldquo;{chapter.openingLine}&rdquo;
              </p>
            )}

            {/* Empty state */}
            {!chapter.goal && !chapter.openingLine && status === "upcoming" && (
              <p className="mt-3 text-sm text-[var(--muted)]">Chapter not yet started</p>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-[1.25rem] bg-white px-5 py-3 ring-1 ring-black/6">
      <span className="text-2xl font-bold tracking-tight text-[var(--ink)]">{value}</span>
      <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
    </div>
  );
}

// ── Main shell ────────────────────────────────────────────────────────────────

export function ProjectOverviewShell({
  project,
  projects,
  profile,
  currentUser,
  projectMembers,
  lastChapterId,
}: {
  project: ProjectWithChapters;
  projects: ProjectWithChapters[];
  profile: UserProfile;
  currentUser: AppUser;
  projectMembers: ProjectMember[];
  lastChapterId?: string | null;
}) {
  const router = useRouter();
  const [refining, setRefining] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [foundationsOpen, setFoundationsOpen] = useState(false);

  // Chronicle stats
  const totalChapters = project.chapters.length;
  const storiesWritten = project.chapters.filter((c) => c.retroCompletedAt).length;
  const storiesShared = project.chapters.filter((c) => c.sharedAt).length;

  return (
    <>
      <ProjectShellFrame
        projects={projects}
        profile={profile}
        currentProjectId={project.id}
        lastChapterId={lastChapterId}
        activeNav="arc"
        mobileEyebrow="Arc"
        mobileTitle={project.name}
      >
        {refining ? (
          <ProjectArcRefiner project={project} onClose={() => setRefining(false)} />
        ) : (
          <div className="flex flex-col gap-6 overflow-y-auto px-4 py-6 lg:px-8">

            {/* ── Header: project identity ── */}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">
                {project.name}
              </h1>
              {project.description && (
                <p className="mt-2 text-sm leading-6 text-[var(--muted)] sm:text-base">
                  {project.description}
                </p>
              )}
            </div>

            {/* ── North Star ── */}
            <section
              className="relative overflow-hidden rounded-[2rem] bg-[var(--ink)] px-6 py-7 cursor-pointer"
              onClick={() => !project.northStar && setRefining(true)}
            >
              <div className="absolute right-6 top-5 opacity-10">
                <Sparkles className="size-16" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                North star
              </p>
              {project.northStar ? (
                <p className="mt-2 text-lg font-semibold italic leading-8 text-white sm:text-xl">
                  &ldquo;{project.northStar}&rdquo;
                </p>
              ) : (
                <p className="mt-2 text-base italic text-white/40">
                  Not set yet — tap "Refine with chat" to define your north star.
                </p>
              )}
            </section>

            {/* ── Chronicle stats ── */}
            {totalChapters > 0 && (
              <div className="flex gap-3">
                <StatPill value={totalChapters} label={totalChapters === 1 ? "Chapter" : "Chapters"} />
                <StatPill value={storiesWritten} label={storiesWritten === 1 ? "Story written" : "Stories written"} />
                {storiesShared > 0 && (
                  <StatPill value={storiesShared} label={storiesShared === 1 ? "Story shared" : "Stories shared"} />
                )}
              </div>
            )}

            {/* ── Accumulative story ── */}
            <section className="surface hairline rounded-[2rem] p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                The story so far
              </p>
              {project.accumulativeStory ? (
                <p className="mt-3 text-sm leading-7 text-[var(--ink)] sm:text-base">
                  {project.accumulativeStory}
                </p>
              ) : (
                <p className="mt-3 text-sm italic text-[var(--muted)]">
                  Not written yet — use "Refine with chat" to build the narrative thread across your chapters.
                </p>
              )}
            </section>

            {/* ── Chapter arc timeline ── */}
            {project.chapters.length > 0 ? (
              <section>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  The chapters
                </p>
                <div>
                  {project.chapters.map((chapter, i) => (
                    <ChapterArcCard
                      key={chapter.id}
                      chapter={chapter}
                      index={i}
                      projectId={project.id}
                      isLast={i === project.chapters.length - 1}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <section className="surface hairline flex flex-col items-center gap-3 rounded-[2rem] px-6 py-12 text-center">
                <Layers className="size-8 text-[var(--muted)]" />
                <p className="font-semibold text-[var(--ink)]">No chapters yet</p>
                <p className="text-sm text-[var(--muted)]">
                  Start the first chapter to begin building the arc.
                </p>
              </section>
            )}

            {/* ── Project foundations (collapsible) ── */}
            {(project.goal || project.whyItMatters || project.successLooksLike || project.doneDefinition) && (
              <section className="surface hairline overflow-hidden rounded-[2rem]">
                <button
                  type="button"
                  onClick={() => setFoundationsOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 sm:px-6"
                >
                  <span className="text-sm font-semibold text-[var(--ink)]">Project foundations</span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-[var(--muted)] transition-transform duration-200",
                      foundationsOpen && "rotate-180",
                    )}
                  />
                </button>

                {foundationsOpen && (
                  <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
                    {[
                      { label: "Goal", value: project.goal },
                      { label: "Why it matters", value: project.whyItMatters },
                      { label: "What success looks like", value: project.successLooksLike },
                      { label: "How we know we're done", value: project.doneDefinition },
                    ].map(({ label, value }) =>
                      value ? (
                        <div key={label} className="surface-card hairline rounded-[1.5rem] p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                            {label}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--ink)]">{value}</p>
                        </div>
                      ) : null,
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ── Refine FAB ── */}
            <button
              type="button"
              onClick={() => setRefining(true)}
              className="group fixed bottom-6 right-6 z-40 flex h-14 items-center overflow-hidden rounded-full bg-[var(--ink)] shadow-xl shadow-black/20 transition-all duration-300 ease-out hover:shadow-2xl hover:shadow-black/25"
              style={{ width: "3.5rem" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.width = "220px"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.width = "3.5rem"; }}
              aria-label="Refine with chat"
            >
              <span className="flex size-14 shrink-0 items-center justify-center text-white">
                <MessageSquare className="size-5" />
              </span>
              <span className="whitespace-nowrap pr-5 text-sm font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Refine with chat
              </span>
            </button>

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
