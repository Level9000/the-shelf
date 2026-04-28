"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Bot,
  CheckCircle2,
  LoaderCircle,
  MessageSquareText,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { BoardSnapshot, Task } from "@/types";
import { moveTasksToColumnAction } from "@/lib/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";

type DialogueMessage = {
  role: "user" | "assistant";
  content: string;
};

export function WeeklyPlanningRefiner({
  snapshot,
  onClose,
}: {
  snapshot: BoardSnapshot;
  onClose: () => void;
}) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const todoColumn = snapshot.columns.find((column) => column.name === "To Do") ?? null;
  const weekColumn =
    snapshot.columns.find((column) => column.name === "Do This Week") ?? null;
  const todoTasks = useMemo(
    () =>
      snapshot.tasks
        .filter((task) => task.columnId === todoColumn?.id)
        .sort((left, right) => left.position - right.position),
    [snapshot.tasks, todoColumn?.id],
  );
  const [messages, setMessages] = useState<DialogueMessage[]>([
    {
      role: "assistant",
      content:
        todoTasks.length > 0
          ? "Let’s plan this week. Looking at the backlog, what feels realistic for you to get done without tipping into guilt or overload?"
          : "There are no tasks in To Do right now, so there is nothing to plan into Do This Week yet.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [plannedTaskIds, setPlannedTaskIds] = useState<string[]>([]);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isApproving, startApproveTransition] = useTransition();

  const plannedTasks = plannedTaskIds
    .map((taskId) => todoTasks.find((task) => task.id === taskId))
    .filter((task): task is Task => Boolean(task));

  async function requestAssistantReply(nextMessages: DialogueMessage[]) {
    const response = await fetch("/api/weekly-plan/refine", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: snapshot.project.id,
        boardId: snapshot.board.id,
        messages: nextMessages,
      }),
    });

    const payload = (await response.json()) as {
      reply?: string;
      readyForApproval?: boolean;
      plannedTaskIds?: string[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Weekly planning failed.");
    }

    const reply = payload.reply?.trim();

    if (!reply) {
      throw new Error("Weekly planning returned an incomplete response.");
    }

    setMessages((current) => [...current, { role: "assistant", content: reply }]);
    setPlannedTaskIds(
      (payload.plannedTaskIds ?? []).filter((taskId) =>
        todoTasks.some((task) => task.id === taskId),
      ),
    );

    if (payload.readyForApproval && (payload.plannedTaskIds?.length ?? 0) > 0) {
      setApprovalOpen(true);
    }
  }

  function sendMessage() {
    const content = draft.trim();

    if (!content || isPending || isApproving || todoTasks.length === 0) {
      return;
    }

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setDraft("");
    setError(null);

    startTransition(async () => {
      try {
        await requestAssistantReply(nextMessages);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Weekly planning failed.",
        );
      } finally {
        queueMicrotask(() =>
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
        );
      }
    });
  }

  function approvePlan() {
    if (!weekColumn || plannedTaskIds.length === 0) {
      return;
    }

    setError(null);
    startApproveTransition(async () => {
      try {
        await moveTasksToColumnAction({
          projectId: snapshot.project.id,
          boardId: snapshot.board.id,
          taskIds: plannedTaskIds,
          targetColumnId: weekColumn.id,
        });
        router.refresh();
        onClose();
      } catch (approveError) {
        setError(
          approveError instanceof Error
            ? approveError.message
            : "Failed to move tasks into Do This Week.",
        );
      }
    });
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-5">
        <section className="surface hairline rounded-[2rem] p-5 sm:p-6">
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
                  Plan this week with chat
                </h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Choose a realistic amount of work for {snapshot.board.name} without
                  creating guilt or overload.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                {plannedTasks.length} planned
              </div>
              <Button variant="secondary" onClick={onClose}>
                <ArrowLeft className="mr-2 size-4" />
                Back to board
              </Button>
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1.08fr)_400px]">
          <section className="surface hairline flex min-h-0 flex-col overflow-hidden rounded-[2rem]">
            <div className="border-b border-black/6 px-5 py-4">
              <p className="text-sm font-semibold text-[var(--ink)]">
                Weekly planning conversation
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                We are only choosing what moves from To Do into Do This Week.
              </p>
            </div>

            <div className="border-b border-black/6 bg-[var(--surface-muted)]/65 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Chapter context
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-[var(--ink)]">Chapter goal</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {snapshot.board.goal ?? "Not set yet on the chapter overview."}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--ink)]">
                    Success looks like
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {snapshot.board.successLooksLike ??
                      "Not set yet on the chapter overview."}
                  </p>
                </div>
              </div>
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
                      Thinking through a guilt-free weekly scope...
                    </div>
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-black/6 bg-white/72 px-5 py-4">
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
                  placeholder="Talk through what feels realistic for this week."
                  className="min-h-[118px] border-0 bg-transparent px-2 py-2 shadow-none focus:ring-0"
                  disabled={isPending || isApproving || todoTasks.length === 0}
                />
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <MessageSquareText className="size-3.5" />
                    Enter sends. Shift + Enter adds a new line.
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={
                      !draft.trim() || isPending || isApproving || todoTasks.length === 0
                    }
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

          <aside className="surface-card hairline min-h-0 rounded-[2rem] p-5 lg:flex lg:flex-col">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              <CheckCircle2 className="size-4 text-[var(--accent)]" />
              Plan for this week
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              The tasks we agree are realistic to move from To Do into Do This Week.
            </p>
            <div className="mt-4 space-y-2 overflow-y-auto lg:min-h-0 lg:flex-1">
              {plannedTasks.length > 0 ? (
                plannedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-[1.2rem] bg-white px-4 py-3 ring-1 ring-black/6"
                  >
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {task.title}
                    </p>
                    {task.description ? (
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        {task.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
                      {task.priority ? <span>{task.priority}</span> : null}
                      {task.dueDate ? <span>{formatDate(task.dueDate)}</span> : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.2rem] bg-white/55 px-4 py-4 text-sm leading-6 text-[var(--muted)] ring-1 ring-black/6">
                  Once the conversation lands on a realistic weekly scope, the agreed
                  tasks will appear here.
                </div>
              )}
            </div>
          </aside>
        </div>

        {error ? (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </div>

      <Modal
        open={approvalOpen}
        onClose={() => !isApproving && setApprovalOpen(false)}
        title="Approve weekly plan"
        description="Approve this plan to move the selected tasks from To Do into Do This Week."
        className="max-w-2xl"
      >
        <div className="space-y-3">
          {plannedTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-[1.3rem] bg-[var(--surface-muted)] px-4 py-3"
            >
              <p className="text-sm font-semibold text-[var(--ink)]">{task.title}</p>
              {task.description ? (
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  {task.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => setApprovalOpen(false)}
            disabled={isApproving}
          >
            Needs changes
          </Button>
          <Button
            onClick={approvePlan}
            disabled={isApproving || !weekColumn || plannedTaskIds.length === 0}
          >
            {isApproving ? "Moving tasks..." : "Move to Do This Week"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
