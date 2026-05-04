"use client";

import React from "react";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowUp,
  BookOpen,
  Bot,
  Check,
  Circle,
  LoaderCircle,
  MessageSquareText,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { AIKickoffDialogue, KickoffProposedTask } from "@/lib/ai/schema";
import type { Board, BoardColumn, Project } from "@/types";
import { completeChapterKickoffAction } from "@/lib/actions/project-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DialogueMessage = {
  role: "user" | "assistant";
  content: string;
};

type Stage = "chatting" | "proposal" | "done";

function buildOpeningMessage(projectName: string, chapterName: string): DialogueMessage {
  return {
    role: "assistant",
    content: `You're building ${projectName}. Let's set up ${chapterName} — what's the main thing you need to get done this sprint?`,
  };
}

function buildPrefillOpeningMessage(
  projectName: string,
  board: Board,
): DialogueMessage {
  const lines: string[] = [
    `Based on what you told me about ${projectName}, here's how I'd frame ${board.name}. Does this feel right, or do you want to adjust anything?`,
    "",
  ];
  if (board.goal) lines.push(`**Goal:** ${board.goal}`);
  if (board.whyItMatters) lines.push(`**Why it matters:** ${board.whyItMatters}`);
  if (board.successLooksLike) lines.push(`**Success looks like:** ${board.successLooksLike}`);
  if (board.doneDefinition) lines.push(`**Done when:** ${board.doneDefinition}`);

  return {
    role: "assistant",
    content: lines.join("\n"),
  };
}

