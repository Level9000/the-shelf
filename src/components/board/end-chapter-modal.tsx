"use client";

import { useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, Trash2 } from "lucide-react";
import { endChapterEarlyAction } from "@/lib/actions/project-actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

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

  function handleClose() {
    if (isPending) return;
    setChoice(null);
    setError(null);
    onClose();
  }

  function handleConfirm() {
    if (hasIncompleteTasks && !choice) return;

    const handleIncompleteTasks =
      !hasIncompleteTasks || choice === "carry_over" ? "carry_over" : "delete";

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

  return (
    <Modal
      open={open}
      title={hasIncompleteTasks ? "End chapter early" : "Close this chapter"}
      description={
        hasIncompleteTasks
          ? `${incompleteCount} task${incompleteCount === 1 ? "" : "s"} still in progress. What should happen to ${incompleteCount === 1 ? "it" : "them"}?`
          : "All tasks are done. Ready to write this chapter's story?"
      }
      onClose={handleClose}
    >
      {hasIncompleteTasks ? (
        <div className="space-y-3">
          <div className="mb-5 rounded-[1.5rem] bg-[var(--surface-muted)] px-4 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Incomplete tasks
            </p>
            <ul className="space-y-1.5">
              {incompleteTitles.slice(0, 5).map((title, i) => (
                <li key={i} className="text-sm text-[var(--ink)]">
                  · {title}
                </li>
              ))}
              {incompleteCount > 5 ? (
                <li className="text-sm text-[var(--muted)]">
                  + {incompleteCount - 5} more
                </li>
              ) : null}
            </ul>
          </div>

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
              {choice === "carry_over" ? (
                <div className="size-2 rounded-full bg-white" />
              ) : null}
            </div>
            <div>
              <p className="font-semibold text-[var(--ink)]">
                Carry over to the next chapter
              </p>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                A new chapter is created with these tasks already in the
                backlog.
              </p>
            </div>
          </button>

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
              {choice === "delete" ? (
                <div className="size-2 rounded-full bg-white" />
              ) : null}
            </div>
            <div>
              <p className="font-semibold text-[var(--ink)]">
                Remove them — this chapter is done
              </p>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                Incomplete tasks are deleted. The chapter closes clean.
              </p>
            </div>
          </button>
        </div>
      ) : (
        <p className="text-sm leading-6 text-[var(--muted)]">
          You&apos;ve completed all tasks. Click below to start the retro and
          write this chapter&apos;s story.
        </p>
      )}

      {error ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isPending || (hasIncompleteTasks && !choice)}
          className="gap-2"
        >
          {isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          {isPending ? "Working..." : "Start the retro"}
        </Button>
      </div>
    </Modal>
  );
}
