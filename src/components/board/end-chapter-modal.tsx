"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, X } from "lucide-react";
import { endChapterEarlyAction } from "@/lib/actions/project-actions";
import { TapeButton } from "@/components/ui/tape-button";

type IncompleteTaskChoice = "carry_over" | "delete" | null;

export function EndChapterModal({
  open,
  onClose,
  onConfirm,
  projectId,
  boardId,
  incompleteTasks: { count: incompleteCount, titles: incompleteTitles },
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (nextChapterId: string | null) => void;
  projectId: string;
  boardId: string;
  incompleteTasks: { count: number; titles: string[] };
}) {
  const [choice, setChoice] = useState<IncompleteTaskChoice>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasIncompleteTasks = incompleteCount > 0;

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  function handleClose() {
    if (isPending) return;
    setChoice(null);
    setError(null);
    onClose();
  }

  function handleConfirm() {
    if (hasIncompleteTasks && !choice) return;

    setError(null);
    startTransition(async () => {
      try {
        const { nextChapterId } = await endChapterEarlyAction({
          projectId,
          boardId,
          handleIncompleteTasks: hasIncompleteTasks
            ? (choice as "carry_over" | "delete")
            : "delete",
        });
        setChoice(null);
        onConfirm(nextChapterId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-[2rem] bg-[var(--surface)] shadow-2xl ring-1 ring-black/8 overflow-hidden">

        {/* Header */}
        <div className="bg-[var(--accent-soft)] px-7 pt-8 pb-6 text-center rounded-t-[2rem] relative">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            style={{ fontFamily: "'Literata', Georgia, serif" }}
            className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full bg-black/5 text-[var(--muted)] transition hover:bg-black/8 hover:text-[var(--ink)]"
          >
            <X className="size-4" />
          </button>
          <h2 className="text-2xl font-bold text-[var(--ink)] font-literata">
            {hasIncompleteTasks ? "End this chapter early?" : "The work is done."}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {hasIncompleteTasks
              ? `${incompleteCount} task${incompleteCount === 1 ? "" : "s"} still in progress. What should happen to ${incompleteCount === 1 ? "it" : "them"}?`
              : "You've completed all your tasks. Ready to write this chapter's story?"}
          </p>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-4 rounded-b-[2rem] bg-[var(--surface)]">

          {hasIncompleteTasks ? (
            <>
              {/* Incomplete task list */}
              <div className="rounded-[1.5rem] bg-[var(--surface-muted)] px-4 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Incomplete tasks
                </p>
                <ul className="space-y-1.5">
                  {incompleteTitles.slice(0, 5).map((title, i) => (
                    <li key={i} className="text-sm text-[var(--ink)]">· {title}</li>
                  ))}
                  {incompleteCount > 5 && (
                    <li className="text-sm text-[var(--muted)]">+ {incompleteCount - 5} more</li>
                  )}
                </ul>
              </div>

              {/* Carry over */}
              <button
                type="button"
                onClick={() => setChoice("carry_over")}
                className={`flex w-full items-start gap-4 rounded-[1.5rem] p-4 text-left ring-1 transition ${
                  choice === "carry_over"
                    ? "bg-[var(--accent-soft)] ring-[var(--accent)]/30"
                    : "bg-white/60 ring-black/6 hover:bg-white"
                }`}
              >
                <div
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ${
                    choice === "carry_over"
                      ? "bg-[var(--accent)] ring-[var(--accent)] text-white"
                      : "bg-white ring-black/20"
                  }`}
                >
                  {choice === "carry_over" && <div className="size-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="font-semibold text-[var(--ink)] font-literata">Carry over to the next chapter</p>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">
                    A new chapter is created with these tasks already in the backlog.
                  </p>
                </div>
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => setChoice("delete")}
                className={`flex w-full items-start gap-4 rounded-[1.5rem] p-4 text-left ring-1 transition ${
                  choice === "delete"
                    ? "bg-rose-50 ring-rose-200"
                    : "bg-white/60 ring-black/6 hover:bg-white"
                }`}
              >
                <div
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ${
                    choice === "delete"
                      ? "bg-rose-500 ring-rose-500 text-white"
                      : "bg-white ring-black/20"
                  }`}
                >
                  {choice === "delete" && <div className="size-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="font-semibold text-[var(--ink)] font-literata">Remove them — this chapter is done</p>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">
                    Incomplete tasks are deleted. The chapter closes clean.
                  </p>
                </div>
              </button>
            </>
          ) : (
            <p className="text-sm leading-6 text-[var(--muted)] text-center">
              Cass will walk you through a quick recap and write this chapter&apos;s story for your record.
            </p>
          )}

          {error && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          )}

          {/* CTA */}
          <div className="flex justify-center pt-2">
            <TapeButton
              variant="primary"
              size="lg"
              onClick={handleConfirm}
              disabled={isPending || (hasIncompleteTasks && !choice)}
              className="justify-center"
            >
              {isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {isPending ? "Working..." : "Start the recap"}
            </TapeButton>
          </div>

          {/* Cancel escape hatch */}
          <TapeButton
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-1.5"
          >
            <X className="size-3" />
            Cancel
          </TapeButton>
        </div>
      </div>
    </div>
  );
}
