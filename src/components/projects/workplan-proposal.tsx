"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  LoaderCircle,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkplanChapter = {
  chapterNumber: number;
  title: string;
  goal: string;
  prefill?: {
    goal: string;
    value: string;
    measure: string;
    done: string;
  } | null;
};

type EditingState = {
  index: number;
  title: string;
  goal: string;
} | null;

export function WorkplanProposal({
  projectName,
  northStar,
  initialChapters,
  isSaving,
  onAccept,
  error,
}: {
  projectName: string;
  northStar: string;
  initialChapters: WorkplanChapter[];
  isSaving: boolean;
  onAccept: (chapters: WorkplanChapter[]) => void;
  error: string | null;
}) {
  const [chapters, setChapters] = useState<WorkplanChapter[]>(initialChapters);
  const [editing, setEditing] = useState<EditingState>(null);

  function startEdit(index: number) {
    const ch = chapters[index];
    setEditing({ index, title: ch.title, goal: ch.goal });
  }

  function commitEdit() {
    if (!editing) return;
    setChapters((current) =>
      current.map((ch, i) =>
        i === editing.index
          ? { ...ch, title: editing.title.trim() || ch.title, goal: editing.goal.trim() }
          : ch,
      ),
    );
    setEditing(null);
  }

  function cancelEdit() {
    setEditing(null);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setChapters((current) => {
      const next = [...current];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((ch, i) => ({ ...ch, chapterNumber: i + 1 }));
    });
  }

  function moveDown(index: number) {
    if (index === chapters.length - 1) return;
    setChapters((current) => {
      const next = [...current];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((ch, i) => ({ ...ch, chapterNumber: i + 1 }));
    });
  }

  function deleteChapter(index: number) {
    setChapters((current) =>
      current
        .filter((_, i) => i !== index)
        .map((ch, i) => ({ ...ch, chapterNumber: i + 1 })),
    );
  }

  function addChapter() {
    const nextNumber = chapters.length + 1;
    const newChapter: WorkplanChapter = {
      chapterNumber: nextNumber,
      title: `Chapter ${nextNumber}`,
      goal: "",
    };
    setChapters((current) => [...current, newChapter]);
    setEditing({ index: chapters.length, title: newChapter.title, goal: "" });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--surface)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* North star */}
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            <Sparkles className="size-3.5" />
            {projectName}
          </div>
          <h1 className="text-3xl font-semibold leading-snug tracking-tight text-[var(--ink)] sm:text-4xl">
            &ldquo;{northStar}&rdquo;
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Your project north star. Here&apos;s the workplan we suggest to get you there.
          </p>
        </div>

        {/* Chapter list */}
        <div className="surface hairline overflow-hidden rounded-[2rem]">
          <div className="border-b border-black/6 px-6 py-4">
            <p className="text-sm font-semibold text-[var(--ink)]">Suggested workplan</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Click any chapter to rename it or adjust its goal. Drag to reorder.
            </p>
          </div>

          <div className="divide-y divide-black/6">
            {chapters.map((chapter, index) => {
              const isEditing = editing?.index === index;
              const isChapter1 = chapter.chapterNumber === 1;

              return (
                <div
                  key={`${chapter.chapterNumber}-${chapter.title}`}
                  className={cn(
                    "flex items-start gap-4 px-6 py-4 transition",
                    isEditing && "bg-[var(--surface-muted)]",
                  )}
                >
                  {/* Chapter number */}
                  <div
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isChapter1
                        ? "bg-[var(--accent)] text-white"
                        : "bg-black/8 text-[var(--muted)]",
                    )}
                  >
                    {chapter.chapterNumber}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editing.title}
                          onChange={(e) =>
                            setEditing((s) => s ? { ...s, title: e.target.value } : s)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="w-full rounded-xl border border-[var(--accent)]/40 bg-white px-3 py-1.5 text-sm font-semibold text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                          placeholder="Chapter title"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editing.goal}
                          onChange={(e) =>
                            setEditing((s) => s ? { ...s, goal: e.target.value } : s)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/30"
                          placeholder="One-sentence goal"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={commitEdit}
                            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                          >
                            <Check className="size-3.5" />
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="flex items-center gap-1.5 rounded-lg bg-black/8 px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition hover:bg-black/12"
                          >
                            <X className="size-3.5" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(index)}
                        className="group w-full text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--ink)]">
                            {chapter.title}
                          </span>
                          {isChapter1 && (
                            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                              Ready to start
                            </span>
                          )}
                          <Pencil className="size-3 text-[var(--muted)] opacity-0 transition group-hover:opacity-60" />
                        </div>
                        {chapter.goal ? (
                          <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
                            {chapter.goal}
                          </p>
                        ) : null}
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="flex size-7 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-black/8 disabled:opacity-25"
                        title="Move up"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={index === chapters.length - 1}
                        className="flex size-7 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-black/8 disabled:opacity-25"
                        title="Move down"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteChapter(index)}
                        disabled={chapters.length <= 1}
                        className="flex size-7 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-25"
                        title="Remove chapter"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-black/6 px-6 py-4">
            <button
              type="button"
              onClick={addChapter}
              className="flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
            >
              <Plus className="size-4" />
              Add a chapter
            </button>
          </div>
        </div>

        {/* Chapter 1 notice */}
        <div className="mt-4 rounded-[1.5rem] bg-[var(--accent-soft)] px-5 py-4">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Chapter 1 is ready to kick off.
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--accent)]/80">
            We&apos;ve already filled in your four questions based on what you told us. You&apos;ll confirm them when Chapter 1 opens.
          </p>
        </div>

        {/* Error */}
        {error ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {/* CTA */}
        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => onAccept(chapters)}
            disabled={isSaving || chapters.length === 0}
            className="gap-2 rounded-full px-8 py-3 text-base"
          >
            {isSaving ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <Check className="size-5" />
            )}
            {isSaving ? "Setting up your project..." : "Let's go →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
