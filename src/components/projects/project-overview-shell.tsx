"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  MessageSquare,
  Share2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppUser, Chapter, ProjectMember, ProjectWithChapters, UserProfile } from "@/types";
import { ProjectArcRefiner } from "@/components/projects/project-arc-refiner";
import { ChapterPlannerChat } from "@/components/projects/chapter-planner-chat";
import { ProjectOverviewSettingsDrawer } from "@/components/projects/project-overview-settings-drawer";
import { ProjectShellFrame } from "@/components/projects/project-shell-frame";
import { SparkleShareIcon } from "@/components/ui/sparkle-share-icon";
import { cn } from "@/lib/utils";

// ── Share format options ──────────────────────────────────────────────────────

const SHARE_FORMATS = [
  { id: "email", label: "Email update" },
  { id: "blog", label: "Blog post" },
  { id: "linkedin", label: "LinkedIn post" },
  { id: "podcast", label: "Podcast notes" },
] as const;

type ShareFormat = (typeof SHARE_FORMATS)[number]["id"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function chapterStatus(chapter: Chapter): "completed" | "working_on_it" | "planned" {
  if (chapter.retroCompletedAt) return "completed";
  if (chapter.kickoffCompletedAt) return "working_on_it";
  return "planned";
}

// ── FAB action sheet ──────────────────────────────────────────────────────────

function FabActionSheet({
  project,
  onClose,
  onPlan,
  onRefine,
}: {
  project: ProjectWithChapters;
  onClose: () => void;
  onPlan: () => void;
  onRefine: () => void;
}) {
  const router = useRouter();
  const lastCompletedChapter = [...project.chapters]
    .reverse()
    .find((c) => c.retroCompletedAt);

  const actions = [
    {
      Icon: MessageSquare,
      title: "Plan chapters",
      description: "Map out what's coming next",
      onClick: () => { onClose(); onPlan(); },
      disabled: false,
    },
    {
      Icon: SparkleShareIcon,
      title: "Craft your story",
      description: lastCompletedChapter
        ? "Turn a completed chapter into content to share"
        : "Complete a chapter first to craft your story",
      onClick: lastCompletedChapter
        ? () => {
            onClose();
            router.push(`/projects/${project.id}/chapters/${lastCompletedChapter.id}`);
          }
        : null,
      disabled: !lastCompletedChapter,
    },
    {
      Icon: Sparkles,
      title: "Refine the vision",
      description: "Sharpen your north star and narrative arc",
      onClick: () => { onClose(); onRefine(); },
      disabled: false,
    },
  ] as const;

  return (
    /* Full-screen overlay — click backdrop to dismiss */
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Sheet — bottom on mobile, centered floating on desktop */}
      <div
        className="absolute bottom-0 left-0 right-0 flex justify-center lg:inset-0 lg:items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full rounded-t-[2rem] bg-white px-5 pb-10 pt-6 lg:max-w-sm lg:rounded-[2rem] lg:pb-6 lg:shadow-2xl lg:shadow-black/25">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
            What do you want to do?
          </p>

          <div className="flex flex-col gap-1">
            {actions.map(({ Icon, title, description, onClick, disabled }) => (
              <button
                key={title}
                type="button"
                onClick={onClick ?? undefined}
                disabled={disabled}
                className={cn(
                  "flex items-center gap-4 rounded-[1.5rem] p-4 text-left transition",
                  disabled
                    ? "cursor-not-allowed opacity-40"
                    : "hover:bg-black/5",
                )}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/6">
                  <Icon className="size-5 text-[var(--ink)]" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--ink)]">{title}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">{description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
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
  const router = useRouter();
  const status = chapterStatus(chapter);
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shareOpen) return;
    function handleOutside(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [shareOpen]);

  function handleShareFormat(format: ShareFormat) {
    setShareOpen(false);
    router.push(`/projects/${projectId}/chapters/${chapter.id}?format=${format}`);
  }

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            status === "completed" && "bg-green-100 text-green-700",
            status === "working_on_it" && "bg-[var(--accent-soft)] text-[var(--accent)]",
            status === "planned" && "bg-black/5 text-[var(--muted)]",
          )}
        >
          {status === "completed" ? (
            <CheckCircle2 className="size-4" />
          ) : status === "working_on_it" ? (
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--accent)] opacity-50" />
              <span className="relative inline-flex size-2.5 rounded-full bg-[var(--accent)]" />
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-[var(--muted)]">{index + 1}</span>
          )}
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-black/8" />}
      </div>

      {/* Chapter content */}
      <div className={cn("min-w-0 flex-1 pb-6", isLast && "pb-0")}>
        <Link
          href={`/projects/${projectId}/chapters/${chapter.id}`}
          className="group block"
        >
          <div
            className={cn(
              "surface-card hairline rounded-[1.75rem] p-5 transition-all duration-200 group-hover:shadow-md",
              status === "planned" && "opacity-55",
            )}
          >
            {/* Header row */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Chapter {index + 1}
                </span>
                {status === "completed" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 ring-1 ring-green-200">
                    <BookOpen className="size-2.5" />
                    Completed
                  </span>
                )}
                {status === "working_on_it" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                    Working on it
                  </span>
                )}
                {status === "planned" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                    Planned
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

            {/* The bet */}
            {chapter.goal && (
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                <span className="mr-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink)]/40">
                  Bet
                </span>
                {chapter.goal}
              </p>
            )}

            {/* Opening line — the narrative seed */}
            {chapter.openingLine && (
              <p className="mt-2 text-sm italic leading-6 text-[var(--ink)]/60">
                &ldquo;{chapter.openingLine}&rdquo;
              </p>
            )}
          </div>
        </Link>

        {/* ── Share button (completed chapters only) ── */}
        {status === "completed" && (
          <div ref={shareRef} className="relative mt-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShareOpen((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-85"
            >
              <SparkleShareIcon className="size-3.5 shrink-0" />
              Share
            </button>

            {shareOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2xl shadow-black/20">
                <p className="px-4 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Share as
                </p>
                {SHARE_FORMATS.map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onMouseDown={() => handleShareFormat(fmt.id)}
                    className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--ink)] transition hover:bg-black/5 last:pb-3"
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
  initialPlanning = false,
}: {
  project: ProjectWithChapters;
  projects: ProjectWithChapters[];
  profile: UserProfile;
  currentUser: AppUser;
  projectMembers: ProjectMember[];
  lastChapterId?: string | null;
  initialPlanning?: boolean;
}) {
  const [refining, setRefining] = useState(false);
  const [planning, setPlanning] = useState(initialPlanning);
  const [fabOpen, setFabOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [foundationsOpen, setFoundationsOpen] = useState(false);
  const [storyExpanded, setStoryExpanded] = useState(false);

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
        activeNav="overview"
        mobileEyebrow="Overview"
        mobileTitle={project.name}
        onPlanChapters={() => setPlanning(true)}
      >
        {refining ? (
          <ProjectArcRefiner project={project} onClose={() => setRefining(false)} />
        ) : planning ? (
          <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-6 lg:px-8">
            <ChapterPlannerChat project={project} onClose={() => setPlanning(false)} />
          </div>
        ) : (
          <div className="overflow-y-auto px-4 py-6 lg:px-8">
            {/* ── Two-column grid on desktop ── */}
            <div className="lg:grid lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-8">

              {/* ══ LEFT COLUMN ══ */}
              <div className="flex flex-col gap-6">

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
                <section className="relative overflow-hidden rounded-[2rem] bg-[var(--ink)] px-6 py-7">
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
                      Not set yet — use the button below to refine your vision.
                    </p>
                  )}

                  {/* ── Chronicle stats (mobile only, inside north star card) ── */}
                  {totalChapters > 0 && (
                    <div className="mt-5 flex gap-2 lg:hidden">
                      <div className="flex flex-col items-center gap-0.5 rounded-[1rem] bg-white/10 px-4 py-2.5">
                        <span className="text-xl font-bold tracking-tight text-white">{totalChapters}</span>
                        <span className="text-[10px] font-medium text-white/60">
                          {totalChapters === 1 ? "Chapter" : "Chapters"}
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 rounded-[1rem] bg-white/10 px-4 py-2.5">
                        <span className="text-xl font-bold tracking-tight text-white">{storiesWritten}</span>
                        <span className="text-[10px] font-medium text-white/60">
                          {storiesWritten === 1 ? "Story written" : "Stories written"}
                        </span>
                      </div>
                      {storiesShared > 0 && (
                        <div className="flex flex-col items-center gap-0.5 rounded-[1rem] bg-white/10 px-4 py-2.5">
                          <span className="text-xl font-bold tracking-tight text-white">{storiesShared}</span>
                          <span className="text-[10px] font-medium text-white/60">
                            {storiesShared === 1 ? "Story shared" : "Stories shared"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* ── Chronicle stats (desktop only, standalone pills) ── */}
                {totalChapters > 0 && (
                  <div className="hidden gap-3 lg:flex">
                    <StatPill value={totalChapters} label={totalChapters === 1 ? "Chapter" : "Chapters"} />
                    <StatPill value={storiesWritten} label={storiesWritten === 1 ? "Story written" : "Stories written"} />
                    {storiesShared > 0 && (
                      <StatPill value={storiesShared} label={storiesShared === 1 ? "Story shared" : "Stories shared"} />
                    )}
                  </div>
                )}

                {/* ── Accumulative story ── */}
                <section className="surface hairline rounded-[2rem] p-5 sm:p-6">
                  <button
                    type="button"
                    onClick={() => setStoryExpanded((v) => !v)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      The story so far
                    </p>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-[var(--muted)] transition-transform duration-200",
                        storyExpanded && "rotate-180",
                      )}
                    />
                  </button>
                  {storyExpanded && (
                    project.accumulativeStory ? (
                      <p className="mt-3 text-sm leading-7 text-[var(--ink)] sm:text-base">
                        {project.accumulativeStory}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm italic text-[var(--muted)]">
                        Not written yet — use &ldquo;Refine the vision&rdquo; to build the narrative thread across your chapters.
                      </p>
                    )
                  )}
                </section>

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

              </div>{/* end left column */}

              {/* ══ RIGHT COLUMN — chapters ══ */}
              <div className="mt-6 flex flex-col gap-6 lg:mt-0">

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
                    <Sparkles className="size-8 text-[var(--muted)]" />
                    <div>
                      <p className="font-semibold text-[var(--ink)]">No chapters yet</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Tap the button below to plan your first chapter.
                      </p>
                    </div>
                  </section>
                )}

              </div>{/* end right column */}

            </div>{/* end grid */}

            {/* ── FAB ── */}
            <button
              type="button"
              onClick={() => setFabOpen(true)}
              className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-[var(--ink)] shadow-xl shadow-black/20 transition hover:shadow-2xl hover:shadow-black/25 hover:opacity-90"
              aria-label="Actions"
            >
              <Sparkles className="size-5 text-white" />
            </button>

          </div>
        )}

        {/* ── FAB action sheet ── */}
        {fabOpen && (
          <FabActionSheet
            project={project}
            onClose={() => setFabOpen(false)}
            onPlan={() => setPlanning(true)}
            onRefine={() => setRefining(true)}
          />
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
