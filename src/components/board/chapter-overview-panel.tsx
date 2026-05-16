"use client";

import { useState, useTransition } from "react";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Link2,
  Mail,
  MessageSquare,
  Mic,
  PencilLine,
  Save,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Board, Chapter, Task, BoardColumn } from "@/types";
import { updateBoardOverviewAction } from "@/lib/actions/project-actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { ChapterProgressBanner } from "@/components/board/chapter-progress-banner";
import { cn } from "@/lib/utils";

function copyOrFallback(value: string | null, fallback: string) {
  return value?.trim() || fallback;
}

const SHARE_FORMATS = [
  { key: "email", icon: Mail, label: "Email update", description: "A personal email to your board, investors, or team" },
  { key: "blog", icon: FileText, label: "Blog post", description: "A 400–600 word post in your authentic founder voice" },
  { key: "linkedin", icon: Link2, label: "LinkedIn post", description: "A punchy 150–200 word post for your network" },
  { key: "podcast", icon: Mic, label: "Podcast script", description: "A 2–3 minute conversational solo-cast monologue" },
] as const;

export function ChapterOverviewPanel({
  board,
  projectId,
  chapterId,
  tasks,
  columns,
  projectName,
  northStar,
  accumulativeStory,
  chapters,
  onRefine,
  onStartRetro,
  onEndChapter,
  activeChapterUrl = null,
  onSelectShareFormat,
  onPlanChapters,
}: {
  board: Board;
  projectId: string;
  chapterId: string;
  tasks?: Task[];
  columns?: BoardColumn[];
  projectName?: string | null;
  northStar?: string | null;
  accumulativeStory?: string | null;
  chapters?: Chapter[];
  onRefine: () => void;
  onStartRetro?: () => void;
  onEndChapter?: () => void;
  activeChapterUrl?: string | null;
  onSelectShareFormat?: (format: string) => void;
  onPlanChapters?: () => void;
}) {
  const router = useRouter();

  const doneColumnId = columns?.find(
    (col) => col.name.toLowerCase() === "done",
  )?.id;
  const allTasksDone =
    tasks !== undefined &&
    tasks.length > 0 &&
    tasks.every((t) => t.columnId === doneColumnId);
const retroAvailable =
    Boolean(board.kickoffCompletedAt) && !board.retroCompletedAt;
  const retroDone = Boolean(board.retroCompletedAt);

  type EditableField = "goal" | "whyItMatters" | "successLooksLike" | "doneDefinition";

  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    goal: board.goal ?? "",
    whyItMatters: board.whyItMatters ?? "",
    successLooksLike: board.successLooksLike ?? "",
    doneDefinition: board.doneDefinition ?? "",
  });

  function handleChange(field: EditableField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCancelEdit() {
    setForm({
      goal: board.goal ?? "",
      whyItMatters: board.whyItMatters ?? "",
      successLooksLike: board.successLooksLike ?? "",
      doneDefinition: board.doneDefinition ?? "",
    });
    setError(null);
    setEditingField(null);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateBoardOverviewAction({
          projectId,
          boardId: board.id,
          name: board.name,
          ...form,
        });
        setEditingField(null);
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Failed to save the chapter overview.",
        );
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="flex flex-col gap-6">

      {/* Mobile: north star — project identity at a glance */}
      {northStar && (
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[var(--ink)] px-5 py-4 lg:hidden">
          <div className="absolute right-4 top-3 opacity-[0.07]">
            <Sparkles className="size-14" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
            {projectName ? `${projectName} · ` : ""}North star
          </p>
          <p className="mt-1.5 text-sm font-semibold italic leading-6 text-white">
            &ldquo;{northStar}&rdquo;
          </p>
        </div>
      )}

      {!retroDone && retroAvailable && allTasksDone && onStartRetro && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onStartRetro}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/20 transition duration-200 hover:-translate-y-0.5"
          >
            <BookOpen className="size-4" />
            All done — write the story
          </button>
        </div>
      )}

      <Modal
        open={shareOpen && retroDone}
        title="Share your story"
        description="Generate polished updates for your network"
        onClose={() => setShareOpen(false)}
      >
        <div className="flex flex-col gap-2.5">
          {SHARE_FORMATS.map(({ key, label, description }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setShareOpen(false); onSelectShareFormat?.(key); }}
              className="flex flex-col rounded-[1.25rem] px-4 py-3.5 text-left transition hover:bg-black/5"
            >
              <p className="text-sm font-semibold text-[var(--ink)]">{label}</p>
              <p className="mt-0.5 text-[11px] leading-5 text-[var(--muted)]">{description}</p>
            </button>
          ))}
        </div>
      </Modal>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_30%]">
        {/* Left: how it went + 4 overview cards */}
        <div className="flex flex-col gap-4">
        {retroDone && board.chapterStory && (
          <article className="surface-card hairline rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 flex-col overflow-hidden rounded-[3px] shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]">
                <div className="h-3 shrink-0 bg-violet-200" />
                <div className="flex flex-1 items-center justify-center bg-violet-100">
                  <span className="text-[10px] font-bold tracking-wide text-violet-900/60">Story</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">How it went</h3>
                <p className="text-sm text-[var(--muted)]">The story of this chapter.</p>
              </div>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="lg:hidden flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
                aria-label="Share your story"
              >
                <Share2 className="size-4" />
              </button>
            </div>
            <p className="mt-4 text-sm italic leading-7 text-[var(--ink)] sm:text-base">
              {board.chapterStory}
            </p>
          </article>
        )}
        <section className="grid auto-rows-fr gap-4 sm:grid-cols-2">
          <article className="surface-card hairline h-full rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 flex-col overflow-hidden rounded-[3px] shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]">
                <div className="h-3 shrink-0 bg-yellow-200" />
                <div className="flex flex-1 items-center justify-center bg-yellow-100">
                  <span className="text-[10px] font-bold tracking-wide text-yellow-900/60">What</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {retroDone ? "What's the bet that we made?" : "What's the bet we're making?"}
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  The core hypothesis we're acting on this chapter.
                </p>
              </div>
              {!retroDone && editingField !== "goal" && (
                <button
                  type="button"
                  onClick={() => setEditingField("goal")}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
                  aria-label="Edit chapter goal"
                >
                  <PencilLine className="size-3.5" />
                </button>
              )}
            </div>
            {editingField === "goal" ? (
              <>
                <Textarea
                  value={form.goal}
                  onChange={(event) => handleChange("goal", event.target.value)}
                  placeholder="What belief are you acting on? State the bet plainly — what you expect to be true if this chapter succeeds."
                  className="mt-4 min-h-[140px] rounded-[1.5rem]"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" onClick={handleCancelEdit} disabled={isPending}>
                    <X className="mr-1.5 size-3.5" />Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isPending}>
                    <Save className="mr-1.5 size-3.5" />{isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                {copyOrFallback(
                  board.goal,
                  "What belief are you acting on? State the bet plainly — what you expect to be true if this chapter succeeds.",
                )}
              </p>
            )}
            {error && editingField === "goal" && (
              <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            )}
          </article>

          <article className="surface-card hairline h-full rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 flex-col overflow-hidden rounded-[3px] shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]">
                <div className="h-3 shrink-0 bg-blue-200" />
                <div className="flex flex-1 items-center justify-center bg-blue-100">
                  <span className="text-[10px] font-bold tracking-wide text-blue-900/60">Why</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {retroDone ? "Why did this matter at the time?" : "Why does this matter right now?"}
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  The urgency and stakes behind this chapter.
                </p>
              </div>
              {!retroDone && editingField !== "whyItMatters" && (
                <button
                  type="button"
                  onClick={() => setEditingField("whyItMatters")}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
                  aria-label="Edit why this chapter matters"
                >
                  <PencilLine className="size-3.5" />
                </button>
              )}
            </div>
            {editingField === "whyItMatters" ? (
              <>
                <Textarea
                  value={form.whyItMatters}
                  onChange={(event) => handleChange("whyItMatters", event.target.value)}
                  placeholder="What's the window? What's the pressure? Why is this the right chapter to run right now?"
                  className="mt-4 min-h-[140px] rounded-[1.5rem]"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" onClick={handleCancelEdit} disabled={isPending}>
                    <X className="mr-1.5 size-3.5" />Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isPending}>
                    <Save className="mr-1.5 size-3.5" />{isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                {copyOrFallback(
                  board.whyItMatters,
                  "What's the window? What's the pressure? Why is this the right chapter to run right now?",
                )}
              </p>
            )}
            {error && editingField === "whyItMatters" && (
              <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            )}
          </article>

          <article className="surface-card hairline h-full rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 flex-col overflow-hidden rounded-[3px] shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]">
                <div className="h-3 shrink-0 bg-pink-200" />
                <div className="flex flex-1 items-center justify-center bg-pink-100">
                  <span className="text-[10px] font-bold tracking-wide text-pink-900/60">How</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {retroDone ? "What needed to be true?" : "What has to be true?"}
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  The conditions that need to hold for this chapter to work.
                </p>
              </div>
              {!retroDone && editingField !== "successLooksLike" && (
                <button
                  type="button"
                  onClick={() => setEditingField("successLooksLike")}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
                  aria-label="Edit what success looks like"
                >
                  <PencilLine className="size-3.5" />
                </button>
              )}
            </div>
            {editingField === "successLooksLike" ? (
              <>
                <Textarea
                  value={form.successLooksLike}
                  onChange={(event) => handleChange("successLooksLike", event.target.value)}
                  placeholder="List the conditions that need to hold. Each one is something the board can work toward directly."
                  className="mt-4 min-h-[140px] rounded-[1.5rem]"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" onClick={handleCancelEdit} disabled={isPending}>
                    <X className="mr-1.5 size-3.5" />Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isPending}>
                    <Save className="mr-1.5 size-3.5" />{isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                {copyOrFallback(
                  board.successLooksLike,
                  "List the conditions that need to hold. Each one is something the board can work toward directly.",
                )}
              </p>
            )}
            {error && editingField === "successLooksLike" && (
              <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            )}
          </article>

          <article className="surface-card hairline h-full rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 flex-col overflow-hidden rounded-[3px] shadow-[2px_3px_0px_rgba(0,0,0,0.08),2px_4px_10px_rgba(0,0,0,0.12)]">
                <div className="h-3 shrink-0 bg-green-200" />
                <div className="flex flex-1 items-center justify-center bg-green-100">
                  <span className="text-[10px] font-bold tracking-wide text-green-900/60">When</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {retroDone ? "What did we have to show for it?" : "What will we have to show?"}
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  The proof point at the end of this chapter.
                </p>
              </div>
              {!retroDone && editingField !== "doneDefinition" && (
                <button
                  type="button"
                  onClick={() => setEditingField("doneDefinition")}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
                  aria-label="Edit done definition"
                >
                  <PencilLine className="size-3.5" />
                </button>
              )}
            </div>
            {editingField === "doneDefinition" ? (
              <>
                <Textarea
                  value={form.doneDefinition}
                  onChange={(event) => handleChange("doneDefinition", event.target.value)}
                  placeholder="What tangible thing will exist or be demonstrably true at the end? This is what the retro will hold you to."
                  className="mt-4 min-h-[140px] rounded-[1.5rem]"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" onClick={handleCancelEdit} disabled={isPending}>
                    <X className="mr-1.5 size-3.5" />Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isPending}>
                    <Save className="mr-1.5 size-3.5" />{isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                {copyOrFallback(
                  board.doneDefinition,
                  "What tangible thing will exist or be demonstrably true at the end? This is what the retro will hold you to.",
                )}
              </p>
            )}
            {error && editingField === "doneDefinition" && (
              <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            )}
          </article>
        </section>
        </div>

        {/* Right: share panel — desktop only, mobile uses collapsible above */}
        <section className="hidden surface hairline sticky top-6 rounded-[2rem] p-5 sm:p-6 lg:block">
          {retroDone ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Chapter complete
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ink)]">
                Share your story
              </h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Turn this chapter into a polished update for your network, board, or team.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {SHARE_FORMATS.map(({ key, icon: Icon, label, description }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectShareFormat?.(key)}
                    className="surface-card hairline group flex items-center gap-3 rounded-[1.25rem] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] transition group-hover:bg-[var(--ink)] group-hover:text-white">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">{label}</p>
                      <p className="mt-0.5 text-[11px] leading-5 text-[var(--muted)]">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Unlocks when you close this chapter
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ink)]">
                    Share your story
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    End the chapter and complete the retro — AI will turn your work into polished updates ready to send.
                  </p>
                </div>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--muted)]">
                  <Lock className="size-4" />
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 pointer-events-none select-none opacity-50">
                {SHARE_FORMATS.map(({ icon: Icon, label, description }) => (
                  <div key={label} className="surface-card hairline flex items-center gap-3 rounded-[1.25rem] p-4">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">{label}</p>
                      <p className="mt-0.5 text-[11px] leading-5 text-[var(--muted)]">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Mobile: chapter arc — all chapters in the project */}
      {chapters && chapters.length > 0 && (
        <section className="lg:hidden">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-black/8" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              All chapters
            </p>
            <div className="h-px flex-1 bg-black/8" />
          </div>

          <div>
            {chapters.map((ch, i) => {
              const status = ch.retroCompletedAt
                ? "completed"
                : ch.kickoffCompletedAt
                ? "active"
                : "planned";
              const isCurrent = ch.id === chapterId;
              const isLast = i === chapters.length - 1;

              return (
                <div key={ch.id} className="flex gap-3">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full",
                        status === "completed" && "bg-green-100 text-green-700",
                        status === "active" && "bg-[var(--accent-soft)] text-[var(--accent)]",
                        status === "planned" && "bg-black/5 text-[var(--muted)]",
                      )}
                    >
                      {status === "completed" ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : status === "active" ? (
                        <span className="relative flex size-2">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--accent)] opacity-50" />
                          <span className="relative inline-flex size-2 rounded-full bg-[var(--accent)]" />
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold">{i + 1}</span>
                      )}
                    </div>
                    {!isLast && <div className="mt-1 w-px flex-1 bg-black/8" />}
                  </div>

                  {/* Chapter card */}
                  <div className={cn("mb-3 min-w-0 flex-1", isLast && "mb-0")}>
                    <Link
                      href={`/projects/${projectId}/chapters/${ch.id}`}
                      className={cn(
                        "block rounded-[1.5rem] p-4 transition",
                        isCurrent
                          ? "bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/20"
                          : "surface-card hairline hover:shadow-sm",
                        status === "planned" && !isCurrent && "opacity-60",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                          Chapter {i + 1}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold text-[var(--accent)]">
                            · current
                          </span>
                        )}
                        {status === "completed" && !isCurrent && (
                          <span className="text-[10px] font-semibold text-green-600">· done</span>
                        )}
                      </div>
                      {ch.goal && (
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--ink)]">
                          {ch.goal}
                        </p>
                      )}
                      {ch.openingLine && status === "completed" && (
                        <p className="mt-1 line-clamp-1 text-xs italic text-[var(--muted)]">
                          &ldquo;{ch.openingLine}&rdquo;
                        </p>
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {onPlanChapters && (
            <button
              type="button"
              onClick={onPlanChapters}
              className="mt-3 flex w-full items-center gap-2 rounded-[1.5rem] px-4 py-3.5 text-sm font-medium text-[var(--accent)] transition hover:bg-black/5"
            >
              <Sparkles className="size-3.5 shrink-0" />
              Plan new chapters
            </button>
          )}
        </section>
      )}

      </div>{/* end gap-6 content */}

      {/* Floating refine button — bottom-right FAB, hidden once chapter is done */}
      {!retroDone && <button
        type="button"
        onClick={onRefine}
        className="group fixed bottom-6 right-6 z-40 flex h-14 items-center overflow-hidden rounded-full bg-[var(--ink)] shadow-xl shadow-black/20 transition-all duration-300 ease-out hover:shadow-2xl hover:shadow-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        style={{ width: "3.5rem" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.width = "220px"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.width = "3.5rem"; }}
        aria-label="Refine this page with chat"
      >
        <span className="flex size-14 shrink-0 items-center justify-center text-white">
          <MessageSquare className="size-5" />
        </span>
        <span className="whitespace-nowrap pr-5 text-sm font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Refine story with chat
        </span>
      </button>}
    </div>
  );
}