function ProposedTaskList({
  tasks,
  selected,
  onToggle,
}: {
  tasks: KickoffProposedTask[];
  selected: Set<number>;
  onToggle: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      {tasks.map((task, index) => {
        const isSelected = selected.has(index);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onToggle(index)}
            className={cn(
              "flex w-full items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left ring-1 transition",
              isSelected
                ? "bg-[var(--accent-soft)] ring-[var(--accent)]/30"
                : "bg-white/60 ring-black/6 hover:bg-white",
            )}
          >
            <div
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-md ring-1",
                isSelected
                  ? "bg-[var(--accent)] ring-[var(--accent)] text-white"
                  : "bg-white ring-black/20",
              )}
            >
              {isSelected ? <Check className="size-3" /> : null}
            </div>
            <span className="text-sm font-medium text-[var(--ink)]">
              {task.title}
            </span>
            {task.source === "component_library" ? (
              <span className="ml-auto shrink-0 rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                from library
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

// ─── Backlog review modal ─────────────────────────────────────────────────────

function BacklogReviewModal({
  tasks,
  onConfirm,
  onClose,
  isSaving,
  error,
}: {
  tasks: KickoffProposedTask[];
  onConfirm: (accepted: KickoffProposedTask[]) => void;
  onClose: () => void;
  isSaving: boolean;
  error: string | null;
}) {
  // Two-phase removal: `exiting` shows the strikethrough briefly, then `removed` hides the item.
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  function removeTask(title: string) {
    // Phase 1: show strikethrough
    setExiting((prev) => new Set([...prev, title]));
    // Phase 2: fully remove after animation completes
    setTimeout(() => {
      setRemoved((prev) => new Set([...prev, title]));
      setExiting((prev) => { const n = new Set(prev); n.delete(title); return n; });
    }, 300);
  }

  // Items still visible (not permanently removed)
  const visibleTasks = tasks.filter((t) => !removed.has(t.title));
  // Items to pass on confirm (exclude both removed and mid-exit)
  const confirmedTasks = visibleTasks.filter((t) => !exiting.has(t.title));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Card */}
      <div className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/8 max-h-[82vh]">
        {/* Header */}
        <div className="shrink-0 border-b border-black/6 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
                Review your backlog
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Remove anything that doesn&apos;t fit before adding to the board.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
            >
              <X className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onConfirm(confirmedTasks)}
            disabled={isSaving}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white disabled:opacity-50"
          >
            <Check className="size-3" />
            Accept all
          </button>
        </div>

        {/* Task list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {visibleTasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              No suggestions yet — keep chatting.
            </p>
          ) : (
            <ul className="space-y-2">
              {visibleTasks.map((task) => {
                const isExiting = exiting.has(task.title);
                return (
                  <li
                    key={task.title}
                    className={cn(
                      "flex items-center gap-3 rounded-[1.25rem] px-4 py-3 ring-1 transition-all duration-300",
                      isExiting
                        ? "bg-[#fef2f2] ring-rose-200 opacity-40"
                        : "bg-white ring-black/6",
                    )}
                  >
                    {/* Static accepted indicator */}
                    <div className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                      isExiting ? "bg-rose-100 text-rose-400" : "bg-[var(--accent)] text-white",
                    )}>
                      {isExiting ? <X className="size-2.5" /> : <Check className="size-2.5" />}
                    </div>
                    <span
                      className={cn(
                        "flex-1 text-[13px] font-medium leading-snug transition-all duration-300",
                        isExiting ? "text-[var(--muted)] line-through" : "text-[var(--ink)]",
                      )}
                    >
                      {task.title}
                    </span>
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeTask(task.title)}
                      disabled={isExiting}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-rose-50 hover:text-rose-500 disabled:pointer-events-none disabled:opacity-0"
                      aria-label="Remove"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-black/6 bg-white/90 px-6 py-4">
          {error ? (
            <p className="mb-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-[var(--muted)]">
              {confirmedTasks.length} of {tasks.length} selected
            </span>
            <Button
              onClick={() => onConfirm(confirmedTasks)}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {isSaving
                ? "Populating board..."
                : confirmedTasks.length === 0
                  ? "Start with empty board"
                  : `Add ${confirmedTasks.length} task${confirmedTasks.length === 1 ? "" : "s"} to board`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChapterKickoffChat({
  project,
  board,
  columns,
  onComplete,
  isPrefilled = false,
}: {
  project: Project;
  board: Board;
  columns: BoardColumn[];
  onComplete: () => void;
  isPrefilled?: boolean;
}) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const openingMessage = isPrefilled
    ? buildPrefillOpeningMessage(project.name, board)
    : buildOpeningMessage(project.name, board.name);

  const [stage, setStage] = useState<Stage>("chatting");
  const [messages, setMessages] = useState<DialogueMessage[]>([openingMessage]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [chapterData, setChapterData] = useState<AIKickoffDialogue | null>(null);
  const [liveData, setLiveData] = useState<Partial<AIKickoffDialogue>>({});
  const [removedTaskTitles, setRemovedTaskTitles] = useState<Set<string>>(new Set());
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [readyToReview, setReadyToReview] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  // Auto-select all tasks when proposal stage is reached
  useEffect(() => {
    if (stage === "proposal" && chapterData?.proposedTasks) {
      setSelectedTasks(
        new Set(chapterData.proposedTasks.map((_, i) => i)),
      );
    }
  }, [stage, chapterData]);

  // Scroll to bottom after new messages
  useEffect(() => {
    queueMicrotask(() =>
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    );
  }, [messages, stage]);

  // Prompt the user to review once all 4 topics have been covered
  useEffect(() => {
    if (
      stage === "chatting" &&
      !readyToReview &&
      liveData.goal &&
      liveData.whyItMatters &&
      liveData.successLooksLike &&
      liveData.doneDefinition
    ) {
      setReadyToReview(true);
    }
  }, [liveData, stage, readyToReview]);

  async function requestAssistantReply(nextMessages: DialogueMessage[]) {
    const response = await fetch("/api/chat/kickoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        chapterId: board.id,
        messages: nextMessages,
      }),
    });

    const payload = (await response.json()) as AIKickoffDialogue & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Kickoff dialogue failed.");
    }

    const reply = payload.reply?.trim();
    if (!reply) {
      throw new Error("Kickoff returned an empty response.");
    }

    setMessages((current) => [...current, { role: "assistant", content: reply }]);

    // Always capture partial data so the live panel can update in real-time
    setLiveData({
      goal: payload.goal,
      whyItMatters: payload.whyItMatters,
      successLooksLike: payload.successLooksLike,
      doneDefinition: payload.doneDefinition,
      proposedTasks: payload.proposedTasks,
    });

    if (payload.done) {
      setChapterData(payload);
      setStage("proposal");
    }
  }

  function sendMessage() {
    const content = draft.trim();
    if (!content || isPending || stage !== "chatting") return;

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

  function toggleTask(index: number) {
    setSelectedTasks((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function handleConfirmTasks() {
    if (!chapterData) return;

    const acceptedTasks = chapterData.proposedTasks.filter((_, i) =>
      selectedTasks.has(i),
    );

    setError(null);
    startSaveTransition(async () => {
      try {
        await completeChapterKickoffAction({
          projectId: project.id,
          boardId: board.id,
          goal: chapterData.goal,
          whyItMatters: chapterData.whyItMatters,
          successLooksLike: chapterData.successLooksLike,
          doneDefinition: chapterData.doneDefinition,
          openingLine: chapterData.openingLine,
          conversation: messages,
          tasks: acceptedTasks,
          columns,
        });
        setStage("done");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save kickoff.");
      }
    });
  }

  function handleConfirmFromModal(acceptedTasks: KickoffProposedTask[]) {
    const data = chapterData ?? liveData;
    setError(null);
    startSaveTransition(async () => {
      try {
        await completeChapterKickoffAction({
          projectId: project.id,
          boardId: board.id,
          goal: data.goal ?? "",
          whyItMatters: data.whyItMatters ?? "",
          successLooksLike: data.successLooksLike ?? "",
          doneDefinition: data.doneDefinition ?? "",
          openingLine: data.openingLine ?? "",
          conversation: messages,
          tasks: acceptedTasks,
          columns,
        });
        // Ensure chapterData is populated so the done stage renders correctly
        if (!chapterData) {
          setChapterData({
            reply: "",
            done: true,
            goal: data.goal ?? "",
            whyItMatters: data.whyItMatters ?? "",
            successLooksLike: data.successLooksLike ?? "",
            doneDefinition: data.doneDefinition ?? "",
            openingLine: data.openingLine ?? "",
            proposedTasks: acceptedTasks,
          });
        }
        setReviewModalOpen(false);
        setStage("done");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save kickoff.");
      }
    });
  }

  // ─── Stage: Done ─────────────────────────────────────────────────────────────
  if (stage === "done" && chapterData) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/6">
          <Image
            src="/icons/authored_by_icon_512.png"
            alt="Shelf AI icon"
            width={64}
            height={64}
            className="size-16 object-cover"
            priority
          />
        </div>

        <div className="max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Your chapter opens with
          </p>
          <blockquote className="mt-4 text-2xl font-semibold leading-snug tracking-tight text-[var(--ink)] sm:text-3xl">
            &ldquo;{chapterData.openingLine}&rdquo;
          </blockquote>
        </div>

        <Button
          onClick={onComplete}
          className="gap-2 rounded-full px-8 py-3 text-base"
        >
          <BookOpen className="size-5" />
          Begin Chapter
        </Button>
      </div>
    );
  }

  // ─── Stage: Proposal ─────────────────────────────────────────────────────────
  if (stage === "proposal" && chapterData) {
    const acceptedCount = selectedTasks.size;

    return (
      <div className="flex h-full min-h-0 flex-col gap-5">
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
                  {board.name} — ready to start
                </h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Review your backlog and add it to the board in one tap.
                </p>
              </div>
            </div>
            <div className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
              {acceptedCount} of {chapterData.proposedTasks.length} selected
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="surface hairline flex min-h-0 flex-col rounded-[2rem] overflow-hidden">
            <div className="border-b border-black/6 px-5 py-4">
              <p className="text-sm font-semibold text-[var(--ink)]">
                Suggested tasks
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Deselect any you don&apos;t need. You can always add more once you&apos;re in the board.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <ProposedTaskList
                tasks={chapterData.proposedTasks}
                selected={selectedTasks}
                onToggle={toggleTask}
              />
            </div>
            <div className="border-t border-black/6 bg-white/72 px-5 py-4">
              {error ? (
                <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedTasks(new Set())}
                  disabled={isSaving}
                >
                  Deselect all
                </Button>
                <Button
                  onClick={handleConfirmTasks}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {isSaving
                    ? "Populating board..."
                    : acceptedCount === 0
                      ? "Start with an empty board"
                      : `Add ${acceptedCount} task${acceptedCount === 1 ? "" : "s"} to the board`}
                </Button>
              </div>
            </div>
          </section>

          <aside className="surface-card hairline min-h-0 rounded-[2rem] p-5 lg:flex lg:flex-col">
            {chapterData.openingLine ? (
              <div className="mb-4 rounded-[1.25rem] bg-[var(--ink)] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  This chapter opens with
                </p>
                <blockquote className="mt-2 text-sm font-medium leading-6 text-white">
                  &ldquo;{chapterData.openingLine}&rdquo;
                </blockquote>
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              <Sparkles className="size-4 text-[var(--accent)]" />
              {board.name}
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              This is the intent of the chapter — it will stay visible at the top
              of your board while you work.
            </p>
            <div className="mt-4 space-y-3 overflow-y-auto lg:min-h-0 lg:flex-1">
              {[
                { question: "What are you working on?", value: chapterData.goal },
                { question: "Why does it matter right now?", value: chapterData.whyItMatters },
                { question: "How will you know it worked?", value: chapterData.successLooksLike },
                { question: "What does done look like?", value: chapterData.doneDefinition },
              ].map(({ question, value }) =>
                value ? (
                  <div
                    key={question}
                    className="rounded-[1.25rem] bg-white/70 px-4 py-3 ring-1 ring-black/6"
                  >
                    <p className="text-[11px] font-medium text-[var(--muted)]">
                      {question}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[var(--ink)]">{value}</p>
                  </div>
                ) : null,
              )}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ─── Stage: Chatting ─────────────────────────────────────────────────────────
  const checklistItems = [
    { label: "What you're working on", value: liveData.goal },
    { label: "Why it matters", value: liveData.whyItMatters },
    { label: "What success looks like", value: liveData.successLooksLike },
    { label: "How you'll know you're done", value: liveData.doneDefinition },
  ];
  const completedCount = checklistItems.filter((item) => item.value).length;
  const visibleSuggestions = (liveData.proposedTasks ?? []).filter(
    (t) => !removedTaskTitles.has(t.title),
  );

  return (
    <React.Fragment>
    <div className="flex h-full min-h-0 flex-col gap-5">
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
                Let&apos;s kick off {board.name}
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                A short conversation to set the goal, value, and shape your backlog.
              </p>
            </div>
          </div>
          <div className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
            {project.name}
          </div>
        </div>
      </section>

      {/* Two-column body */}
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">

        {/* ── Left: chat ── */}
        <section className="surface hairline flex min-h-0 flex-col rounded-[2rem] overflow-hidden">
          <div className="border-b border-black/6 px-5 py-4">
            <p className="text-sm font-semibold text-[var(--ink)]">Chapter kickoff</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Answer naturally — this is a conversation, not a form.
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

          {/* Ready-to-review prompt */}
          {readyToReview && !reviewModalOpen ? (
            <div className="shrink-0 border-t border-[var(--accent)]/20 bg-[var(--accent-soft)] px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[13px] font-medium text-[var(--accent)]">
                  Looks like we&apos;ve got everything we need. Ready to review your backlog?
                </p>
                <Button
                  onClick={() => setReviewModalOpen(true)}
                  className="shrink-0 gap-2 rounded-full"
                >
                  <Sparkles className="size-3.5" />
                  Review backlog
                </Button>
              </div>
            </div>
          ) : null}

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
                placeholder="Tell me what you're working on..."
                className="min-h-[118px] border-0 bg-transparent px-2 py-2 shadow-none focus:ring-0"
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

        {/* ── Right: progress + live backlog ── */}
        <aside className="hidden lg:flex flex-col gap-4 min-h-0 overflow-y-auto">

          {/* Progress checklist */}
          <div className="surface-card hairline shrink-0 rounded-[2rem] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Covering
              </p>
              <span className="text-[11px] font-semibold tabular-nums text-[var(--muted)]">
                {completedCount} / {checklistItems.length}
              </span>
            </div>
            <ul className="space-y-2.5">
              {checklistItems.map(({ label, value }) => {
                const done = Boolean(value);
                return (
                  <li key={label} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                        done
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--stroke)] text-transparent",
                      )}
                    >
                      {done ? (
                        <Check className="size-3" />
                      ) : (
                        <Circle className="size-3 text-[var(--muted)] opacity-30" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[13px] transition-colors duration-300",
                        done
                          ? "font-medium text-[var(--ink)]"
                          : "text-[var(--muted)]",
                      )}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Live backlog */}
          <div className="surface-card hairline flex min-h-0 flex-1 flex-col rounded-[2rem] overflow-hidden">
            <div className="border-b border-black/6 px-5 py-4 shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Backlog Suggestions
                </p>
                {visibleSuggestions.length > 0 ? (
                  <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                    {visibleSuggestions.length} task{visibleSuggestions.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {visibleSuggestions.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <Sparkles className="size-6 text-[var(--muted)] opacity-30" />
                  <p className="text-[12px] leading-5 text-[var(--muted)] opacity-60">
                    Tasks will appear here as we talk
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {visibleSuggestions.map((task) => (
                    <li
                      key={task.title}
                      className="group flex items-center gap-2 rounded-xl bg-white/70 px-3.5 py-2.5 ring-1 ring-black/6"
                    >
                      <p className="flex-1 text-[12.5px] font-medium leading-snug text-[var(--ink)]">
                        {task.title}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setRemovedTaskTitles((prev) => new Set([...prev, task.title]))
                        }
                        className="flex size-5 shrink-0 items-center justify-center rounded-full text-[var(--muted)] opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                        aria-label="Remove suggestion"
                      >
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </aside>

      </div>
    </div>

    {/* Backlog review modal */}
    {reviewModalOpen ? (
      <BacklogReviewModal
        tasks={(liveData.proposedTasks ?? []).filter(
          (t) => !removedTaskTitles.has(t.title),
        )}
        onConfirm={handleConfirmFromModal}
        onClose={() => setReviewModalOpen(false)}
        isSaving={isSaving}
        error={error}
      />
    ) : null}
    </React.Fragment>
  );
}
