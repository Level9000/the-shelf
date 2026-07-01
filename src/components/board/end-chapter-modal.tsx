"use client";

import { useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, X } from "lucide-react";
import { endChapterEarlyAction } from "@/lib/actions/project-actions";
import { TapeButton } from "@/components/ui/tape-button";
import { Modal } from "@/components/ui/modal";
import { CassRecorder } from "@/components/cass/CassRecorder";
import { useTheme } from "@/lib/theme-context";

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
  const { theme } = useTheme();
  const isDark = theme === "dark";
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
      onClose={handleClose}
      title={hasIncompleteTasks ? "End this chapter early?" : "The work is done."}
      hideHeader
    >
      <div className="px-6 pt-6 text-center">
        {/* Cass avatar — same treatment as the chat drawer's header avatar */}
        <div className="flex flex-col items-center gap-2">
          <CassRecorder animState="talking" size="sm" />
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: isDark ? "rgba(248,248,246,0.35)" : "rgba(26,14,0,0.35)",
            }}
          >
            Cass · Story Guide
          </span>
        </div>

        <h1 className="mt-4 text-2xl font-semibold" style={{ fontFamily: "var(--font-cass)" }}>
          {hasIncompleteTasks ? "End this chapter early?" : "The work is done."}
        </h1>
        <p
          style={{ fontFamily: "'Lora', Georgia, serif" }}
          className="mt-2 text-sm leading-6 text-[var(--muted)]"
        >
          {hasIncompleteTasks
            ? `${incompleteCount} task${incompleteCount === 1 ? "" : "s"} still in progress. What should happen to ${incompleteCount === 1 ? "it" : "them"}?`
            : "You've completed all your tasks. Ready to write this chapter's story?"}
        </p>
      </div>

      {/* Body */}
      <div className="space-y-4 px-6 pb-6 pt-5">

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
    </Modal>
  );
}
