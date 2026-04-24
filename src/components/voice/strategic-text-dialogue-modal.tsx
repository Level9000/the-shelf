"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { LoaderCircle, MessageSquareText, Send, Sparkles } from "lucide-react";
import type { Project, ProposedTask } from "@/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DialogueMessage = {
  role: "user" | "assistant";
  content: string;
};

type DraftTask = Omit<ProposedTask, "id">;

const INITIAL_MESSAGE =
  "Tell me what you are trying to accomplish, what success looks like, and any constraints. I’ll help narrow it into the right backlog cards.";

export function StrategicTextDialogueModal({
  open,
  project,
  onClose,
  onProcessed,
}: {
  open: boolean;
  project: Project;
  onClose: () => void;
  onProcessed: (result: {
    captureId: string;
    transcript: string;
    proposals: ProposedTask[];
  }) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<DialogueMessage[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"clarifying" | "ready_for_confirmation">(
    "clarifying",
  );
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isConfirming, startConfirmTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  const canConfirm = useMemo(
    () => status === "ready_for_confirmation" && draftTasks.length > 0,
    [draftTasks.length, status],
  );

  function sendMessage() {
    const content = draft.trim();

    if (!content || isPending) {
      return;
    }

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setDraft("");
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/strategy/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: project.id,
            messages: nextMessages,
          }),
        });

        const payload = (await response.json()) as {
          status?: "clarifying" | "ready_for_confirmation";
          reply?: string;
          tasks?: DraftTask[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Strategic dialogue failed.");
        }

        const reply = payload.reply?.trim();

        if (!reply || !payload.status) {
          throw new Error("Strategic dialogue returned an incomplete response.");
        }

        setMessages((current) => [...current, { role: "assistant", content: reply }]);
        setStatus(payload.status);
        setDraftTasks(
          payload.status === "ready_for_confirmation"
            ? (payload.tasks ?? []).map((task) => ({
                ...task,
                description: task.description ?? "",
              }))
            : [],
        );
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Strategic dialogue failed.",
        );
      }
    });
  }

  function confirmTasks() {
    if (!canConfirm || isConfirming) {
      return;
    }

    setError(null);
    startConfirmTransition(async () => {
      try {
        const response = await fetch("/api/strategy/text/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: project.id,
            messages,
            tasks: draftTasks,
          }),
        });

        const payload = (await response.json()) as {
          id?: string;
          transcript?: string;
          tasks?: ProposedTask[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to prepare review.");
        }

        onProcessed({
          captureId: payload.id ?? crypto.randomUUID(),
          transcript: payload.transcript ?? "",
          proposals:
            payload.tasks?.map((task) => ({
              ...task,
              title: task.title.trim(),
              description: task.description ?? "",
            })) ?? [],
        });
        onClose();
      } catch (confirmError) {
        setError(
          confirmError instanceof Error
            ? confirmError.message
            : "Failed to prepare review.",
        );
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isPending && !isConfirming) {
          onClose();
        }
      }}
      title="Strategic text dialogue"
      description={`Work through the goal for ${project.name}, then move the aligned task set into review.`}
      fullScreen
      className="flex min-h-full flex-col bg-[linear-gradient(180deg,rgba(252,250,246,0.98),rgba(243,238,231,0.98))]"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5">
        <div className="rounded-[1.75rem] bg-[var(--surface-muted)] p-5 text-sm text-[var(--muted)]">
          <div className="flex items-center gap-2 font-semibold text-[var(--ink)]">
            <Sparkles className="size-4 text-[var(--accent)]" />
            Strategy-first flow
          </div>
          <p className="mt-2 leading-6">
            This mode stays in dialogue until the task list is concrete enough to
            review. Nothing is saved until you confirm the aligned cards.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="min-h-0 rounded-[2rem] bg-white/72 p-5 ring-1 ring-black/6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  Strategy conversation
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Clarify the outcome before any cards are created.
                </p>
              </div>
              <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                {status === "ready_for_confirmation" ? "Aligned" : "Refining"}
              </div>
            </div>
            <div className="h-[calc(100vh-22rem)] min-h-[340px] space-y-3 overflow-y-auto pr-1">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "max-w-[88%] rounded-[1.4rem] px-4 py-3 text-sm leading-6",
                  message.role === "assistant"
                    ? "bg-[var(--surface-muted)] text-[var(--ink)]"
                    : "ml-auto bg-[var(--ink)] text-white",
                )}
              >
                <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">
                  {message.role === "assistant" ? (
                    <MessageSquareText className="size-3.5" />
                  ) : null}
                  {message.role}
                </div>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          </div>

          <div className="flex min-h-0 flex-col gap-4">
            {canConfirm ? (
              <div className="rounded-[1.75rem] border border-[var(--accent)]/15 bg-[var(--accent-soft)]/55 p-5">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  Task plan is ready for review
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Confirm to open the same task review modal used by
                  audio-to-backlog, or keep chatting if the scope still needs work.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button onClick={confirmTasks} disabled={isConfirming}>
                    {isConfirming ? "Preparing review..." : "Yes, review these tasks"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStatus("clarifying");
                      setDraftTasks([]);
                      setError(null);
                    }}
                    disabled={isConfirming}
                  >
                    Keep refining
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.75rem] bg-[var(--surface-muted)] p-5 text-sm leading-6 text-[var(--muted)]">
                Keep the conversation going until the plan is concrete. Once the AI
                has enough signal, it will summarize the exact cards it wants to
                create and ask you to confirm.
              </div>
            )}

            <div className="rounded-[1.75rem] bg-[var(--surface-muted)] p-5">
              <label className="mb-2 block text-sm font-medium text-[var(--ink)]">
                Your message
              </label>
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Describe the goal, blockers, deadlines, or outcomes you need."
                className="min-h-[180px] bg-white"
                disabled={isPending || isConfirming}
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[var(--muted)]">
                  Press Ctrl/Cmd + Enter to send.
                </p>
                <Button
                  onClick={sendMessage}
                  disabled={!draft.trim() || isPending || isConfirming}
                >
                  {isPending ? (
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 size-4" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
