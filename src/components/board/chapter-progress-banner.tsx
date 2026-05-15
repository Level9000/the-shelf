"use client";

import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import type { Board, BoardColumn, Task } from "@/types";
import { getChapterAgeDays } from "@/lib/utils";

const RUNNING_LONG_THRESHOLD = 14;

type BannerState =
  | { kind: "completed"; retroCompletedAt: string }
  | { kind: "on_pace"; ageDays: number; completedCount: number }
  | { kind: "closing_stretch"; ageDays: number; completedCount: number; totalCount: number }
  | { kind: "running_long"; ageDays: number; openingLine: string | null }
  | { kind: "none" };

function resolveBannerState(
  board: Board,
  tasks: Task[],
  columns: BoardColumn[],
): BannerState {
  if (board.retroCompletedAt) {
    return { kind: "completed", retroCompletedAt: board.retroCompletedAt };
  }

  const ageDays = getChapterAgeDays(board);
  if (!ageDays) return { kind: "none" };

  const doneColumn = columns.find((c) => c.name.toLowerCase() === "done");
  const totalCount = tasks.length;
  const completedCount = doneColumn
    ? tasks.filter((t) => t.columnId === doneColumn.id).length
    : 0;

  if (ageDays >= RUNNING_LONG_THRESHOLD) {
    return { kind: "running_long", ageDays, openingLine: board.openingLine };
  }

  // Only show positive signals once the chapter is at least a day old and
  // the founder has actually completed something.
  if (ageDays >= 1 && completedCount >= 1 && totalCount > 0) {
    const completionRatio = completedCount / totalCount;
    if (completionRatio >= 0.5) {
      return { kind: "closing_stretch", ageDays, completedCount, totalCount };
    }
    return { kind: "on_pace", ageDays, completedCount };
  }

  return { kind: "none" };
}

// ── Variant renderers ─────────────────────────────────────────────────────────

function CompletedBanner({
  retroCompletedAt,
  activeChapterUrl,
  onDismiss,
}: {
  retroCompletedAt: string;
  activeChapterUrl: string | null;
  onDismiss: () => void;
}) {
  const date = new Date(retroCompletedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="my-2 mx-auto flex w-fit items-center gap-4 rounded-[1.75rem] bg-green-50 px-5 py-3 ring-1 ring-green-200">
      <p className="text-sm text-green-800">
        Chapter completed on <span className="font-semibold">{date}</span>.
      </p>
      {activeChapterUrl ? (
        <Link
          href={activeChapterUrl}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-green-800 ring-1 ring-green-300 transition hover:bg-green-100"
        >
          Go to current chapter
          <ArrowRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function OnPaceBanner({
  ageDays,
  completedCount,
  onDismiss,
}: {
  ageDays: number;
  completedCount: number;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-2 mt-1 mx-auto flex w-fit items-center gap-4 rounded-[1.75rem] bg-green-50 px-5 py-3 ring-1 ring-green-200">
      <p className="text-sm text-green-800">
        <span className="font-semibold">
          {completedCount} {completedCount === 1 ? "task" : "tasks"} done in {ageDays}{" "}
          {ageDays === 1 ? "day" : "days"}.
        </span>{" "}
        <span className="text-green-700">You&rsquo;re on pace to close this chapter this week.</span>
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="flex shrink-0 size-7 items-center justify-center rounded-full text-green-600 transition hover:bg-green-100"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function ClosingStretchBanner({
  ageDays,
  completedCount,
  totalCount,
  onDismiss,
}: {
  ageDays: number;
  completedCount: number;
  totalCount: number;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-2 mt-1 mx-auto flex w-fit items-center gap-4 rounded-[1.75rem] bg-emerald-50 px-5 py-3.5 ring-1 ring-emerald-200">
      <p className="text-sm text-emerald-900">
        <span className="font-semibold">
          {completedCount} of {totalCount} done in {ageDays}{" "}
          {ageDays === 1 ? "day" : "days"}.
        </span>{" "}
        <span className="text-emerald-700">
          Close this out this week and you&rsquo;ll have a story worth telling.
        </span>
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="flex shrink-0 size-7 items-center justify-center rounded-full text-emerald-600 transition hover:bg-emerald-100"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function RunningLongBanner({
  ageDays,
  openingLine,
  onRefocus,
  onDismiss,
}: {
  ageDays: number;
  openingLine: string | null;
  onRefocus: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-2 mt-1 mx-auto flex w-fit items-center gap-4 rounded-[1.75rem] bg-amber-50 px-5 py-3.5 ring-1 ring-amber-200">
      <div>
        <p className="text-sm font-medium text-amber-900">
          This chapter is {ageDays} days in.{" "}
          <span className="text-amber-700">There&rsquo;s a story waiting to be written.</span>
        </p>
        {openingLine ? (
          <p className="mt-0.5 text-xs text-amber-700/70">
            &ldquo;{openingLine}&rdquo;
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onRefocus}
          className="rounded-xl bg-amber-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800"
        >
          Refocus
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex size-7 items-center justify-center rounded-full text-amber-600 transition hover:bg-amber-100"
          aria-label="Dismiss"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export function ChapterProgressBanner({
  board,
  tasks,
  columns,
  onRefocus,
  activeChapterUrl = null,
}: {
  board: Board;
  tasks: Task[];
  columns: BoardColumn[];
  onRefocus: () => void;
  activeChapterUrl?: string | null;
}) {
  const [dismissed, setDismissed] = useState(false);
  const state = resolveBannerState(board, tasks, columns);

  if (dismissed || state.kind === "none") return null;

  if (state.kind === "completed") {
    return (
      <CompletedBanner
        retroCompletedAt={state.retroCompletedAt}
        activeChapterUrl={activeChapterUrl}
        onDismiss={() => setDismissed(true)}
      />
    );
  }

  if (state.kind === "on_pace") {
    return (
      <OnPaceBanner
        ageDays={state.ageDays}
        completedCount={state.completedCount}
        onDismiss={() => setDismissed(true)}
      />
    );
  }

  if (state.kind === "closing_stretch") {
    return (
      <ClosingStretchBanner
        ageDays={state.ageDays}
        completedCount={state.completedCount}
        totalCount={state.totalCount}
        onDismiss={() => setDismissed(true)}
      />
    );
  }

  return (
    <RunningLongBanner
      ageDays={state.ageDays}
      openingLine={state.openingLine}
      onRefocus={onRefocus}
      onDismiss={() => setDismissed(true)}
    />
  );
}
