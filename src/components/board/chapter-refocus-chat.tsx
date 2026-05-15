"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, ArrowUp, Bot, LoaderCircle, MessageSquareText, UserRound } from "lucide-react";
import type { Board, BoardColumn, Task } from "@/types";
import type { AIRefocusDialogue } from "@/lib/ai/schema";
import { deferTasksToNextChapterAction } from "@/lib/actions/project-actions";
import { getChapterAgeDays } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChatProgressBar } from "@/components/ui/chat-progress-bar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type DialogueMessage = {
  role: "user" | "assistant";
  content: string;
};

// ── Opener ────────────────────────────────────────────────────────────────────

function buildRefocusOpener(
  board: Board,
  incompleteTasks: Task[],
  ageDays: number,
): DialogueMessage {
  if (incompleteTasks.length === 0) {
    return {
      role: "assistant",
      content: `Your backlog for ${board.name} is clear — nothing left incomplete. If you're ready to close this chapter, head to the retro. If there's more to do, add it to the board.`,
    };
  }

  const openingLine = board.openingLine
    ? `You started this chapter with: "${board.openingLine}." `
    : "";

  const named = incompleteTasks
    .slice(0, 2)
    .map((t) => `"${t.title}"`)
    .join(" and ");
  const more =
    incompleteTasks.length > 2
      ? ` and ${incompleteTasks.length - 2} more`
      : "";

  return {
    role: "assistant",
    content: `${openingLine}It's been ${ageDays} days. You still have ${named}${more} in the backlog. Let's figure out what actually belongs in this chapter — and what should wait. What's been getting in the way?`,
  };
}

// ── Split confirmation panel ──────────────────────────────────────────────────

