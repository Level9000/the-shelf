"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowUp, LoaderCircle, Sparkles, UserRound } from "lucide-react";
import type { AITaskChunking } from "@/lib/ai/schema";
import { createChunkedTasksAction } from "@/lib/actions/task-actions";
import type { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { ChatProgressBar } from "@/components/ui/chat-progress-bar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DialogueMessage = { role: "user" | "assistant"; content: string };
type ChunkedTask = { title: string; description: string; priority: "low" | "medium" | "high" | null };

function buildOpener(task: Task): DialogueMessage {
  return {
    role: "assistant",
    content: `Let's break down "${task.title}" into smaller pieces. Walk me through it — what are the distinct parts or steps involved?`,
  };
}

const PRIORITY_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

// ── Confirmation panel ────────────────────────────────────────────────────────

function ConfirmPanel({
  tasks,
  isPending,
  error,
  onConfirm,
  onAdjust,
}: {
  tasks: ChunkedTask[];
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
  onAdjust: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Proposed breakdown
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Review the subtasks below. Confirm to replace the original card with these.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {tasks.map((task, i) => (
          <div
            key={i}
            className="surface-card hairline rounded-[1.5rem] px-5 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-[var(--ink)]">{task.title}</p>
              {task.priority && (
                <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                  {PRIORITY_LABELS[task.priority]}
                </span>
              )}
            </div>
            {task.description && (
              <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">{task.description}</p>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onAdjust}
          disabled={isPending}
          className="flex items-center gap-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
        >
          <ArrowLeft className="size-3.5" />
          Adjust the breakdown
        </button>
        <Button onClick={onConfirm} disabled={isPending} className="gap-2">
          {isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {isPending ? "Creating tasks…" : `Create ${tasks.length} tasks`}
        </Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TaskChunkingChat({
  task,
  projectId,
  boardId,
  onComplete,
  onClose,
}: {
  task: Task;
  projectId: string;
  boardId: string;
  onComplete: () => void;
  onClose: () => void;
}) {
  const opener = buildOpener(task);
  const [messages, setMessages] = useState<DialogueMessage[]>([opener]);
  const [input, setInput] = useState("");
  const [pendingTasks, setPendingTasks] = useState<ChunkedTask[] | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isChatPending, startChat] = useTransition();
  const [isSaving, startSave] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pendingTasks]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function sendMessage() {
    const text = input.trim();
    if (!text || isChatPending) return;

    const next: DialogueMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setChatError(null);

    startChat(async () => {
      try {
        const response = await fetch("/api/chat/task-chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: task.id,
            projectId,
            boardId,
            messages: next,
          }),
        });

        const data = (await response.json()) as AITaskChunking & { error?: string };

        if (!response.ok) {
          setChatError(data.error ?? "Something went wrong.");
          return;
        }

        setMessages([...next, { role: "assistant", content: data.reply }]);

        if (data.isComplete && data.tasks.length > 0) {
          setPendingTasks(data.tasks);
        }
      } catch {
        setChatError("Failed to reach the server. Try again.");
      }
    });
  }

  function handleAdjust() {
    setPendingTasks(null);
    setSaveError(null);
    // Add a nudge message so the user knows we're back in chat
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "No problem — tell me what you'd like to change." },
    ]);
  }

  function handleConfirm() {
    if (!pendingTasks) return;
    setSaveError(null);

    startSave(async () => {
      try {
        await createChunkedTasksAction({
          projectId,
          boardId,
          columnId: task.columnId,
          originalTaskId: task.id,
          tasks: pendingTasks,
        });
        onComplete();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to create tasks.");
      }
    });
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <ChatProgressBar step={pendingTasks ? 2 : 1} total={2} />
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-black/6 pb-4">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
            <Sparkles className="size-3.5" />
          </div>
          <p className="text-sm font-semibold text-[var(--ink)]">Break into smaller tasks</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-5">
        {pendingTasks ? (
          <ConfirmPanel
            tasks={pendingTasks}
            isPending={isSaving}
            error={saveError}
            onConfirm={handleConfirm}
            onAdjust={handleAdjust}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" && "justify-end")}>
                {msg.role === "assistant" && (
                  <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Sparkles className="size-3.5" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[82%] rounded-[1.5rem] px-4 py-3 text-sm leading-6",
                    msg.role === "assistant"
                      ? "bg-[var(--surface-muted)] text-[var(--ink)]"
                      : "bg-[var(--ink)] text-white",
                  )}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
                    <UserRound className="size-3.5" />
                  </div>
                )}
              </div>
            ))}
            {isChatPending && (
              <div className="flex gap-3">
                <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Sparkles className="size-3.5" />
                </div>
                <div className="flex items-center gap-2 rounded-[1.5rem] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
            {chatError && (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{chatError}</p>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      {!pendingTasks && (
        <div className="shrink-0 border-t border-black/6 pt-4">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe how to break this down…"
              className="min-h-[56px] max-h-[160px] resize-none rounded-2xl"
              disabled={isChatPending}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || isChatPending}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-white transition hover:opacity-80 disabled:opacity-30"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
