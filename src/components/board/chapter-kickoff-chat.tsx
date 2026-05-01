"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowUp,
  BookOpen,
  Bot,
  Check,
  LoaderCircle,
  MessageSquareText,
  Sparkles,
  UserRound,
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

export function ChapterKickoffChat({
  project,
  board,
  columns,
  onComplete,
}: {
  project: Project;
  board: Board;
  columns: BoardColumn[];
  onComplete: () => void;
}) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [stage, setStage] = useState<Stage>("chatting");
  const [messages, setMessages] = useState<DialogueMessage[]>(() => [
    buildOpeningMessage(project.name, board.name),
  ]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [chapterData, setChapterData] = useState<AIKickoffDialogue | null>(null);
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
                  Your proposed backlog
                </h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Select the tasks you want to add to {board.name}.
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
                Based on our conversation
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Toggle tasks off to exclude them. You can always add more from the board.
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
                    ? "Saving..."
                    : acceptedCount === 0
                      ? "Skip tasks"
                      : `Add ${acceptedCount} task${acceptedCount === 1 ? "" : "s"} to backlog`}
                </Button>
              </div>
            </div>
          </section>

          <aside className="surface-card hairline min-h-0 rounded-[2rem] p-5 lg:flex lg:flex-col">
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

      <section className="surface hairline flex min-h-0 flex-1 flex-col rounded-[2rem] overflow-hidden">
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

        <div className="border-t border-black/6 bg-white/72 px-5 py-4">
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
    </div>
  );
}