function RefocusSplitPanel({
  result,
  incompleteTasks,
  columns,
  onConfirm,
  onBack,
  isSaving,
  error,
}: {
  result: AIRefocusDialogue;
  incompleteTasks: Task[];
  columns: BoardColumn[];
  onConfirm: (deferIds: string[]) => void;
  onBack: () => void;
  isSaving: boolean;
  error: string | null;
}) {
  const [deferIds, setDeferIds] = useState<Set<string>>(
    () => new Set(result.deferTaskIds),
  );

  const taskById = new Map(incompleteTasks.map((t) => [t.id, t]));
  const columnNameById = new Map(columns.map((c) => [c.id, c.name]));

  const keepTasks = incompleteTasks.filter((t) => !deferIds.has(t.id));
  const deferTasks = incompleteTasks.filter((t) => deferIds.has(t.id));

  function toggle(id: string) {
    setDeferIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <ChatProgressBar step={2} total={3} />
      <div className="surface hairline shrink-0 rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/6">
              <Image
                src="/icons/authored_by_icon_512.png"
                alt="Shelf AI icon"
                width={56}
                height={56}
                className="size-14 object-cover"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
                Refocus
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Confirm the split — or move tasks between lists before committing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {result.rationale ? (
        <div className="shrink-0 rounded-[1.75rem] bg-[var(--accent-soft)] px-5 py-3.5">
          <p className="text-sm text-[var(--ink)]">
            <span className="font-semibold">Why: </span>
            {result.rationale}
          </p>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        {/* Keep column */}
        <div className="surface hairline flex flex-col overflow-hidden rounded-[2rem]">
          <div className="border-b border-black/6 px-5 py-4">
            <p className="text-sm font-semibold text-[var(--ink)]">
              Finish this chapter
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {keepTasks.length} task{keepTasks.length === 1 ? "" : "s"} staying
            </p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {keepTasks.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No tasks — move some back from the right.</p>
            ) : (
              keepTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => toggle(task.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-[1.4rem] bg-white/85 px-4 py-3 text-left ring-1 ring-black/6 transition hover:bg-white hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--ink)]">
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {columnNameById.get(task.columnId) ?? ""}
                    </p>
                  </div>
                  <ArrowRight className="size-3.5 shrink-0 text-[var(--muted)]" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Defer column */}
        <div className="surface hairline flex flex-col overflow-hidden rounded-[2rem]">
          <div className="border-b border-black/6 px-5 py-4">
            <p className="text-sm font-semibold text-[var(--ink)]">
              Save for next chapter
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {deferTasks.length} task{deferTasks.length === 1 ? "" : "s"} moving out
            </p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {deferTasks.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No tasks deferred — move some from the left.</p>
            ) : (
              deferTasks.map((task) => {
                void taskById;
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggle(task.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-[1.4rem] bg-amber-50 px-4 py-3 text-left ring-1 ring-amber-200 transition hover:bg-amber-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-amber-900">
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-xs text-amber-700/70">
                        {columnNameById.get(task.columnId) ?? ""}
                      </p>
                    </div>
                    <ArrowRight className="size-3.5 shrink-0 rotate-180 text-amber-600" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 shrink-0 border-t border-black/6 bg-[var(--surface)]/95 pt-4 backdrop-blur">
        {error ? (
          <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={onBack} disabled={isSaving}>
            Back to chat
          </Button>
          <Button
            onClick={() => onConfirm([...deferIds])}
            disabled={isSaving || deferIds.size === 0}
          >
            {isSaving ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Moving tasks...
              </>
            ) : (
              `Confirm — move ${deferIds.size} task${deferIds.size === 1 ? "" : "s"} out`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChapterRefocusChat({
  project,
  board,
  incompleteTasks,
  columns,
  onComplete,
  onClose,
}: {
  project: { id: string; name: string };
  board: Board;
  incompleteTasks: Task[];
  columns: BoardColumn[];
  onComplete: () => void;
  onClose: () => void;
}) {
  const ageDays = getChapterAgeDays(board) ?? 0;
  const opener = buildRefocusOpener(board, incompleteTasks, ageDays);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<DialogueMessage[]>([opener]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [splitResult, setSplitResult] = useState<AIRefocusDialogue | null>(null);
  const [successState, setSuccessState] = useState<{
    count: number;
    chapterName: string;
    chapterId: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    queueMicrotask(() =>
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    );
  }, [messages, splitResult]);

  async function requestAssistantReply(nextMessages: DialogueMessage[]) {
    const response = await fetch("/api/chat/refocus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        chapterId: board.id,
        messages: nextMessages,
      }),
    });

    const payload = (await response.json()) as Partial<AIRefocusDialogue> & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Refocus dialogue failed.");
    }

    setMessages((current) => [
      ...current,
      { role: "assistant", content: payload.reply ?? "" },
    ]);

    if (payload.done) {
      setSplitResult(payload as AIRefocusDialogue);
    }
  }

  function sendMessage() {
    const content = draft.trim();
    if (!content || isPending || splitResult) return;

    const nextMessages: DialogueMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    setDraft("");
    setError(null);

    startTransition(async () => {
      try {
        await requestAssistantReply(nextMessages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function handleConfirmDefer(deferIds: string[]) {
    setError(null);
    startSaveTransition(async () => {
      try {
        const { nextChapterId, nextChapterName } = await deferTasksToNextChapterAction({
          projectId: project.id,
          boardId: board.id,
          taskIds: deferIds,
        });
        setSuccessState({
          count: deferIds.length,
          chapterName: nextChapterName,
          chapterId: nextChapterId,
        });
        onComplete();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to move tasks.");
      }
    });
  }

  // ── Stage: Success ───────────────────────────────────────────────────────────
  if (successState) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-5">
      <ChatProgressBar step={3} total={3} />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/6">
          <Image
            src="/icons/authored_by_icon_512.png"
            alt="Shelf AI icon"
            width={56}
            height={56}
            className="size-14 object-cover"
            priority
          />
        </div>
        <div className="max-w-sm space-y-2">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            Done.
          </h2>
          <p className="text-sm leading-6 text-[var(--muted)]">
            {successState.count} task{successState.count === 1 ? "" : "s"} moved to{" "}
            <span className="font-semibold text-[var(--ink)]">{successState.chapterName}</span>
            {" "}— it&rsquo;ll be waiting when you&rsquo;re ready to kick it off.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={onClose}>
            Back to board
          </Button>
          <Link
            href={`/projects/${project.id}/chapters/${successState.chapterId}`}
            className="inline-flex items-center gap-2 rounded-[1.75rem] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            View {successState.chapterName}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
      </div>
    );
  }

  // ── Stage: Split confirmation ────────────────────────────────────────────────
  if (splitResult) {
    return (
      <RefocusSplitPanel
        result={splitResult}
        incompleteTasks={incompleteTasks}
        columns={columns}
        onConfirm={handleConfirmDefer}
        onBack={() => setSplitResult(null)}
        isSaving={isSaving}
        error={error}
      />
    );
  }

  // ── Stage: Chat ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <ChatProgressBar step={1} total={3} />
      <section className="surface hairline shrink-0 rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/6">
              <Image
                src="/icons/authored_by_icon_512.png"
                alt="Shelf AI icon"
                width={56}
                height={56}
                className="size-14 object-cover"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
                Refocus
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Day {ageDays} · {board.name}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </section>

      <section className="surface hairline flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem]">
        <div className="border-b border-black/6 px-5 py-4">
          <p className="text-sm font-semibold text-[var(--ink)]">What belongs here?</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            A short conversation to protect your chapter&apos;s story.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`}>
              <div
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "justify-end",
                )}
              >
                {message.role === "assistant" ? (
                  <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Bot className="size-4" />
                  </div>
                ) : null}
                <div
                  className={cn(
                    "max-w-[82%] rounded-[1.7rem] px-4 py-3 text-sm leading-6 shadow-sm",
                    message.role === "assistant"
                      ? "rounded-tl-[0.55rem] bg-[var(--surface-muted)] text-[var(--ink)]"
                      : "rounded-tr-[0.55rem] bg-[var(--ink)] text-white",
                  )}
                >
                  <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-65">
                    {message.role === "assistant" ? "Shelf AI" : "You"}
                  </div>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" ? (
                  <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-black text-white">
                    <UserRound className="size-4" />
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {isPending ? (
            <div className="flex gap-3">
              <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                <Bot className="size-4" />
              </div>
              <div className="rounded-[1.7rem] rounded-tl-[0.55rem] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)] shadow-sm">
                <div className="flex items-center gap-2">
                  <LoaderCircle className="size-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-0 border-t border-black/6 bg-white/72 px-5 py-4 backdrop-blur-sm">
          {error ? (
            <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="rounded-[1.9rem] bg-[var(--surface-muted)] p-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="What's been getting in the way..."
              className="min-h-[100px] border-0 bg-transparent px-2 py-2 shadow-none focus:ring-0"
              disabled={isPending}
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <MessageSquareText className="size-3.5" />
                Enter sends. Shift + Enter adds a new line.
              </div>
              <Button
                onClick={sendMessage}
                disabled={!draft.trim() || isPending}
                className="gap-2"
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
