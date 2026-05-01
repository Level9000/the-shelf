"use client";

import { useState, useTransition } from "react";
import {
  BookOpen,
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
import type { Board, Task, BoardColumn } from "@/types";
import { updateBoardOverviewAction } from "@/lib/actions/project-actions";
import { ChapterPageNav } from "@/components/projects/chapter-page-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function copyOrFallback(value: string | null, fallback: string) {
  return value?.trim() || fallback;
}

export function ChapterOverviewPanel({
  board,
  projectId,
  chapterId,
  tasks,
  columns,
  projectName,
  northStar,
  onRefine,
  onOpenSettings,
  onStartRetro,
  onEndChapter,
}: {
  board: Board;
  projectId: string;
  chapterId: string;
  tasks?: Task[];
  columns?: BoardColumn[];
  projectName?: string | null;
  northStar?: string | null;
  onRefine: () => void;
  onOpenSettings: () => void;
  onStartRetro?: () => void;
  onEndChapter?: () => void;
}) {
  const router = useRouter();

  const doneColumnId = columns?.find(
    (col) => col.name.toLowerCase() === "done",
  )?.id;
  const allTasksDone =
    tasks !== undefined &&
    tasks.length > 0 &&
    tasks.every((t) => t.columnId === doneColumnId);
  const hasIncompleteTasks =
    tasks !== undefined &&
    tasks.some((t) => t.columnId !== doneColumnId);

  const retroAvailable =
    Boolean(board.kickoffCompletedAt) && !board.retroCompletedAt;
  const retroDone = Boolean(board.retroCompletedAt);

  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: board.name,
    goal: board.goal ?? "",
    whyItMatters: board.whyItMatters ?? "",
    successLooksLike: board.successLooksLike ?? "",
    doneDefinition: board.doneDefinition ?? "",
  });

  function handleChange(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCancelEdit() {
    setForm({
      name: board.name,
      goal: board.goal ?? "",
      whyItMatters: board.whyItMatters ?? "",
      successLooksLike: board.successLooksLike ?? "",
      doneDefinition: board.doneDefinition ?? "",
    });
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateBoardOverviewAction({
          projectId,
          boardId: board.id,
          ...form,
        });
        setEditing(false);
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
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto">
      <section className="surface hairline shrink-0 rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            {northStar ? (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                {projectName ?? "Project"} &mdash; {northStar}
              </p>
            ) : null}
            {editing ? (
              <Input
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="Chapter title"
                className="mt-5 text-2xl font-semibold sm:text-3xl"
              />
            ) : (
              <h2 className={`text-3xl font-semibold tracking-tight sm:text-4xl ${northStar ? "mt-2" : "mt-5"}`}>
                {board.name}
              </h2>
            )}
            {board.openingLine && !editing ? (
              <blockquote className="mt-3 border-l-2 border-[var(--accent)]/30 pl-4 text-sm italic leading-7 text-[var(--muted)]">
                &ldquo;{board.openingLine}&rdquo;
              </blockquote>
            ) : null}
            <div className="mt-4">
              <ChapterPageNav
                projectId={projectId}
                chapterId={chapterId}
                active="overview"
              />
            </div>
          </div>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex size-11 items-center justify-center rounded-full bg-white/80 text-[var(--ink)] ring-1 ring-black/8 transition hover:bg-white"
                aria-label="Open chapter settings"
              >
                <Settings2 className="size-4" />
              </button>
              {!editing ? (
                <Button
                  variant="secondary"
                  className="size-11 rounded-full p-0"
                  onClick={() => setEditing(true)}
                  aria-label="Quick edit chapter overview"
                >
                  <PencilLine className="size-4" />
                </Button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onRefine}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:bg-black"
            >
              Refine this chapter with chat
            </button>

            {retroDone ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 ring-1 ring-green-200">
                <BookOpen className="size-4" />
                Story published
              </div>
            ) : retroAvailable && allTasksDone && onStartRetro ? (
              <button
                type="button"
                onClick={onStartRetro}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/20 transition duration-200 hover:-translate-y-0.5"
              >
                <BookOpen className="size-4" />
                All done — write the story
              </button>
            ) : retroAvailable && onEndChapter ? (
              <button
                type="button"
                onClick={onEndChapter}
                className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--ink)] ring-1 ring-black/12 transition duration-200 hover:bg-[var(--surface-muted)]"
              >
                End chapter
              </button>
            ) : null}
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
              <h3 className="text-lg font-semibold">The chapter goal</h3>
              <p className="text-sm text-[var(--muted)]">
                The specific contribution this chapter should make to the story.
              </p>
            </div>
          </div>
          {editing ? (
            <Textarea
              value={form.goal}
              onChange={(event) => handleChange("goal", event.target.value)}
              placeholder="Define the concrete change this chapter needs to create so the team can focus the board on meaningful progress."
              className="mt-4 min-h-[180px] rounded-[1.5rem]"
            />
          ) : (
            <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
              {copyOrFallback(
                board.goal,
                "Define the concrete change this chapter needs to create so the team can focus the board on meaningful progress.",
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
              <h3 className="text-lg font-semibold">Why this chapter matters</h3>
              <p className="text-sm text-[var(--muted)]">
                The reason this chapter deserves attention inside the larger story.
              </p>
            </div>
          </div>
          {editing ? (
            <Textarea
              value={form.whyItMatters}
              onChange={(event) =>
                handleChange("whyItMatters", event.target.value)
              }
              placeholder="Explain why this chapter matters now so the team can make stronger tradeoffs inside the sprint."
              className="mt-4 min-h-[180px] rounded-[1.5rem]"
            />
          ) : (
            <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
              {copyOrFallback(
                board.whyItMatters,
                "Explain why this chapter matters now so the team can make stronger tradeoffs inside the sprint.",
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
              <h3 className="text-lg font-semibold">What success looks like here</h3>
              <p className="text-sm text-[var(--muted)]">
                The visible state you want this chapter to reach.
              </p>
            </div>
          </div>
          {editing ? (
            <Textarea
              value={form.successLooksLike}
              onChange={(event) =>
                handleChange("successLooksLike", event.target.value)
              }
              placeholder="Describe the chapter end state that would tell you this slice of work landed well."
              className="mt-4 min-h-[180px] rounded-[1.5rem]"
            />
          ) : (
            <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
              {copyOrFallback(
                board.successLooksLike,
                "Describe the chapter end state that would tell you this slice of work landed well.",
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
              <h3 className="text-lg font-semibold">How we know this chapter is done</h3>
              <p className="text-sm text-[var(--muted)]">
                The completion signal for this chapter.
              </p>
            </div>
          </div>
          {editing ? (
            <Textarea
              value={form.doneDefinition}
              onChange={(event) =>
                handleChange("doneDefinition", event.target.value)
              }
              placeholder="Set a clear finish line for this chapter so the board can close cleanly before the next one begins."
              className="mt-4 min-h-[180px] rounded-[1.5rem]"
            />
          ) : (
            <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
              {copyOrFallback(
                board.doneDefinition,
                "Set a clear finish line for this chapter so the board can close cleanly before the next one begins.",
              )}
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
