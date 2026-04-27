"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowUp,
  Bot,
  CheckCircle2,
  LoaderCircle,
  MessageSquareText,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { ProposedTask, Project } from "@/types";
import type { StrategicTemplate } from "@/lib/ai/schema";
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
  "Tell me about a kind of work you do more than once. Walk me through the last time you did it from start to finish, and I’ll help capture your real workflow.";

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
    templateId?: string | null;
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
  const [status, setStatus] = useState<
    "discovery" | "template_review" | "ready_for_review"
  >(
    "discovery",
  );
  const [template, setTemplate] = useState<StrategicTemplate | null>(null);
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isConfirming, startConfirmTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  const canConfirm = useMemo(
    () => status === "ready_for_review" && draftTasks.length > 0 && template !== null,
    [draftTasks.length, status, template],
  );

  const stageLabel = useMemo(() => {
    if (status === "ready_for_review") return "Backlog ready";
    if (status === "template_review") return "Template drafted";
    return "Discovery mode";
  }, [status]);

  function normalizeTemplate(nextTemplate?: StrategicTemplate | null) {
    if (!nextTemplate) {
      return null;
    }

    const hasMeaningfulValue =
      nextTemplate.name.trim().length > 0 ||
      nextTemplate.triggerPhrase.trim().length > 0 ||
      nextTemplate.description.trim().length > 0;

    return hasMeaningfulValue ? nextTemplate : null;
  }

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
          status?: "discovery" | "template_review" | "ready_for_review";
          reply?: string;
          template?: StrategicTemplate | null;
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
        setTemplate(normalizeTemplate(payload.template));
        setDraftTasks(
          payload.status === "template_review" || payload.status === "ready_for_review"
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

    if (!template) {
      setError("Shelf needs a reusable template before it can prepare the backlog.");
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
            template,
            tasks: draftTasks,
          }),
        });

        const payload = (await response.json()) as {
          id?: string;
          templateId?: string;
          transcript?: string;
          tasks?: ProposedTask[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to prepare review.");
        }

        onProcessed({
          captureId: payload.id ?? crypto.randomUUID(),
          templateId: payload.templateId ?? null,
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
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] bg-white/70 px-5 py-4 ring-1 ring-black/6">
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
              <p className="text-xl font-semibold tracking-tight text-[var(--ink)]">
                Shelf AI
              </p>
              <p className="text-sm text-[var(--muted)]">
                Planning partner for reusable workflows and backlog setup
              </p>
            </div>
          </div>
          <div className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
            {stageLabel}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[1.18fr_0.82fr]">
          <div className="flex min-h-0 flex-col rounded-[2rem] bg-white/72 ring-1 ring-black/6">
            <div className="border-b border-black/6 px-5 py-4">
              <p className="text-sm font-semibold text-[var(--ink)]">
                Strategic text dialogue
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Capture how you actually work, then turn it into a reusable task flow.
              </p>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
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
              ))}
              {isPending ? (
                <div className="flex gap-3">
                  <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Bot className="size-4" />
                  </div>
                  <div className="rounded-[1.7rem] rounded-tl-[0.55rem] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)] shadow-sm">
                    <div className="flex items-center gap-2">
                      <LoaderCircle className="size-4 animate-spin" />
                      Thinking through your workflow...
                    </div>
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-black/6 px-5 py-4">
              <div className="rounded-[1.9rem] bg-[var(--surface-muted)] p-3">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Describe the kind of work you want Shelf to learn from you."
                  className="min-h-[118px] border-0 bg-transparent px-2 py-2 shadow-none focus:ring-0"
                  disabled={isPending || isConfirming}
                />
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <Sparkles className="size-3.5" />
                    Shelf is learning your actual process, not a generic checklist.
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={!draft.trim() || isPending || isConfirming}
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
          </div>

          <div className="flex min-h-0 flex-col gap-4">
            <div className="rounded-[1.75rem] bg-[var(--surface-muted)] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                <MessageSquareText className="size-4 text-[var(--accent)]" />
                Workflow capture
              </div>
              {template ? (
                <div className="mt-4 rounded-[1.5rem] bg-white/90 p-4 ring-1 ring-black/6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[var(--ink)]">
                        {template.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Trigger: {template.triggerPhrase}
                      </p>
                    </div>
                    <div className="rounded-full bg-black px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                      {status === "ready_for_review" ? "Ready" : "Draft"}
                    </div>
                  </div>
                  {template.description ? (
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      {template.description}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  As you describe your process, Shelf will build a reusable workflow
                  template here with a trigger phrase and ordered steps.
                </p>
              )}
            </div>

            <div className="rounded-[1.75rem] bg-white/72 p-5 ring-1 ring-black/6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                <CheckCircle2 className="size-4 text-[var(--accent)]" />
                Task library draft
              </div>
              {draftTasks.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {draftTasks.map((task, index) => (
                    <div
                      key={`${task.title}-${index}`}
                      className="rounded-[1.25rem] bg-[var(--surface-muted)] px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        {index + 1}. {task.title}
                      </p>
                      {task.description ? (
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                          {task.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  No steps captured yet. Discovery mode will ask about the real
                  sequence you follow before turning it into a reusable flow.
                </p>
              )}
            </div>

            {canConfirm ? (
              <div className="rounded-[1.75rem] border border-[var(--accent)]/15 bg-[var(--accent-soft)]/55 p-5">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  Backlog draft is ready
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Open the review modal to inspect the tasks for this chapter, or keep
                  refining the workflow first.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button onClick={confirmTasks} disabled={isConfirming}>
                    {isConfirming ? "Preparing review..." : "Review chapter tasks"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStatus("discovery");
                      setError(null);
                    }}
                    disabled={isConfirming}
                  >
                    Keep refining
                  </Button>
                </div>
              </div>
            ) : null}
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
